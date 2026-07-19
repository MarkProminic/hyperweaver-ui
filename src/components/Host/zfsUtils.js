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

export const flatVdevDevices = parsed =>
  (Array.isArray(parsed?.vdevs) ? parsed.vdevs : []).flatMap(group => group.devices);
