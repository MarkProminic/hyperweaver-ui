import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import {
  addZfsPoolVdevs,
  createZfsPool,
  destroyZfsPool,
  getHostDisks,
  getImportableZfsPools,
  getZfsPool,
  getZfsPoolStatus,
  importZfsPool,
  offlineZfsPoolDevice,
  onlineZfsPoolDevice,
  removeZfsPoolVdev,
  replaceZfsPoolDevice,
  setZfsPoolProperties,
} from '../../api/zfsAPI';
import { hasFeature } from '../../utils/capabilities';
import { ContentModal, FormModal } from '../common';

import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';
import { healthBadgeClass, parsePropertyLines, parseZpoolStatus, queuedMessage } from './zfsUtils';

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
 * stays for hosts without the monitoring feature.
 */
const VdevBuilder = ({ rows, onChange, shelf = [], disabled, idPrefix }) => {
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
          <div className="d-flex flex-wrap gap-1" role="list">
            {shelfDisks.length === 0 && (
              <span className="text-muted small">Every free disk is placed.</span>
            )}
            {shelfDisks.map(disk => (
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
                title={`${disk.manufacturer || ''} ${disk.model || ''} · ${disk.serial_number || ''} · ${disk.disk_type || ''}`.trim()}
                onDragStart={() => setDragChip({ device: disk.device_name, fromKey: '__shelf__' })}
                onDragEnd={() => setDragChip(null)}
              >
                <i
                  className={`fas ${disk.disk_type === 'SSD' ? 'fa-microchip' : 'fa-hard-drive'}`}
                />
                <code className="small">{disk.device_name}</code>
                <span className="text-muted small">{disk.capacity}</span>
              </span>
            ))}
          </div>
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
                    <span className="text-muted small">Drag disks here or type below.</span>
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
  disabled: PropTypes.bool,
  idPrefix: PropTypes.string.isRequired,
};

/** The monitoring inventory's FREE disks — the builder's shelf feed. */
const useFreeDiskShelf = (isOpen, server) => {
  const [shelf, setShelf] = useState([]);
  useEffect(() => {
    if (!isOpen || !server || !hasFeature(server, 'monitoring')) {
      return;
    }
    setShelf([]);
    getHostDisks(server.hostname, server.port, server.protocol, { available: true }).then(
      result => {
        setShelf(result.success && Array.isArray(result.data?.disks) ? result.data.disks : []);
      }
    );
  }, [isOpen, server]);
  return shelf;
};

