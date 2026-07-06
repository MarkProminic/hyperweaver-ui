import { useState, useEffect, useRef, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useServers } from '../../contexts/ServerContext';
import { hasFeature } from '../../utils/capabilities';

import { fetchNetworkData } from './utils/loaders/networkingDataLoader';
import { fetchHistoricalNetworkData } from './utils/loaders/networkingHistoricalLoader';

export const useHostNetworkingData = () => {
  console.log('🐛 DEBUG: useHostNetworkingData hook starting - Enhanced for topology');

  // Network data state
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [networkUsage, setNetworkUsage] = useState([]);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Topology data state
  const [aggregates, setAggregates] = useState([]);
  const [etherstubs, setEtherstubs] = useState([]);
  const [vnics, setVnics] = useState([]);
  const [zones, setZones] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300); // seconds

  // Chart data state
  const [chartData, setChartData] = useState({});
  const [timeWindow, setTimeWindow] = useState('15min');
  const [resolution, setResolution] = useState('high'); // 'realtime', 'high', 'medium', 'low'
  const [chartSortBy, setChartSortBy] = useState('bandwidth');
  const [expandedChart, setExpandedChart] = useState(null);
  const [expandedChartType, setExpandedChartType] = useState(null);
  const [interfaceSort, setInterfaceSort] = useState([{ column: 'link', direction: 'asc' }]);
  const [bandwidthSort, setBandwidthSort] = useState([{ column: 'totalMbps', direction: 'desc' }]);

  // Chart refs
  const chartRefs = useRef({});
  const summaryChartRefs = useRef({});

  // Track initial loading to prevent duplicate historical calls
  const initialLoadDone = useRef(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [lastChartTimestamp, setLastChartTimestamp] = useState(null);

  // Helper to get resolution limit for API requests (per interface)
  const getResolutionLimit = res => ({ realtime: 125, high: 38, medium: 13, low: 5 })[res] || 13;

  // Authentication
  const { user } = useAuth();

  // Server context
  const { currentServer, makeAgentRequest } = useServers();

  // Simplified section state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    topology: false,
    ipAddresses: false,
    routingTable: false,
    interfaces: false,
    bandwidth: false,
    summary: false,
    charts: false,
  });

  // Load historical chart data for the selected time window and resolution
  const loadHistoricalChartData = useCallback(async () => {
    if (!currentServer || !makeAgentRequest) {
      return;
    }

    try {
      const newChartData = await fetchHistoricalNetworkData(
        currentServer,
        makeAgentRequest,
        timeWindow,
        resolution
      );
      setChartData(newChartData);

      // Find the latest timestamp from the loaded historical data
      let latestTimestamp = null;
      Object.values(newChartData).forEach(ifaceData => {
        if (ifaceData.totalData?.length > 0) {
          const [lastPointTime] = ifaceData.totalData[ifaceData.totalData.length - 1];
          if (latestTimestamp === null || lastPointTime > latestTimestamp) {
            latestTimestamp = lastPointTime;
          }
        }
      });

      if (latestTimestamp) {
        const newTimestamp = new Date(latestTimestamp).toISOString();
        setLastChartTimestamp(newTimestamp);
        console.log('📊 HISTORICAL CHARTS: Set last timestamp to:', newTimestamp);
      }
    } catch (err) {
      console.error('📊 HISTORICAL CHARTS: Error loading historical data:', err);
    }
  }, [currentServer, makeAgentRequest, timeWindow, resolution]);

  const loadNetworkData = useCallback(async () => {
    if (!currentServer) {
      return;
    }

    try {
      const data = await fetchNetworkData(currentServer, makeAgentRequest);

      setNetworkInterfaces(data.networkInterfaces);
      setNetworkUsage(data.networkUsage);
      setIpAddresses(data.ipAddresses);
      setRoutes(data.routes);
      setAggregates(data.aggregates);
      setEtherstubs(data.etherstubs);
      setVnics(data.vnics);
      setZones(data.zones);

      console.log('🔍 NETWORKING: Topology and current state data loaded');
    } catch (err) {
      console.error('💥 NETWORKING: Error loading topology data:', err);
      setError(`Error loading topology data: ${err.message}`);
    }
  }, [currentServer, makeAgentRequest]);

  // This is a new function to handle the real-time chart updates.
  const loadRecentNetworkData = useCallback(async () => {
    // The usage refresh is /monitoring/* — token-gated (sync OPEN ITEM 4b).
    if (!currentServer || loading || !hasFeature(currentServer, 'monitoring')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (!lastChartTimestamp) {
        console.warn('🔄 RECENT CHARTS: No last timestamp available, skipping recent data load.');
        setLoading(false);
        return;
      }

      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/network/usage?since=${encodeURIComponent(lastChartTimestamp)}&limit=${getResolutionLimit(resolution)}&per_interface=true`
      );

      if (result.success && result.data?.usage?.length > 0) {
        const recentUsage = result.data.usage;
        console.log(`🔄 RECENT CHARTS: Fetched ${recentUsage.length} new usage records.`);

        // Append new data to charts
        setChartData(prevData => {
          const newChartData = { ...prevData };
          recentUsage.forEach(usage => {
            const iface = usage.link;
            if (newChartData[iface]) {
              const timestamp = new Date(usage.scan_timestamp).getTime();
              const rxMbps = parseFloat(usage.rx_mbps) || 0;
              const txMbps = parseFloat(usage.tx_mbps) || 0;
              newChartData[iface].rxData.push([timestamp, rxMbps]);
              newChartData[iface].txData.push([timestamp, txMbps]);
              newChartData[iface].totalData.push([timestamp, rxMbps + txMbps]);
            }
          });
          return newChartData;
        });

        // Update the last timestamp
        const latestRecord = recentUsage.reduce((latest, current) =>
          new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
        );
        setLastChartTimestamp(latestRecord.scan_timestamp);
      }
    } catch (err) {
      console.error('💥 RECENT CHARTS: Error loading recent network data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentServer, loading, makeAgentRequest, lastChartTimestamp, resolution]);

  // Load data when server changes
  useEffect(() => {
    console.log('🔍 NETWORKING: Server changed effect triggered', {
      currentServer: currentServer?.hostname,
      hasRequest: !!makeAgentRequest,
    });
    if (currentServer && makeAgentRequest) {
      loadHistoricalChartData(); // Load historical data first to establish chart foundation
      loadNetworkData().then(() => {
        setInitialDataLoaded(true); // Mark initial data load as completed
        initialLoadDone.current = true; // Mark initial load as completed AFTER completion
        console.log(
          '🔍 NETWORKING: Initial data loading completed - preventing duplicate historical calls'
        );
      });
    }
  }, [currentServer, makeAgentRequest, loadHistoricalChartData, loadNetworkData]);

  // Auto-refresh effect - wait for initial data to load before starting
  useEffect(() => {
    let interval = null;

    if (autoRefresh && currentServer && initialDataLoaded) {
      console.log('🔄 NETWORKING: Setting up auto-refresh every', refreshInterval, 'seconds');
      interval = setInterval(() => {
        console.log('🔄 NETWORKING: Auto-refreshing topology and recent chart data...');
        Promise.all([loadNetworkData(), loadRecentNetworkData()]);
      }, refreshInterval * 1000);
    } else if (!initialDataLoaded) {
      console.log('🔄 NETWORKING: Auto-refresh waiting for initial data load to complete');
    }

    return () => {
      if (interval) {
        console.log('🔄 NETWORKING: Cleaning up auto-refresh interval');
        clearInterval(interval);
      }
    };
  }, [
    autoRefresh,
    refreshInterval,
    currentServer,
    initialDataLoaded,
    loadNetworkData,
    loadRecentNetworkData,
  ]);

  const toggleSection = section => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Load historical chart data when time window or resolution changes (but not during initial load)
  useEffect(() => {
    if (currentServer && makeAgentRequest && initialLoadDone.current) {
      console.log(
        '📊 HISTORICAL CHARTS: Time window or resolution changed, loading historical data'
      );
      // Reset timestamp to force a full historical reload
      setLastChartTimestamp(null);
      console.log('📊 HISTORICAL CHARTS: Resetting last timestamp for full reload.');
      loadHistoricalChartData();
    } else if (!initialLoadDone.current) {
      console.log('📊 HISTORICAL CHARTS: Skipping settings change during initial load');
    }
  }, [timeWindow, resolution, currentServer, makeAgentRequest, loadHistoricalChartData]);

  // Note: networkUsage is now only for react-flow topology animations (current values)
  // Chart data comes from loadHistoricalChartData() with time-based sampling

  // Chart functionality
  const expandChart = (chartId, type) => {
    setExpandedChart(chartId);
    setExpandedChartType(type);
  };

  const closeExpandedChart = () => {
    setExpandedChart(null);
    setExpandedChartType(null);
  };

  const getSortedChartEntries = () => {
    const entries = Object.entries(chartData);

    switch (chartSortBy) {
      case 'name':
        return entries.sort(([a], [b]) => a.localeCompare(b));
      case 'rx':
        return entries.sort(([, a], [, b]) => {
          const aRx = a.rxData[a.rxData.length - 1]?.[1] || 0;
          const bRx = b.rxData[b.rxData.length - 1]?.[1] || 0;
          return bRx - aRx;
        });
      case 'tx':
        return entries.sort(([, a], [, b]) => {
          const aTx = a.txData[a.txData.length - 1]?.[1] || 0;
          const bTx = b.txData[b.txData.length - 1]?.[1] || 0;
          return bTx - aTx;
        });
      case 'bandwidth':
      default:
        return entries.sort(([, a], [, b]) => {
          const aTotal = a.totalData[a.totalData.length - 1]?.[1] || 0;
          const bTotal = b.totalData[b.totalData.length - 1]?.[1] || 0;
          return bTotal - aTotal;
        });
    }
  };

  // Sorting functions
  const handleInterfaceSort = column => {
    setInterfaceSort(prev => {
      const existing = prev.find(s => s.column === column);
      if (existing) {
        return prev.map(s =>
          s.column === column ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' } : s
        );
      }
      return [{ column, direction: 'asc' }];
    });
  };

  const handleBandwidthSort = column => {
    setBandwidthSort(prev => {
      const existing = prev.find(s => s.column === column);
      if (existing) {
        return prev.map(s =>
          s.column === column ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' } : s
        );
      }
      return [{ column, direction: 'desc' }];
    });
  };

  const resetInterfaceSort = () => {
    setInterfaceSort([{ column: 'link', direction: 'asc' }]);
  };

  const resetBandwidthSort = () => {
    setBandwidthSort([{ column: 'totalMbps', direction: 'desc' }]);
  };

  const getSortedInterfaces = () => {
    const sorted = [...networkInterfaces];

    interfaceSort.forEach(sort => {
      sorted.sort((a, b) => {
        const aVal = a[sort.column] || '';
        const bVal = b[sort.column] || '';

        if (sort.direction === 'asc') {
          return aVal.toString().localeCompare(bVal.toString());
        }
        return bVal.toString().localeCompare(aVal.toString());
      });
    });

    return sorted;
  };

  const getSortedBandwidthUsage = () => {
    const sorted = [...networkUsage];

    bandwidthSort.forEach(sort => {
      sorted.sort((a, b) => {
        let aVal;
        let bVal;

        // Handle calculated total bandwidth
        if (sort.column === 'totalMbps') {
          aVal = (parseFloat(a.rx_mbps) || 0) + (parseFloat(a.tx_mbps) || 0);
          bVal = (parseFloat(b.rx_mbps) || 0) + (parseFloat(b.tx_mbps) || 0);
        } else {
          aVal = parseFloat(a[sort.column]) || 0;
          bVal = parseFloat(b[sort.column]) || 0;
        }

        if (sort.direction === 'asc') {
          return aVal - bVal;
        }
        return bVal - aVal;
      });
    });

    return sorted;
  };

  const getSortIcon = (currentSortArray, column) => {
    // Ensure we always have a valid array
    if (!Array.isArray(currentSortArray)) {
      return 'fa-sort';
    }
    const sort = currentSortArray.find(s => s.column === column);
    if (!sort) {
      return 'fa-sort';
    }
    return sort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  };

  console.log('🐛 DEBUG: Returning enhanced hook interface with topology data');

  return {
    networkInterfaces,
    networkUsage,
    ipAddresses,
    routes,
    // Topology data
    aggregates,
    etherstubs,
    vnics,
    zones,
    loading,
    error,
    selectedServer: currentServer,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    sectionsCollapsed,
    toggleSection,
    chartData,
    timeWindow,
    setTimeWindow,
    resolution,
    setResolution,
    chartRefs,
    summaryChartRefs,
    interfaceSort,
    handleInterfaceSort,
    bandwidthSort,
    handleBandwidthSort,
    resetInterfaceSort,
    resetBandwidthSort,
    getSortedInterfaces,
    getSortedBandwidthUsage,
    getSortIcon: (currentSortArray, column) =>
      getSortIcon(currentSortArray || interfaceSort, column),
    expandedChart,
    expandedChartType,
    expandChart,
    closeExpandedChart,
    chartSortBy,
    setChartSortBy,
    getSortedChartEntries,
    user,
    getServers: () => (currentServer ? [currentServer] : []),
    servers: currentServer ? [currentServer] : [], // Added for useMemo dependency
    loadNetworkData,
    loadHistoricalChartData,
  };
};
