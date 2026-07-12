import { calculateNetworkBandwidth } from '../utils';

// Series only move forward: a batch that overlaps what a series already holds
// (realtime re-fetches, since-boundary rows) is skipped, never duplicated.
const isNewerPoint = (series, timestamp) =>
  series.length === 0 || timestamp > series[series.length - 1][0];

/**
 * Incremental update function for Storage I/O (pure incremental only)
 * @param {Object} prevChartData - Previous chart data state
 * @param {Array} poolIOData - New pool I/O records
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated chart data
 */
export const updatePoolIOChartData = (prevChartData, poolIOData, maxDataPoints) => {
  // Group by pool
  const poolData = {};
  poolIOData.forEach(poolIO => {
    const poolName = poolIO.pool;
    if (!poolData[poolName]) {
      poolData[poolName] = [];
    }
    poolData[poolName].push(poolIO);
  });

  const newData = { ...prevChartData };

  Object.entries(poolData).forEach(([poolName, poolIOArray]) => {
    // Sort by timestamp (oldest first)
    poolIOArray.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));

    if (!newData[poolName]) {
      newData[poolName] = {
        readData: [],
        writeData: [],
        totalData: [],
      };
    }

    // Pure incremental - append all new data points
    poolIOArray.forEach(poolIO => {
      const timestamp = new Date(poolIO.scan_timestamp).getTime();
      if (!isNewerPoint(newData[poolName].readData, timestamp)) {
        return;
      }
      const readBandwidth = poolIO.read_bandwidth_bytes || 0;
      const writeBandwidth = poolIO.write_bandwidth_bytes || 0;
      const readMBps = readBandwidth / (1024 * 1024);
      const writeMBps = writeBandwidth / (1024 * 1024);
      const totalMBps = readMBps + writeMBps;

      newData[poolName].readData.push([timestamp, parseFloat(readMBps.toFixed(3))]);
      newData[poolName].writeData.push([timestamp, parseFloat(writeMBps.toFixed(3))]);
      newData[poolName].totalData.push([timestamp, parseFloat(totalMBps.toFixed(3))]);
    });

    // Trim to max data points
    if (newData[poolName].readData.length > maxDataPoints) {
      newData[poolName].readData = newData[poolName].readData.slice(-maxDataPoints);
      newData[poolName].writeData = newData[poolName].writeData.slice(-maxDataPoints);
      newData[poolName].totalData = newData[poolName].totalData.slice(-maxDataPoints);
    }
  });

  return newData;
};

/**
 * Incremental update function for ARC
 * @param {Object} prevArcChartData - Previous ARC chart data
 * @param {Array} arcData - New ARC records
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated ARC chart data
 */
export const updateARCChartData = (prevArcChartData, arcData, maxDataPoints) => {
  const newData = { ...prevArcChartData };

  arcData.forEach(arc => {
    const timestamp = new Date(arc.scan_timestamp).getTime();
    if (!isNewerPoint(newData.sizeData, timestamp)) {
      return;
    }

    const arcSize = arc.arc_size ? parseFloat(arc.arc_size) / (1024 * 1024 * 1024) : 0;
    const arcTarget = arc.arc_target_size
      ? parseFloat(arc.arc_target_size) / (1024 * 1024 * 1024)
      : 0;

    const arcHits = parseFloat(arc.hits || arc.arc_hits) || 0;
    const arcMisses = parseFloat(arc.misses || arc.arc_misses) || 0;
    const hitRate =
      arc.hit_ratio || (arcHits + arcMisses > 0 ? (arcHits / (arcHits + arcMisses)) * 100 : 0);

    const sizePoint = [timestamp, parseFloat(arcSize.toFixed(2))];
    const targetPoint = [timestamp, parseFloat(arcTarget.toFixed(2))];
    const hitRatePoint = [timestamp, parseFloat(hitRate.toFixed(1))];

    newData.sizeData.push(sizePoint);
    newData.targetData.push(targetPoint);
    newData.hitRateData.push(hitRatePoint);

    if (newData.sizeData.length > maxDataPoints) {
      newData.sizeData = newData.sizeData.slice(-maxDataPoints);
      newData.targetData = newData.targetData.slice(-maxDataPoints);
      newData.hitRateData = newData.hitRateData.slice(-maxDataPoints);
    }
  });

  return newData;
};

/**
 * Incremental update function for Network
 * @param {Object} prevNetworkChartData - Previous network chart data
 * @param {Array} networkUsageData - New network usage records
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated network chart data
 */
