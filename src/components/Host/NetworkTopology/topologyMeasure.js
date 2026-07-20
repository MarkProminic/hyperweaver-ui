import { widthForCount, motionState, MOTION_NO_FEED } from './topologyPalette';

const bezier = (x1, y1, x2, y2) => {
  const mid = (x1 + x2) / 2;
  return `M${x1},${y1} C ${mid},${y1} ${mid},${y2} ${x2},${y2}`;
};

/**
 * Ghost cards for staged targets that have no live network card yet — the
 * full-preview rule: every staged move renders its complete post-apply path,
 * so a rewire/add onto a bare (carrier, vlan) combo materializes a planned
 * network card instead of a dangling wire.
 * @param {object} graph - the host graph
 * @param {Array<object>} pendingMoves - staged tray rows for this host
 * @returns {Array<object>} synthetic network objects (live 0, planned 1)
 */
export const plannedNetworksFor = (graph, pendingMoves) => {
  const known = new Set(graph.networks.map(net => net.id));
  const map = new Map();
  pendingMoves.forEach(move => {
    if (!move.toNetId || move.isRemove || known.has(move.toNetId) || map.has(move.toNetId)) {
      return;
    }
    const isSwitch = graph.switches.some(swtch => swtch.id === move.toCarrier);
    let kind = move.toVlanId > 0 ? 'vlan' : 'untagged';
    if (isSwitch) {
      kind = 'internal';
    }
    if (move.hostKind === 'vbox' && move.toMode === 'bridged') {
      kind = 'bridged';
    }
    map.set(move.toNetId, {
      id: move.toNetId,
      carrier: move.toCarrier,
      carrierKind: isSwitch ? 'etherstub' : 'phys',
      vlanId: move.toVlanId || 0,
      kind,
      detail: null,
      live: 0,
      planned: 1,
      members: [],
      usage: null,
    });
  });
  return [...map.values()];
};

/**
 * Pure geometry pass for the SVG overlay: measured DOM anchor rects → bezier
 * path descriptors. Produces the live nic→carrier and carrier→network
 * connectors plus the dashed staged-rewire segments routed chip → target
 * carrier → network (the network leg is skipped when the staged target has no
 * network card yet).
 * @param {object} input - container, anchors map and the visible graph slices
 * @returns {{paths: Array<object>, pending: Array<object>}}
 */
export const buildTopologyPaths = ({
  container,
  anchors,
  visibleConsumers,
  visibleNetworks,
  isolatedNet,
  colors,
  graph,
  pendingByNic,
  pendingMoves,
}) => {
  const box = container.getBoundingClientRect();
  const anchorPoint = (key, side) => {
    const el = anchors.get(key);
    if (!el || !el.isConnected) {
      return null;
    }
    const rect = el.getBoundingClientRect();
    return {
      x: (side === 'right' ? rect.right : rect.left) - box.left,
      y: rect.top + rect.height / 2 - box.top,
    };
  };

  const paths = [];
  visibleConsumers.forEach(consumer => {
    consumer.nics.forEach(nic => {
      if (isolatedNet && nic.networkId !== isolatedNet) {
        return;
      }
      const from =
        anchorPoint(`nic:${consumer.id}|${nic.link}`, 'right') ||
        anchorPoint(`consumer:${consumer.id}`, 'right');
      const to = anchorPoint(`carrier:${nic.over}`, 'left');
      if (!from || !to) {
        return;
      }
      paths.push({
        id: `nic-${consumer.id}-${nic.link}`,
        d: bezier(from.x, from.y, to.x, to.y),
        color: colors.get(nic.networkId),
        width: nic.ghost ? 2.5 : 3,
        ghost: nic.ghost,
        struck: pendingByNic.has(`${consumer.id}|${nic.link}`),
        netId: nic.networkId,
        motion: nic.ghost ? MOTION_NO_FEED : motionState(graph.feedPresent, nic.usage),
        rx: nic.usage?.rxMbps || 0,
        tx: nic.usage?.txMbps || 0,
        speedMbps: nic.usage?.speedMbps || 0,
        mx: (from.x + to.x) / 2,
        my: (from.y + to.y) / 2,
      });
    });
  });
  visibleNetworks.forEach(net => {
    const from = anchorPoint(`carrier:${net.carrier}`, 'right');
    const to = anchorPoint(`network:${net.id}`, 'left');
    if (!from || !to) {
      return;
    }
    const carrier = graph.adapters.find(a => a.id === net.carrier);
    paths.push({
      id: `net-${net.id}`,
      d: bezier(from.x, from.y, to.x, to.y),
      color: colors.get(net.id),
      width: widthForCount(net.live),
      ghost: net.live === 0,
      netId: net.id,
      motion: net.live === 0 ? MOTION_NO_FEED : motionState(graph.feedPresent, net.usage),
      rx: net.usage?.rxMbps || 0,
      tx: net.usage?.txMbps || 0,
      speedMbps: carrier?.speedMbps || 0,
      cap: true,
      ex: to.x,
      ey: to.y,
      mx: (from.x + to.x) / 2,
      my: (from.y + to.y) / 2,
    });
  });

  const pending = [];
  pendingMoves.forEach(move => {
    const from =
      anchorPoint(`nic:${move.machineName}|${move.link}`, 'right') ||
      anchorPoint(`consumer:${move.machineName}`, 'right');
    const carrierIn = anchorPoint(`carrier:${move.toCarrier}`, 'left');
    const carrierOut = anchorPoint(`carrier:${move.toCarrier}`, 'right');
    const to = anchorPoint(`network:${move.toNetId}`, 'left');
    if (from && carrierIn) {
      pending.push({
        id: `pending-a-${move.machineName}-${move.link}`,
        d: bezier(from.x, from.y, carrierIn.x, carrierIn.y),
      });
    }
    if (carrierOut && to) {
      pending.push({
        id: `pending-b-${move.machineName}-${move.link}`,
        d: bezier(carrierOut.x, carrierOut.y, to.x, to.y),
      });
    } else if (carrierOut && move.toNetId) {
      pending.push({
        id: `pending-b-${move.machineName}-${move.link}`,
        d: bezier(carrierOut.x, carrierOut.y, carrierOut.x + 70, carrierOut.y),
      });
    }
  });

  return { paths, pending };
};