export const CreatePoolModal = ({ isOpen, onClose, server, onQueued }) => {
  const [name, setName] = useState('');
  const [vdevRows, setVdevRows] = useState([]);
  const shelf = useFreeDiskShelf(isOpen, server);
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

export const PoolStatusModal = ({ isOpen, onClose, server, pool }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !pool) {
      return;
    }
    setStatus(null);
    setError('');
    getZfsPoolStatus(server.hostname, server.port, server.protocol, pool).then(result => {
      if (result.success) {
        setStatus(result.data?.status || '');
      } else {
        setError(result.message);
      }
    });
  }, [isOpen, server, pool]);

  const parsed = status === null ? null : parseZpoolStatus(status);

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pool status — ${pool || ''}`}
      icon="fas fa-heart-pulse"
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!error && status === null && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {parsed && (
        <>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            {parsed.fields.state && (
              <span className={`badge ${healthBadgeClass(parsed.fields.state)}`}>
                {parsed.fields.state}
              </span>
            )}
            {parsed.fields.errors && (
              <span className="small">
                <strong>Errors:</strong> {parsed.fields.errors}
              </span>
            )}
          </div>
          {parsed.fields.status && <p className="small mb-1">{parsed.fields.status}</p>}
          {parsed.fields.action && (
            <p className="small mb-1">
              <strong>Action:</strong> {parsed.fields.action}
            </p>
          )}
          {parsed.fields.scan && (
            <p className="small text-muted mb-2">
              <i className="fas fa-broom me-1" />
              {parsed.fields.scan}
            </p>
          )}
          {parsed.rows.length > 0 && (
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
                  {parsed.rows.map(row => (
                    <tr key={`${row.depth}-${row.name}`}>
                      <td style={{ paddingLeft: `${row.depth * 1.25 + 0.5}rem` }}>
                        <i
                          className={`fas ${row.isDevice ? 'fa-hard-drive' : 'fa-layer-group'} text-muted me-2`}
                        />
                        <code className="small">{row.name}</code>
                      </td>
                      <td>
                        <span className={`badge ${healthBadgeClass(row.state)}`}>{row.state}</span>
                      </td>
                      <td className="text-end">{row.read}</td>
                      <td className="text-end">{row.write}</td>
                      <td className="text-end">{row.cksum}</td>
                      <td className="text-muted small">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary className="small text-muted">Raw zpool status</summary>
            <pre className="small border rounded p-2 mt-1 mb-0">{status}</pre>
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
        setError(result.message);
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
      {properties === null && (
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

const DEVICE_MODES = {
  'add-vdev': { title: 'Add vdevs', icon: 'fas fa-plus', submit: 'Add vdevs' },
  remove: { title: 'Remove device', icon: 'fas fa-minus', submit: 'Remove' },
  replace: { title: 'Replace device', icon: 'fas fa-right-left', submit: 'Replace' },
  online: { title: 'Online device', icon: 'fas fa-circle-check', submit: 'Online' },
  offline: { title: 'Offline device', icon: 'fas fa-circle-minus', submit: 'Offline' },
};

export const PoolDeviceModal = ({ isOpen, onClose, server, pool, mode, onQueued }) => {
  const [vdevRows, setVdevRows] = useState([]);
  const shelf = useFreeDiskShelf(isOpen && (mode === 'add-vdev' || mode === 'replace'), server);
  const [device, setDevice] = useState('');
  const [newDevice, setNewDevice] = useState('');
  const [flag, setFlag] = useState(false); // force | expand | temporary, by mode
  // The pool's real devices (parsed from zpool status) — the chooser feed.
  const [poolDevices, setPoolDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVdevRows([{ key: 'vdev-0-device', type: '', devices: [] }]);
      setDevice('');
      setNewDevice('');
      setFlag(false);
      setError('');
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen || !pool || mode === 'add-vdev') {
      return;
    }
    setPoolDevices([]);
    getZfsPoolStatus(server.hostname, server.port, server.protocol, pool).then(result => {
      if (result.success) {
        setPoolDevices(parseZpoolStatus(result.data?.status).devices);
      }
    });
  }, [isOpen, server, pool, mode]);

  const meta = DEVICE_MODES[mode] || DEVICE_MODES.remove;

  const runByMode = () => {
    const base = [server.hostname, server.port, server.protocol, pool];
    switch (mode) {
      case 'add-vdev': {
        const vdevs = buildVdevs(vdevRows);
        if (vdevs.length === 0) {
          return null;
        }
        return addZfsPoolVdevs(...base, { vdevs, ...(flag && { force: true }) });
      }
      case 'replace':
        if (!device.trim() || !newDevice.trim()) {
          return null;
        }
        return replaceZfsPoolDevice(...base, {
          old_device: device.trim(),
          new_device: newDevice.trim(),
          ...(flag && { force: true }),
        });
      case 'online':
        if (!device.trim()) {
          return null;
        }
        return onlineZfsPoolDevice(...base, {
          device: device.trim(),
          ...(flag && { expand: true }),
        });
      case 'offline':
        if (!device.trim()) {
          return null;
        }
        return offlineZfsPoolDevice(...base, {
          device: device.trim(),
          ...(flag && { temporary: true }),
        });
      default:
        if (!device.trim()) {
          return null;
        }
        return removeZfsPoolVdev(...base, device.trim());
    }
  };

  const handleSubmit = async () => {
    const request = runByMode();
    if (!request) {
      setError('Fill in the required device fields.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await request;
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `${meta.title} queued on ${pool}.`));
    onClose();
  };

  const flagLabel = {
    'add-vdev': 'Force (override device refusals)',
    replace: 'Force (override device refusals)',
    online: 'Expand the device to use all available space',
    offline: 'Temporary (comes back online on reboot)',
  }[mode];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`${meta.title} — ${pool || ''}`}
      icon={meta.icon}
      submitText={meta.submit}
      submitIcon={meta.icon}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {mode === 'add-vdev' ? (
        <VdevBuilder
          rows={vdevRows}
          onChange={setVdevRows}
          shelf={shelf}
          disabled={loading}
          idPrefix="device"
        />
      ) : (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="zpool-device">
              {mode === 'replace' ? 'Old device' : 'Device'} <span className="text-danger">*</span>
            </label>
            {poolDevices.length > 0 ? (
              <select
                id="zpool-device"
                className="form-select font-monospace"
                value={device}
                onChange={e => setDevice(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a device in this pool…</option>
                {poolDevices.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="zpool-device"
                className="form-control font-monospace"
                type="text"
                placeholder="e.g. c1t2d0"
                value={device}
                onChange={e => setDevice(e.target.value)}
                disabled={loading}
              />
            )}
            <span className="form-text">
              Targets this ONE device only — the rest of the pool keeps running.
            </span>
          </div>
          {mode === 'replace' && (
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="zpool-new-device">
                New device <span className="text-danger">*</span>
              </label>
              {shelf.length > 0 ? (
                <select
                  id="zpool-new-device"
                  className="form-select font-monospace"
                  value={newDevice}
                  onChange={e => setNewDevice(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a free disk…</option>
                  {shelf.map(disk => (
                    <option key={disk.device_name} value={disk.device_name}>
                      {disk.device_name} — {disk.capacity} {disk.model || ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="zpool-new-device"
                  className="form-control font-monospace"
                  type="text"
                  placeholder="the replacement device path"
                  value={newDevice}
                  onChange={e => setNewDevice(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>
          )}
        </div>
      )}
      {flagLabel && (
        <div className="form-check mt-3">
          <input
            id="zpool-device-flag"
            className="form-check-input"
            type="checkbox"
            checked={flag}
            onChange={e => setFlag(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="zpool-device-flag">
            {flagLabel}
          </label>
        </div>
      )}
    </FormModal>
  );
};

PoolDeviceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  mode: PropTypes.oneOf(['add-vdev', 'remove', 'replace', 'online', 'offline']),
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
