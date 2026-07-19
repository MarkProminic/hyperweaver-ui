/**
 * Pure graph builder: agent wire rows → the topology model the renderer draws.
 * No fetching, no React — deterministic data in, data out, unit-testable.
 *
 * Model shape (one host):
 *   adapters   phys NICs + aggregates (aggregates carry their member links)
 *   switches   etherstubs (internal switches), with port counts
 *   networks   derived: one per (carrier, vlan-id) with live/planned counts
 *   consumers  machines + the global zone, each with its nic list (ghosts dashed)
 *   usage      per-link rates, filtered against links that actually exist
 */

const asArray = value => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
};

const parseConfig = raw => {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
};

const isGlobalZone = zone => !zone || zone === '--' || zone.toLowerCase() === 'global';

const networkKey = (carrier, vid) => `${carrier}|${Number(vid) || 0}`;

const networkKind = (carrierKind, vid) => {
  if (carrierKind === 'etherstub') {
    return 'internal';
  }
  return Number(vid) > 0 ? 'vlan' : 'untagged';
};

/**
 * Build one host's topology graph from the wire rows the networking loader
 * already fetches (plus the machines rows, whose zoneweaver `configuration`
 * carries zonecfg net resources for ghost/planned rendering).
 * @param {object} input
 * @returns {object} graph
 */
