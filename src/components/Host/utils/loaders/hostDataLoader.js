import { hasFeature } from '../../../../utils/capabilities';

/**
 * Helper: Deduplicate pools by name/pool field
 */
const deduplicatePools = pools => {
  const deduplicated = pools.reduce((acc, pool) => {
    const existingPool = acc.find(item => (item.name || item.pool) === (pool.name || pool.pool));
    if (!existingPool) {
      acc.push(pool);
    } else if (
      pool.scan_timestamp &&
      existingPool.scan_timestamp &&
      new Date(pool.scan_timestamp) > new Date(existingPool.scan_timestamp)
    ) {
      const index = acc.indexOf(existingPool);
      acc[index] = pool;
    }
    return acc;
  }, []);
  deduplicated.sort((a, b) => (a.name || a.pool).localeCompare(b.name || b.pool));
  return deduplicated;
};

/**
 * Helper: Deduplicate datasets by name/dataset field
 */
const deduplicateDatasets = datasets => {
  const deduplicated = datasets.reduce((acc, dataset) => {
    const existingDataset = acc.find(
      item => (item.name || item.dataset) === (dataset.name || dataset.dataset)
    );
    if (!existingDataset) {
      acc.push(dataset);
    } else if (
      dataset.scan_timestamp &&
      existingDataset.scan_timestamp &&
      new Date(dataset.scan_timestamp) > new Date(existingDataset.scan_timestamp)
    ) {
      const index = acc.indexOf(existingDataset);
      acc[index] = dataset;
    }
    return acc;
  }, []);
  deduplicated.sort((a, b) => (a.name || a.dataset).localeCompare(b.name || b.dataset));
  return deduplicated;
};

/**
 * Helper: Process storage results (pools and datasets)
 */
const processStorageResults = (poolsResult, datasetsResult) => {
  let deduplicatedPools = [];
  let deduplicatedDatasets = [];

  if (poolsResult.status === 'fulfilled' && poolsResult.value.success) {
    const pools = poolsResult.value.data?.pools || poolsResult.value.data || [];
    deduplicatedPools = deduplicatePools(pools);
  }

  if (datasetsResult.status === 'fulfilled' && datasetsResult.value.success) {
    const datasets = datasetsResult.value.data?.datasets || datasetsResult.value.data || [];
    deduplicatedDatasets = deduplicateDatasets(datasets);
  }

  return {
    pools: deduplicatedPools,
    datasets: deduplicatedDatasets,
  };
};

/**
 * Load main host data (stats, monitoring, network, storage, tasks, swap)
 */
export const loadHostData = async ({
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
}) => {
  if (!server || isLoadingRef?.current) {
    return;
  }

  try {
    isLoadingRef.current = true;
    setLoading(true);
    setError('');

    // /monitoring/* is a token-gated surface (sync OPEN ITEM 4b): agents that don't
    // advertise `monitoring` are never asked — those widgets render their empty states.
    // Same for the swap summary on the `swap` token (sync OPEN ITEM 6) — the swap row
    // self-hides on empty data, so skipping the fetch is the whole gate.
    const monitoringAvailable = hasFeature(server, 'monitoring');
    const swapAvailable = hasFeature(server, 'swap');
    const skipped = Promise.resolve({ success: false, message: 'token not advertised' });

    const results = await Promise.allSettled([
      makeAgentRequest(server.hostname, server.port, server.protocol, 'stats'),
      monitoringAvailable
        ? getMonitoringHealth(server.hostname, server.port, server.protocol)
        : skipped,
      monitoringAvailable
        ? getMonitoringStatus(server.hostname, server.port, server.protocol)
        : skipped,
      monitoringAvailable
        ? makeAgentRequest(
            server.hostname,
            server.port,
            server.protocol,
            'monitoring/network/interfaces'
          )
        : skipped,
      monitoringAvailable
        ? getStoragePools(server.hostname, server.port, server.protocol)
        : skipped,
      monitoringAvailable
        ? getStorageDatasets(server.hostname, server.port, server.protocol)
        : skipped,
      makeAgentRequest(server.hostname, server.port, server.protocol, 'tasks/stats'),
      swapAvailable
        ? makeAgentRequest(server.hostname, server.port, server.protocol, 'system/swap/summary')
        : skipped,
    ]);

    const [
      statsResult,
      healthResult,
      statusResult,
      networkResult,
      poolsResult,
      datasetsResult,
      taskResult,
      swapSummaryResult,
    ] = results;

    if (statsResult.status === 'fulfilled' && statsResult.value.success) {
      setServerStats(statsResult.value.data);
    } else if (statsResult.status === 'fulfilled') {
      setError(`Failed to fetch stats: ${statsResult.value.message}`);
    }

    if (healthResult.status === 'fulfilled' && healthResult.value.success) {
      setMonitoringHealth(healthResult.value.data);
    } else {
      setMonitoringHealth({});
    }

    if (statusResult.status === 'fulfilled' && statusResult.value.success) {
      setMonitoringStatus(statusResult.value.data);
    } else {
      setMonitoringStatus({});
    }

    if (networkResult.status === 'fulfilled' && networkResult.value.success) {
      setNetworkInterfaces(networkResult.value.data?.interfaces || []);
    } else {
      setNetworkInterfaces([]);
    }

    const storageSummary = processStorageResults(poolsResult, datasetsResult);
    setStorageSummary(storageSummary);

    if (taskResult.status === 'fulfilled' && taskResult.value.success) {
      setTaskStats(taskResult.value.data || {});
    } else {
      setTaskStats({});
    }

    if (swapSummaryResult.status === 'fulfilled' && swapSummaryResult.value.success) {
      setSwapSummaryData(swapSummaryResult.value.data);
    } else {
      setSwapSummaryData({});
      // A skipped (token-gated) fetch is by design — only log real failures.
      if (swapAvailable) {
        console.error(
          'Failed to fetch swap summary:',
          swapSummaryResult.value?.message || 'Unknown error'
        );
      }
    }
  } catch (error) {
    console.error('Error fetching host data:', error);
    setError(`Error connecting to ${server.hostname}`);
  } finally {
    isLoadingRef.current = false;
    setLoading(false);
  }
};
