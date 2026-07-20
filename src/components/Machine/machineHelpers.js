import { humanSize } from '../Host/zfsUtils';

export const withAddressing = (entry, row) => {
  if (row.controller?.trim()) {
    entry.controller = row.controller.trim();
  }
  if (row.port !== undefined && row.port !== '') {
    entry.port = Number(row.port);
  }
  return entry;
};

export const cdromEntry = row => {
  const iso = (row.iso || '').trim();
  const path = (row.path || '').trim();
  return row.source === 'iso' ? iso && { iso } : path && { path };
};

export const filesystemEntries = rows =>
  (rows || [])
    .filter(row => row.special.trim() && row.dir.trim())
    .map(row => ({
      special: row.special.trim(),
      dir: row.dir.trim(),
      ...(row.type.trim() && { type: row.type.trim() }),
      ...(row.options.trim() && { options: row.options.trim() }),
    }));

export const flattenBridgedInterfaces = data => {
  const list = data?.interfaces || data?.bridged_interfaces || data || [];
  return (Array.isArray(list) ? list : [])
    .map(entry => (typeof entry === 'string' ? { name: entry } : entry || {}))
    .filter(
      entry =>
        !entry.class ||
        entry.class === 'phys' ||
        entry.class === 'aggr' ||
        entry.class === 'etherstub'
    )
    .map(entry => ({
      name: entry.name || entry.device || '',
      class: entry.class || '',
      provisioning: entry.provisioning === true,
      status: typeof entry.status === 'string' ? entry.status.toLowerCase() : '',
      wireless: entry.wireless === true,
    }))
    .filter(entry => entry.name && entry.status !== 'down');
};

export const parseConfiguration = holder => {
  const configuration = holder?.configuration;
  if (!configuration) {
    return {};
  }
  if (typeof configuration === 'string') {
    try {
      return JSON.parse(configuration);
    } catch {
      return {};
    }
  }
  return configuration;
};

export const isoFilenames = result => {
  const rows = Array.isArray(result.data) ? result.data : result.data?.artifacts || [];
  return result.success
    ? rows.filter(row => row.file_exists !== false).map(row => row.filename)
    : [];
};

export const agentDefaultLabel = (defaultsDoc, key) => {
  const value =
    defaultsDoc?.knob_defaults?.[`zones.${key}`] ??
    defaultsDoc?.knob_defaults?.[`settings.${key}`] ??
    defaultsDoc?.zones?.[key] ??
    defaultsDoc?.settings?.[key];
  return value !== undefined && value !== null && value !== '' ? String(value) : 'n/a';
};

export const machineStatusVariant = status => {
  switch ((status || '').toLowerCase()) {
    case 'running':
      return 'success';
    case 'starting':
    case 'stopping':
    case 'shutting_down':
      return 'info';
    case 'suspended':
    case 'paused':
    case 'configured':
    case 'installed':
    case 'ready':
      return 'warning';
    case 'stopped':
    case 'aborted':
    case 'incomplete':
    case 'down':
      return 'danger';
    default:
      return 'secondary';
  }
};

export const zfsPoolOptions = zfsPools =>
  zfsPools.map(pool => {
    const free = pool.free ? ` — ${humanSize(pool.free)} free` : '';
    const health = pool.health && pool.health !== 'ONLINE' ? ` · ${pool.health}` : '';
    return { value: pool.name, label: `${pool.name}${free}${health}` };
  });

export const zfsDatasetOptions = (zfsDatasets, poolName) =>
  zfsDatasets
    .filter(dataset => dataset.name.startsWith(`${poolName}/`))
    .map(dataset => {
      const relative = dataset.name.slice(poolName.length + 1);
      return { value: relative, label: relative };
    });
