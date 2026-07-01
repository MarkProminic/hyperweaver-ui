import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';

/**
 * Custom hook to manage fetching and state for the details of a specific zone.
 * @param {object} currentServer - The currently selected server object.
 * @param {string} currentZone - The name of the currently selected zone.
 * @returns {object} An object containing zone details, loading state, error state, and a function to reload details.
 */
export const useZoneDetails = (currentServer, currentZone) => {
  const [zoneDetails, setZoneDetails] = useState({});
  const [monitoringHealth, setMonitoringHealth] = useState({});
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [storagePools, setStoragePools] = useState([]);
  const [storageDatasets, setStorageDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    makeAgentRequest,
    getMonitoringHealth,
    getNetworkInterfaces,
    getStoragePools,
    getStorageDatasets,
  } = useServers();

  const { initializeSessionFromExisting } = useZoneTerminal();

  const loadMonitoringData = useCallback(
    async server => {
      if (!server) {
        return;
      }
      try {
        const [healthResult, networkResult, poolsResult, datasetsResult] = await Promise.all([
          getMonitoringHealth(server.hostname, server.port, server.protocol),
          getNetworkInterfaces(server.hostname, server.port, server.protocol),
          getStoragePools(server.hostname, server.port, server.protocol),
          getStorageDatasets(server.hostname, server.port, server.protocol),
        ]);

        if (healthResult.success) {
          setMonitoringHealth(healthResult.data);
        }
        if (networkResult.success) {
          setNetworkInterfaces(networkResult.data);
        }
        if (poolsResult.success) {
          setStoragePools(poolsResult.data);
        }
        if (datasetsResult.success) {
          setStorageDatasets(datasetsResult.data);
        }
      } catch (monitoringErr) {
        console.warn('Error fetching monitoring data:', monitoringErr);
      }
    },
    [getMonitoringHealth, getNetworkInterfaces, getStoragePools, getStorageDatasets]
  );

  const loadZoneDetails = useCallback(
    async (server, zoneName) => {
      if (!server || !zoneName) {
        setZoneDetails({});
        return;
      }

      try {
        setLoading(true);
        setError('');

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          `zones/${zoneName}`
        );

        if (result.success) {
          const zoneData = { ...result.data };

          // Fire off monitoring data load in the background
          loadMonitoringData(server);

          // Automatically poll VNC session info (like zlogin does)
          try {
            console.log(`🔍 VNC AUTO-POLL: Checking for existing VNC session for ${zoneName}`);
            const vncResult = await makeAgentRequest(
              server.hostname,
              server.port,
              server.protocol,
              `zones/${zoneName}/vnc/info?_t=${Date.now()}`,
              'GET',
              null,
              null,
              true // bypass cache
            );

            if (vncResult.success && vncResult.data && vncResult.data.active_vnc_session) {
              console.log(`✅ VNC AUTO-POLL: Found existing VNC session for ${zoneName}`);
              // Use VNC-specific data instead of basic zone API flag
              zoneData.active_vnc_session = vncResult.data.active_vnc_session;
              zoneData.vnc_session_info = vncResult.data.vnc_session_info;
            } else {
              console.log(`❌ VNC AUTO-POLL: No existing VNC session for ${zoneName}`);
              // Clear any stale VNC flags from basic zone API
              zoneData.active_vnc_session = false;
              zoneData.vnc_session_info = null;
            }
          } catch (vncError) {
            console.warn(
              `⚠️ VNC AUTO-POLL: Failed to check VNC session for ${zoneName}:`,
              vncError
            );
            // Clear VNC flags on polling failure to prevent stale data
            zoneData.active_vnc_session = false;
            zoneData.vnc_session_info = null;
          }

          // Automatically poll zlogin sessions (like existing zlogin system)
          try {
            console.log(
              `🔍 ZLOGIN AUTO-POLL: Checking for existing zlogin sessions for ${zoneName}`
            );
            const zloginResult = await makeAgentRequest(
              server.hostname,
              server.port,
              server.protocol,
              `zlogin/sessions?_t=${Date.now()}`,
              'GET',
              null,
              null,
              true // bypass cache
            );

            if (zloginResult.success && zloginResult.data) {
              const activeSessions = Array.isArray(zloginResult.data)
                ? zloginResult.data
                : zloginResult.data.sessions || [];

              const activeZoneSession = activeSessions.find(
                session => session.zone_name === zoneName && session.status === 'active'
              );

              if (activeZoneSession) {
                console.log(`✅ ZLOGIN AUTO-POLL: Found existing zlogin session for ${zoneName}`);
                zoneData.zlogin_session = activeZoneSession;
                zoneData.active_zlogin_session = true;

                // Initialize ZoneTerminalContext with the existing session
                console.log(
                  `🔄 ZLOGIN AUTO-INIT: Initializing ZoneTerminalContext for existing session`
                );
                initializeSessionFromExisting(server, zoneName, activeZoneSession);
              } else {
                console.log(`❌ ZLOGIN AUTO-POLL: No existing zlogin session for ${zoneName}`);
                zoneData.zlogin_session = null;
                zoneData.active_zlogin_session = false;
              }
            } else {
              console.log(`❌ ZLOGIN AUTO-POLL: No zlogin sessions found for ${zoneName}`);
              zoneData.zlogin_session = null;
              zoneData.active_zlogin_session = false;
            }
          } catch (zloginError) {
            console.warn(
              `⚠️ ZLOGIN AUTO-POLL: Failed to check zlogin sessions for ${zoneName}:`,
              zloginError
            );
            // Clear zlogin flags on polling failure
            zoneData.zlogin_session = null;
            zoneData.active_zlogin_session = false;
          }

          setZoneDetails(zoneData);
        } else {
          setError(`Failed to fetch details for zone ${zoneName}: ${result.message}`);
          setZoneDetails({});
        }
      } catch (err) {
        console.error('Error fetching zone details:', err);
        setError(`Error fetching zone details for ${zoneName}`);
        setZoneDetails({});
      } finally {
        setLoading(false);
      }
    },
    [makeAgentRequest, loadMonitoringData, initializeSessionFromExisting]
  );

  useEffect(() => {
    if (currentServer && currentZone) {
      loadZoneDetails(currentServer, currentZone);
    } else {
      setZoneDetails({});
      setMonitoringHealth({});
      setNetworkInterfaces([]);
      setStoragePools([]);
      setStorageDatasets([]);
    }
  }, [currentServer, currentZone, loadZoneDetails]);

  return {
    zoneDetails,
    setZoneDetails, // Expose setter for optimistic updates
    monitoringHealth,
    networkInterfaces,
    storagePools,
    storageDatasets,
    loading,
    error,
    reloadZoneDetails: () => loadZoneDetails(currentServer, currentZone),
    loadZoneDetails, // Expose for manual calls with session refresh
  };
};
