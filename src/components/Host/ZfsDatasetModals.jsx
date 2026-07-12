import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  cloneZfsSnapshot,
  createZfsDataset,
  createZfsSnapshot,
  destroyZfsDataset,
  destroyZfsSnapshot,
  getZfsDataset,
  getZfsSnapshotHolds,
  holdZfsSnapshot,
  releaseZfsSnapshotHold,
  renameZfsDataset,
  rollbackZfsSnapshot,
  setZfsDatasetProperties,
} from '../../api/zfsAPI';
import { FormModal } from '../common';

import ZfsPropertiesEditor, { propertyEdits } from './ZfsPropertiesEditor';
import { parsePropertyLines, queuedMessage } from './zfsUtils';

const DATASET_TYPE_CARDS = [
  {
    value: 'filesystem',
    label: 'Filesystem',
    icon: 'fa-folder',
    note: 'a mountable dataset — files, quotas, compression',
  },
  {
    value: 'volume',
    label: 'Volume (zvol)',
    icon: 'fa-hard-drive',
    note: 'a fixed-size block device — VM disks, iSCSI',
  },
];

export const CreateDatasetModal = ({
  isOpen,
  onClose,
  server,
  pools,
  initialName = '',
  onQueued,
}) => {
  // "Create child…" hands a `parent/` prefix — it locks, only the leaf types.
  const parentPrefix = initialName.endsWith('/') ? initialName : '';
  const [leaf, setLeaf] = useState('');
  const [pool, setPool] = useState('');
  const [type, setType] = useState('filesystem');
  const [volsize, setVolsize] = useState('');
  const [propLines, setPropLines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLeaf(parentPrefix ? '' : initialName);
      setPool('');
      setType('filesystem');
      setVolsize('');
      setPropLines('');
      setError('');
    }
  }, [isOpen, initialName, parentPrefix]);

  // Full dataset name: locked parent prefix, or pool picker + typed path.
  const prefix = parentPrefix || (pool ? `${pool}/` : '');
  const fullName = `${prefix}${leaf.trim()}`;

  const handleSubmit = async () => {
    if (!leaf.trim() || (!parentPrefix && pools.length > 0 && !pool)) {
      setError(parentPrefix ? 'Name the new dataset.' : 'Pick the pool and name the new dataset.');
      return;
    }
    if (type === 'volume' && !volsize.trim()) {
      setError('A volume needs a size.');
      return;
    }
    const properties = {
      ...parsePropertyLines(propLines),
      ...(type === 'volume' && { volsize: volsize.trim() }),
    };
    setLoading(true);
    setError('');
    const result = await createZfsDataset(server.hostname, server.port, server.protocol, {
      name: fullName,
      type,
      ...(Object.keys(properties).length > 0 && { properties }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Creation queued for ${fullName}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={parentPrefix ? `Create under ${parentPrefix}` : 'Create dataset'}
      icon="fas fa-folder-tree"
      submitText="Create"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <span className="form-label d-block">Type</span>
      <div className="row g-2 mb-3">
        {DATASET_TYPE_CARDS.map(card => (
          <div className="col-6" key={card.value}>
            <button
              type="button"
              className={`border rounded p-2 w-100 text-start bg-transparent ${
                type === card.value ? 'border-primary border-2' : ''
              }`}
              onClick={() => setType(card.value)}
              disabled={loading}
            >
              <div className="d-flex align-items-center gap-2">
                <i className={`fas ${card.icon} text-muted`} />
                <strong className="small">{card.label}</strong>
                {type === card.value && <i className="fas fa-circle-check text-primary ms-auto" />}
              </div>
              <span className="form-text d-block">{card.note}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {!parentPrefix && pools.length > 0 && (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="zfs-create-pool">
              Pool <span className="text-danger">*</span>
            </label>
            <select
              id="zfs-create-pool"
              className="form-select"
              value={pool}
              onChange={e => setPool(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a pool…</option>
              {pools.map(entry => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="zfs-create-name">
            Name <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            {prefix && <span className="input-group-text font-monospace">{prefix}</span>}
            <input
              id="zfs-create-name"
              className="form-control font-monospace"
              type="text"
              placeholder={type === 'volume' ? 'e.g. vm-disk1' : 'e.g. data or data/projects'}
              value={leaf}
              onChange={e => setLeaf(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        {type === 'volume' && (
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="zfs-create-volsize">
              Size <span className="text-danger">*</span>
            </label>
            <input
              id="zfs-create-volsize"
              className="form-control"
              type="text"
              placeholder="e.g. 10G"
              value={volsize}
              onChange={e => setVolsize(e.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {leaf.trim() && (prefix || parentPrefix) && (
        <p className="form-text mt-2 mb-0">
          Creates {type} <code>{fullName}</code>
          {type === 'volume' && volsize.trim() ? ` — ${volsize.trim()}` : ''}
        </p>
      )}

      <details className="mt-3">
        <summary className="small text-muted">Advanced properties</summary>
        <label className="form-label small mt-2" htmlFor="zfs-create-props">
          Properties (key=value, one per line)
        </label>
        <textarea
          id="zfs-create-props"
          className="form-control font-monospace"
          rows={2}
          placeholder={'e.g.\ncompression=lz4\nquota=50G'}
          value={propLines}
          onChange={e => setPropLines(e.target.value)}
          disabled={loading}
        />
      </details>
    </FormModal>
  );
};

CreateDatasetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pools: PropTypes.arrayOf(PropTypes.string).isRequired,
  initialName: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const SnapshotCreateModal = ({ isOpen, onClose, server, dataset, onQueued }) => {
  const [snapName, setSnapName] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSnapName('');
      setRecursive(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!snapName.trim()) {
      setError('A snapshot name is required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await createZfsSnapshot(server.hostname, server.port, server.protocol, dataset, {
      snapshot_name: snapName.trim(),
      ...(recursive && { recursive: true }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Snapshot queued: ${dataset}@${snapName.trim()}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Snapshot — ${dataset || ''}`}
      icon="fas fa-camera"
      submitText="Snapshot"
      submitIcon="fas fa-camera"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-snap-name">
        Snapshot name <span className="text-danger">*</span>
      </label>
      <div className="input-group">
        <span className="input-group-text font-monospace">{dataset}@</span>
        <input
          id="zfs-snap-name"
          className="form-control font-monospace"
          type="text"
          placeholder="e.g. before-upgrade"
          value={snapName}
          onChange={e => setSnapName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="form-check mt-3">
        <input
          id="zfs-snap-recursive"
          className="form-check-input"
          type="checkbox"
          checked={recursive}
          onChange={e => setRecursive(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-snap-recursive">
          Recursive (snapshot every descendant dataset too)
        </label>
      </div>
    </FormModal>
  );
};

SnapshotCreateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  dataset: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const RenameDatasetModal = ({ isOpen, onClose, server, dataset, onQueued }) => {
  const [newName, setNewName] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(dataset || '');
      setRecursive(false);
      setForce(false);
      setError('');
    }
  }, [isOpen, dataset]);

  const handleSubmit = async () => {
    if (!newName.trim() || newName.trim() === dataset) {
      setError('Enter a different name.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await renameZfsDataset(server.hostname, server.port, server.protocol, dataset, {
      new_name: newName.trim(),
      ...(recursive && { recursive: true }),
      ...(force && { force: true }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Rename queued: ${dataset} → ${newName.trim()}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Rename — ${dataset || ''}`}
      icon="fas fa-i-cursor"
      submitText="Rename"
      submitIcon="fas fa-check"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-rename-name">
        New name <span className="text-danger">*</span>
      </label>
      <input
        id="zfs-rename-name"
        className="form-control font-monospace"
        type="text"
        value={newName}
        onChange={e => setNewName(e.target.value)}
        disabled={loading}
      />
      <div className="form-check mt-3">
        <input
          id="zfs-rename-recursive"
          className="form-check-input"
          type="checkbox"
          checked={recursive}
          onChange={e => setRecursive(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-rename-recursive">
          Recursive (rename descendant snapshots too)
        </label>
      </div>
      <div className="form-check">
        <input
          id="zfs-rename-force"
          className="form-check-input"
          type="checkbox"
          checked={force}
          onChange={e => setForce(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-rename-force">
          Force (unmount first if busy)
        </label>
      </div>
    </FormModal>
  );
};

RenameDatasetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  dataset: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const CloneSnapshotModal = ({ isOpen, onClose, server, snapshot, onQueued }) => {
  const [target, setTarget] = useState('');
  const [propLines, setPropLines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTarget('');
      setPropLines('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!target.trim()) {
      setError('A target dataset name is required.');
      return;
    }
    const properties = parsePropertyLines(propLines);
    setLoading(true);
    setError('');
    const result = await cloneZfsSnapshot(server.hostname, server.port, server.protocol, snapshot, {
      target: target.trim(),
      ...(Object.keys(properties).length > 0 && { properties }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Clone queued: ${snapshot} → ${target.trim()}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Clone — ${snapshot || ''}`}
      icon="fas fa-clone"
      submitText="Clone"
      submitIcon="fas fa-clone"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-clone-target">
        Target dataset <span className="text-danger">*</span>
      </label>
      <input
        id="zfs-clone-target"
        className="form-control font-monospace"
        type="text"
        placeholder="pool/path for the new clone"
        value={target}
        onChange={e => setTarget(e.target.value)}
        disabled={loading}
      />
      <label className="form-label mt-3" htmlFor="zfs-clone-props">
        Properties (key=value, one per line)
      </label>
      <textarea
        id="zfs-clone-props"
        className="form-control font-monospace"
        rows={2}
        value={propLines}
        onChange={e => setPropLines(e.target.value)}
        disabled={loading}
      />
      <p className="form-text mb-0 mt-2">
        A clone stays dependent on its origin snapshot until you promote it.
      </p>
    </FormModal>
  );
};

CloneSnapshotModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  snapshot: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const RollbackSnapshotModal = ({ isOpen, onClose, server, snapshot, onQueued }) => {
  const [recursive, setRecursive] = useState(false);
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRecursive(false);
      setForce(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const result = await rollbackZfsSnapshot(
      server.hostname,
      server.port,
      server.protocol,
      snapshot,
      {
        ...(recursive && { recursive: true }),
        ...(force && { force: true }),
      }
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Rollback queued to ${snapshot}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Roll back — ${snapshot || ''}`}
      icon="fas fa-clock-rotate-left"
      submitText="Roll back"
      submitVariant="danger"
      submitIcon="fas fa-clock-rotate-left"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-warning">
        Rolling back DISCARDS every change made to the dataset after this snapshot — including any
        snapshots taken since (they must be destroyed by the rollback).
      </div>
      <div className="form-check">
        <input
          id="zfs-rollback-recursive"
          className="form-check-input"
          type="checkbox"
          checked={recursive}
          onChange={e => setRecursive(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-rollback-recursive">
          Recursive (destroy the newer snapshots in the way)
        </label>
      </div>
      <div className="form-check">
        <input
          id="zfs-rollback-force"
          className="form-check-input"
          type="checkbox"
          checked={force}
          onChange={e => setForce(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-rollback-force">
          Force (unmount clones in the way)
        </label>
      </div>
    </FormModal>
  );
};

RollbackSnapshotModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  snapshot: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const SnapshotHoldsModal = ({ isOpen, onClose, server, snapshot, onQueued }) => {
  const [holds, setHolds] = useState(null);
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHolds = useCallback(async () => {
    const result = await getZfsSnapshotHolds(
      server.hostname,
      server.port,
      server.protocol,
      snapshot
    );
    if (result.success) {
      setHolds(Array.isArray(result.data?.holds) ? result.data.holds : []);
    } else {
      setError(result.message);
    }
  }, [server, snapshot]);

  useEffect(() => {
    if (!isOpen || !snapshot) {
      return;
    }
    setHolds(null);
    setTag('');
    setError('');
    loadHolds();
  }, [isOpen, snapshot, loadHolds]);

  const handleSubmit = async () => {
    if (!tag.trim()) {
      setError('A hold tag is required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await holdZfsSnapshot(server.hostname, server.port, server.protocol, snapshot, {
      tag: tag.trim(),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Hold '${tag.trim()}' queued on ${snapshot}.`));
    setTag('');
    // The hold lands via the task — give it a moment, then re-list.
    setTimeout(loadHolds, 2000);
  };

  const release = async holdTag => {
    setLoading(true);
    setError('');
    const result = await releaseZfsSnapshotHold(
      server.hostname,
      server.port,
      server.protocol,
      snapshot,
      holdTag
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Release of '${holdTag}' queued on ${snapshot}.`));
    setTimeout(loadHolds, 2000);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Holds — ${snapshot || ''}`}
      icon="fas fa-lock"
      submitText="Add hold"
      submitIcon="fas fa-lock"
      loading={loading}
      showCancelButton
      cancelText="Close"
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p className="form-text mt-0">
        A held snapshot cannot be destroyed until every hold tag is released.
      </p>
      {holds === null && (
        <p className="text-muted">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {holds !== null && holds.length === 0 && <p className="text-muted">No holds.</p>}
      {holds !== null && holds.length > 0 && (
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">Since</th>
              <th scope="col" className="text-end" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {holds.map(hold => (
              <tr key={hold.tag}>
                <td>
                  <code className="small">{hold.tag}</code>
                </td>
                <td className="text-muted small">{hold.timestamp}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => release(hold.tag)}
                    disabled={loading}
                    title="Release this hold"
                  >
                    <i className="fas fa-lock-open" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <label className="form-label" htmlFor="zfs-hold-tag">
        New hold tag
      </label>
      <input
        id="zfs-hold-tag"
        className="form-control"
        type="text"
        placeholder="e.g. keep-for-audit"
        value={tag}
        onChange={e => setTag(e.target.value)}
        disabled={loading}
      />
    </FormModal>
  );
};

SnapshotHoldsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  snapshot: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const DatasetPropertiesModal = ({ isOpen, onClose, server, dataset, onQueued }) => {
  const [properties, setProperties] = useState(null);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !dataset) {
      return;
    }
    setProperties(null);
    setEdits({});
    setError('');
    getZfsDataset(server.hostname, server.port, server.protocol, dataset).then(result => {
      if (result.success) {
        setProperties(result.data?.properties || {});
      } else {
        setError(
          `GET storage/datasets/${dataset} failed (${result.status ?? '?'}): ${result.message}`
        );
      }
    });
  }, [isOpen, server, dataset]);

  const handleSubmit = async () => {
    const props = propertyEdits(properties || {}, edits);
    if (Object.keys(props).length === 0) {
      setError('Nothing changed — edit a value first.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await setZfsDatasetProperties(
      server.hostname,
      server.port,
      server.protocol,
      dataset,
      props
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Property update queued for ${dataset}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Properties — ${dataset || ''}`}
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

DatasetPropertiesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  dataset: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export const DestroyDatasetModal = ({ isOpen, onClose, server, name, isSnapshot, onQueued }) => {
  const [recursive, setRecursive] = useState(false);
  const [flag, setFlag] = useState(false); // force (dataset) | defer (snapshot)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRecursive(false);
      setFlag(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const body = {
      ...(recursive && { recursive: true }),
      ...(flag && (isSnapshot ? { defer: true } : { force: true })),
    };
    const result = isSnapshot
      ? await destroyZfsSnapshot(server.hostname, server.port, server.protocol, name, body)
      : await destroyZfsDataset(server.hostname, server.port, server.protocol, name, body);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(queuedMessage(result, `Destruction queued for ${name}.`));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Destroy — ${name || ''}`}
      icon="fas fa-trash"
      submitText="Destroy"
      submitVariant="danger"
      submitIcon="fas fa-trash"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-danger">
        This permanently destroys <strong>{name}</strong>
        {isSnapshot ? '.' : ' and its data. There is no undo.'}
      </div>
      <div className="form-check">
        <input
          id="zfs-destroy-recursive"
          className="form-check-input"
          type="checkbox"
          checked={recursive}
          onChange={e => setRecursive(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-destroy-recursive">
          {isSnapshot
            ? 'Recursive (destroy same-name snapshots of descendants too)'
            : 'Recursive (destroy descendants and their snapshots too)'}
        </label>
      </div>
      <div className="form-check">
        <input
          id="zfs-destroy-flag"
          className="form-check-input"
          type="checkbox"
          checked={flag}
          onChange={e => setFlag(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="zfs-destroy-flag">
          {isSnapshot
            ? 'Defer (destroy when the last hold/clone goes away)'
            : 'Force (unmount first if busy)'}
        </label>
      </div>
    </FormModal>
  );
};

DestroyDatasetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  name: PropTypes.string,
  isSnapshot: PropTypes.bool,
  onQueued: PropTypes.func.isRequired,
};