export const updateNetworkChartData = (prevNetworkChartData, networkUsageData, maxDataPoints) => {
  // Group by interface and sort by timestamp for proper chart initialization
  const interfaceData = {};
  networkUsageData.forEach(usage => {
    const interfaceName = usage.link;
    if (!interfaceData[interfaceName]) {
      interfaceData[interfaceName] = [];
    }
    interfaceData[interfaceName].push(usage);
  });

  const newData = { ...prevNetworkChartData };

  Object.entries(interfaceData).forEach(([interfaceName, usageArray]) => {
    // Sort by timestamp (oldest first)
    usageArray.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));

    if (!newData[interfaceName]) {
      newData[interfaceName] = {
        rxData: [],
        txData: [],
        totalData: [],
      };
    }

    // If this is initial load, replace the data. If updating, append.
    const isInitialLoad = newData[interfaceName].rxData.length === 0;

    if (isInitialLoad) {
      // Initialize with all historical data
      usageArray.forEach(usage => {
        const bandwidth = calculateNetworkBandwidth(usage);
        const timestamp = new Date(usage.scan_timestamp).getTime();

        newData[interfaceName].rxData.push([timestamp, parseFloat(bandwidth.rxMbps.toFixed(3))]);
        newData[interfaceName].txData.push([timestamp, parseFloat(bandwidth.txMbps.toFixed(3))]);
        newData[interfaceName].totalData.push([
          timestamp,
          parseFloat(bandwidth.totalMbps.toFixed(3)),
        ]);
      });
    } else {
      // Update mode - just add the latest points
      const latestUsage = usageArray[usageArray.length - 1];
      if (latestUsage) {
        const timestamp = new Date(latestUsage.scan_timestamp).getTime();
        if (isNewerPoint(newData[interfaceName].rxData, timestamp)) {
          const bandwidth = calculateNetworkBandwidth(latestUsage);

          newData[interfaceName].rxData.push([timestamp, parseFloat(bandwidth.rxMbps.toFixed(3))]);
          newData[interfaceName].txData.push([timestamp, parseFloat(bandwidth.txMbps.toFixed(3))]);
          newData[interfaceName].totalData.push([
            timestamp,
            parseFloat(bandwidth.totalMbps.toFixed(3)),
          ]);
        }
      }
    }

    // Trim to max data points
    if (newData[interfaceName].rxData.length > maxDataPoints) {
      newData[interfaceName].rxData = newData[interfaceName].rxData.slice(-maxDataPoints);
      newData[interfaceName].txData = newData[interfaceName].txData.slice(-maxDataPoints);
      newData[interfaceName].totalData = newData[interfaceName].totalData.slice(-maxDataPoints);
    }
  });

  return newData;
};

/**
 * Incremental update function for CPU (pure incremental only)
 * @param {Object} prevCpuChartData - Previous CPU chart data
 * @param {Array} cpuData - New CPU records
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated CPU chart data
 */
export const updateCPUChartData = (prevCpuChartData, cpuData, maxDataPoints) => {
  const newData = { ...prevCpuChartData };

  // Sort new data by timestamp
  const sortedData = [...cpuData].sort(
    (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
  );

  // Process each new data point
  sortedData.forEach(d => {
    const timestamp = new Date(d.scan_timestamp).getTime();
    if (!isNewerPoint(newData.overall, timestamp)) {
      return;
    }

    // Append to overall data
    newData.overall.push([timestamp, d.cpu_utilization_pct]);

    // Append to load data
    newData.load['1min'].push([timestamp, d.load_avg_1min]);
    newData.load['5min'].push([timestamp, d.load_avg_5min]);
    newData.load['15min'].push([timestamp, d.load_avg_15min]);
  });

  // Trim to max data points
  if (newData.overall.length > maxDataPoints) {
    newData.overall = newData.overall.slice(-maxDataPoints);
    newData.load['1min'] = newData.load['1min'].slice(-maxDataPoints);
    newData.load['5min'] = newData.load['5min'].slice(-maxDataPoints);
    newData.load['15min'] = newData.load['15min'].slice(-maxDataPoints);
  }

  return newData;
};

/**
 * Incremental update function for CPU cores (pure incremental only)
 * @param {Object} prevCpuChartData - Previous CPU chart data
 * @param {Array} cpuData - New CPU records with per-core data
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated CPU chart data with core information
 */
export const updateCPUCoreChartData = (prevCpuChartData, cpuData, maxDataPoints) => {
  const newData = { ...prevCpuChartData };

  cpuData.forEach(d => {
    if (d.per_core_parsed) {
      const timestamp = new Date(d.scan_timestamp).getTime();

      d.per_core_parsed.forEach(coreData => {
        if (!newData.cores[coreData.cpu_id]) {
          newData.cores[coreData.cpu_id] = [];
        }
        if (!isNewerPoint(newData.cores[coreData.cpu_id], timestamp)) {
          return;
        }
        newData.cores[coreData.cpu_id].push([timestamp, coreData.utilization_pct]);

        // Trim core data to max data points
        if (newData.cores[coreData.cpu_id].length > maxDataPoints) {
          newData.cores[coreData.cpu_id] = newData.cores[coreData.cpu_id].slice(-maxDataPoints);
        }
      });
    }
  });

  return newData;
};

/**
 * Incremental update function for Memory (pure incremental only)
 * @param {Object} prevMemoryChartData - Previous memory chart data
 * @param {Array} memoryData - New memory records
 * @param {number} maxDataPoints - Maximum data points to keep
 * @returns {Object} Updated memory chart data
 */
export const updateMemoryChartData = (prevMemoryChartData, memoryData, maxDataPoints) => {
  // Sort memory data by timestamp
  const sortedMemoryData = [...memoryData].sort(
    (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
  );

  const newData = { ...prevMemoryChartData };

  // Process each new memory data point
  sortedMemoryData.forEach(d => {
    const timestamp = new Date(d.scan_timestamp).getTime();
    if (!isNewerPoint(newData.used, timestamp)) {
      return;
    }

    newData.used.push([timestamp, parseFloat((d.used_memory_bytes / 1024 ** 3).toFixed(2))]);
    newData.free.push([timestamp, parseFloat((d.free_memory_bytes / 1024 ** 3).toFixed(2))]);
    newData.cached.push([timestamp, parseFloat((d.cached_bytes / 1024 ** 3).toFixed(2))]);
    newData.total.push([timestamp, parseFloat((d.total_memory_bytes / 1024 ** 3).toFixed(2))]);
  });

  // Trim to max data points
  if (newData.used.length > maxDataPoints) {
    newData.used = newData.used.slice(-maxDataPoints);
    newData.free = newData.free.slice(-maxDataPoints);
    newData.cached = newData.cached.slice(-maxDataPoints);
    newData.total = newData.total.slice(-maxDataPoints);
  }

  return newData;
};
