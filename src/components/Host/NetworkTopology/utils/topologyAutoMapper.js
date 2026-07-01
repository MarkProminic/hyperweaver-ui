import { createEdges } from '../mappers/edgeMapper';
import { createNodes } from '../mappers/nodeMapper';
import { detectTopologyPatterns } from '../mappers/patternDetector';

/**
 * Auto-map network topology from existing Hyperweaver data sources
 * Transforms the complex OmniOS networking data into React Flow format
 */
export const autoMapTopology = ({
  interfaces = [],
  aggregates = [],
  etherstubs = [],
  vnics = [],
  zones = [],
  bandwidthData = [],
  ipAddresses = [],
}) => {
  // Create a map for quick bandwidth lookups - use pre-calculated values from API
  const bandwidthMap = new Map();
  console.log('🔍 TOPOLOGY: Processing bandwidth data:', bandwidthData.length, 'entries');
  console.log('🔍 TOPOLOGY: Raw bandwidth data sample:', bandwidthData.slice(0, 5));

  bandwidthData.forEach((usage, index) => {
    console.log(`🔍 TOPOLOGY: Processing usage entry ${index}:`, {
      link: usage.link,
      rx_mbps: usage.rx_mbps,
      tx_mbps: usage.tx_mbps,
      rx_bps: usage.rx_bps,
      tx_bps: usage.tx_bps,
      hasPreCalculated: !!(usage.rx_mbps !== undefined || usage.tx_mbps !== undefined),
      fullEntry: usage,
    });

    if (usage.link && usage.ipackets !== 'IPACKETS') {
      // Use pre-calculated bandwidth from API instead of recalculating
      const bandwidth = {
        rxMbps: parseFloat(usage.rx_mbps) || 0,
        txMbps: parseFloat(usage.tx_mbps) || 0,
        totalMbps: (parseFloat(usage.rx_mbps) || 0) + (parseFloat(usage.tx_mbps) || 0),
        rxBytesPerSecond: parseInt(usage.rx_bps) || 0,
        txBytesPerSecond: parseInt(usage.tx_bps) || 0,
      };

      console.log('🔍 TOPOLOGY: Using pre-calculated bandwidth for', usage.link, ':', bandwidth);
      bandwidthMap.set(usage.link, bandwidth);
    } else {
      console.log('🔍 TOPOLOGY: Skipping entry - link:', usage.link, 'ipackets:', usage.ipackets);
    }
  });

  console.log('🔍 TOPOLOGY: Bandwidth map created with', bandwidthMap.size, 'entries');
  console.log('🔍 TOPOLOGY: Bandwidth map contents:', Array.from(bandwidthMap.entries()));

  // Create a map for IP address assignments
  const ipMap = new Map();
  ipAddresses.forEach(addr => {
    if (addr.interface && addr.ip_address) {
      if (!ipMap.has(addr.interface)) {
        ipMap.set(addr.interface, []);
      }
      ipMap.get(addr.interface).push(addr);
    }
  });

  // If vnics array is empty, extract VNICs from interfaces array
  const allVnics =
    vnics.length > 0
      ? vnics
      : interfaces.filter(iface => iface.class === 'vnic' && iface.link && iface.link !== 'LINK');

  const nodes = createNodes({
    interfaces,
    aggregates,
    etherstubs,
    vnics: allVnics,
    zones,
    bandwidthMap,
    ipMap,
  });

  const edges = createEdges({
    interfaces,
    aggregates,
    vnics: allVnics,
    zones,
    bandwidthMap,
  });

  // 6. Handle special cases and detect patterns
  detectTopologyPatterns({
    aggregates,
    etherstubs,
    vnics,
    zones,
  });

  return { nodes, edges };
};

/**
 * Helper function to get VLAN color for consistency
 */
export const getVlanColor = vlanId => {
  if (!vlanId || vlanId === 0) {
    return '#48c78e';
  } // Default/untagged - green

  const colors = [
    '#3273dc', // Blue
    '#48c78e', // Green
    '#ffdd57', // Yellow
    '#f14668', // Red
    '#00d1b2', // Teal
    '#ff9f43', // Orange
    '#6f42c1', // Purple
    '#e83e8c', // Pink
  ];

  return colors[vlanId % colors.length];
};

/**
 * Helper function to get bandwidth saturation color
 */
export const getBandwidthColor = (current, maximum) => {
  if (!maximum || maximum === 0) {
    return '#dbdbdb';
  } // Gray for unknown

  const saturation = (current / maximum) * 100;

  if (saturation < 25) {
    return '#48c78e';
  } // Green - Light load
  if (saturation < 50) {
    return '#ffdd57';
  } // Yellow - Moderate load
  if (saturation < 75) {
    return '#ff9f43';
  } // Orange - Heavy load
  if (saturation < 90) {
    return '#f14668';
  } // Red - Critical load
  return '#e74c3c'; // Dark Red - Overloaded
};
