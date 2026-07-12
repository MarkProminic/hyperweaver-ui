import { makeAgentRequest } from './serverUtils';

// ZFS pool/dataset/snapshot management — the /storage/* surface (zfs feature
// token). Every mutation answers 202 with a queued task; list/detail calls
// answer synchronously. Dataset and snapshot names ride URL-encoded in the
// path (they carry '/' and '@').

/**
 * List ZFS pools.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} {pools: [{name, size, alloc, free, capacity_percent, dedup_ratio, health, altroot}], total}
 */
export const getZfsPools = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/pools');

/**
 * Create a ZFS pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} body - {pool_name, vdevs: (string | {type, devices})[], properties?, force?, mount_point?}
 * @returns {Promise<Object>} Queued task result
 */
export const createZfsPool = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/pools', 'POST', body);

/**
 * All properties of one pool.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @returns {Promise<Object>} {name, properties: {prop: {value, source}}}
 */
export const getZfsPool = async (hostname, port, protocol, pool) =>
  await makeAgentRequest(hostname, port, protocol, `storage/pools/${encodeURIComponent(pool)}`);

/**
 * Destroy a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {boolean} force - Force destruction
 * @returns {Promise<Object>} Queued task result
 */
export const destroyZfsPool = async (hostname, port, protocol, pool, force = false) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}`,
    'DELETE',
    { force }
  );

/**
 * Detailed pool status — raw `zpool status` text (vdev tree, scan, errors).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @returns {Promise<Object>} {name, status}
 */
export const getZfsPoolStatus = async (hostname, port, protocol, pool) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/status`
  );

/**
 * Set pool properties (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {Object} properties - {prop: value}
 * @returns {Promise<Object>} Queued task result
 */
export const setZfsPoolProperties = async (hostname, port, protocol, pool, properties) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/properties`,
    'PUT',
    { properties }
  );

/**
 * Start a pool scrub (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @returns {Promise<Object>} Queued task result
 */
export const scrubZfsPool = async (hostname, port, protocol, pool) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/scrub`,
    'POST'
  );

/**
 * Stop an in-progress scrub (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @returns {Promise<Object>} Queued task result
 */
export const stopZfsPoolScrub = async (hostname, port, protocol, pool) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/scrub/stop`,
    'POST'
  );

/**
 * Upgrade a pool to the latest supported version (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @returns {Promise<Object>} Queued task result
 */
export const upgradeZfsPool = async (hostname, port, protocol, pool) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/upgrade`,
    'POST'
  );

/**
 * Export a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {boolean} force - Force export
 * @returns {Promise<Object>} Queued task result
 */
export const exportZfsPool = async (hostname, port, protocol, pool, force = false) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/export`,
    'POST',
    { force }
  );

/**
 * Pools available for import — parsed names plus the raw `zpool import` text.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} {pools: [name], total, output, message?}
 */
export const getImportableZfsPools = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/pools/importable');

/**
 * Import a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} body - {pool_name?, pool_id?, new_name?, properties?, force?}
 * @returns {Promise<Object>} Queued task result
 */
export const importZfsPool = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/pools/import', 'POST', body);

/**
 * Add vdevs to a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {Object} body - {vdevs: (string | {type, devices})[], force?}
 * @returns {Promise<Object>} Queued task result
 */
export const addZfsPoolVdevs = async (hostname, port, protocol, pool, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/vdevs`,
    'POST',
    body
  );

/**
 * Remove a device from a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {string} device - Device to remove
 * @returns {Promise<Object>} Queued task result
 */
export const removeZfsPoolVdev = async (hostname, port, protocol, pool, device) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/vdevs/remove`,
    'POST',
    { device }
  );

/**
 * Replace a device in a pool (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {Object} body - {old_device, new_device, force?}
 * @returns {Promise<Object>} Queued task result
 */
export const replaceZfsPoolDevice = async (hostname, port, protocol, pool, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/devices/replace`,
    'POST',
    body
  );

/**
 * Bring a device online (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {Object} body - {device, expand?}
 * @returns {Promise<Object>} Queued task result
 */
export const onlineZfsPoolDevice = async (hostname, port, protocol, pool, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/devices/online`,
    'POST',
    body
  );

/**
 * Take a device offline (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} pool - Pool name
 * @param {Object} body - {device, temporary?}
 * @returns {Promise<Object>} Queued task result
 */
export const offlineZfsPoolDevice = async (hostname, port, protocol, pool, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/pools/${encodeURIComponent(pool)}/devices/offline`,
    'POST',
    body
  );

/**
 * The host's physical disk inventory (monitoring surface, already live on
 * zoneweaver): rows carry device_name, serial_number, manufacturer, model,
 * firmware, capacity/capacity_bytes, device_path, disk_type, interface_type,
 * pool_assignment (null = free), is_available, disk_index, scan_timestamp.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} params - {available?, pool?, type?} filters
 * @returns {Promise<Object>} {disks, totalCount, pagination}
 */
