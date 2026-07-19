import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useServers } from '../../../contexts/ServerContext';
import { hasFeature } from '../../../utils/capabilities';
import { fetchNetworkData } from '../utils/loaders/networkingDataLoader';

import { buildHostGraph } from './topologyModel';
import { buildVBoxGraph } from './topologyModelVBox';

const STRUCTURE_INTERVAL_MS = 60000;
const USAGE_INTERVAL_MS = 4000;

/**
 * Topology data feed for one or many hosts.
 *
 * Structure (links/vnics/machines) refreshes on a slow interval or arrives
 * preloaded from the page that already fetched it; the usage fast-lane polls
 * `monitoring/network/usage?limit=1` every 10s per monitoring-capable host so
 * live motion stays fresh without re-fetching structure.
 *
 * @param {object} options
 * @param {'host'|'all'} options.scope
 * @param {object|null} [options.preloaded] - structure rows already fetched by
 *   the embedding page for the CURRENT server (skips the structure fetch).
 * @param {Function} [options.reloadPreloaded] - page-owned structure reload.
 * @returns {{hosts: Array, loading: boolean, error: string, refresh: Function, pulse: number}}
 */
export const useTopologyFeed = ({ scope = 'host', preloaded = null, reloadPreloaded = null }) => {
  const { currentServer, getServers, makeAgentRequest } = useServers();
  const [structures, setStructures] = useState(new Map());
  const [usageMaps, setUsageMaps] = useState(new Map());
  const [machineUsageMaps, setMachineUsageMaps] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pulse, setPulse] = useState(0);
  const busyRef = useRef(false);

  const serverKey = server => `${server.hostname}:${server.port}`;

  const targetServers = useMemo(() => {
    if (scope === 'all') {
      return getServers();
    }
    return currentServer ? [currentServer] : [];
  }, [scope, currentServer, getServers]);

  const loadStructures = useCallback(async () => {
    if (busyRef.current || targetServers.length === 0) {
      return;
    }
    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        targetServers.map(async server => {
          const data =
            preloaded && currentServer && serverKey(server) === serverKey(currentServer)
              ? preloaded
              : await fetchNetworkData(server, makeAgentRequest);
          const machineDetails = new Map();
          if (hasFeature(server, 'network-spaces')) {
            const detailResults = await Promise.allSettled(
              (data.zones || [])
                .filter(row => row.name)
                .map(async row => {
                  const result = await makeAgentRequest(
                    server.hostname,
                    server.port,
                    server.protocol,
                    `machines/${encodeURIComponent(row.name)}`
                  );
                  return { name: row.name, detail: result?.data || result };
                })
            );
            detailResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value.detail) {
                machineDetails.set(result.value.name, result.value.detail);
              }
            });
          }
          return { server, data, machineDetails };
        })
      );
      const next = new Map();
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          next.set(serverKey(result.value.server), result.value);
        } else {
          failures.push(targetServers[index].hostname);
        }
      });
      setStructures(next);
      if (failures.length > 0) {
        setError(failures.join(', '));
      }
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, [targetServers, preloaded, currentServer, makeAgentRequest]);

  useEffect(() => {
    loadStructures();
    const interval = setInterval(loadStructures, STRUCTURE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStructures]);

  useEffect(() => {
    let cancelled = false;
    const parseMachineUsage = payload => {
      const rows = payload?.data?.usage || payload?.usage || payload?.data?.machines || [];
      const byMachine = new Map();
      rows.forEach(row => {
        const name = row.machine_name || row.name || row.machine;
        if (!name || !Array.isArray(row.nics)) {
          return;
        }
        const byAdapter = new Map();
        row.nics.forEach(nicRow => {
          byAdapter.set(nicRow.adapter, {
            rxMbps: (parseFloat(nicRow.rx_bps) || 0) / 1000000,
            txMbps: (parseFloat(nicRow.tx_bps) || 0) / 1000000,
            speedMbps: 0,
          });
        });
        byMachine.set(name, byAdapter);
      });
      return byMachine;
    };
    const pollUsage = async () => {
      const capable = targetServers.filter(server => hasFeature(server, 'monitoring'));
      if (capable.length === 0) {
        return;
      }
      const rows = await Promise.allSettled(
        capable.map(async server => {
          const hostUsage = await makeAgentRequest(
            server.hostname,
            server.port,
            server.protocol,
            'monitoring/network/usage?limit=1&per_interface=true'
          );
          const perMachine = hasFeature(server, 'network-spaces')
            ? await makeAgentRequest(
                server.hostname,
                server.port,
                server.protocol,
                'monitoring/machines/usage'
              )
            : null;
          return {
            server,
            usage: hostUsage?.data?.usage || hostUsage?.usage || [],
            machineUsage: perMachine ? parseMachineUsage(perMachine) : null,
          };
        })
      );
      if (cancelled) {
        return;
      }
      setUsageMaps(prev => {
        const next = new Map(prev);
        rows.forEach(result => {
          if (result.status === 'fulfilled') {
            next.set(serverKey(result.value.server), result.value.usage);
          }
        });
        return next;
      });
      setMachineUsageMaps(prev => {
        const next = new Map(prev);
        rows.forEach(result => {
          if (result.status === 'fulfilled' && result.value.machineUsage) {
            next.set(serverKey(result.value.server), result.value.machineUsage);
          }
        });
        return next;
      });
      setPulse(prev => prev + 1);
    };
    pollUsage();
    const interval = setInterval(pollUsage, USAGE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [targetServers, makeAgentRequest]);

  const refresh = useCallback(() => {
    if (reloadPreloaded) {
      reloadPreloaded();
    }
    loadStructures();
  }, [reloadPreloaded, loadStructures]);

  const hosts = useMemo(
    () =>
      [...structures.values()].map(({ server, data, machineDetails }) => {
        const freshUsage = usageMaps.get(serverKey(server));
        const usage = freshUsage && freshUsage.length > 0 ? freshUsage : data.networkUsage || [];
        const graph = hasFeature(server, 'network-spaces')
          ? buildVBoxGraph({
              interfaces: data.networkInterfaces || [],
              spaces: data.networkSpaces || [],
              machines: data.zones || [],
              machineDetails: machineDetails || new Map(),
              usage,
              machineUsage: machineUsageMaps.get(serverKey(server)) || new Map(),
              ipAddresses: data.ipAddresses || [],
            })
          : buildHostGraph({
              interfaces: data.networkInterfaces || [],
              aggregates: data.aggregates || [],
              etherstubs: data.etherstubs || [],
              vnics: data.vnics || [],
              machines: data.zones || [],
              usage,
              ipAddresses: data.ipAddresses || [],
            });
        return { server, graph };
      }),
    [structures, usageMaps, machineUsageMaps]
  );

  return { hosts, loading, error, refresh, pulse };
};

export default useTopologyFeed;
