import { useState, useEffect, useCallback } from 'react';

import { useOrgFilter, filterMachineNamesUnderOrg } from '../contexts/OrgFilterContext';
import { useServers } from '../contexts/ServerContext';

/**
 * Custom hook to manage fetching and state for the list of all machines on a given server.
 * Reads the de-zoned `stats` wire keys (allmachines/runningmachines — sync-file ruling).
 * @param {object} currentServer - The currently selected server object.
 * @returns {object} An object containing zones, runningMachines, loading state, error state, and a function to reload zones.
 */
export const useMachineManager = currentServer => {
  const [machines, setMachines] = useState([]);
  const [runningMachines, setRunningMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();
  const { activeOrg } = useOrgFilter();

  const loadMachines = useCallback(
    async server => {
      if (!server) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'stats'
        );

        if (result.success) {
          const { data } = result;
          const visible = await filterMachineNamesUnderOrg(
            makeAgentRequest,
            server,
            data.allmachines || [],
            activeOrg
          );
          setMachines(visible);
          setRunningMachines((data.runningmachines || []).filter(name => visible.includes(name)));
        } else {
          setError(`Failed to fetch machines for ${server.hostname}: ${result.message}`);
          setMachines([]);
          setRunningMachines([]);
        }
      } catch (err) {
        console.error('Error fetching machines:', err);
        setError(`Error connecting to ${server.hostname}`);
        setMachines([]);
        setRunningMachines([]);
      } finally {
        setLoading(false);
      }
    },
    [makeAgentRequest, activeOrg]
  );

  useEffect(() => {
    if (currentServer) {
      loadMachines(currentServer);
    } else {
      // Clear zones if no server is selected
      setMachines([]);
      setRunningMachines([]);
    }
  }, [currentServer, loadMachines]);

  const getMachineStatus = machineName =>
    runningMachines.includes(machineName) ? 'running' : 'stopped';

  return {
    machines,
    runningMachines,
    loading,
    error,
    loadMachines: () => loadMachines(currentServer), // Provide a simplified reload function
    getMachineStatus,
  };
};
