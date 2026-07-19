import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  addZfsPoolVdevs,
  createZfsPool,
  destroyZfsPool,
  forceMonitoringCollect,
  getHostDisks,
  getImportableZfsPools,
  getZfsPool,
  getZfsPoolStatus,
  importZfsPool,
  setZfsPoolProperties,
} from '../../api/zfsAPI';
import { hasFeature } from '../../utils/capabilities';
import { ContentModal, FormModal } from '../common';

import { shortDevice } from './ZfsDiskActionModal';
import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';
import { healthBadgeClass, parsePropertyLines, queuedMessage, vdevKey } from './zfsUtils';

const VDEV_TYPES = [
  { value: '', label: 'stripe', note: 'no redundancy — data stripes across these disks' },
  { value: 'mirror', label: 'mirror', note: 'survives all but one disk in the group' },
  { value: 'raidz', label: 'raidz1', note: 'survives 1 disk failure in the group' },
  { value: 'raidz2', label: 'raidz2', note: 'survives 2 disk failures in the group' },
  { value: 'raidz3', label: 'raidz3', note: 'survives 3 disk failures in the group' },
  { value: 'spare', label: 'spare', note: 'hot spares — take over when a disk fails' },
  { value: 'log', label: 'log', note: 'dedicated ZIL (sync-write log) device' },
  { value: 'cache', label: 'cache', note: 'L2ARC read cache' },
];

/** Vdev rows → the wire's mixed array: plain devices as strings, typed groups as {type, devices}. */
const buildVdevs = rows =>
  rows.flatMap(row => {
    if (row.devices.length === 0) {
      return [];
    }
    return row.type === '' ? row.devices : [{ type: row.type, devices: row.devices }];
  });

/**
 * Visual vdev builder — a shelf of the host's FREE disks (monitoring
 * inventory: name/model/serial/capacity) sits above vdev buckets; drag
 * disks from the shelf into buckets, between buckets, or back. Typing
 * exists ONLY when the inventory answers empty (last resort, with the
 * rescan right there).
 */
