import { useState, useEffect, useCallback, useRef } from 'react';

import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';
import { hasConsole, hasFeature } from '../utils/capabilities';

/**
 * Custom hook to manage fetching and state for the details of a specific machine.
 * Canonical /machines/* paths + de-zoned wire keys (sync-file ruling, 2026-07-05).
 * Console-session auto-polls are capability-gated: VNC on the `vnc` console token,
 * zlogin on the `zlogin` console token — agents without them are never asked.
 * @param {object} currentServer - The currently selected server object.
 * @param {string} currentMachine - The name of the currently selected machine.
 * @returns {object} An object containing machine details, loading state, error state, and a function to reload details.
 */
export const useMachineDetails = (currentServer, currentMachine) => {
  const [machineDetails, setMachineDetails] = useState({});
  const [monitoringHealth, setMonitoringHealth] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest, getMonitoringHealth } = useServers();

  const { initializeSessionFromExisting } = useZoneTerminal();

  // SSH/RDP console sessions live only in client state (no agent-side list to
  // re-detect them from, unlike VNC/zlogin above) — a details reload for the
  // SAME machine must not wipe a live console. Machine switches still reset.
  const lastLoadedRef = useRef(null);

  const loadMonitoringData = useCallback(
    async server => {
      // /monitoring/* is a token-gated surface: agents that don't advertise
      // `monitoring` are never asked — the health badge shows its empty state.
      if (!server || !hasFeature(server, 'monitoring')) {
        return;
      }
      try {
        const healthResult = await getMonitoringHealth(
          server.hostname,
          server.port,
          server.protocol
        );

        if (healthResult.success) {
          setMonitoringHealth(healthResult.data);
        }
      } catch (monitoringErr) {
        console.warn('Error fetching monitoring data:', monitoringErr);
      }
    },
    [getMonitoringHealth]
  );

  const loadMachineDetails = useCallback(
    async (server, machineName, background = false) => {
      if (!server || !machineName) {
        setMachineDetails({});
        return;
      }

      try {
        if (!background) {
          setLoading(true);
          setError('');
        }

        // The detail fetch and the console-session auto-polls (VNC on the
        // `vnc` console token, zlogin on `zlogin`) are independent — ONE
        // parallel fan-out instead of three serial round-trips per select
        // and per 30s poll.
        const skipped = Promise.resolve(null);
        const [detailSettled, vncSettled, zloginSettled] = await Promise.allSettled([
          makeAgentRequest(
            server.hostname,
            server.port,
            server.protocol,
            `machines/${machineName}`
          ),
          hasConsole(server, 'vnc')
            ? makeAgentRequest(
                server.hostname,
                server.port,
                server.protocol,
                `machines/${machineName}/vnc/info?_t=${Date.now()}`,
                'GET',
                null,
                null,
                true
              )
            : skipped,
          hasConsole(server, 'zlogin')
            ? makeAgentRequest(
                server.hostname,
                server.port,
                server.protocol,
                `zlogin/sessions?_t=${Date.now()}`,
                'GET',
                null,
                null,
                true
              )
            : skipped,
        ]);

        const result = detailSettled.status === 'fulfilled' ? detailSettled.value : null;
        if (result?.success) {
          const machineData = { ...result.data };

          // Fire off monitoring data load in the background
          loadMonitoringData(server);

          const vncResult = vncSettled.status === 'fulfilled' ? vncSettled.value : null;
          if (vncResult?.success && vncResult.data?.active_vnc_session) {
            // Use VNC-specific data instead of the basic machine API flag
            machineData.active_vnc_session = vncResult.data.active_vnc_session;
            machineData.vnc_session_info = vncResult.data.vnc_session_info;
          } else {
            // Clear any stale VNC flags from the basic machine API
            machineData.active_vnc_session = false;
            machineData.vnc_session_info = null;
          }

          const zloginResult = zloginSettled.status === 'fulfilled' ? zloginSettled.value : null;
          const activeSessions = (() => {
            if (!zloginResult?.success || !zloginResult.data) {
              return [];
            }
            return Array.isArray(zloginResult.data)
              ? zloginResult.data
              : zloginResult.data.sessions || [];
          })();
          const activeMachineSession = activeSessions.find(
            session => session.machine_name === machineName && session.status === 'active'
          );
          if (activeMachineSession) {
            machineData.zlogin_session = activeMachineSession;
            machineData.active_zlogin_session = true;

            // Initialize ZoneTerminalContext with the existing session
            initializeSessionFromExisting(server, machineName, activeMachineSession);
          } else {
            machineData.zlogin_session = null;
            machineData.active_zlogin_session = false;
          }

          const loadKey = `${server.hostname}:${server.port}:${machineName}`;
          const sameMachine = lastLoadedRef.current === loadKey;
          lastLoadedRef.current = loadKey;
          setMachineDetails(prev =>
            sameMachine
              ? {
                  ...machineData,
                  ssh_session: prev.ssh_session || null,
                  rdp_session: prev.rdp_session || null,
                }
              : machineData
          );
        } else if (background) {
          // A transient failure mid-poll keeps the stale-but-working view —
          // never blank the page or kill live consoles over one bad answer.
          console.warn(
            `Background detail refresh failed for ${machineName}: ${result?.message || 'request failed'}`
          );
        } else {
          setError(
            `Failed to fetch details for ${machineName}: ${result?.message || 'request failed'}`
          );
          setMachineDetails({});
        }
      } catch (err) {
        console.error('Error fetching machine details:', err);
        if (!background) {
          setError(`Error fetching details for ${machineName}`);
          setMachineDetails({});
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [makeAgentRequest, loadMonitoringData, initializeSessionFromExisting]
  );

  useEffect(() => {
    if (currentServer && currentMachine) {
      loadMachineDetails(currentServer, currentMachine);
    } else {
      setMachineDetails({});
      setMonitoringHealth({});
    }
  }, [currentServer, currentMachine, loadMachineDetails]);

  // Machine detail is a POLL surface (no push channel): discovery refreshes
  // guest_info / system_status / knob_current server-side, so the viewed
  // machine refetches on an interval. Same-machine reloads preserve live
  // ssh/rdp sessions; VNC/zlogin re-detect from the agent each pass.
  useEffect(() => {
    if (!currentServer || !currentMachine) {
      return undefined;
    }
    const timer = setInterval(() => {
      loadMachineDetails(currentServer, currentMachine, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [currentServer, currentMachine, loadMachineDetails]);

  return {
    machineDetails,
    setMachineDetails, // Expose setter for optimistic updates
    monitoringHealth,
    loading,
    error,
    reloadMachineDetails: () => loadMachineDetails(currentServer, currentMachine),
    loadMachineDetails, // Expose for manual calls with session refresh
  };
};
