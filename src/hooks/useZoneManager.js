import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../contexts/ServerContext';

/**
 * Custom hook to manage fetching and state for the list of all zones on a given server.
 * @param {object} currentServer - The currently selected server object.
 * @returns {object} An object containing zones, runningZones, loading state, error state, and a function to reload zones.
 */
export const useZoneManager = currentServer => {
  const [zones, setZones] = useState([]);
  const [runningZones, setRunningZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  const loadZones = useCallback(
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
          setZones(data.allzones || []);
          setRunningZones(data.runningzones || []);
        } else {
          setError(`Failed to fetch zones for ${server.hostname}: ${result.message}`);
          setZones([]);
          setRunningZones([]);
        }
      } catch (err) {
        console.error('Error fetching zones:', err);
        setError(`Error connecting to ${server.hostname}`);
        setZones([]);
        setRunningZones([]);
      } finally {
        setLoading(false);
      }
    },
    [makeAgentRequest]
  ); // FIXED: Remove loading dependency to prevent re-creation

  useEffect(() => {
    if (currentServer) {
      loadZones(currentServer);
    } else {
      // Clear zones if no server is selected
      setZones([]);
      setRunningZones([]);
    }
  }, [currentServer, loadZones]);

  const getZoneStatus = zoneName => (runningZones.includes(zoneName) ? 'running' : 'stopped');

  return {
    zones,
    runningZones,
    loading,
    error,
    loadZones: () => loadZones(currentServer), // Provide a simplified reload function
    getZoneStatus,
  };
};
