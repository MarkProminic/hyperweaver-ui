/**
 * Creates React Flow edge objects from various network data sources.
 */
export const createEdges = ({
  interfaces = [],
  aggregates = [],
  vnics = [],
  zones = [],
  bandwidthMap = new Map(),
}) => {
  const edges = [];

  const physicalNics = interfaces.filter(
    iface => iface.class === 'phys' && iface.link && iface.link !== 'LINK'
  );
  const etherstubs = interfaces.filter(
    iface => iface.class === 'stub' && iface.link && iface.link !== 'LINK'
  );

  // 1. Connect member NICs to aggregates
  aggregates.forEach(aggr => {
    const memberNics = aggr.over ? aggr.over.split(',').map(n => n.trim()) : [];
    memberNics.forEach(memberNic => {
      const memberNicData = physicalNics.find(nic => nic.link === memberNic);
      if (memberNicData) {
        const memberBandwidth = bandwidthMap.get(memberNic) || {
          rxMbps: 0,
          txMbps: 0,
          totalMbps: 0,
        };
        const linkSpeed = parseInt(memberNicData.speed) || 1000;

        // Downlink edge (RX)
        edges.push({
          id: `${memberNic}-${aggr.link}-rx`,
          source: memberNic,
          target: aggr.link,
          type: 'floating',
          animated: memberBandwidth.rxMbps > 0,
          data: {
            type: 'aggregation',
            bandwidth: {
              ...memberBandwidth,
              totalMbps: memberBandwidth.rxMbps,
              direction: 'downlink',
            },
            linkSpeed,
            sourceInterface: memberNic,
            targetInterface: aggr.link,
            flowDirection: 'rx',
          },
        });

        // Uplink edge (TX)
        edges.push({
          id: `${memberNic}-${aggr.link}-tx`,
          source: aggr.link,
          target: memberNic,
          type: 'floating',
          animated: memberBandwidth.txMbps > 0,
          data: {
            type: 'aggregation',
            bandwidth: {
              ...memberBandwidth,
              totalMbps: memberBandwidth.txMbps,
              direction: 'uplink',
            },
            linkSpeed,
            sourceInterface: aggr.link,
            targetInterface: memberNic,
            flowDirection: 'tx',
          },
        });
      }
    });
  });

  // 2. Connect VNICs to their underlying layer
  vnics.forEach(vnic => {
    if (vnic.over) {
      const bandwidth = bandwidthMap.get(vnic.link) || {
        rxMbps: 0,
        txMbps: 0,
        totalMbps: 0,
      };
      const sourceInterface =
        physicalNics.find(nic => nic.link === vnic.over) ||
        aggregates.find(agg => agg.link === vnic.over) ||
        etherstubs.find(stub => stub.link === vnic.over);
      const linkSpeed = sourceInterface ? parseInt(sourceInterface.speed) || 1000 : 1000;

      // Downlink edge (RX)
      edges.push({
        id: `${vnic.over}-${vnic.link}-rx`,
        source: vnic.over,
        target: vnic.link,
        type: 'floating',
        animated: bandwidth.rxMbps > 0,
        data: {
          type: vnic.vid ? 'vlan' : 'direct',
          vlanId: vnic.vid,
          bandwidth: {
            ...bandwidth,
            totalMbps: bandwidth.rxMbps,
            direction: 'downlink',
          },
          sourceInterface: vnic.over,
          targetInterface: vnic.link,
          linkSpeed,
          flowDirection: 'rx',
        },
      });

      // Uplink edge (TX)
      edges.push({
        id: `${vnic.over}-${vnic.link}-tx`,
        source: vnic.link,
        target: vnic.over,
        type: 'floating',
        animated: bandwidth.txMbps > 0,
        data: {
          type: vnic.vid ? 'vlan' : 'direct',
          vlanId: vnic.vid,
          bandwidth: {
            ...bandwidth,
            totalMbps: bandwidth.txMbps,
            direction: 'uplink',
          },
          sourceInterface: vnic.link,
          targetInterface: vnic.over,
          linkSpeed,
          flowDirection: 'tx',
        },
      });
    }
  });

  // 3. Connect zones to their VNICs
  zones.forEach(zone => {
    const zoneVnics = vnics.filter(vnic => vnic.zone === zone.name);
    zoneVnics.forEach(vnic => {
      const vnicBandwidth = bandwidthMap.get(vnic.link) || {
        rxMbps: 0,
        txMbps: 0,
        totalMbps: 0,
      };
      const vnicData = vnics.find(v => v.link === vnic.link);
      const linkSpeed = vnicData ? parseInt(vnicData.speed) || 1000 : 1000;

      // Downlink edge (RX)
      edges.push({
        id: `${vnic.link}-to-${zone.name}-rx`,
        source: vnic.link,
        target: zone.name,
        type: 'floating',
        animated: vnicBandwidth.rxMbps > 0,
        data: {
          type: 'assignment',
          bandwidth: {
            ...vnicBandwidth,
            totalMbps: vnicBandwidth.rxMbps,
            direction: 'downlink',
          },
          sourceInterface: vnic.link,
          targetInterface: zone.name,
          linkSpeed,
          flowDirection: 'rx',
        },
      });

      // Uplink edge (TX)
      edges.push({
        id: `${zone.name}-to-${vnic.link}-tx`,
        source: zone.name,
        target: vnic.link,
        type: 'floating',
        animated: vnicBandwidth.txMbps > 0,
        data: {
          type: 'assignment',
          bandwidth: {
            ...vnicBandwidth,
            totalMbps: vnicBandwidth.txMbps,
            direction: 'uplink',
          },
          sourceInterface: zone.name,
          targetInterface: vnic.link,
          linkSpeed,
          flowDirection: 'tx',
        },
      });
    });
  });

  return edges;
};