export const buildHostGraph = ({
  interfaces = [],
  aggregates = [],
  etherstubs = [],
  vnics = [],
  machines = [],
  usage = [],
  ipAddresses = [],
}) => {
  const physRows = interfaces.filter(
    row => row.class === 'phys' && row.link && row.link !== 'LINK'
  );
  const stubRows = [
    ...etherstubs,
    ...interfaces.filter(row => row.class === 'stub' || row.class === 'etherstub'),
  ].filter(
    (row, index, all) => row.link && all.findIndex(other => other.link === row.link) === index
  );
  const vnicRows = vnics.filter(row => row.link && row.link !== 'LINK');

  const liveLinks = new Set([
    ...physRows.map(row => row.link),
    ...stubRows.map(row => row.link),
    ...vnicRows.map(row => row.link),
    ...aggregates.map(row => row.link),
  ]);

  const usageByLink = new Map();
  const staleUsageLinks = [];
  usage.forEach(row => {
    if (!row.link || row.ipackets === 'IPACKETS') {
      return;
    }
    if (!liveLinks.has(row.link)) {
      staleUsageLinks.push(row.link);
      return;
    }
    usageByLink.set(row.link, {
      rxMbps: parseFloat(row.rx_mbps) || 0,
      txMbps: parseFloat(row.tx_mbps) || 0,
      speedMbps: parseFloat(row.interface_speed_mbps) || 0,
    });
  });
  const feedPresent = usage.length > 0;

  const ipsByLink = new Map();
  ipAddresses.forEach(row => {
    if (!row.interface || !row.ip_address) {
      return;
    }
    if (!ipsByLink.has(row.interface)) {
      ipsByLink.set(row.interface, []);
    }
    ipsByLink.get(row.interface).push(row);
  });

  const memberNames = new Set();
  const adapters = [];
  aggregates.forEach(row => {
    const members = (row.over || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => {
        memberNames.add(name);
        const phys = physRows.find(p => p.link === name);
        return { name, state: phys?.state || 'unknown', speed: parseInt(phys?.speed, 10) || 0 };
      });
    adapters.push({
      id: row.link,
      name: row.link,
      kind: 'aggr',
      state: row.state || 'unknown',
      speedMbps: members.reduce((sum, m) => sum + (m.speed || 0), 0),
      mtu: parseInt(row.mtu, 10) || null,
      members,
      policy: row.policy || null,
      lacpActivity: row.lacp_activity || null,
      ips: ipsByLink.get(row.link) || [],
      usage: usageByLink.get(row.link) || null,
    });
  });
  physRows.forEach(row => {
    adapters.push({
      id: row.link,
      name: row.link,
      kind: 'phys',
      state: row.state || 'unknown',
      speedMbps: parseInt(row.speed, 10) || 0,
      mtu: parseInt(row.mtu, 10) || null,
      members: [],
      memberOf: adapters.find(a => a.members.some(m => m.name === row.link))?.id || null,
      ips: ipsByLink.get(row.link) || [],
      usage: usageByLink.get(row.link) || null,
    });
  });

  const switches = stubRows.map(row => ({
    id: row.link,
    name: row.link,
    state: row.state || 'unknown',
    mtu: parseInt(row.mtu, 10) || null,
    ports: vnicRows.filter(v => v.over === row.link).length,
    usage: usageByLink.get(row.link) || null,
  }));

  const carrierKindOf = name => {
    if (switches.some(s => s.id === name)) {
      return 'etherstub';
    }
    if (adapters.some(a => a.id === name && a.kind === 'aggr')) {
      return 'aggr';
    }
    return 'phys';
  };

  const networks = new Map();
  const touchNetwork = (carrier, vid, { live = 0, planned = 0, member = null }) => {
    const key = networkKey(carrier, vid);
    if (!networks.has(key)) {
      const carrierKind = carrierKindOf(carrier);
      networks.set(key, {
        id: key,
        carrier,
        carrierKind,
        vlanId: Number(vid) || 0,
        kind: networkKind(carrierKind, vid),
        live: 0,
        planned: 0,
        members: [],
      });
    }
    const net = networks.get(key);
    net.live += live;
    net.planned += planned;
    if (member) {
      net.members.push(member);
    }
    return net;
  };

  const machineRows = machines.filter(row => row.name || row.zonename);
  const consumers = [];
  const vnicsByZone = new Map();
  vnicRows.forEach(row => {
    const zone = isGlobalZone(row.zone) ? 'global' : row.zone;
    if (!vnicsByZone.has(zone)) {
      vnicsByZone.set(zone, []);
    }
    vnicsByZone.get(zone).push(row);
  });

  const buildNic = (row, ghost) => {
    const netId = networkKey(row.over, row.vid);
    if (!ghost) {
      touchNetwork(row.over, row.vid, { live: 1, member: { link: row.link, zone: row.zone } });
    } else {
      touchNetwork(row.over, row.vid, { planned: 1 });
    }
    return {
      link: row.link,
      over: row.over,
      vlanId: Number(row.vid) || 0,
      mac: row.macaddress || row['mac-addr'] || null,
      mtu: parseInt(row.mtu, 10) || null,
      networkId: netId,
      ghost,
      usage: ghost ? null : usageByLink.get(row.link) || null,
    };
  };

  machineRows.forEach(row => {
    const name = row.name || row.zonename;
    const status = (row.status || row.state || '').toLowerCase();
    const running = status === 'running';
    const liveNics = (vnicsByZone.get(name) || []).map(v => buildNic(v, false));
    const liveNames = new Set(liveNics.map(nic => nic.link));
    const configured = parseConfig(row.configuration);
    const ghostNics = asArray(configured.net)
      .filter(net => net && (net.physical || net['global-nic']))
      .filter(net => !liveNames.has(net.physical))
      .map(net =>
        buildNic(
          {
            link: net.physical || `${name}-planned`,
            over: net['global-nic'] || net.over || 'unknown',
            vid: net['vlan-id'] || 0,
            macaddress: net['mac-addr'] || null,
            zone: name,
          },
          true
        )
      );
    consumers.push({
      id: name,
      name,
      type: 'machine',
      status: status || 'unknown',
      running,
      ghostOnly: !running && liveNics.length === 0,
      nics: [...liveNics, ...ghostNics],
    });
  });

  const globalVnics = (vnicsByZone.get('global') || []).map(v => buildNic(v, false));
  if (globalVnics.length > 0) {
    consumers.push({
      id: 'global',
      name: 'global',
      type: 'global',
      status: 'running',
      running: true,
      ghostOnly: false,
      nics: globalVnics,
    });
  }

  const networkList = [...networks.values()].map(net => ({
    ...net,
    usage: net.members.reduce(
      (acc, member) => {
        const memberUsage = usageByLink.get(member.link);
        acc.rxMbps += memberUsage?.rxMbps || 0;
        acc.txMbps += memberUsage?.txMbps || 0;
        return acc;
      },
      { rxMbps: 0, txMbps: 0 }
    ),
  }));

  const issues = {
    downAdapters: adapters.filter(a => a.kind === 'phys' && !a.memberOf && a.state === 'down'),
    emptySwitches: switches.filter(s => s.ports === 0),
    unassignedVnics: vnicRows.filter(v => isGlobalZone(v.zone)).map(v => v.link),
    staleUsageLinks: [...new Set(staleUsageLinks)],
    disconnectedMachines: consumers.filter(
      c => c.type === 'machine' && c.running && c.nics.length === 0
    ),
  };

  return {
    feedPresent,
    adapters,
    switches,
    networks: networkList,
    consumers,
    usageByLink,
    issues,
  };
};

