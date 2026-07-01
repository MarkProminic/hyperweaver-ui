import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../../contexts/ServerContext';

export const useNetworkTopologyData = selectedServer => {
  const [topologyData, setTopologyData] = useState({
    aggregates: [],
    etherstubs: [],
    vnics: [],
    zones: [],
    bridges: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  const loadTopologyData = useCallback(async () => {
    if (!selectedServer || loading) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🔍 TOPOLOGY: Loading topology data for', selectedServer.hostname);

      // Load all topology components in parallel
      const [aggregatesResult, etherstubsResult, vnicsResult, zonesResult, bridgesResult] =
        await Promise.allSettled([
          makeAgentRequest(
            selectedServer.hostname,
            selectedServer.port,
            selectedServer.protocol,
            'network/aggregates'
          ),
          makeAgentRequest(
            selectedServer.hostname,
            selectedServer.port,
            selectedServer.protocol,
            'network/etherstubs'
          ),
          makeAgentRequest(
            selectedServer.hostname,
            selectedServer.port,
            selectedServer.protocol,
            'network/vnics'
          ),
          makeAgentRequest(
            selectedServer.hostname,
            selectedServer.port,
            selectedServer.protocol,
            'zones'
          ),
          makeAgentRequest(
            selectedServer.hostname,
            selectedServer.port,
            selectedServer.protocol,
            'network/bridges'
          ),
        ]);

      const newTopologyData = {
        aggregates: [],
        etherstubs: [],
        vnics: [],
        zones: [],
        bridges: [],
      };

      // Process aggregates
      if (aggregatesResult.status === 'fulfilled' && aggregatesResult.value.success) {
        const aggregates = aggregatesResult.value.data?.aggregates || [];
        newTopologyData.aggregates = aggregates.filter(aggr => aggr.link && aggr.link !== 'LINK');
        console.log('🔍 TOPOLOGY: Loaded', newTopologyData.aggregates.length, 'aggregates');
      }

      // Process etherstubs
      if (etherstubsResult.status === 'fulfilled' && etherstubsResult.value.success) {
        const etherstubs = etherstubsResult.value.data?.etherstubs || [];
        newTopologyData.etherstubs = etherstubs.filter(stub => stub.link && stub.link !== 'LINK');
        console.log('🔍 TOPOLOGY: Loaded', newTopologyData.etherstubs.length, 'etherstubs');
      }

      // Process VNICs
      if (vnicsResult.status === 'fulfilled' && vnicsResult.value.success) {
        const vnics = vnicsResult.value.data?.vnics || [];
        newTopologyData.vnics = vnics.filter(vnic => vnic.link && vnic.link !== 'LINK');
        console.log('🔍 TOPOLOGY: Loaded', newTopologyData.vnics.length, 'vnics');
      }

      // Process zones
      if (zonesResult.status === 'fulfilled' && zonesResult.value.success) {
        const zones = zonesResult.value.data?.zones || [];
        newTopologyData.zones = zones.filter(zone => zone.name || zone.zonename);
        console.log('🔍 TOPOLOGY: Loaded', newTopologyData.zones.length, 'zones');
      }

      // Process bridges
      if (bridgesResult.status === 'fulfilled' && bridgesResult.value.success) {
        const bridges = bridgesResult.value.data?.bridges || [];
        newTopologyData.bridges = bridges.filter(bridge => bridge.link && bridge.link !== 'LINK');
        console.log('🔍 TOPOLOGY: Loaded', newTopologyData.bridges.length, 'bridges');
      }

      setTopologyData(newTopologyData);
      console.log('🔍 TOPOLOGY: Complete topology data loaded:', newTopologyData);
    } catch (err) {
      console.error('💥 TOPOLOGY: Error loading topology data:', err);
      setError(`Error loading network topology data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedServer, makeAgentRequest, loading]);

  useEffect(() => {
    if (selectedServer && makeAgentRequest) {
      loadTopologyData();
    }
  }, [selectedServer, makeAgentRequest, loadTopologyData]);

  return {
    ...topologyData,
    loading,
    error,
    reload: loadTopologyData,
  };
};
