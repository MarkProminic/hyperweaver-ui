import { useState, useCallback } from 'react';

import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';

/**
 * Custom hook to manage all zlogin session state and logic for a machine.
 * @param {object} currentServer - The currently selected server object.
 * @param {string} currentMachine - The name of the currently selected machine.
 * @param {function} setMachineDetails - The state setter function for the parent component's details.
 * @returns {object} An object containing all zlogin-related state and handler functions.
 */
export const useZloginSession = (currentServer, currentMachine, setMachineDetails) => {
  const [showZloginConsole, setShowZloginConsole] = useState(false);
  const [isZloginFullScreen, setIsZloginFullScreen] = useState(false);

  const { makeAgentRequest, startZloginSession } = useServers();
  const { initializeSessionFromExisting, pasteTextToZone } = useZoneTerminal();

  const handleZloginConsole = useCallback(
    async machineName => {
      if (!currentServer) {
        return { success: false, message: 'No server selected.' };
      }
      try {
        const result = await startZloginSession(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          machineName
        );
        if (result.success) {
          setMachineDetails(prev => ({
            ...prev,
            zlogin_session: result.session,
          }));
          setShowZloginConsole(true);
          return { success: true };
        }
        return {
          success: false,
          message: `Failed to start zlogin console: ${result.message}`,
        };
      } catch (error) {
        console.error('ZLOGIN CONSOLE: Error starting:', error);
        return { success: false, message: 'Error starting zlogin console.' };
      }
    },
    [currentServer, startZloginSession, setMachineDetails]
  );

  const refreshZloginSessionStatus = useCallback(
    async machineName => {
      if (!currentServer) {
        return;
      }
      try {
        console.log(`🔍 ZLOGIN STATUS: Checking session status for zone: ${machineName}`);

        const sessionsResult = await makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          `zlogin/sessions?_t=${Date.now()}`,
          'GET',
          null,
          null,
          true
        );

        console.log(`🔍 ZLOGIN STATUS: Sessions API response:`, {
          success: sessionsResult.success,
          status: sessionsResult.status,
          data: sessionsResult.data,
        });

        if (sessionsResult.success && sessionsResult.data) {
          // Find active session for this zone
          const activeSessions = Array.isArray(sessionsResult.data)
            ? sessionsResult.data
            : sessionsResult.data.sessions || [];

          const activeMachineSession = activeSessions.find(
            session => session.machine_name === machineName && session.status === 'active'
          );

          if (activeMachineSession) {
            console.log(
              `✅ ZLOGIN STATUS: Active session found for ${machineName}:`,
              activeMachineSession.id
            );

            // Initialize context state for existing session
            if (currentServer) {
              initializeSessionFromExisting(currentServer, machineName, activeMachineSession);
            }

            setMachineDetails(prev => {
              console.log(`🔍 ZONE STATE: ZLOGIN update - BEFORE:`, {
                hasVncSession: !!prev.active_vnc_session,
                hasVncSessionInfo: !!prev.vnc_session_info,
                timestamp: Date.now(),
              });

              // 🛡️ DEFENSIVE STATE MERGE: Only update zlogin fields, explicitly preserve VNC state
              const newState = {
                ...prev,
                zlogin_session: activeMachineSession,
                active_zlogin_session: true,
                // CRITICAL: Explicitly preserve VNC session state to prevent overwrites
                active_vnc_session: prev.active_vnc_session || false,
                vnc_session_info: prev.vnc_session_info || null,
              };

              console.log(`🔍 ZONE STATE: ZLOGIN update - AFTER:`, {
                hasVncSession: !!newState.active_vnc_session,
                hasVncSessionInfo: !!newState.vnc_session_info,
                timestamp: Date.now(),
              });

              return newState;
            });
          } else {
            console.log(`❌ ZLOGIN STATUS: No active session for ${machineName}`);
            setMachineDetails(prev => {
              console.log(`🔍 ZONE STATE: ZLOGIN clear - BEFORE:`, {
                hasVncSession: !!prev.active_vnc_session,
                hasVncSessionInfo: !!prev.vnc_session_info,
                timestamp: Date.now(),
              });

              // 🛡️ DEFENSIVE STATE MERGE: Only clear zlogin fields, explicitly preserve VNC state
              const newState = {
                ...prev,
                zlogin_session: null,
                active_zlogin_session: false,
                // CRITICAL: Explicitly preserve VNC session state to prevent overwrites
                active_vnc_session: prev.active_vnc_session || false,
                vnc_session_info: prev.vnc_session_info || null,
              };

              console.log(`🔍 ZONE STATE: ZLOGIN clear - AFTER:`, {
                hasVncSession: !!newState.active_vnc_session,
                hasVncSessionInfo: !!newState.vnc_session_info,
                timestamp: Date.now(),
              });

              return newState;
            });
          }
        } else {
          // No sessions or API error
          console.log(`❌ ZLOGIN STATUS: No sessions found or API error for ${machineName}`);
          setMachineDetails(prev => {
            // 🛡️ DEFENSIVE STATE MERGE: Only clear zlogin fields, explicitly preserve VNC state
            const newState = {
              ...prev,
              zlogin_session: null,
              active_zlogin_session: false,
              // CRITICAL: Explicitly preserve VNC session state to prevent overwrites
              active_vnc_session: prev.active_vnc_session || false,
              vnc_session_info: prev.vnc_session_info || null,
            };
            return newState;
          });
        }
      } catch (error) {
        console.error('💥 ZLOGIN STATUS: Error checking session status:', error);
        setMachineDetails(prev => {
          // 🛡️ DEFENSIVE STATE MERGE: Only clear zlogin fields, explicitly preserve VNC state
          const newState = {
            ...prev,
            zlogin_session: null,
            active_zlogin_session: false,
            // CRITICAL: Explicitly preserve VNC session state to prevent overwrites
            active_vnc_session: prev.active_vnc_session || false,
            vnc_session_info: prev.vnc_session_info || null,
          };
          return newState;
        });
      }
    },
    [currentServer, makeAgentRequest, setMachineDetails, initializeSessionFromExisting]
  );

  const handleZloginPreviewPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && currentServer && currentMachine) {
          await pasteTextToZone(currentServer, currentMachine, text);
        }
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
    }
  };

  const handleZloginModalPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && currentServer && currentMachine) {
          await pasteTextToZone(currentServer, currentMachine, text);
        }
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
    }
  };

  return {
    showZloginConsole,
    setShowZloginConsole,
    isZloginFullScreen,
    setIsZloginFullScreen,
    handleZloginConsole,
    refreshZloginSessionStatus,
    handleZloginPreviewPaste,
    handleZloginModalPaste,
  };
};
