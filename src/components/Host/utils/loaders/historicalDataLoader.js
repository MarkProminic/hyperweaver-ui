import { hasFeature } from '../../../../utils/capabilities';
import {
  processStorageIOHistoricalData,
  processCPUHistoricalData,
  processMemoryHistoricalData,
} from '../chartProcessors';

/**
 * Helper: Group network records by interface
 */
const groupNetworkRecordsByInterface = networkData => {
  const interfaceGroups = {};
  networkData.forEach(record => {
    const interfaceName = record.link;
    if (!interfaceName) {
      return;
    }

    if (!interfaceGroups[interfaceName]) {
      interfaceGroups[interfaceName] = [];
    }
    interfaceGroups[interfaceName].push(record);
  });
  return interfaceGroups;
};

/**
 * Helper: Build network chart data from interface groups
 */
const buildNetworkChartData = interfaceGroups => {
  const newNetworkChartData = {};
  Object.entries(interfaceGroups).forEach(([interfaceName, records]) => {
    // Sort records by timestamp (oldest first)
    const sortedRecords = records.sort(
      (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
    );

    newNetworkChartData[interfaceName] = {
      rxData: [],
      txData: [],
      totalData: [],
    };

    sortedRecords.forEach(record => {
      const timestamp = new Date(record.scan_timestamp).getTime();
      const rxMbps = parseFloat(record.rx_mbps) || 0;
      const txMbps = parseFloat(record.tx_mbps) || 0;

      newNetworkChartData[interfaceName].rxData.push([timestamp, parseFloat(rxMbps.toFixed(3))]);
      newNetworkChartData[interfaceName].txData.push([timestamp, parseFloat(txMbps.toFixed(3))]);
      newNetworkChartData[interfaceName].totalData.push([
        timestamp,
        parseFloat((rxMbps + txMbps).toFixed(3)),
      ]);
    });

    console.log(
      `📊 HISTORICAL CHARTS: Built ${sortedRecords.length} historical points for network ${interfaceName}`
    );
  });
  return newNetworkChartData;
};

/**
 * Helper: Process network usage for state (deduplicate and sort)
 */
const processNetworkUsageForState = networkData => {
  const validNetworkUsage = networkData.filter(
    usage =>
      usage.link &&
      usage.link !== 'LINK' &&
      usage.ipackets !== 'IPACKETS' &&
      usage.time_delta_seconds > 0
  );

  const deduplicatedNetworkUsage = validNetworkUsage.reduce((acc, usage) => {
    const existingUsage = acc.find(existingItem => existingItem.link === usage.link);
    if (!existingUsage) {
      acc.push({ ...usage });
    } else if (new Date(usage.scan_timestamp) > new Date(existingUsage.scan_timestamp)) {
      const index = acc.indexOf(existingUsage);
      acc[index] = { ...usage };
    }
    return acc;
  }, []);

  const networkUsageWithBandwidth = deduplicatedNetworkUsage.map(usage => ({
    ...usage,
    totalMbps: (parseFloat(usage.rx_mbps) || 0) + (parseFloat(usage.tx_mbps) || 0),
  }));

  networkUsageWithBandwidth.sort((a, b) => b.totalMbps - a.totalMbps);

  const sortedNetworkUsage = networkUsageWithBandwidth.map(({ ...usage }) => usage);
  return sortedNetworkUsage;
};

/**
 * Helper: Process network historical data
 */
const processNetworkHistoricalData = (networkResult, setNetworkChartData, setNetworkUsage) => {
  if (networkResult.status === 'fulfilled' && networkResult.value?.success) {
    const networkData = networkResult.value.data?.usage || [];
    console.log(
      '📊 HISTORICAL CHARTS: Processing',
      networkData.length,
      'historical network records'
    );

    const interfaceGroups = groupNetworkRecordsByInterface(networkData);
    const newNetworkChartData = buildNetworkChartData(interfaceGroups);
    setNetworkChartData(newNetworkChartData);

    const sortedNetworkUsage = processNetworkUsageForState(networkData);
    setNetworkUsage(sortedNetworkUsage);

    return networkData;
  }
  return [];
};

/**
 * Helper: Process storage pool I/O historical data
 */
const processPoolIOHistoricalData = (poolIOResult, setChartData, setDiskIOStats) => {
  if (poolIOResult.status === 'fulfilled' && poolIOResult.value?.success) {
    const poolIOData = poolIOResult.value.data?.poolio || [];
    console.log(
      '📊 HISTORICAL CHARTS: Processing',
      poolIOData.length,
      'historical pool I/O records'
    );

    const processedStorageIOData = processStorageIOHistoricalData(poolIOData);
    setChartData(processedStorageIOData);

    const deduplicatedPoolIO = poolIOData.reduce((acc, poolIO) => {
      const existingPoolIO = acc.find(existingItem => existingItem.pool === poolIO.pool);
      if (!existingPoolIO) {
        acc.push({ ...poolIO });
      } else if (new Date(poolIO.scan_timestamp) > new Date(existingPoolIO.scan_timestamp)) {
        const index = acc.indexOf(existingPoolIO);
        acc[index] = { ...poolIO };
      }
      return acc;
    }, []);
    deduplicatedPoolIO.sort((a, b) => a.pool.localeCompare(b.pool));
    setDiskIOStats(deduplicatedPoolIO);

    return poolIOData;
  }
  return [];
};

/**
 * Helper: Process ZFS ARC historical data
 */
const processARCHistoricalData = (arcResult, setArcChartData, setArcStats) => {
  if (arcResult.status === 'fulfilled' && arcResult.value?.success) {
    const arcData = arcResult.value.data?.arc || [];
    console.log('📊 HISTORICAL CHARTS: Processing', arcData.length, 'historical ARC records');

    const sizeData = [];
    const targetData = [];
    const hitRateData = [];

    arcData.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));

    arcData.forEach(arc => {
      const timestamp = new Date(arc.scan_timestamp).getTime();
      const arcSize = arc.arc_size ? parseFloat(arc.arc_size) / (1024 * 1024 * 1024) : 0;
      const arcTarget = arc.arc_target_size
        ? parseFloat(arc.arc_target_size) / (1024 * 1024 * 1024)
        : 0;
      const arcHits = parseFloat(arc.hits || arc.arc_hits) || 0;
      const arcMisses = parseFloat(arc.misses || arc.arc_misses) || 0;
      const hitRate =
        arc.hit_ratio || (arcHits + arcMisses > 0 ? (arcHits / (arcHits + arcMisses)) * 100 : 0);

      sizeData.push([timestamp, parseFloat(arcSize.toFixed(2))]);
      targetData.push([timestamp, parseFloat(arcTarget.toFixed(2))]);
      hitRateData.push([timestamp, parseFloat(hitRate.toFixed(1))]);
    });

    setArcChartData({ sizeData, targetData, hitRateData });

    const deduplicatedARC = arcData.reduce((acc, arc) => {
      const existingARC = acc.find(
        existingItem => existingItem.scan_timestamp === arc.scan_timestamp
      );
      if (!existingARC) {
        acc.push({ ...arc });
      }
      return acc;
    }, []);
    deduplicatedARC.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));
    setArcStats(deduplicatedARC);

    return arcData;
  }
  return [];
};

