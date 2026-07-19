/**
 * Visual-encoding rules for the network topology renderer.
 *
 * State colors and network colors are separate palettes by design: red/green/
 * orange always mean state (running/up, selected, pending), never a network.
 * Network colors are assigned deterministically per screen, largest network
 * first, so the same screen always colors the same way.
 */

const NETWORK_COLOR_VARS = [
  'var(--hw-topo-net-1)',
  'var(--hw-topo-net-2)',
  'var(--hw-topo-net-3)',
  'var(--hw-topo-net-4)',
  'var(--hw-topo-net-5)',
  'var(--hw-topo-net-6)',
  'var(--hw-topo-net-7)',
  'var(--hw-topo-net-8)',
];

export const INTERNAL_NET_COLOR = 'var(--hw-topo-net-internal)';
export const GHOST_COLOR = 'var(--hw-topo-ghost)';
export const PENDING_COLOR = 'var(--hw-topo-pending)';

/**
 * Assign a color to every network id, ordered by live member count (largest
 * first) so the dominant networks always claim the most distinct hues.
 * Internal (etherstub) networks share one reserved neutral; planned-only
 * networks render in the ghost color.
 * @param {Array<{id: string, kind: string, live: number}>} networks
 * @returns {Map<string, string>} network id → CSS color value
 */
export const assignNetworkColors = networks => {
  const colors = new Map();
  const ranked = networks
    .filter(net => net.kind !== 'internal' && net.live > 0)
    .sort((a, b) => b.live - a.live || String(a.id).localeCompare(String(b.id)));
  ranked.forEach((net, index) => {
    colors.set(net.id, NETWORK_COLOR_VARS[index % NETWORK_COLOR_VARS.length]);
  });
  networks.forEach(net => {
    if (!colors.has(net.id)) {
      colors.set(net.id, net.live > 0 ? INTERNAL_NET_COLOR : GHOST_COLOR);
    }
  });
  return colors;
};

/**
 * Ribbon/wire width from member count: w = 4 + 2·√n, capped for sanity.
 * The one width rule for every view; stated in the on-page legend.
 * @param {number} count
 * @returns {number}
 */
export const widthForCount = count => {
  const n = Math.max(0, Number(count) || 0);
  return Math.min(18, 4 + 2 * Math.sqrt(n));
};

export const MOTION_TRAFFIC = 'traffic';
export const MOTION_IDLE = 'idle';
export const MOTION_NO_FEED = 'no-feed';

/**
 * The three-state motion grammar: measured traffic moves, measured idle is
 * static with an explicit zero, no-feed is static with hollow caps. Motion is
 * impossible without a measurement by construction.
 * @param {boolean} feedPresent - whether this host has a usage feed
 * @param {{rxMbps: number, txMbps: number}|null} usage
 * @returns {string} one of MOTION_TRAFFIC | MOTION_IDLE | MOTION_NO_FEED
 */
export const motionState = (feedPresent, usage) => {
  if (!feedPresent) {
    return MOTION_NO_FEED;
  }
  const total = (usage?.rxMbps || 0) + (usage?.txMbps || 0);
  return total > 0 ? MOTION_TRAFFIC : MOTION_IDLE;
};

/**
 * Dash-animation period in seconds for a measured rate — faster with more
 * traffic, log-scaled so Kbps and Gbps both read as motion.
 * @param {number} totalMbps
 * @returns {number}
 */
export const flowPeriod = totalMbps => {
  if (totalMbps <= 0) {
    return 0;
  }
  return Math.max(0.5, 3.2 - Math.log10(totalMbps + 1) * 1.1);
};

/**
 * Utilization fraction 0..1 against a link speed in Mbps (0 when unknown).
 * @param {number} totalMbps
 * @param {number} speedMbps
 * @returns {number}
 */
export const utilization = (totalMbps, speedMbps) => {
  const speed = Number(speedMbps) || 0;
  if (speed <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (Number(totalMbps) || 0) / speed));
};

/**
 * Temperature color for a utilization fraction — the one HSL ramp the whole
 * app uses (blue idle → cyan → green → yellow → orange → red saturated).
 * @param {number} frac - 0..1
 * @returns {string} hsl() color
 */
export const utilizationColor = frac => {
  const u = Math.min(1, Math.max(0, frac)) * 100;
  if (u === 0) {
    return 'var(--hw-topo-idle-flow)';
  }
  let hue;
  let sat;
  let light;
  if (u <= 10) {
    hue = 240 - (u / 10) * 20;
    sat = 85 + (u / 10) * 10;
    light = 55 + (u / 10) * 10;
  } else if (u <= 25) {
    const f = (u - 10) / 15;
    hue = 220 - f * 40;
    sat = 95;
    light = 65 + f * 5;
  } else if (u <= 50) {
    const f = (u - 25) / 25;
    hue = 180 - f * 60;
    sat = 95 - f * 15;
    light = 70;
  } else if (u <= 75) {
    const f = (u - 50) / 25;
    hue = 120 - f * 60;
    sat = 80 + f * 15;
    light = 70 - f * 5;
  } else if (u <= 90) {
    const f = (u - 75) / 15;
    hue = 60 - f * 30;
    sat = 95;
    light = 65 - f * 5;
  } else {
    const f = (u - 90) / 10;
    hue = 30 - f * 30;
    sat = 95 + f * 5;
    light = 60 - f * 10;
  }
  return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`;
};

/**
 * Human bandwidth label from Mbps ("—" when no feed, "0" when measured idle).
 * @param {boolean} feedPresent
 * @param {{rxMbps: number, txMbps: number}|null} usage
 * @returns {{rx: string, tx: string, total: string}|null}
 */
export const rateLabels = (feedPresent, usage) => {
  if (!feedPresent) {
    return null;
  }
  const fmt = mbps => {
    const v = Number(mbps) || 0;
    if (v >= 1000) {
      return `${(v / 1000).toFixed(1)} Gbps`;
    }
    if (v >= 1) {
      return `${v.toFixed(1)} Mbps`;
    }
    return `${Math.round(v * 1000)} Kbps`;
  };
  const rx = usage?.rxMbps || 0;
  const tx = usage?.txMbps || 0;
  return { rx: fmt(rx), tx: fmt(tx), total: fmt(rx + tx) };
};
