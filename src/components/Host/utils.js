/**
 * Formats uptime from seconds to a human-readable string (e.g., "3d 4h 5m").
 * @param {number} uptime - The uptime in seconds.
 * @returns {string} The formatted uptime string or 'N/A'.
 */
export const formatUptime = uptime => {
  if (!uptime) {
    return 'N/A';
  }
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

/**
 * Converts bytes to a human-readable size string (e.g., "1.23 GB").
 * @param {number} bytes - The number of bytes.
 * @returns {string} The formatted size string.
 */
export const bytesToSize = bytes => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return '0 Byte';
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Math.round(bytes / 1024 ** i, 2)} ${sizes[i]}`;
};

/**
 * Gets the CPU count from server stats.
 * @param {object} serverStats - The server statistics object.
 * @returns {number|string} The number of CPUs or 'N/A'.
 */
export const getCpuCount = serverStats => {
  if (!serverStats) {
    return 'N/A';
  }
  if (Array.isArray(serverStats.cpus)) {
    return serverStats.cpus.length;
  }
  if (typeof serverStats.cpus === 'number') {
    return serverStats.cpus;
  }
  return 'N/A';
};

/**
 * Gets the CPU model from server stats.
 * @param {object} serverStats - The server statistics object.
 * @returns {string} The CPU model or 'Unknown CPU'.
 */
export const getCpuModel = serverStats => {
  if (Array.isArray(serverStats.cpus) && serverStats.cpus.length > 0) {
    const [firstCpu] = serverStats.cpus;
    if (typeof firstCpu === 'object' && firstCpu.model) {
      return firstCpu.model;
    }
  }
  return 'Unknown CPU';
};

/**
 * Gets the configuration for the maximum number of data points for a given time window.
 * @param {string} window - The time window (e.g., '1min', '15min', '1hour').
 * @returns {object} The configuration object with points, since, and limit.
 */
export const getMaxDataPointsForWindow = window => {
  const windowConfig = {
    '1min': { points: 12, since: '1minute', limit: 500 },
    '5min': { points: 60, since: '5minutes', limit: 2000 },
    '10min': { points: 120, since: '10minutes', limit: 4000 },
    '15min': { points: 180, since: '15minutes', limit: 6000 },
    '30min': { points: 360, since: '30minutes', limit: 12000 },
    '1hour': { points: 720, since: '1hour', limit: 25000 },
    '3hour': { points: 2160, since: '3hours', limit: 70000 },
    '6hour': { points: 4320, since: '6hours', limit: 140000 },
    '12hour': { points: 8640, since: '12hours', limit: 280000 },
    '24hour': { points: 17280, since: '24hours', limit: 500000 },
  };
  return windowConfig[window] || windowConfig['1hour'];
};

/**
 * Calculates real-time network bandwidth from a record containing delta values.
 * @param {object} record - The network usage record.
 * @returns {object} An object with rx/tx bytes per second and Mbps values.
 */
export const calculateNetworkBandwidth = record => {
  if (!record.time_delta_seconds || record.time_delta_seconds <= 0) {
    return {
      rxBytesPerSecond: 0,
      txBytesPerSecond: 0,
      rxMbps: 0,
      txMbps: 0,
      totalMbps: 0,
    };
  }

  const rxBytesPerSecond = (record.rbytes_delta || 0) / record.time_delta_seconds;
  const txBytesPerSecond = (record.obytes_delta || 0) / record.time_delta_seconds;

  // Convert to Mbps (bytes/second * 8 bits/byte / 1,000,000)
  const rxMbps = (rxBytesPerSecond * 8) / 1000000;
  const txMbps = (txBytesPerSecond * 8) / 1000000;
  const totalMbps = rxMbps + txMbps;

  const result = {
    rxBytesPerSecond,
    txBytesPerSecond,
    rxMbps: Math.max(0, rxMbps), // Ensure no negative values
    txMbps: Math.max(0, txMbps),
    totalMbps: Math.max(0, totalMbps),
  };

  return result;
};