/**
 * Helper: Process CPU historical data
 */
const processCPUHistoricalDataHelper = (cpuResult, setCpuChartData, setCpuStats) => {
  if (cpuResult.status === 'fulfilled' && cpuResult.value?.success) {
    const cpuData = cpuResult.value.data?.cpu || [];
    console.log('📊 HISTORICAL CHARTS: Processing', cpuData.length, 'historical CPU records');

    const processedCPUData = processCPUHistoricalData(cpuData);
    setCpuChartData(processedCPUData);
    setCpuStats(cpuData);

    return cpuData;
  }
  return [];
};

/**
 * Helper: Process memory historical data
 */
const processMemoryHistoricalDataHelper = (memoryResult, setMemoryChartData, setMemoryStats) => {
  if (memoryResult.status === 'fulfilled' && memoryResult.value?.success) {
    const memoryData = memoryResult.value.data?.memory || [];
    console.log('📊 HISTORICAL CHARTS: Processing', memoryData.length, 'historical memory records');

    const processedMemoryData = processMemoryHistoricalData(memoryData);
    setMemoryChartData(processedMemoryData);
    setMemoryStats(memoryData);

    return memoryData;
  }
  return [];
};

/**
 * Helper: Extract latest timestamp from data array
 */
const extractLatestTimestamp = data => {
  if (!data || data.length === 0) {
    return null;
  }
  const latest = data.reduce((latestItem, current) =>
    new Date(current.scan_timestamp) > new Date(latestItem.scan_timestamp) ? current : latestItem
  );
  return latest.scan_timestamp;
};

