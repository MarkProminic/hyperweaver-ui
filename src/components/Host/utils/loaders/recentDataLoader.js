import { hasFeature } from '../../../../utils/capabilities';

/**
 * Helper: Process network recent data
 */
const processNetworkRecentData = (networkResult, updateNetworkChartData) => {
  if (networkResult.status === 'fulfilled' && networkResult.value?.success) {
    const networkData = networkResult.value.data?.usage || [];
    console.log('🔄 RECENT CHARTS: Processing', networkData.length, 'recent network records');

    if (networkData.length > 0) {
      updateNetworkChartData(networkData);

      const validNetworkUsage = networkData.filter(
        usage =>
          usage.link &&
          usage.link !== 'LINK' &&
          usage.ipackets !== 'IPACKETS' &&
          usage.time_delta_seconds > 0
      );

      if (validNetworkUsage.length > 0) {
        const latestNetwork = validNetworkUsage.reduce((latest, current) =>
          new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
        );
        return latestNetwork.scan_timestamp;
      }
    }
  }
  return null;
};

/**
 * Helper: Process pool I/O recent data
 */
const processPoolIORecentData = (poolIOResult, updatePoolIOChartData) => {
  if (poolIOResult.status === 'fulfilled' && poolIOResult.value?.success) {
    const poolIOData = poolIOResult.value.data?.poolio || [];
    console.log('🔄 RECENT CHARTS: Processing', poolIOData.length, 'recent pool I/O records');

    if (poolIOData.length > 0) {
      updatePoolIOChartData(poolIOData);

      const latestPoolIO = poolIOData.reduce((latest, current) =>
        new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
      );
      return latestPoolIO.scan_timestamp;
    }
  }
  return null;
};

/**
 * Helper: Process ARC recent data
 */
const processARCRecentData = (arcResult, updateARCChartData) => {
  if (arcResult.status === 'fulfilled' && arcResult.value?.success) {
    const arcData = arcResult.value.data?.arc || [];
    console.log('🔄 RECENT CHARTS: Processing', arcData.length, 'recent ARC records');

    if (arcData.length > 0) {
      updateARCChartData(arcData);

      const latestARC = arcData.reduce((latest, current) =>
        new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
      );
      return latestARC.scan_timestamp;
    }
  }
  return null;
};

/**
 * Helper: Process CPU recent data
 */
const processCPURecentData = (cpuResult, updateCPUChartData, updateCPUCoreChartData) => {
  if (cpuResult.status === 'fulfilled' && cpuResult.value?.success) {
    const cpuData = cpuResult.value.data?.cpu || [];
    console.log('🔄 RECENT CHARTS: Processing', cpuData.length, 'recent CPU records');

    if (cpuData.length > 0) {
      updateCPUChartData(cpuData);
      updateCPUCoreChartData(cpuData);

      const latestCPU = cpuData.reduce((latest, current) =>
        new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
      );
      return latestCPU.scan_timestamp;
    }
  }
  return null;
};

/**
 * Helper: Process memory recent data
 */
const processMemoryRecentData = (memoryResult, updateMemoryChartData) => {
  if (memoryResult.status === 'fulfilled' && memoryResult.value?.success) {
    const memoryData = memoryResult.value.data?.memory || [];
    console.log('🔄 RECENT CHARTS: Processing', memoryData.length, 'recent memory records');

    if (memoryData.length > 0) {
      updateMemoryChartData(memoryData);

      const latestMemory = memoryData.reduce((latest, current) =>
        new Date(current.scan_timestamp) > new Date(latest.scan_timestamp) ? current : latest
      );
      return latestMemory.scan_timestamp;
    }
  }
  return null;
};

/**
 * Load recent chart data for incremental refresh
 */
export const loadRecentChartData = async ({
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
  loadHistoricalChartDataFn,
  getResolutionLimit,
}) => {
  // Every fetch below is /monitoring/* — a token-gated surface (sync OPEN ITEM 4b).
  if (!currentServer || !makeAgentRequest || !hasFeature(currentServer, 'monitoring')) {
    return;
  }

  try {
    console.log('🔄 RECENT CHARTS: Loading recent chart data for refresh');

    const hasTimestamps = Object.values(lastChartTimestamps).some(timestamp => timestamp !== null);
    if (!hasTimestamps) {
      console.log('🔄 RECENT CHARTS: No timestamps found, falling back to historical load');
      loadHistoricalChartDataFn();
      return;
    }

    const results = await Promise.allSettled([
      lastChartTimestamps.network
        ? makeAgentRequest(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            `monitoring/network/usage?since=${encodeURIComponent(lastChartTimestamps.network)}&limit=${getResolutionLimit(resolution)}&per_interface=true`
          )
        : Promise.resolve({ success: false, message: 'No network timestamp' }),
      lastChartTimestamps.poolIO
        ? makeAgentRequest(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            `monitoring/storage/pool-io?limit=${getResolutionLimit(resolution)}&per_pool=true&since=${encodeURIComponent(lastChartTimestamps.poolIO)}`
          )
        : Promise.resolve({ success: false, message: 'No poolIO timestamp' }),
      lastChartTimestamps.arc
        ? makeAgentRequest(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            `monitoring/storage/arc?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(lastChartTimestamps.arc)}`
          )
        : Promise.resolve({ success: false, message: 'No arc timestamp' }),
      lastChartTimestamps.cpu
        ? makeAgentRequest(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            `monitoring/system/cpu?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(lastChartTimestamps.cpu)}&include_cores=true`
          )
        : Promise.resolve({ success: false, message: 'No cpu timestamp' }),
      lastChartTimestamps.memory
        ? makeAgentRequest(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            `monitoring/system/memory?limit=${getResolutionLimit(resolution)}&since=${encodeURIComponent(lastChartTimestamps.memory)}`
          )
        : Promise.resolve({ success: false, message: 'No memory timestamp' }),
    ]);

    const [networkResult, poolIOResult, arcResult, cpuResult, memoryResult] = results;

    const newTimestamps = {};

    const networkTimestamp = processNetworkRecentData(networkResult, updateNetworkChartData);
    if (networkTimestamp) {
      newTimestamps.network = networkTimestamp;
    }

    const poolIOTimestamp = processPoolIORecentData(poolIOResult, updatePoolIOChartData);
    if (poolIOTimestamp) {
      newTimestamps.poolIO = poolIOTimestamp;
    }

    const arcTimestamp = processARCRecentData(arcResult, updateARCChartData);
    if (arcTimestamp) {
      newTimestamps.arc = arcTimestamp;
    }

    const cpuTimestamp = processCPURecentData(
      cpuResult,
      updateCPUChartData,
      updateCPUCoreChartData
    );
    if (cpuTimestamp) {
      newTimestamps.cpu = cpuTimestamp;
    }

    const memoryTimestamp = processMemoryRecentData(memoryResult, updateMemoryChartData);
    if (memoryTimestamp) {
      newTimestamps.memory = memoryTimestamp;
    }

    if (Object.keys(newTimestamps).length > 0) {
      setLastChartTimestamps(prev => ({ ...prev, ...newTimestamps }));
    }

    console.log('🔄 RECENT CHARTS: Completed loading recent data for all chart types');
  } catch (error) {
    console.error('🔄 RECENT CHARTS: Error loading recent chart data:', error);
  }
};
