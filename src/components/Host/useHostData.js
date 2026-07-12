import { useState, useEffect, useCallback, useRef } from 'react';

import { useServers } from '../../contexts/ServerContext';

import {
  updatePoolIOChartData as updatePoolIOChartDataUtil,
  updateARCChartData as updateARCChartDataUtil,
  updateNetworkChartData as updateNetworkChartDataUtil,
  updateCPUChartData as updateCPUChartDataUtil,
  updateCPUCoreChartData as updateCPUCoreChartDataUtil,
  updateMemoryChartData as updateMemoryChartDataUtil,
} from './utils/chartUpdaters';
import {
  loadHistoricalChartData as loadHistoricalChartDataUtil,
  loadRecentChartData as loadRecentChartDataUtil,
  loadHostData as loadHostDataUtil,
} from './utils/dataLoaders';
import { getHistoricalTimestamp, getResolutionLimit } from './utils/hostUtils';

// Session-scoped chart history, keyed per agent. Realtime agents answer one
// live sample per fetch — the points a session accumulates exist ONLY in this
// map, so charts survive route changes (state remounts) and start over on a
// page reload. Entries stay capped by maxDataPoints via the chart updaters.
const hostChartSessions = new Map();

const emptyChartTimestamps = {
  poolIO: null,
  network: null,
  arc: null,
  cpu: null,
  memory: null,
};
const emptyArcChartData = () => ({ sizeData: [], targetData: [], hitRateData: [] });
const emptyCpuChartData = () => ({
  overall: [],
  cores: {},
  load: { '1min': [], '5min': [], '15min': [] },
});
const emptyMemoryChartData = () => ({ used: [], free: [], cached: [], total: [] });