const VdevBuilder = ({
  rows,
  onChange,
  shelf = [],
  shelfError = '',
  rescanning = false,
  onRescan,
  disabled,
  idPrefix,
}) => {
  const [dragChip, setDragChip] = useState(null); // {device, fromKey}
  const [pending, setPending] = useState({}); // per-bucket typed text

  const placed = new Set(rows.flatMap(row => row.devices));
  const shelfDisks = shelf.filter(disk => !placed.has(disk.device_name));

  const patchRow = (key, patch) =>
    onChange(rows.map(row => (row.key === key ? { ...row, ...patch } : row)));

  const addTyped = key => {
    const row = rows.find(entry => entry.key === key);
    const typed = (pending[key] || '')
      .trim()
      .split(/[\s,]+/u)
      .filter(device => device && !row.devices.includes(device));
    if (typed.length === 0) {
      return;
    }
    patchRow(key, { devices: [...row.devices, ...typed] });
    setPending(prev => ({ ...prev, [key]: '' }));
  };

  const dropChip = toKey => {
    if (!dragChip || dragChip.fromKey === toKey) {
      return;
    }
    onChange(
      rows.map(row => {
        if (row.key === dragChip.fromKey) {
          return { ...row, devices: row.devices.filter(device => device !== dragChip.device) };
        }
        if (row.key === toKey && !row.devices.includes(dragChip.device)) {
          return { ...row, devices: [...row.devices, dragChip.device] };
        }
        return row;
      })
    );
  };

  // Dropping a bucket chip on the shelf detaches it from its bucket.
  const returnChip = () => {
    if (!dragChip || dragChip.fromKey === '__shelf__') {
      return;
    }
    onChange(
      rows.map(row =>
        row.key === dragChip.fromKey
          ? { ...row, devices: row.devices.filter(device => device !== dragChip.device) }
          : row
      )
    );
  };

  return (
    <div className="d-flex flex-column gap-2">
      {shelf.length === 0 && (
        <div className="alert alert-warning py-2 d-flex align-items-center gap-2 flex-wrap mb-0">
          <span>
            {shelfError
              ? 'The disk inventory calls are FAILING — this is an agent problem, not missing disks:'
              : 'The disk inventory reports no free disks — rescan it (required once after an agent deploy). Typed device names below are the last resort.'}
          </span>
          {shelfError && <code className="small d-block w-100">{shelfError}</code>}
          {onRescan && (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={onRescan}
              disabled={rescanning || disabled}
            >
              <i className={`fas fa-radar me-2 ${rescanning ? 'fa-spin' : ''}`} />
              Rescan
            </button>
          )}
        </div>
      )}
      {shelf.length > 0 && (
        <div
          className="border rounded p-2"
          role="group"
          aria-label="Available disks"
          onDragOver={e => e.preventDefault()}
          onDrop={() => {
            returnChip();
            setDragChip(null);
          }}
        >
          <div className="small fw-semibold mb-1">
            <i className="fas fa-server me-2 text-muted" />
            Available disks — drag into a vdev
          </div>
          {shelfDisks.length === 0 && (
            <span className="text-muted small">Every free disk is placed.</span>
          )}
          {['HDD', 'SSD', 'NVMe', 'Other'].map(groupType => {
            const groupDisks = shelfDisks.filter(disk => {
              const type = disk.disk_type || 'HDD';
              if (groupType === 'Other') {
                return !['HDD', 'SSD', 'NVMe'].includes(type);
              }
              return type === groupType;
            });
            if (groupDisks.length === 0) {
              return null;
            }
            return (
              <div key={groupType} className="mb-1">
                <div className="small text-muted">{groupType}</div>
                <div className="d-flex flex-wrap gap-1" role="list">
                  {groupDisks.map(disk => (
                    <span
                      className={`badge text-bg-light border d-inline-flex align-items-center gap-1 ${
                        dragChip?.device === disk.device_name && dragChip?.fromKey === '__shelf__'
                          ? 'opacity-50'
                          : ''
                      }`}
                      style={{ cursor: 'grab' }}
                      key={disk.device_name}
                      role="listitem"
                      draggable={!disabled}
                      title={`${disk.device_name} · ${disk.manufacturer || ''} ${disk.model || ''} · ${disk.serial_number || ''}`.trim()}
                      onDragStart={() =>
                        setDragChip({ device: disk.device_name, fromKey: '__shelf__' })
                      }
                      onDragEnd={() => setDragChip(null)}
                    >
                      <i
                        className={`fas ${disk.disk_type === 'SSD' || disk.disk_type === 'NVMe' ? 'fa-microchip' : 'fa-hard-drive'}`}
                      />
                      <code className="small">{shortDevice(disk.device_name)}</code>
                      <span className="text-muted small">{disk.capacity}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="row g-2">
        {rows.map(row => {
          const meta = VDEV_TYPES.find(entry => entry.value === row.type) || VDEV_TYPES[0];
          return (
            <div className="col-12 col-md-6" key={row.key}>
              <div
                className="border rounded p-2 h-100"
                role="group"
                aria-label={`${meta.label} vdev devices`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  dropChip(row.key);
                  setDragChip(null);
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-1">
                  <select
                    className="form-select form-select-sm w-auto"
                    value={row.type}
                    onChange={e => patchRow(row.key, { type: e.target.value })}
                    disabled={disabled}
                    aria-label="Vdev type"
                  >
                    {VDEV_TYPES.map(entry => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                  <span className="badge text-bg-secondary">
                    {row.devices.length} disk{row.devices.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-0 ms-auto"
                    onClick={() => onChange(rows.filter(entry => entry.key !== row.key))}
                    disabled={disabled}
                    title="Remove this vdev"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
                <p className="form-text text-muted mt-0 mb-2 small">{meta.note}</p>
                <div className="d-flex flex-wrap gap-1 mb-2" role="list">
                  {row.devices.length === 0 && (
                    <span className="text-muted small">
                      {shelf.length > 0
                        ? 'Drag disks here from the shelf.'
                        : 'Type a device below (last resort).'}
                    </span>
                  )}
                  {row.devices.map(device => (
                    <span
                      className={`badge text-bg-light border d-inline-flex align-items-center gap-1 ${
                        dragChip?.device === device && dragChip?.fromKey === row.key
                          ? 'opacity-50'
                          : ''
                      }`}
                      style={{ cursor: 'grab' }}
                      key={device}
                      role="listitem"
                      draggable={!disabled}
                      onDragStart={() => setDragChip({ device, fromKey: row.key })}
                      onDragEnd={() => setDragChip(null)}
                    >
                      <i className="fas fa-hard-drive" />
                      <code className="small">{device}</code>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-danger"
                        aria-label={`Remove ${device}`}
                        onClick={() =>
                          patchRow(row.key, {
                            devices: row.devices.filter(entry => entry !== device),
                          })
                        }
                        disabled={disabled}
                      >
                        <i className="fas fa-times small" />
                      </button>
                    </span>
                  ))}
                </div>
                {shelf.length === 0 && (
                  <div className="input-group input-group-sm">
                    <input
                      className="form-control font-monospace"
                      type="text"
                      placeholder="device — e.g. c1t0d0"
                      aria-label="Add device to this vdev"
                      value={pending[row.key] || ''}
                      onChange={e => setPending(prev => ({ ...prev, [row.key]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTyped(row.key);
                        }
                      }}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => addTyped(row.key)}
                      disabled={disabled || !(pending[row.key] || '').trim()}
                    >
                      <i className="fas fa-plus" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <button
          type="button"
          id={`${idPrefix}-add-vdev-row`}
          className="btn btn-sm btn-outline-primary"
          onClick={() =>
            onChange([...rows, { key: `vdev-${idPrefix}-${Date.now()}`, type: '', devices: [] }])
          }
          disabled={disabled}
        >
          <i className="fas fa-plus me-2" />
          Add vdev
        </button>
      </div>
    </div>
  );
};

VdevBuilder.propTypes = {
  rows: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  shelf: PropTypes.array,
  shelfError: PropTypes.string,
  rescanning: PropTypes.bool,
  onRescan: PropTypes.func,
  disabled: PropTypes.bool,
  idPrefix: PropTypes.string.isRequired,
};

/** The monitoring inventory's FREE disks — the builder's shelf feed, with
 *  the forced rescan an empty first answer needs. Failures surface as
 *  `error` — a silent empty shelf hides agent bugs. */
const useFreeDiskShelf = (isOpen, server) => {
  const [shelf, setShelf] = useState([]);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState('');
  const enabled = !!(isOpen && server && hasFeature(server, 'monitoring'));

  const load = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const result = await getHostDisks(server.hostname, server.port, server.protocol, {
      available: true,
    });
    if (result.success) {
      setShelf(Array.isArray(result.data?.disks) ? result.data.disks : []);
      setError('');
    } else {
      setShelf([]);
      setError(`GET monitoring/storage/disks failed (${result.status ?? '?'}): ${result.message}`);
    }
  }, [enabled, server]);

  useEffect(() => {
    setShelf([]);
    setError('');
    load();
  }, [load]);

  const rescan = async () => {
    setRescanning(true);
    const collect = await forceMonitoringCollect(server.hostname, server.port, server.protocol);
    if (!collect.success) {
      setError(`POST monitoring/collect failed (${collect.status ?? '?'}): ${collect.message}`);
    }
    await load();
    setRescanning(false);
  };

  return { shelf, rescanning, rescan, error };
};

export const CreatePoolModal = ({ isOpen, onClose, server, onQueued }) => {
  const [name, setName] = useState('');
  const [vdevRows, setVdevRows] = useState([]);
  const { shelf, rescanning, rescan, error: shelfError } = useFreeDiskShelf(isOpen, server);
  const [propLines, setPropLines] = useState('');
  const [mountPoint, setMountPoint] = useState('');
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setVdevRows([{ key: 'vdev-0-create', type: '', devices: [] }]);
      setPropLines('');
      setMountPoint('');
      setForce(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const vdevs = buildVdevs(vdevRows);
    if (!name.trim() || vdevs.length === 0) {
      setError('A pool name and at least one vdev with devices are required.');
      return;
    }
    const properties = parsePropertyLines(propLines);
    setLoading(true);
    setError('');
    const result = await createZfsPool(server.hostname, server.port, server.protocol, {
      pool_name: name.trim(),
      vdevs,
      ...(Object.keys(properties).length > 0 && { properties }),
      ...(mountPoint.trim() && { mount_point: mountPoint.trim() }),
      ...(force && { force: true }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Pool creation queued for ${name.trim()}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create ZFS pool"
      icon="fas fa-database"
      submitText="Create"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="zpool-create-name">
            Pool name <span className="text-danger">*</span>
          </label>
          <input
            id="zpool-create-name"
            className="form-control"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="zpool-create-mountpoint">
            Mount point
          </label>
          <input
            id="zpool-create-mountpoint"
            className="form-control font-monospace"
            type="text"
            placeholder="(default — /{pool name})"
            value={mountPoint}
            onChange={e => setMountPoint(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">
            Vdevs <span className="text-danger">*</span>
          </span>
          <VdevBuilder
            rows={vdevRows}
            onChange={setVdevRows}
            shelf={shelf}
            shelfError={shelfError}
            rescanning={rescanning}
            onRescan={rescan}
            disabled={loading}
            idPrefix="create"
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="zpool-create-props">
            Pool properties (key=value, one per line)
          </label>
          <textarea
            id="zpool-create-props"
            className="form-control font-monospace"
            rows={2}
            placeholder={'e.g.\nashift=12\nautoexpand=on'}
            value={propLines}
            onChange={e => setPropLines(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12">
          <div className="form-check">
            <input
              id="zpool-create-force"
              className="form-check-input"
              type="checkbox"
              checked={force}
              onChange={e => setForce(e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="zpool-create-force">
              Force (override in-use / mismatched-size device refusals)
            </label>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

CreatePoolModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  onQueued: PropTypes.func.isRequired,
};

export const ImportPoolModal = ({ isOpen, onClose, server, onQueued }) => {
  const [importable, setImportable] = useState(null); // null = loading
  const [poolName, setPoolName] = useState('');
  const [newName, setNewName] = useState('');
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setImportable(null);
    setPoolName('');
    setNewName('');
    setForce(false);
    setError('');
    getImportableZfsPools(server.hostname, server.port, server.protocol).then(result => {
      if (result.success) {
        setImportable(result.data || {});
      } else {
        setImportable({});
        setError(`Failed to list importable pools: ${result.message}`);
      }
    });
  }, [isOpen, server]);

  const names = Array.isArray(importable?.pools) ? importable.pools : [];

  const handleSubmit = async () => {
    if (!poolName.trim()) {
      setError('Pick or type the pool to import.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await importZfsPool(server.hostname, server.port, server.protocol, {
      pool_name: poolName.trim(),
      ...(newName.trim() && { new_name: newName.trim() }),
      ...(force && { force: true }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Import queued for ${poolName.trim()}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Import ZFS pool"
      icon="fas fa-file-import"
      submitText="Import"
      submitIcon="fas fa-file-import"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {importable === null && (
        <p className="text-muted">
          <i className="fas fa-spinner fa-pulse me-2" />
          Scanning for importable pools…
        </p>
      )}
      {importable !== null && (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="zpool-import-name">
              Pool <span className="text-danger">*</span>
            </label>
            {names.length > 0 ? (
              <select
                id="zpool-import-name"
                className="form-select"
                value={poolName}
                onChange={e => setPoolName(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a pool…</option>
                {names.map(entry => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="zpool-import-name"
                className="form-control"
                type="text"
                placeholder="pool name or numeric id"
                value={poolName}
                onChange={e => setPoolName(e.target.value)}
                disabled={loading}
              />
            )}
            {importable.message && <span className="form-text">{importable.message}</span>}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="zpool-import-newname">
              Import as (rename)
            </label>
            <input
              id="zpool-import-newname"
              className="form-control"
              type="text"
              placeholder="(keep its name)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                id="zpool-import-force"
                className="form-check-input"
                type="checkbox"
                checked={force}
                onChange={e => setForce(e.target.checked)}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="zpool-import-force">
                Force (import even if the pool looks active on another system)
              </label>
            </div>
          </div>
          {importable.output && (
            <div className="col-12">
              <details>
                <summary className="small">Raw scan output</summary>
                <pre className="small border rounded p-2 mb-0">{importable.output}</pre>
              </details>
            </div>
          )}
        </div>
      )}
    </FormModal>
  );
};

ImportPoolModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  onQueued: PropTypes.func.isRequired,
};

export const PoolStatusModal = ({ isOpen, onClose, server, pool, health }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !pool) {
      return;
    }
    setData(null);
    setError('');
    getZfsPoolStatus(server.hostname, server.port, server.protocol, pool).then(result => {
      if (result.success) {
        setData(result.data || {});
      } else {
        setError(result.message);
      }
    });
  }, [isOpen, server, pool]);

  const groups = Array.isArray(data?.parsed?.vdevs) ? data.parsed.vdevs : [];
  const scan = data?.parsed?.scan || null;

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pool status — ${pool || ''}`}
      icon="fas fa-heart-pulse"
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!error && data === null && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {data && (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            {health && <span className={`badge ${healthBadgeClass(health)}`}>{health}</span>}
            {scan && (
              <span className="small text-muted">
                <i className="fas fa-broom me-1" />
                {scan.action} — {scan.pct}%
              </span>
            )}
          </div>
          {groups.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm small align-middle mb-2">
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">State</th>
                    <th scope="col" className="text-end">
                      Read
                    </th>
                    <th scope="col" className="text-end">
                      Write
                    </th>
                    <th scope="col" className="text-end">
                      Cksum
                    </th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.flatMap(group => {
                    const bare = group.type === 'disk';
                    const header = bare
                      ? []
                      : [
                          <tr key={vdevKey(group)}>
                            <td>
                              <i className="fas fa-layer-group text-muted me-2" />
                              <code className="small">{group.type}</code>
                            </td>
                            <td>
                              <span className={`badge ${healthBadgeClass(group.state)}`}>
                                {group.state}
                              </span>
                            </td>
                            <td className="text-end" />
                            <td className="text-end" />
                            <td className="text-end" />
                            <td />
                          </tr>,
                        ];
                    return [
                      ...header,
                      ...group.devices.map(device => (
                        <tr key={`${vdevKey(group)}-${device.name}`}>
                          <td style={{ paddingLeft: bare ? undefined : '1.75rem' }}>
                            <i className="fas fa-hard-drive text-muted me-2" />
                            <code className="small">{device.name}</code>
                          </td>
                          <td>
                            <span className={`badge ${healthBadgeClass(device.state)}`}>
                              {device.state}
                            </span>
                          </td>
                          <td className="text-end">{device.read}</td>
                          <td className="text-end">{device.write}</td>
                          <td className="text-end">{device.cksum}</td>
                          <td className="text-muted small">{device.note}</td>
                        </tr>
                      )),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary className="small text-muted">Raw zpool status</summary>
            <pre className="small border rounded p-2 mt-1 mb-0">{data.status}</pre>
          </details>
        </>
      )}
    </ContentModal>
  );
};

PoolStatusModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  health: PropTypes.string,
};

export const PoolPropertiesModal = ({ isOpen, onClose, server, pool, onQueued }) => {
  const [properties, setProperties] = useState(null);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !pool) {
      return;
    }
    setProperties(null);
    setEdits({});
    setError('');
    getZfsPool(server.hostname, server.port, server.protocol, pool).then(result => {
      if (result.success) {
        setProperties(result.data?.properties || {});
      } else {
        setError(`GET storage/pools/${pool} failed (${result.status ?? '?'}): ${result.message}`);
      }
    });
  }, [isOpen, server, pool]);

  const handleSubmit = async () => {
    const props = propertyEdits(properties || {}, edits);
    if (Object.keys(props).length === 0) {
      setError('Nothing changed — edit a value first.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await setZfsPoolProperties(
      server.hostname,
      server.port,
      server.protocol,
      pool,
      props
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Property update queued for ${pool}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Pool properties — ${pool || ''}`}
      icon="fas fa-sliders"
      submitText="Apply changed properties"
      submitIcon="fas fa-check"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p className="form-text mt-0">
        Edit a value and Apply — only changed properties ride the update. Read-only properties
        (source <code>-</code>) display as-is.
      </p>
      {properties === null && !error && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {properties !== null && (
        <ZfsPropertiesEditor
          properties={properties}
          edits={edits}
          onEdit={(key, value) => setEdits(prev => ({ ...prev, [key]: value }))}
          disabled={loading}
        />
      )}
    </FormModal>
  );
};

PoolPropertiesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

/** Extend a pool with new vdevs — the same drag-a-disk builder create uses.
 *  Per-device operations (remove/replace/online/offline) live on the
 *  topology's disk chips, not here. */
export const AddVdevsModal = ({ isOpen, onClose, server, pool, onQueued }) => {
  const [vdevRows, setVdevRows] = useState([]);
  const { shelf, rescanning, rescan, error: shelfError } = useFreeDiskShelf(isOpen, server);
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVdevRows([{ key: 'vdev-0-device', type: '', devices: [] }]);
      setForce(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const vdevs = buildVdevs(vdevRows);
    if (vdevs.length === 0) {
      setError('Put at least one disk into a vdev.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await addZfsPoolVdevs(server.hostname, server.port, server.protocol, pool, {
      vdevs,
      ...(force && { force: true }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Add vdevs queued on ${pool}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Add vdevs — ${pool || ''}`}
      icon="fas fa-plus"
      submitText="Add vdevs"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <VdevBuilder
        rows={vdevRows}
        onChange={setVdevRows}
        shelf={shelf}
        shelfError={shelfError}
        rescanning={rescanning}
        onRescan={rescan}
        disabled={loading}
        idPrefix="device"
      />
      <div className="form-check mt-3">
        <input
          id="zpool-addvdev-force"
          className="form-check-input"
          type="checkbox"
          checked={force}
          onChange={e => setForce(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zpool-addvdev-force">
          Force (override device refusals)
        </label>
      </div>
    </FormModal>
  );
};

AddVdevsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const DestroyPoolModal = ({ isOpen, onClose, server, pool, onQueued }) => {
  const [confirmName, setConfirmName] = useState('');
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
      setForce(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const result = await destroyZfsPool(server.hostname, server.port, server.protocol, pool, force);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Destruction queued for pool ${pool}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Destroy pool — ${pool || ''}`}
      icon="fas fa-trash"
      submitText="Destroy pool"
      submitVariant="danger"
      submitIcon="fas fa-trash"
      loading={loading}
      disabled={confirmName !== pool}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-danger">
        This permanently destroys the pool <strong>{pool}</strong> and EVERY dataset, volume, and
        snapshot on it. There is no undo.
      </div>
      <label className="form-label" htmlFor="zpool-destroy-confirm">
        Type the pool name to confirm
      </label>
      <input
        id="zpool-destroy-confirm"
        className="form-control font-monospace"
        type="text"
        value={confirmName}
        onChange={e => setConfirmName(e.target.value)}
        disabled={loading}
      />
      <div className="form-check mt-3">
        <input
          id="zpool-destroy-force"
          className="form-check-input"
          type="checkbox"
          checked={force}
          onChange={e => setForce(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zpool-destroy-force">
          Force (unmount busy datasets first)
        </label>
      </div>
    </FormModal>
  );
};

DestroyPoolModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};
