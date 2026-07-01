/**
 * Creates React Flow node objects from various network data sources.
 */
export const createNodes = ({
  interfaces = [],
  aggregates = [],
  etherstubs = [],
  vnics = [],
  zones = [],
  bandwidthMap = new Map(),
  ipMap = new Map(),
}) => {
  const nodes = [];

  // Extract physical NICs from the mixed interfaces array
  const physicalNics = interfaces.filter(
    iface => iface.class === 'phys' && iface.link && iface.link !== 'LINK'
  );

  // 1. Physical NICs
  physicalNics.forEach((nic, index) => {
    const bandwidth = bandwidthMap.get(nic.link) || {
      rxMbps: 0,
      txMbps: 0,
      totalMbps: 0,
    };
    const ips = ipMap.get(nic.link) || [];
    nodes.push({
      id: nic.link,
      type: 'physicalNic',
      position: { x: 100, y: 100 + index * 120 }, // Placeholder
      data: {
        label: nic.link,
        class: nic.class,
        mtu: nic.mtu,
        state: nic.state,
        over: nic.over,
        speed: nic.speed,
        bandwidth,
        ipAddresses: ips,
        flags: nic.flags,
      },
    });
  });

  // 2. Link Aggregates
  aggregates.forEach((aggr, index) => {
    const bandwidth = bandwidthMap.get(aggr.link) || {
      rxMbps: 0,
      txMbps: 0,
      totalMbps: 0,
    };
    const ips = ipMap.get(aggr.link) || [];
    const memberNics = aggr.over ? aggr.over.split(',').map(n => n.trim()) : [];
    nodes.push({
      id: aggr.link,
      type: 'aggregate',
      position: { x: 350, y: 100 + index * 120 }, // Placeholder
      data: {
        label: aggr.link,
        members: memberNics,
        policy: aggr.policy,
        lacpActivity: aggr.lacp_activity,
        lacpTimeout: aggr.lacp_timeout,
        flags: aggr.flags,
        bandwidth,
        ipAddresses: ips,
      },
    });
  });

  // 3. Etherstubs
  etherstubs.forEach((stub, index) => {
    const connectedVnics = vnics.filter(vnic => vnic.over === stub.link);
    nodes.push({
      id: stub.link,
      type: 'etherstub',
      position: { x: 600, y: 100 + index * 120 }, // Placeholder
      data: {
        label: stub.link,
        connectedVnics: connectedVnics.map(v => v.link),
        class: stub.class,
        flags: stub.flags,
      },
    });
  });

  // 4. VNICs
  vnics.forEach((vnic, index) => {
    const bandwidth = bandwidthMap.get(vnic.link) || {
      rxMbps: 0,
      txMbps: 0,
      totalMbps: 0,
    };
    const ips = ipMap.get(vnic.link) || [];
    nodes.push({
      id: vnic.link,
      type: 'vnic',
      position: { x: 850, y: 100 + index * 80 }, // Placeholder
      data: {
        label: vnic.link,
        over: vnic.over,
        vlanId: vnic.vid,
        zone: vnic.zone,
        macaddress: vnic.macaddress,
        macaddrtype: vnic.macaddrtype,
        state: vnic.state,
        speed: vnic.speed,
        mtu: vnic.mtu,
        bandwidth,
        ipAddresses: ips,
      },
    });
  });

  // 5. Zones
  zones.forEach((zone, index) => {
    const zoneVnics = vnics.filter(vnic => vnic.zone === zone.name);
    nodes.push({
      id: zone.name,
      type: 'zone',
      position: { x: 1100, y: 100 + index * 100 }, // Placeholder
      data: {
        label: zone.name,
        status: zone.status,
        zonename: zone.zonename,
        zonepath: zone.zonepath,
        autoboot: zone.autoboot,
        brand: zone.brand,
        ipType: zone.ipType,
        vnics: zoneVnics.map(v => v.link),
      },
    });
  });

  return nodes;
};