export const getHostDisks = async (hostname, port, protocol, params = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/storage/disks', 'GET', null, params);

/**
 * Force a monitoring rescan — refreshes the disk inventory's freshness.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Result
 */
export const forceMonitoringCollect = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/collect', 'POST');

/**
 * List datasets, optionally filtered.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} params - {pool?, type?: filesystem|volume|snapshot|bookmark, recursive?}
 * @returns {Promise<Object>} {datasets: [{name, type, used, avail, refer, mountpoint}], total}
 */
export const getZfsDatasets = async (hostname, port, protocol, params = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/datasets', 'GET', null, params);

/**
 * Create a dataset or volume (202 task). Volumes take their size via
 * properties.volsize.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} body - {name, type?: filesystem|volume, properties?}
 * @returns {Promise<Object>} Queued task result
 */
export const createZfsDataset = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'storage/datasets', 'POST', body);

/**
 * All properties of one dataset.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @returns {Promise<Object>} {name, properties: {prop: {value, source}}}
 */
export const getZfsDataset = async (hostname, port, protocol, name) =>
  await makeAgentRequest(hostname, port, protocol, `storage/datasets/${encodeURIComponent(name)}`);

/**
 * Destroy a dataset (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @param {Object} body - {recursive?, force?}
 * @returns {Promise<Object>} Queued task result
 */
export const destroyZfsDataset = async (hostname, port, protocol, name, body = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(name)}`,
    'DELETE',
    body
  );

/**
 * Set dataset properties (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @param {Object} properties - {prop: value}
 * @returns {Promise<Object>} Queued task result
 */
export const setZfsDatasetProperties = async (hostname, port, protocol, name, properties) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(name)}/properties`,
    'PUT',
    { properties }
  );

/**
 * Rename a dataset (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @param {Object} body - {new_name, recursive?, force?}
 * @returns {Promise<Object>} Queued task result
 */
export const renameZfsDataset = async (hostname, port, protocol, name, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(name)}/rename`,
    'POST',
    body
  );

/**
 * Clone a snapshot to a new dataset (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @param {Object} body - {target, properties?}
 * @returns {Promise<Object>} Queued task result
 */
export const cloneZfsSnapshot = async (hostname, port, protocol, snapshot, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(snapshot)}/clone`,
    'POST',
    body
  );

/**
 * Promote a clone to an independent dataset (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @returns {Promise<Object>} Queued task result
 */
export const promoteZfsDataset = async (hostname, port, protocol, name) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(name)}/promote`,
    'POST'
  );

/**
 * Snapshot a dataset (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} name - Dataset name
 * @param {Object} body - {snapshot_name, recursive?, properties?}
 * @returns {Promise<Object>} Queued task result
 */
export const createZfsSnapshot = async (hostname, port, protocol, name, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/datasets/${encodeURIComponent(name)}/snapshots`,
    'POST',
    body
  );

/**
 * Destroy a snapshot (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @param {Object} body - {recursive?, defer?}
 * @returns {Promise<Object>} Queued task result
 */
export const destroyZfsSnapshot = async (hostname, port, protocol, snapshot, body = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/snapshots/${encodeURIComponent(snapshot)}`,
    'DELETE',
    body
  );

/**
 * Roll a dataset back to a snapshot (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @param {Object} body - {recursive?, force?}
 * @returns {Promise<Object>} Queued task result
 */
export const rollbackZfsSnapshot = async (hostname, port, protocol, snapshot, body = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/snapshots/${encodeURIComponent(snapshot)}/rollback`,
    'POST',
    body
  );

/**
 * List holds on a snapshot.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @returns {Promise<Object>} {snapshot, holds: [{name, tag, timestamp}], total}
 */
export const getZfsSnapshotHolds = async (hostname, port, protocol, snapshot) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/snapshots/${encodeURIComponent(snapshot)}/holds`
  );

/**
 * Add a hold tag to a snapshot (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @param {Object} body - {tag, recursive?}
 * @returns {Promise<Object>} Queued task result
 */
export const holdZfsSnapshot = async (hostname, port, protocol, snapshot, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/snapshots/${encodeURIComponent(snapshot)}/holds`,
    'POST',
    body
  );

/**
 * Release a hold tag from a snapshot (202 task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} snapshot - Snapshot name (dataset@snapshot)
 * @param {string} tag - Hold tag to release
 * @returns {Promise<Object>} Queued task result
 */
export const releaseZfsSnapshotHold = async (hostname, port, protocol, snapshot, tag) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `storage/snapshots/${encodeURIComponent(snapshot)}/holds/${encodeURIComponent(tag)}`,
    'DELETE'
  );
