export const formatBytes = bytes => {
  if (!bytes || bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export const formatSpeed = speed => {
  if (!speed || speed === 0) {
    return 'N/A';
  }
  if (speed >= 1000) {
    return `${speed / 1000} Gbps`;
  }
  return `${speed} Mbps`;
};

// Calculate real-time bandwidth from delta values
export const calculateBandwidth = record => {
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

  return {
    rxBytesPerSecond,
    txBytesPerSecond,
    rxMbps: Math.max(0, rxMbps), // Ensure no negative values
    txMbps: Math.max(0, txMbps),
    totalMbps: Math.max(0, totalMbps),
  };
};

// Format bandwidth for display
export const formatBandwidth = mbps => {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(2)} Gbps`;
  } else if (mbps >= 1) {
    return `${mbps.toFixed(2)} Mbps`;
  } else if (mbps > 0) {
    return `${(mbps * 1000).toFixed(0)} Kbps`;
  }
  return '0 bps';
};

// Get bandwidth color based on total Mbps
export const getBandwidthColor = totalMbps => {
  if (totalMbps > 100) {
    return 'text-bg-danger';
  }
  if (totalMbps > 50) {
    return 'text-bg-warning';
  }
  if (totalMbps > 1) {
    return 'text-bg-success';
  }
  if (totalMbps > 0) {
    return 'text-bg-info';
  }
  return 'text-bg-dark';
};