export const useHostData = currentServer => {
  const [serverStats, setServerStats] = useState({});
  const [monitoringHealth, setMonitoringHealth] = useState({});
  const [monitoringStatus, setMonitoringStatus] = useState({});
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [storageSummary, setStorageSummary] = useState({});
  const [taskStats, setTaskStats] = useState({});
  const [diskIOStats, setDiskIOStats] = useState([]);
  const [arcStats, setArcStats] = useState([]);
  const [networkUsage, setNetworkUsage] = useState([]);
  const [cpuStats, setCpuStats] = useState([]);
  const [cpuCoreStats] = useState({});
  const [memoryStats, setMemoryStats] = useState([]);
  const [swapSummaryData, setSwapSummaryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [chartData, setChartData] = useState({});
  const [arcChartData, setArcChartData] = useState(emptyArcChartData);
  const [networkChartData, setNetworkChartData] = useState({});
  const [cpuChartData, setCpuChartData] = useState(emptyCpuChartData);
  const [memoryChartData, setMemoryChartData] = useState(emptyMemoryChartData);
  const [timeWindow, setTimeWindow] = useState('15min');
  const [resolution, setResolution] = useState('high');
  const [maxDataPoints, setMaxDataPoints] = useState(180);

  // Track initial loading to prevent duplicate historical calls and auto-refresh overlap
  const initialLoadDone = useRef(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // In-flight guard for loadHostData. Kept in a ref (not the `loading` state) so the
  // loadHostData callback identity stays stable. If the guard lived in `loading`, every
  // fetch toggling that state would give loadHostData a new identity, re-fire the data
  // load effect, and poll in a tight loop instead of honoring refreshInterval.
  const isLoadingRef = useRef(false);

  // Track latest timestamps for incremental chart updates
  const [lastChartTimestamps, setLastChartTimestamps] = useState(emptyChartTimestamps);

  // Which agent the chart states currently belong to — the session cache's key.
  const chartSessionKeyRef = useRef(null);

  const {
    makeAgentRequest,
    getMonitoringHealth,
    getMonitoringStatus,
    getStoragePools,
    getStorageDatasets,
  } = useServers();

  // CPU usage for the Resource Utilization row, computed from /stats `cpus`
  // cumulative times (both agents emit the os.cpus() shape — sync entry
  // 2026-07-05; load averages don't exist on Windows, so loadavg can't drive
  // this row). A percentage needs a DELTA between two samples: the first
  // sample only baselines, and a one-shot 3s /stats re-poll follows it so the
  // row shows a real number seconds after load instead of waiting out a full
  // refresh interval.
  const [cpuUsagePct, setCpuUsagePct] = useState(null);
  const prevCpuSampleRef = useRef(null); // { hostname, idle, total }
  const cpuResampleTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (cpuResampleTimerRef.current) {
        clearTimeout(cpuResampleTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const cpus = serverStats?.cpus;
    const hostname = currentServer?.hostname;
    if (!Array.isArray(cpus) || cpus.length === 0 || !hostname) {
      return;
    }

    // Only the wall-time buckets count: on illumos, os.cpus()' `irq` value is
    // interrupt accounting that OVERLAPS the real buckets (user+nice+sys+idle
    // alone already sums to uptime there), so summing every key inflated busy
    // ~15x (34% shown on a 2%-busy host). Explicit keys, never Object.values.
    let idle = 0;
    let total = 0;
    cpus.forEach(cpu => {
      const times = cpu.times || {};
      const busy = (times.user || 0) + (times.nice || 0) + (times.sys || 0);
      idle += times.idle || 0;
      total += busy + (times.idle || 0);
    });

    const prev = prevCpuSampleRef.current;
    if (prev && prev.hostname === hostname && total > prev.total && idle >= prev.idle) {
      const totalDelta = total - prev.total;
      const busyPct = ((totalDelta - (idle - prev.idle)) / totalDelta) * 100;
      setCpuUsagePct(Math.min(100, Math.max(0, busyPct)));
    } else if (!prev || prev.hostname !== hostname) {
      // New host (or very first sample): baseline now, quick-resample for the delta.
      setCpuUsagePct(null);
      if (cpuResampleTimerRef.current) {
        clearTimeout(cpuResampleTimerRef.current);
      }
      cpuResampleTimerRef.current = setTimeout(async () => {
        const result = await makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'stats'
        );
        if (result.success) {
          setServerStats(result.data);
        }
      }, 3000);
    }
    // A same-host non-increasing counter (agent restart) falls through to a
    // silent rebaseline below.
    prevCpuSampleRef.current = { hostname, idle, total };
  }, [serverStats, currentServer, makeAgentRequest]);

  // Wrapper functions for chart updaters that use state setters
  const updatePoolIOChartData = useCallback(
    poolIOData => {
      setChartData(prevData => updatePoolIOChartDataUtil(prevData, poolIOData, maxDataPoints));
    },
    [maxDataPoints]
  );

  const updateARCChartData = useCallback(
    arcData => {
      setArcChartData(prevData => updateARCChartDataUtil(prevData, arcData, maxDataPoints));
    },
    [maxDataPoints]
  );

  const updateNetworkChartData = useCallback(
    networkUsageData => {
      setNetworkChartData(prevData =>
        updateNetworkChartDataUtil(prevData, networkUsageData, maxDataPoints)
      );
    },
    [maxDataPoints]
  );

  const updateCPUChartData = useCallback(
    cpuData => {
      setCpuChartData(prevData => updateCPUChartDataUtil(prevData, cpuData, maxDataPoints));
    },
    [maxDataPoints]
  );

  const updateCPUCoreChartData = useCallback(
    cpuData => {
      setCpuChartData(prevData => updateCPUCoreChartDataUtil(prevData, cpuData, maxDataPoints));
    },
    [maxDataPoints]
  );

  const updateMemoryChartData = useCallback(
    memoryData => {
      setMemoryChartData(prevData =>
        updateMemoryChartDataUtil(prevData, memoryData, maxDataPoints)
      );
    },
    [maxDataPoints]
  );

  // Wrapper for loadHistoricalChartData
  const loadHistoricalChartData = useCallback(async () => {
    await loadHistoricalChartDataUtil({
      currentServer,
      makeAgentRequest,
      timeWindow,
      resolution,
      setNetworkChartData,
      setNetworkUsage,
      setChartData,
      setDiskIOStats,
      setArcChartData,
      setArcStats,
      setCpuChartData,
      setCpuStats,
      setMemoryChartData,
      setMemoryStats,
      setLastChartTimestamps,
      getHistoricalTimestamp,
      getResolutionLimit,
      updateNetworkChartData,
      updatePoolIOChartData,
      updateARCChartData,
      updateCPUChartData,
      updateCPUCoreChartData,
      updateMemoryChartData,
    });
  }, [
    currentServer,
    makeAgentRequest,
    timeWindow,
    resolution,
    updateNetworkChartData,
    updatePoolIOChartData,
    updateARCChartData,
    updateCPUChartData,
    updateCPUCoreChartData,
    updateMemoryChartData,
  ]);

  // Wrapper for loadRecentChartData
  const loadRecentChartData = useCallback(async () => {
    await loadRecentChartDataUtil({
      currentServer,
      makeAgentRequest,
      lastChartTimestamps,
      resolution,
      updateNetworkChartData,
      updatePoolIOChartData,
      updateARCChartData,
      updateCPUChartData,
      updateCPUCoreChartData,
      updateMemoryChartData,
      setLastChartTimestamps,
      loadHistoricalChartDataFn: loadHistoricalChartData,
      getResolutionLimit,
    });
  }, [
    currentServer,
    makeAgentRequest,
    lastChartTimestamps,
    resolution,
    updateNetworkChartData,
    updatePoolIOChartData,
    updateARCChartData,
    updateCPUChartData,
    updateCPUCoreChartData,
    updateMemoryChartData,
    loadHistoricalChartData,
  ]);

  // Wrapper for loadHostData
  const loadHostData = useCallback(
    async server => {
      await loadHostDataUtil({
        server,
        isLoadingRef,
        makeAgentRequest,
        getMonitoringHealth,
        getMonitoringStatus,
        getStoragePools,
        getStorageDatasets,
        setLoading,
        setError,
        setServerStats,
        setMonitoringHealth,
        setMonitoringStatus,
        setNetworkInterfaces,
        setStorageSummary,
        setTaskStats,
        setSwapSummaryData,
      });
    },
    [
      makeAgentRequest,
      getMonitoringHealth,
      getMonitoringStatus,
      getStoragePools,
      getStorageDatasets,
    ]
  );

  // Load data when server changes - sequential loading pattern
  useEffect(() => {
    console.log('🔍 HOST: Server changed effect triggered', {
      currentServer: currentServer?.hostname,
      hasRequest: !!makeAgentRequest,
    });

    if (currentServer && makeAgentRequest) {
      // Re-seed chart state from the session cache when the agent changes (or
      // the hook remounts), so realtime charts pick their history back up
      // instead of starting over — and never mix points across agents.
      const sessionKey = `${currentServer.hostname}:${currentServer.port}`;
      if (chartSessionKeyRef.current !== sessionKey) {
        chartSessionKeyRef.current = sessionKey;
        const cached = hostChartSessions.get(sessionKey);
        setChartData(cached ? cached.chartData : {});
        setArcChartData(cached ? cached.arcChartData : emptyArcChartData());
        setNetworkChartData(cached ? cached.networkChartData : {});
        setCpuChartData(cached ? cached.cpuChartData : emptyCpuChartData());
        setMemoryChartData(cached ? cached.memoryChartData : emptyMemoryChartData());
        setLastChartTimestamps(cached ? cached.lastChartTimestamps : emptyChartTimestamps);
      }

      // Load historical chart data first to establish chart foundation
      loadHistoricalChartData();

      // Load main host data
      loadHostData(currentServer).then(() => {
        setInitialDataLoaded(true);
        initialLoadDone.current = true;
        console.log('🔍 HOST: Initial data loading completed - preventing duplicate calls');
      });
    }
  }, [currentServer, makeAgentRequest, loadHistoricalChartData, loadHostData]);

  // Mirror chart state into the session cache on every change.
  useEffect(() => {
    if (!chartSessionKeyRef.current) {
      return;
    }
    hostChartSessions.set(chartSessionKeyRef.current, {
      chartData,
      arcChartData,
      networkChartData,
      cpuChartData,
      memoryChartData,
      lastChartTimestamps,
    });
  }, [
    chartData,
    arcChartData,
    networkChartData,
    cpuChartData,
    memoryChartData,
    lastChartTimestamps,
  ]);

  // Load historical chart data when time window or resolution changes
  useEffect(() => {
    if (currentServer && makeAgentRequest && initialLoadDone.current) {
      console.log(
        '📊 HISTORICAL CHARTS: Time window or resolution changed, loading historical data'
      );
      // Reset timestamps when time window or resolution changes
      setLastChartTimestamps(emptyChartTimestamps);
      loadHistoricalChartData();
    } else if (!initialLoadDone.current) {
      console.log('📊 HISTORICAL CHARTS: Skipping settings change during initial load');
    }
  }, [timeWindow, resolution, currentServer, makeAgentRequest, loadHistoricalChartData]);

  // Combined refresh function for both auto-refresh and manual refresh
  const refreshAllData = useCallback(
    async (server = currentServer) => {
      if (!server) {
        return;
      }

      console.log('🔄 REFRESH: Starting combined refresh for host data and charts');

      // Run both in parallel
      await Promise.all([loadHostData(server), loadRecentChartData()]);

      console.log('🔄 REFRESH: Completed combined refresh');
    },
    [currentServer, loadHostData, loadRecentChartData]
  );

  // Auto-refresh effect - wait for initial data to load before starting
  useEffect(() => {
    if (!refreshInterval || refreshInterval === 0 || !currentServer || !initialDataLoaded) {
      if (!initialDataLoaded) {
        console.log('🔄 HOST: Auto-refresh waiting for initial data load to complete');
      }
      return undefined;
    }

    console.log('🔄 HOST: Setting up auto-refresh every', refreshInterval, 'seconds');
    const interval = setInterval(() => {
      console.log('🔄 HOST: Auto-refreshing host data and charts...');
      refreshAllData(currentServer);
    }, refreshInterval * 1000);

    return () => {
      console.log('🔄 HOST: Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
  }, [refreshInterval, currentServer, initialDataLoaded, refreshAllData]);

  return {
    serverStats,
    cpuUsagePct,
    monitoringHealth,
    monitoringStatus,
    networkInterfaces,
    storageSummary,
    taskStats,
    diskIOStats,
    arcStats,
    networkUsage,
    cpuStats,
    cpuCoreStats,
    memoryStats,
    swapSummaryData,
    loading,
    error,
    refreshInterval,
    setRefreshInterval,
    autoRefresh,
    setAutoRefresh,
    chartData,
    arcChartData,
    networkChartData,
    cpuChartData,
    memoryChartData,
    timeWindow,
    setTimeWindow,
    resolution,
    setResolution,
    maxDataPoints,
    setMaxDataPoints,
    loadHostData,
    refreshAllData,
  };
};
