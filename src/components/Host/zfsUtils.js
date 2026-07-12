// Shared helpers for the ZFS pools/datasets panels.

/** key=value lines → a properties object; blank and =-less lines drop. */
export const parsePropertyLines = text => {
  const properties = {};
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        properties[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });
  return properties;
};

/** zpool health → badge class, colored by meaning. */
export const healthBadgeClass = health => {
  switch ((health || '').toUpperCase()) {
    case 'ONLINE':
      return 'text-bg-success';
    case 'DEGRADED':
      return 'text-bg-warning';
    case 'FAULTED':
    case 'UNAVAIL':
    case 'REMOVED':
    case 'OFFLINE':
      return 'text-bg-danger';
    default:
      return 'text-bg-secondary';
  }
};

/** The 202-queued outcome line — every mutation on this surface is a task. */
export const queuedMessage = (result, fallback) => {
  const data = result.data || {};
  const base = data.message || fallback;
  return data.task_id ? `${base} (task ${data.task_id})` : base;
};

/** Raw byte counts (numbers or bare digit strings) → human units; already-
 *  human strings ("1.2T") pass through; '-'/empty → em dash. */
export const humanSize = value => {
  if (value === null || value === undefined || value === '' || value === '-') {
    return '—';
  }
  const isBareNumber = typeof value === 'number' || /^\d+(?:\.\d+)?$/u.test(String(value).trim());
  if (!isBareNumber) {
    return String(value);
  }
  let bytes = Number(value);
  const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E'];
  let unit = 0;
  while (bytes >= 1024 && unit < units.length - 1) {
    bytes /= 1024;
    unit += 1;
  }
  const rounded = bytes >= 100 || unit === 0 ? Math.round(bytes) : Number(bytes.toFixed(1));
  return `${rounded}${units[unit]}`;
};

/** "1.23G"-style zfs size string → bytes; null for '-' and anything unparseable. */
export const parseZfsSize = text => {
  const match = /^(?<num>[\d.]+)(?<unit>[KMGTPE]?)B?$/iu.exec(String(text ?? '').trim());
  if (!match) {
    return null;
  }
  const units = { '': 1, K: 2 ** 10, M: 2 ** 20, G: 2 ** 30, T: 2 ** 40, P: 2 ** 50, E: 2 ** 60 };
  return Number(match.groups.num) * units[match.groups.unit.toUpperCase()];
};

/** used/(used+avail) as a whole percent; null when either side is unknowable. */
export const usedPercent = (used, avail) => {
  const usedBytes = parseZfsSize(used);
  const availBytes = parseZfsSize(avail);
  if (usedBytes === null || availBytes === null || usedBytes + availBytes === 0) {
    return null;
  }
  return Math.round((usedBytes / (usedBytes + availBytes)) * 100);
};

/** Capacity → progress-bar color: comfortable / filling / critical. */
export const capacityVariant = percent => {
  if (percent >= 90) {
    return 'danger';
  }
  if (percent >= 75) {
    return 'warning';
  }
  return 'success';
};

/** zpool health → text color for state dots on drive chips. */
export const healthTextClass = health => {
  switch ((health || '').toUpperCase()) {
    case 'ONLINE':
      return 'text-success';
    case 'DEGRADED':
      return 'text-warning';
    case 'FAULTED':
    case 'UNAVAIL':
    case 'REMOVED':
    case 'OFFLINE':
      return 'text-danger';
    default:
      return 'text-secondary';
  }
};

/** "…45.3% done" out of a scan/resilver line; null when idle/absent. */
export const scanPercent = scan => {
  const match = /(?<pct>[\d.]+)%\s+(?:done|repaired)/u.exec(String(scan || ''));
  return match ? Number(match.groups.pct) : null;
};

/** Top-level vdevs from parsed status rows: groups (mirror-0, raidz2-1, …)
 *  with their member devices, bare top-level disks as single-device groups. */
export const buildVdevGroups = rows => {
  const groups = [];
  rows
    .filter(row => row.depth >= 1)
    .forEach(row => {
      if (row.depth === 1) {
        groups.push({
          name: row.name,
          state: row.state,
          devices: row.isDevice ? [row] : [],
          bare: row.isDevice,
        });
        return;
      }
      const last = groups[groups.length - 1];
      if (last) {
        last.devices.push(row);
      }
    });
  return groups;
};

// vdev grouping keywords in `zpool status` config rows — anything else at
// depth > 0 is a leaf device.
const VDEV_GROUP_ROW =
  /^(?:mirror|raidz\d?|draid\d?|logs?|cache|spares?|special|dedup|replacing|spare|indirect)/u;

/**
 * Parse raw `zpool status` text: keyed lines (state/status/action/scan/
 * errors, with continuation lines folded in) plus the config section as
 * depth-annotated rows {name, state, read, write, cksum, note, depth,
 * isDevice}. The raw text stays the fallback for anything this misses.
 */
export const parseZpoolStatus = text => {
  const fields = {};
  const rows = [];
  let lastKey = null;
  let inConfig = false;
  String(text || '')
    .split('\n')
    .forEach(line => {
      if (/^\s*config:/u.test(line)) {
        inConfig = true;
        lastKey = null;
        return;
      }
      const keyed =
        /^\s*(?<key>pool|state|status|action|see|scan|scrub|errors)\s*:\s?(?<val>.*)$/u.exec(line);
      if (keyed) {
        inConfig = false;
        lastKey = keyed.groups.key;
        fields[lastKey] = keyed.groups.val.trim();
        return;
      }
      if (inConfig) {
        if (!line.trim() || /^\s*NAME\s+STATE/u.test(line)) {
          return;
        }
        const indent = /^(?<pad>[\t ]*)/u.exec(line).groups.pad.replace(/\t/gu, '');
        const depth = Math.floor(indent.length / 2);
        const parts = line.trim().split(/\s+/u);
        const [name, state, read, write, cksum, ...note] = parts;
        rows.push({
          name,
          state: state || '',
          read: read || '',
          write: write || '',
          cksum: cksum || '',
          note: note.join(' '),
          depth,
          isDevice: depth > 0 && !VDEV_GROUP_ROW.test(name),
        });
        return;
      }
      if (lastKey && line.trim()) {
        fields[lastKey] = `${fields[lastKey]} ${line.trim()}`.trim();
      }
    });
  return { fields, rows, devices: rows.filter(row => row.isDevice).map(row => row.name) };
};