/**
 * Helper: Process single result for timestamp
 */
const processResultTimestamp = (result, dataKey) => {
  if (result.status === 'fulfilled' && result.value?.success) {
    const data = result.value.data?.[dataKey] || [];
    return extractLatestTimestamp(data);
  }
  return null;
};

/**
 * Helper: Update last chart timestamps from results
 */
const updateLastChartTimestampsFromResults = (results, setLastChartTimestamps) => {
  const [networkResult, poolIOResult, arcResult, cpuResult, memoryResult] = results;
  const newTimestamps = {};

  const networkTimestamp = processResultTimestamp(networkResult, 'usage');
  if (networkTimestamp) {
    newTimestamps.network = networkTimestamp;
  }

  const poolIOTimestamp = processResultTimestamp(poolIOResult, 'poolio');
  if (poolIOTimestamp) {
    newTimestamps.poolIO = poolIOTimestamp;
  }

  const arcTimestamp = processResultTimestamp(arcResult, 'arc');
  if (arcTimestamp) {
    newTimestamps.arc = arcTimestamp;
  }

  const cpuTimestamp = processResultTimestamp(cpuResult, 'cpu');
  if (cpuTimestamp) {
    newTimestamps.cpu = cpuTimestamp;
  }

  const memoryTimestamp = processResultTimestamp(memoryResult, 'memory');
  if (memoryTimestamp) {
    newTimestamps.memory = memoryTimestamp;
  }

  setLastChartTimestamps(prev => ({ ...prev, ...newTimestamps }));
};

/**
 * Load historical chart data for the selected time window
 */
export const loadHistoricalChartData = async ({
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
}) => {
  // Every fetch below is /monitoring/* — a token-gated surface (sync OPEN ITEM 4b).
  if (!currentServer || !makeAgentRequest || !hasFeature(currentServer, 'monitoring')) {
    return;
  }

  try {
    console.log('📊 HISTORICAL CHARTS: Loading historical data for time window:', timeWindow);

    const historicalTimestamp = getHistoricalTimestamp(timeWindow);
    console.log('📊 HISTORICAL CHARTS: Requesting data since:', historicalTimestamp);

    const results = await Promise.allSettled([
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/network/usage?since=${encodeURIComponent(historicalTimestamp)}&limit=${getResolutionLimit(resolution)}&per_interface=true`
      ),
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/storage/pool-io?limit=${getResolutionLimit(resolution)}&per_pool=true&since=${encodeURIComponent(historicalTimestamp)}`
      ),
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/storage/arc?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(historicalTimestamp)}`
      ),
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/system/cpu?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(historicalTimestamp)}&include_cores=true`
      ),
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `monitoring/system/memory?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(historicalTimestamp)}`
      ),
    ]);

    const [networkResult, poolIOResult, arcResult, cpuResult, memoryResult] = results;

    processNetworkHistoricalData(networkResult, setNetworkChartData, setNetworkUsage);
    processPoolIOHistoricalData(poolIOResult, setChartData, setDiskIOStats);
    processARCHistoricalData(arcResult, setArcChartData, setArcStats);
    processCPUHistoricalDataHelper(cpuResult, setCpuChartData, setCpuStats);
    processMemoryHistoricalDataHelper(memoryResult, setMemoryChartData, setMemoryStats);

    console.log('📊 HISTORICAL CHARTS: Completed loading historical data for all chart types');

    updateLastChartTimestampsFromResults(results, setLastChartTimestamps);
  } catch (error) {
    console.error('📊 HISTORICAL CHARTS: Error loading historical data:', error);
  }
};