const ipv4SubnetOf = row => {
  if (!row?.ip_address || !row.prefix_length || (row.ip_version || 'v4') !== 'v4') {
    return null;
  }
  const parts = row.ip_address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return null;
  }
  const len = Number(row.prefix_length);
  if (!len || len < 1 || len > 32) {
    return null;
  }
  const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = len === 32 ? 0xffffffff : (0xffffffff << (32 - len)) >>> 0;
  const net = (ipInt & mask) >>> 0;
  return `${(net >>> 24) & 255}.${(net >>> 16) & 255}.${(net >>> 8) & 255}.${net & 255}/${len}`;
};

/**
 * Cross-host shared-network detection on SUBNET EVIDENCE only: a network is
 * "shared" when the same (vlan-id, IPv4 subnet) pair appears on two or more
 * hosts — the subnet read from the network's carrier addresses. VLANs with no
 * host address carry no evidence and are never merged by guesswork.
 * @param {Array<{server: object, graph: object}>} hosts
 * @returns {Array<{key: string, subnet: string, vlanId: number, hosts: string[]}>}
 */
export const detectSharedNetworks = hosts => {
  const byKey = new Map();
  hosts.forEach(({ server, graph }) => {
    const hostName = server.entityName || server.hostname;
    const hostKey = `${server.hostname}:${server.port}`;
    graph.networks.forEach(net => {
      const carrier = graph.adapters.find(a => a.id === net.carrier);
      const subnets = (carrier?.ips || []).map(ipv4SubnetOf).filter(Boolean);
      subnets.forEach(subnet => {
        const key = `${net.vlanId}|${subnet}`;
        if (!byKey.has(key)) {
          byKey.set(key, { key, subnet, vlanId: net.vlanId, hosts: [], refs: [] });
        }
        const entry = byKey.get(key);
        if (!entry.hosts.includes(hostName)) {
          entry.hosts.push(hostName);
        }
        entry.refs.push({ hostKey, netId: net.id });
      });
    });
  });
  return [...byKey.values()].filter(entry => entry.hosts.length > 1);
};

/**
 * The machine-detail slice: only the paths one machine owns.
 * @param {object} graph - buildHostGraph output
 * @param {string} machineName
 * @returns {object|null} reduced graph, or null when the machine has no nics
 */
export const sliceForMachine = (graph, machineName) => {
  const consumer = graph.consumers.find(c => c.id === machineName);
  if (!consumer || consumer.nics.length === 0) {
    return null;
  }
  const netIds = new Set(consumer.nics.map(nic => nic.networkId));
  const carriers = new Set(consumer.nics.map(nic => nic.over));
  return {
    ...graph,
    consumers: [consumer],
    networks: graph.networks.filter(net => netIds.has(net.id)),
    adapters: graph.adapters.filter(
      a => carriers.has(a.id) || a.members.some(m => carriers.has(m.name))
    ),
    switches: graph.switches.filter(s => carriers.has(s.id)),
  };
};
