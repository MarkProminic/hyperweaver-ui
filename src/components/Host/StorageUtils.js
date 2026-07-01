export const formatBytes = bytes => {
  // Handle various invalid inputs
  if (bytes === null || bytes === undefined || bytes === '' || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }

  // Convert to number if it's a string
  const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(numBytes) || numBytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  // Ensure i is within valid range
  const sizeIndex = Math.max(0, Math.min(i, sizes.length - 1));
  const value = numBytes / k ** sizeIndex;

  return `${parseFloat(value.toFixed(2))} ${sizes[sizeIndex]}`;
};

export const formatPercentage = (used, total) => {
  if (!used || !total || total === 0) {
    return '0%';
  }
  return `${((used / total) * 100).toFixed(1)}%`;
};

export const getHealthColor = health => {
  switch (health?.toLowerCase()) {
    case 'online':
    case 'healthy':
    case 'optimal':
      return 'text-bg-success';
    case 'degraded':
    case 'warning':
      return 'text-bg-warning';
    case 'faulted':
    case 'offline':
    case 'error':
      return 'text-bg-danger';
    default:
      return 'text-bg-info';
  }
};

// Parse size strings like "176G", "1.72T" etc to bytes
export const parseSize = sizeStr => {
  // Handle null, undefined, empty string, or special values
  if (!sizeStr || sizeStr === '-' || sizeStr === 'none' || sizeStr === 'N/A') {
    return 0;
  }

  // If it's already a number, return it
  if (typeof sizeStr === 'number') {
    return isNaN(sizeStr) ? 0 : Math.floor(sizeStr);
  }

  // Convert to string and clean it
  const cleanStr = String(sizeStr).trim();
  if (!cleanStr) {
    return 0;
  }

  // Match numbers with optional unit suffix (case insensitive)
  const match = cleanStr.match(/^(?:[0-9.]+)\s*(?:[KMGTPEZB]?)/i);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) {
    return 0;
  }

  const unit = (match[2] || '').toUpperCase();

  const multipliers = {
    '': 1,
    B: 1, // Bytes
    K: 1024, // Kilobytes
    M: 1024 * 1024, // Megabytes
    G: 1024 * 1024 * 1024, // Gigabytes
    T: 1024 * 1024 * 1024 * 1024, // Terabytes
    P: 1024 * 1024 * 1024 * 1024 * 1024, // Petabytes
    E: 1024 * 1024 * 1024 * 1024 * 1024 * 1024, // Exabytes
    Z: 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024, // Zettabytes
  };

  const multiplier = multipliers[unit] || 1;
  const result = value * multiplier;

  // Return 0 if result is invalid
  return isNaN(result) || result < 0 ? 0 : Math.floor(result);
};

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

export const groupByKey = (records, key) => {
  const groups = {};
  records.forEach(record => {
    const groupName = record[key];
    if (!groupName) {
      return;
    }
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(record);
  });
  return groups;
};

export const buildIOChartData = groups => {
  const chartResult = {};
  Object.entries(groups).forEach(([name, records]) => {
    const sorted = records.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));
    chartResult[name] = { readData: [], writeData: [], totalData: [] };
    sorted.forEach(io => {
      const timestamp = new Date(io.scan_timestamp).getTime();
      const readMBps = (parseFloat(io.read_bandwidth_bytes) || 0) / (1024 * 1024);
      const writeMBps = (parseFloat(io.write_bandwidth_bytes) || 0) / (1024 * 1024);
      const totalMBps = readMBps + writeMBps;
      chartResult[name].readData.push([timestamp, parseFloat(readMBps.toFixed(3))]);
      chartResult[name].writeData.push([timestamp, parseFloat(writeMBps.toFixed(3))]);
      chartResult[name].totalData.push([timestamp, parseFloat(totalMBps.toFixed(3))]);
    });
  });
  return chartResult;
};

export const extractLatestPerGroup = groups =>
  Object.values(groups)
    .map(
      records => records.sort((a, b) => new Date(b.scan_timestamp) - new Date(a.scan_timestamp))[0]
    )
    .filter(Boolean);

export const deduplicateRecords = (items, getKey) =>
  items.reduce((acc, item) => {
    const existing = acc.find(e => getKey(e) === getKey(item));
    if (!existing) {
      acc.push(item);
    } else if (
      item.scan_timestamp &&
      existing.scan_timestamp &&
      new Date(item.scan_timestamp) > new Date(existing.scan_timestamp)
    ) {
      acc[acc.indexOf(existing)] = item;
    }
    return acc;
  }, []);

export const deduplicateDisksByIdentity = disks =>
  disks.reduce((acc, disk) => {
    const existing = acc.find(
      e =>
        (e.device_name === disk.device_name && disk.device_name) ||
        (e.serial_number === disk.serial_number && disk.serial_number) ||
        (e.device === disk.device && disk.device) ||
        (e.name === disk.name && disk.name)
    );
    if (!existing) {
      acc.push(disk);
    } else if (
      disk.scan_timestamp &&
      existing.scan_timestamp &&
      new Date(disk.scan_timestamp) > new Date(existing.scan_timestamp)
    ) {
      acc[acc.indexOf(existing)] = disk;
    }
    return acc;
  }, []);
