/**
 * Detect common topology patterns and add metadata
 */
export const detectTopologyPatterns = ({ aggregates, etherstubs, vnics, zones }) => {
  const patterns = [];

  // Detect high availability setups
  if (aggregates.length > 0) {
    patterns.push({
      type: 'high-availability',
      description: 'Link aggregation detected for network redundancy',
      count: aggregates.length,
    });
  }

  // Detect virtualized switching
  if (etherstubs.length > 0) {
    patterns.push({
      type: 'virtualized-switching',
      description: 'Virtual switching infrastructure using etherstubs',
      count: etherstubs.length,
    });
  }

  // Detect VLAN segmentation
  const vlanCount = new Set(vnics.filter(v => v.vid).map(v => v.vid)).size;
  if (vlanCount > 1) {
    patterns.push({
      type: 'network-segmentation',
      description: `Network segmentation using ${vlanCount} VLANs`,
      count: vlanCount,
    });
  }

  // Detect zone networking complexity
  const zonesWithMultipleVnics = zones.filter(
    zone => vnics.filter(vnic => vnic.zone === zone.name).length > 1
  ).length;

  if (zonesWithMultipleVnics > 0) {
    patterns.push({
      type: 'multi-homed-zones',
      description: 'Zones with multiple network interfaces detected',
      count: zonesWithMultipleVnics,
    });
  }

  return patterns;
};
