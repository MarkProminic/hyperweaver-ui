import axios from 'axios';
import PropTypes from 'prop-types';
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import * as consoleAPI from '../api/consoleAPI';
import * as deviceAPI from '../api/deviceAPI';
import * as hostManagementAPI from '../api/hostManagementAPI';
import * as machineAPI from '../api/machineAPI';
import * as monitoringAPI from '../api/monitoringAPI';
import { configureAgentAddressing, makeAgentRequest } from '../api/serverUtils';
import * as vlanAPI from '../api/vlanAPI';

import { useAuth } from './AuthContext';
import { useMode } from './ModeContext';
import { useOrgFilter, serverVisibleUnderOrg } from './OrgFilterContext';

/**
 * Server context for managing Agent connections
 *
 * - Hyperweaver application manages shared server connections
 * - All users see the same servers (application-level, not per-user)
 * - Only admins can add/remove servers
 * - All authenticated users can use existing servers
 */
const ServerContext = createContext();

/**
 * Custom hook to use server context
 * @returns {Object} Server context value
 */
export const useServers = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServers must be used within a ServerProvider');
  }
  return context;
};

/**
 * Server provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ServerProvider = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isDirect, ready: modeReady, serverInfo } = useMode();
  const { activeOrg } = useOrgFilter();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentServer, setCurrentServer] = useState(() => {
    // Restore currentServer from localStorage on initialization
    try {
      const saved = localStorage.getItem('hyperweaver_currentServer');
      return saved ? JSON.parse(saved) : null;
    } catch (restoreErr) {
      console.warn('Failed to restore currentServer from localStorage:', restoreErr);
      return null;
    }
  });

  const [currentMachine, setCurrentMachine] = useState(() => {
    // Restore currentMachine from localStorage on initialization
    try {
      const saved = localStorage.getItem('hyperweaver_currentMachine');
      return saved ? JSON.parse(saved) : null;
    } catch (restoreMachineErr) {
      console.warn('Failed to restore currentMachine from localStorage:', restoreMachineErr);
      return null;
    }
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loadingRef = useRef(false);

  /**
   * Direct mode: the agent that served the SPA IS the (only) server. Synthesized from
   * the origin + the /api/status payload. The 'self' id is a sentinel — in direct mode
   * getAgentBasePath never uses it (agent paths go to origin root).
   */
  const selfServer = useMemo(() => {
    if (!isDirect || !serverInfo) {
      return null;
    }
    const scheme = window.location.protocol.replace(':', '');
    return {
      id: 'self',
      hostname: window.location.hostname,
      port: parseInt(window.location.port, 10) || (scheme === 'https' ? 443 : 80),
      protocol: scheme,
      entityName: serverInfo.hostname || window.location.hostname,
      description: t('app.serverContext.selfServerDescription'),
      capabilities: serverInfo,
    };
  }, [isDirect, serverInfo, t]);

  /**
   * Keep the request layer's addressing in sync with mode + registry
   * (dual-mode plan §4/§7): direct → origin-root paths; aggregated →
   * /api/agents/{id} resolved from the loaded servers list.
   */
  useEffect(() => {
    if (!modeReady) {
      return;
    }
    if (isDirect) {
      configureAgentAddressing({ mode: 'direct' });
      return;
    }
    const byTriple = new Map(
      servers.map(server => [
        `${server.hostname}:${String(server.port)}:${server.protocol}`,
        server.id,
      ])
    );
    // Seed the persisted selection: it carries its registry id from the previous
    // session, so mount-time callers (footer terminal, dashboard) don't race the
    // /api/servers fetch. The loaded list overwrites the seed once it lands.
    const seedId = currentServer?.id ?? null;
    if (seedId !== null && seedId !== 'self') {
      const seedKey = `${currentServer.hostname}:${String(currentServer.port)}:${currentServer.protocol}`;
      if (!byTriple.has(seedKey)) {
        byTriple.set(seedKey, seedId);
      }
    }
    configureAgentAddressing({
      mode: 'aggregated',
      resolveId: (hostname, port, protocol) =>
        byTriple.get(`${hostname}:${String(port)}:${protocol}`) ?? null,
    });
  }, [modeReady, isDirect, servers, currentServer]);

  /**
   * Load all servers from the application (Aggregated mode only — Direct has no registry)
   */
  const loadServers = useCallback(async () => {
    if (isDirect) {
      return;
    }
    // Prevent concurrent calls
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      const response = await axios.get('/api/servers');

      if (response.data.success) {
        setServers(response.data.servers);
      } else {
        console.error('Failed to load servers:', response.data.message);
      }
    } catch (loadErr) {
      console.error('Error loading servers:', loadErr);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isDirect]);

  // Persist currentServer to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentServer) {
        // Persist addressing/identity ONLY — capabilities are live data from the
        // registry/status probe. Persisting them froze a stale features array
        // across sessions, and token gating then failed closed on surfaces the
        // agent actually advertises (sync item 9). A restored row with no
        // capabilities renders everything until the fresh registry row lands.
        const { capabilities, ...persistable } = currentServer;
        void capabilities;
        localStorage.setItem('hyperweaver_currentServer', JSON.stringify(persistable));
      } else {
        localStorage.removeItem('hyperweaver_currentServer');
      }
    } catch (saveErr) {
      console.warn('Failed to save currentServer to localStorage:', saveErr);
    }
  }, [currentServer]);

  // Persist currentMachine to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentMachine) {
        localStorage.setItem('hyperweaver_currentMachine', JSON.stringify(currentMachine));
      } else {
        localStorage.removeItem('hyperweaver_currentMachine');
      }
    } catch (saveMachineErr) {
      console.warn('Failed to save currentMachine to localStorage:', saveMachineErr);
    }
  }, [currentMachine]);

  /**
   * Establish the server list once authenticated.
   * Direct mode: the list IS the origin agent — no registry call.
   * Aggregated mode: load the registry from /api/servers.
   */
  useEffect(() => {
    if (!modeReady) {
      return undefined;
    }

    if (isDirect) {
      if (isAuthenticated && selfServer && !hasLoadedOnce) {
        setServers([selfServer]);
        setCurrentServer(selfServer);
        setHasLoadedOnce(true);
      }
      if (!isAuthenticated && !authLoading) {
        setServers([]);
        setCurrentServer(null);
        setHasLoadedOnce(false);
      }
      return undefined;
    }

    if (isAuthenticated && !hasLoadedOnce) {
      const timer = setTimeout(() => {
        loadServers();
        setHasLoadedOnce(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isAuthenticated && !authLoading) {
      // Only clear server state when authentication explicitly fails, not during loading
      setServers([]);
      setCurrentServer(null);
      setHasLoadedOnce(false);
    }
    return undefined;
  }, [modeReady, isDirect, selfServer, isAuthenticated, authLoading, hasLoadedOnce, loadServers]);

  /**
   * Re-establish currentServer connection after servers load
   * This handles page refresh scenarios where currentServer is restored from localStorage
   * but needs to be matched with the actual server objects from the API
   */
  useEffect(() => {
    if (isDirect) {
      // Direct mode: currentServer is always the origin agent; nothing to re-establish.
      return;
    }

    if (servers.length > 0 && currentServer && currentServer.hostname) {
      // Find the matching server in the loaded servers array
      const matchingServer = servers.find(
        server =>
          server.hostname === currentServer.hostname &&
          server.port === currentServer.port &&
          server.protocol === currentServer.protocol
      );

      if (matchingServer) {
        // Compare meaningful fields instead of potentially different IDs.
        // capabilities MUST be part of the comparison: without it a restored
        // currentServer kept its session-old capability snapshot forever and
        // token gating ran against stale features (sync item 9).
        const hasActualChanges =
          matchingServer.hostname !== currentServer.hostname ||
          matchingServer.port !== currentServer.port ||
          matchingServer.protocol !== currentServer.protocol ||
          matchingServer.lastUsed !== currentServer.lastUsed ||
          JSON.stringify(matchingServer.capabilities ?? null) !==
            JSON.stringify(currentServer.capabilities ?? null);

        if (hasActualChanges) {
          setCurrentServer(matchingServer);
        }
      } else {
        // Server no longer exists, clear selection
        setCurrentServer(null);
        setCurrentMachine(null);
      }
    }
  }, [isDirect, servers, currentServer]);

  /**
   * Add a new Server (Admin only)
   * @param {Object} serverData - Server configuration
   * @param {string} serverData.hostname - Server hostname
   * @param {number} serverData.port - Server port
   * @param {string} serverData.protocol - Server protocol (http/https)
   * @param {string} serverData.entityName - Entity name for the API key
   * @param {string} [serverData.description] - Description
   * @returns {Promise<Object>} Add result
   */
  const addServer = useCallback(
    async serverData => {
      if (isDirect) {
        return { success: false, message: t('app.serverContext.directModeUnavailable') };
      }
      try {
        setLoading(true);
        const response = await axios.post('/api/servers', serverData);

        if (response.data.success) {
          // Reload servers to get the new one
          await loadServers();
          return { success: true, message: response.data.message };
        }
        return { success: false, message: response.data.message };
      } catch (addErr) {
        console.error('Add server error:', addErr);
        return {
          success: false,
          message: addErr.response?.data?.message || t('app.serverContext.addServerFailed'),
        };
      } finally {
        setLoading(false);
      }
    },
    [isDirect, loadServers, t]
  );

  /**
   * Test server connectivity
   * @param {Object} serverData - Server configuration
   * @param {string} serverData.hostname - Server hostname
   * @param {number} serverData.port - Server port
   * @param {string} serverData.protocol - Server protocol (http/https)
   * @returns {Promise<Object>} Test result
   */
  const testServer = useCallback(
    async serverData => {
      if (isDirect) {
        return { success: false, message: t('app.serverContext.directModeUnavailable') };
      }
      try {
        const response = await axios.post('/api/servers/test', serverData);

        return {
          success: response.data.success,
          message: response.data.message,
          serverInfo: response.data.serverInfo,
        };
      } catch (testErr) {
        console.error('Test server error:', testErr);
        return {
          success: false,
          message: testErr.response?.data?.message || t('app.serverContext.connectionTestFailed'),
        };
      }
    },
    [isDirect, t]
  );

  /**
   * Update a server's editable settings (Admin only). allow_insecure is the only
   * editable field — it governs whether the Server accepts the agent's self-signed
   * TLS certificate (REST and console WS alike).
   * @param {number} serverId - Server ID
   * @param {boolean} allowInsecure - Accept self-signed TLS certificates
   * @returns {Promise<Object>} Update result
   */
  const updateServer = useCallback(
    async (serverId, allowInsecure) => {
      if (isDirect) {
        return { success: false, message: t('app.serverContext.directModeUnavailable') };
      }
      try {
        setLoading(true);
        const response = await axios.patch(`/api/servers/${serverId}`, { allowInsecure });

        if (response.data.success) {
          // Reload servers so the row reflects the new flag
          await loadServers();
          return { success: true, message: response.data.message };
        }
        return { success: false, message: response.data.message };
      } catch (updateErr) {
        console.error('Update server error:', updateErr);
        return {
          success: false,
          message: updateErr.response?.data?.message || t('app.serverContext.updateServerFailed'),
        };
      } finally {
        setLoading(false);
      }
    },
    [isDirect, loadServers, t]
  );

  /**
   * Remove a server (Admin only)
   * @param {number} serverId - Server ID
   * @returns {Promise<Object>} Remove result
   */
  const removeServer = useCallback(
    async serverId => {
      if (isDirect) {
        return { success: false, message: t('app.serverContext.directModeUnavailable') };
      }
      try {
        setLoading(true);
        const response = await axios.delete(`/api/servers/${serverId}`);

        if (response.data.success) {
          // Reload servers to reflect the change
          await loadServers();

          // Clear current server if it was the one removed
          if (currentServer && currentServer.id === serverId) {
            setCurrentServer(null);
          }

          return { success: true, message: response.data.message };
        }
        return { success: false, message: response.data.message };
      } catch (removeErr) {
        console.error('Remove server error:', removeErr);
        return {
          success: false,
          message: removeErr.response?.data?.message || t('app.serverContext.removeServerFailed'),
        };
      } finally {
        setLoading(false);
      }
    },
    [isDirect, loadServers, currentServer, t]
  );

  /**
   * The registry under the org-switcher's view filter (fails open on rows without the
   * Server's org_uuids annotation). This is what every view surface consumes; the
   * settings page fetches its own unfiltered list.
   */
  const visibleServers = useMemo(
    () => servers.filter(server => serverVisibleUnderOrg(server, activeOrg)),
    [servers, activeOrg]
  );

  /**
   * A selection hidden by an org switch is dropped so the navbar auto-select lands on
   * the first visible host instead of pinning a filtered-out one.
   */
  useEffect(() => {
    if (
      !isDirect &&
      currentServer &&
      servers.length > 0 &&
      !visibleServers.some(
        server =>
          server.hostname === currentServer.hostname &&
          server.port === currentServer.port &&
          server.protocol === currentServer.protocol
      )
    ) {
      setCurrentServer(null);
      setCurrentMachine(null);
    }
  }, [isDirect, servers, visibleServers, currentServer]);

  /**
   * Get all available servers
   * @returns {Array} Array of server objects
   */
  const getServers = useCallback(
    () =>
      [...visibleServers].sort(
        (a, b) => new Date(b.lastUsed || b.createdAt) - new Date(a.lastUsed || a.createdAt)
      ),
    [visibleServers]
  );

  /**
   * Set the current server for operations
   * @param {Object} server - Server object
   */
  const selectServer = useCallback(server => {
    setCurrentServer(server);
    // Clear current machine when server changes
    setCurrentMachine(null);
  }, []);

  /**
   * Set the current machine for operations
   * @param {string} machineName - Machine name
   */
  const selectMachine = useCallback(machineName => {
    setCurrentMachine(machineName);
  }, []);

  /**
   * Clear the current machine selection
   */
  const clearMachine = useCallback(() => {
    setCurrentMachine(null);
  }, []);

  // ========================================
  // API KEY MANAGEMENT FUNCTIONS
  // Kept in context because they depend on currentServer state
  // ========================================

  const getApiKeys = useCallback(async () => {
    if (!currentServer) {
      return { success: false, message: t('app.serverContext.noServerSelected') };
    }
    return await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'api-keys',
      'GET'
    );
  }, [currentServer, t]);

  const generateApiKey = useCallback(
    async (name, description) => {
      if (!currentServer) {
        return { success: false, message: t('app.serverContext.noServerSelected') };
      }
      return await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'api-keys/generate',
        'POST',
        { name, description }
      );
    },
    [currentServer, t]
  );

  const bootstrapApiKey = useCallback(async () => {
    if (!currentServer) {
      return { success: false, message: t('app.serverContext.noServerSelected') };
    }
    return await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'api-keys/bootstrap',
      'POST',
      { name: 'Initial-Setup', description: 'Initial bootstrap API key' }
    );
  }, [currentServer, t]);

  const deleteApiKey = useCallback(
    async id => {
      if (!currentServer) {
        return { success: false, message: t('app.serverContext.noServerSelected') };
      }
      return await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `api-keys/${id}`,
        'DELETE'
      );
    },
    [currentServer, t]
  );

  // Memoized: the value's identity only changes when actual state changes. An inline
  // object literal here re-rendered EVERY useServers consumer on every provider render
  // (visible as page-wide re-render churn). The API-module spreads are static imports —
  // stable by definition, not deps.
  const value = useMemo(
    () => ({
      servers: visibleServers,
      loading,
      currentServer,
      currentMachine,
      loadServers,
      refreshServers: loadServers,
      addServer,
      testServer,
      updateServer,
      removeServer,
      getServers,
      selectServer,
      selectMachine,
      clearMachine,
      makeAgentRequest,
      // Machine Management Functions (canonical /machines/* — startMachine, stopMachine, …)
      ...machineAPI,
      // VNC Console Functions
      startVncSession: consoleAPI.startVncSession,
      getVncSessionInfo: consoleAPI.getVncSessionInfo,
      stopVncSession: consoleAPI.stopVncSession,
      getAllVncSessions: consoleAPI.getAllVncSessions,
      // Zlogin Console Functions
      startZloginSession: consoleAPI.startZloginSession,
      getZloginSessionInfo: consoleAPI.getZloginSessionInfo,
      stopZloginSession: consoleAPI.stopZloginSession,
      getAllZloginSessions: consoleAPI.getAllZloginSessions,
      // Host Monitoring Functions
      getMonitoringStatus: monitoringAPI.getMonitoringStatus,
      getMonitoringHealth: monitoringAPI.getMonitoringHealth,
      triggerMonitoringCollection: monitoringAPI.triggerMonitoringCollection,
      getMonitoringHost: monitoringAPI.getMonitoringHost,
      getMonitoringSummary: monitoringAPI.getMonitoringSummary,
      // Network Monitoring Functions
      getNetworkInterfaces: monitoringAPI.getNetworkInterfaces,
      getNetworkUsage: monitoringAPI.getNetworkUsage,
      getNetworkIPAddresses: monitoringAPI.getNetworkIPAddresses,
      getNetworkRoutes: monitoringAPI.getNetworkRoutes,
      // Storage Monitoring Functions
      getStoragePools: monitoringAPI.getStoragePools,
      getStorageDatasets: monitoringAPI.getStorageDatasets,
      getStorageDisks: monitoringAPI.getStorageDisks,
      getStoragePoolIO: monitoringAPI.getStoragePoolIO,
      getStorageDiskIO: monitoringAPI.getStorageDiskIO,
      getStorageARC: monitoringAPI.getStorageARC,
      // System Monitoring Functions
      getSystemCPU: monitoringAPI.getSystemCPU,
      getSystemMemory: monitoringAPI.getSystemMemory,
      // Device Management Functions
      ...deviceAPI,
      // VLAN Management Functions
      ...vlanAPI,
      // Host Management Functions
      ...hostManagementAPI,
      // API Key Management Functions
      getApiKeys,
      generateApiKey,
      bootstrapApiKey,
      deleteApiKey,
    }),
    [
      visibleServers,
      loading,
      currentServer,
      currentMachine,
      loadServers,
      addServer,
      testServer,
      updateServer,
      removeServer,
      getServers,
      selectServer,
      selectMachine,
      clearMachine,
      getApiKeys,
      generateApiKey,
      bootstrapApiKey,
      deleteApiKey,
    ]
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
};

ServerProvider.propTypes = {
  children: PropTypes.node,
};

export default ServerContext;
