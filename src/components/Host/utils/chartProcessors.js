/**
 * Historical data processor for Storage I/O
 * Transforms raw pool I/O data into chart-ready format
 * @param {Array} poolIOData - Array of pool I/O records
 * @returns {Object} Chart data organized by pool name
 */
export const processStorageIOHistoricalData = poolIOData => {
  // Group by pool
  const poolData = {};
  poolIOData.forEach(poolIO => {
    const poolName = poolIO.pool;
    if (!poolData[poolName]) {
      poolData[poolName] = [];
    }
    poolData[poolName].push(poolIO);
  });

  // Build complete chart data from historical records
  const newChartData = {};
  Object.entries(poolData).forEach(([poolName, poolIOArray]) => {
    // Sort records by timestamp (oldest first)
    const sortedRecords = poolIOArray.sort(
      (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
    );

    newChartData[poolName] = {
      readData: [],
      writeData: [],
      totalData: [],
    };

    sortedRecords.forEach(poolIO => {
      const timestamp = new Date(poolIO.scan_timestamp).getTime();
      const readBandwidth = poolIO.read_bandwidth_bytes || 0;
      const writeBandwidth = poolIO.write_bandwidth_bytes || 0;
      const readMBps = readBandwidth / (1024 * 1024);
      const writeMBps = writeBandwidth / (1024 * 1024);
      const totalMBps = readMBps + writeMBps;

      newChartData[poolName].readData.push([timestamp, parseFloat(readMBps.toFixed(3))]);
      newChartData[poolName].writeData.push([timestamp, parseFloat(writeMBps.toFixed(3))]);
      newChartData[poolName].totalData.push([timestamp, parseFloat(totalMBps.toFixed(3))]);
    });

    console.log(
      `📊 STORAGE IO: Built ${sortedRecords.length} historical points for pool ${poolName}`
    );
  });

  return newChartData;
};

/**
 * Historical data processor for CPU
 * Transforms raw CPU data into chart-ready format
 * @param {Array} cpuData - Array of CPU records
 * @returns {Object} Chart data with overall, cores, and load averages
 */
export const processCPUHistoricalData = cpuData => {
  // Sort data by timestamp (oldest first)
  const sortedData = [...cpuData].sort(
    (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
  );

  const overall = [];
  const load1 = [];
  const load5 = [];
  const load15 = [];
  const cores = {};

  sortedData.forEach(d => {
    const timestamp = new Date(d.scan_timestamp).getTime();
    overall.push([timestamp, d.cpu_utilization_pct]);
    load1.push([timestamp, d.load_avg_1min]);
    load5.push([timestamp, d.load_avg_5min]);
    load15.push([timestamp, d.load_avg_15min]);

    // Process per-core data
    if (d.per_core_parsed) {
      d.per_core_parsed.forEach(coreData => {
        if (!cores[coreData.cpu_id]) {
          cores[coreData.cpu_id] = [];
        }
        cores[coreData.cpu_id].push([timestamp, coreData.utilization_pct]);
      });
    }
  });

  console.log(`📊 CPU: Built ${sortedData.length} historical points for CPU data`);

  return {
    overall,
    cores,
    load: {
      '1min': load1,
      '5min': load5,
      '15min': load15,
    },
  };
};

/**
 * Historical data processor for Memory
 * Transforms raw memory data into chart-ready format
 * @param {Array} memoryData - Array of memory records
 * @returns {Object} Chart data with used, free, cached, and total
 */
export const processMemoryHistoricalData = memoryData => {
  // Sort data by timestamp (oldest first)
  const sortedData = [...memoryData].sort(
    (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
  );

  const used = [];
  const free = [];
  const cached = [];
  const total = [];

  sortedData.forEach(d => {
    const timestamp = new Date(d.scan_timestamp).getTime();
    used.push([timestamp, parseFloat((d.used_memory_bytes / 1024 ** 3).toFixed(2))]);
    free.push([timestamp, parseFloat((d.free_memory_bytes / 1024 ** 3).toFixed(2))]);
    cached.push([timestamp, parseFloat((d.cached_bytes / 1024 ** 3).toFixed(2))]);
    total.push([timestamp, parseFloat((d.total_memory_bytes / 1024 ** 3).toFixed(2))]);
  });

  console.log(`📊 MEMORY: Built ${sortedData.length} historical points for memory data`);

  return {
    used,
    free,
    cached,
    total,
  };
};
