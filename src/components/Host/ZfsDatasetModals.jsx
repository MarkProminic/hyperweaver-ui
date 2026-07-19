import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
    label: 'host.createDatasetModal.filesystemLabel',
    icon: 'fa-folder',
    note: 'host.createDatasetModal.filesystemNote',
  },
  {
    value: 'volume',
    label: 'host.createDatasetModal.volumeLabel',
    icon: 'fa-hard-drive',
    note: 'host.createDatasetModal.volumeNote',
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
  const { t } = useTranslation();
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
      setError(
        parentPrefix
          ? t('host.createDatasetModal.errorNameRequired')
          : t('host.createDatasetModal.errorPoolAndNameRequired')
      );
      return;
    }
    if (type === 'volume' && !volsize.trim()) {
      setError(t('host.createDatasetModal.errorVolumeSizeRequired'));
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
    onQueued(queuedMessage(result, t('host.createDatasetModal.queuedMessage', { name: fullName })));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        parentPrefix
          ? t('host.createDatasetModal.titleWithParent', { parent: parentPrefix })
          : t('host.createDatasetModal.title')
      }
      icon="fas fa-folder-tree"
      submitText={t('host.createDatasetModal.submit')}
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <span className="form-label d-block">{t('host.createDatasetModal.typeLabel')}</span>
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
                <strong className="small">{t(card.label)}</strong>
                {type === card.value && <i className="fas fa-circle-check text-primary ms-auto" />}
              </div>
              <span className="form-text d-block">{t(card.note)}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {!parentPrefix && pools.length > 0 && (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="zfs-create-pool">
              {t('host.createDatasetModal.poolLabel')} <span className="text-danger">*</span>
            </label>
            <select
              id="zfs-create-pool"
              className="form-select"
              value={pool}
              onChange={e => setPool(e.target.value)}
              disabled={loading}
            >
              <option value="">{t('host.createDatasetModal.poolPlaceholder')}</option>
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
            {t('host.createDatasetModal.nameLabel')} <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            {prefix && <span className="input-group-text font-monospace">{prefix}</span>}
            <input
              id="zfs-create-name"
              className="form-control font-monospace"
              type="text"
              placeholder={
                type === 'volume'
                  ? t('host.createDatasetModal.namePlaceholderVolume')
                  : t('host.createDatasetModal.namePlaceholderFilesystem')
              }
              value={leaf}
              onChange={e => setLeaf(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        {type === 'volume' && (
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="zfs-create-volsize">
              {t('host.createDatasetModal.volsizeLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="zfs-create-volsize"
              className="form-control"
              type="text"
              placeholder={t('host.createDatasetModal.volsizePlaceholder')}
              value={volsize}
              onChange={e => setVolsize(e.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {leaf.trim() && (prefix || parentPrefix) && (
        <p className="form-text mt-2 mb-0">
          {t('host.createDatasetModal.createsText', { type })} <code>{fullName}</code>
          {type === 'volume' && volsize.trim() ? ` — ${volsize.trim()}` : ''}
        </p>
      )}

      <details className="mt-3">
        <summary className="small text-muted">
          {t('host.createDatasetModal.advancedPropertiesLabel')}
        </summary>
        <label className="form-label small mt-2" htmlFor="zfs-create-props">
          {t('host.createDatasetModal.propertiesLabelDataset')}
        </label>
        <textarea
          id="zfs-create-props"
          className="form-control font-monospace"
          rows={2}
          placeholder={t('host.createDatasetModal.propertiesPlaceholderDataset')}
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
  const { t } = useTranslation();
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
      setError(t('host.snapshotCreateModal.errorNameRequired'));
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
    onQueued(
      queuedMessage(
        result,
        t('host.snapshotCreateModal.queuedMessage', { dataset, name: snapName.trim() })
      )
    );
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.snapshotCreateModal.title', { dataset: dataset || '' })}
      icon="fas fa-camera"
      submitText={t('host.snapshotCreateModal.submit')}
      submitIcon="fas fa-camera"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-snap-name">
        {t('host.snapshotCreateModal.nameLabel')} <span className="text-danger">*</span>
      </label>
      <div className="input-group">
        <span className="input-group-text font-monospace">{dataset}@</span>
        <input
          id="zfs-snap-name"
          className="form-control font-monospace"
          type="text"
          placeholder={t('host.snapshotCreateModal.namePlaceholderSnap')}
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
          {t('host.snapshotCreateModal.recursiveLabel')}
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
  const { t } = useTranslation();
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
      setError(t('host.renameDatasetModal.errorDifferentNameRequired'));
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
    onQueued(
      queuedMessage(
        result,
        t('host.renameDatasetModal.queuedMessage', { dataset, newName: newName.trim() })
      )
    );
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.renameDatasetModal.title', { dataset: dataset || '' })}
      icon="fas fa-i-cursor"
      submitText={t('host.renameDatasetModal.submit')}
      submitIcon="fas fa-check"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-rename-name">
        {t('host.renameDatasetModal.newNameLabel')} <span className="text-danger">*</span>
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
          {t('host.renameDatasetModal.recursiveLabel')}
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
          {t('host.renameDatasetModal.forceLabel')}
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
  const { t } = useTranslation();
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
      setError(t('host.cloneSnapshotModal.errorTargetRequired'));
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
    onQueued(
      queuedMessage(
        result,
        t('host.cloneSnapshotModal.queuedMessage', { snapshot, target: target.trim() })
      )
    );
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.cloneSnapshotModal.title', { snapshot: snapshot || '' })}
      icon="fas fa-clone"
      submitText={t('host.cloneSnapshotModal.submit')}
      submitIcon="fas fa-clone"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <label className="form-label" htmlFor="zfs-clone-target">
        {t('host.cloneSnapshotModal.targetLabel')} <span className="text-danger">*</span>
      </label>
      <input
        id="zfs-clone-target"
        className="form-control font-monospace"
        type="text"
        placeholder={t('host.cloneSnapshotModal.targetPlaceholder')}
        value={target}
        onChange={e => setTarget(e.target.value)}
        disabled={loading}
      />
      <label className="form-label mt-3" htmlFor="zfs-clone-props">
        {t('host.cloneSnapshotModal.propertiesLabelClone')}
      </label>
      <textarea
        id="zfs-clone-props"
        className="form-control font-monospace"
        rows={2}
        value={propLines}
        onChange={e => setPropLines(e.target.value)}
        disabled={loading}
      />
      <p className="form-text mb-0 mt-2">{t('host.cloneSnapshotModal.helpText')}</p>
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
  const { t } = useTranslation();
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
    onQueued(queuedMessage(result, t('host.rollbackSnapshotModal.queuedMessage', { snapshot })));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.rollbackSnapshotModal.title', { snapshot: snapshot || '' })}
      icon="fas fa-clock-rotate-left"
      submitText={t('host.rollbackSnapshotModal.submit')}
      submitVariant="danger"
      submitIcon="fas fa-clock-rotate-left"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-warning">{t('host.rollbackSnapshotModal.warningText')}</div>
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
          {t('host.rollbackSnapshotModal.recursiveLabel')}
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
          {t('host.rollbackSnapshotModal.forceLabel')}
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
  const { t } = useTranslation();
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
      setError(t('host.snapshotHoldsModal.errorTagRequired'));
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
    onQueued(
      queuedMessage(
        result,
        t('host.snapshotHoldsModal.holdQueuedMessage', { tag: tag.trim(), snapshot })
      )
    );
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
    onQueued(
      queuedMessage(
        result,
        t('host.snapshotHoldsModal.releaseQueuedMessage', { tag: holdTag, snapshot })
      )
    );
    setTimeout(loadHolds, 2000);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.snapshotHoldsModal.title', { snapshot: snapshot || '' })}
      icon="fas fa-lock"
      submitText={t('host.snapshotHoldsModal.submit')}
      submitIcon="fas fa-lock"
      loading={loading}
      showCancelButton
      cancelText={t('host.snapshotHoldsModal.cancelText')}
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p className="form-text mt-0">{t('host.snapshotHoldsModal.helpText')}</p>
      {holds === null && (
        <p className="text-muted">
          <i className="fas fa-spinner fa-pulse me-2" />
          {t('host.snapshotHoldsModal.loading')}
        </p>
      )}
      {holds !== null && holds.length === 0 && (
        <p className="text-muted">{t('host.snapshotHoldsModal.noHolds')}</p>
      )}
      {holds !== null && holds.length > 0 && (
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th scope="col">{t('host.snapshotHoldsModal.tagHeader')}</th>
              <th scope="col">{t('host.snapshotHoldsModal.sinceHeader')}</th>
              <th
                scope="col"
                className="text-end"
                aria-label={t('host.snapshotHoldsModal.actionsLabel')}
              />
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
                    title={t('host.snapshotHoldsModal.releaseTitle')}
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
        {t('host.snapshotHoldsModal.newHoldLabel')}
      </label>
      <input
        id="zfs-hold-tag"
        className="form-control"
        type="text"
        placeholder={t('host.snapshotHoldsModal.holdPlaceholder')}
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
  const { t } = useTranslation();
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
          t('host.datasetPropertiesModal.errorFetchFailed', {
            dataset,
            status: result.status ?? '?',
            message: result.message,
          })
        );
      }
    });
  }, [isOpen, server, dataset, t]);

  const handleSubmit = async () => {
    const props = propertyEdits(properties || {}, edits);
    if (Object.keys(props).length === 0) {
      setError(t('host.datasetPropertiesModal.errorNothingChanged'));
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
    onQueued(queuedMessage(result, t('host.datasetPropertiesModal.queuedMessage', { dataset })));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.datasetPropertiesModal.title', { dataset: dataset || '' })}
      icon="fas fa-sliders"
      submitText={t('host.datasetPropertiesModal.submit')}
      submitIcon="fas fa-check"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p className="form-text mt-0">{t('host.datasetPropertiesModal.helpText', { dash: '-' })}</p>
      {properties === null && !error && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          {t('host.datasetPropertiesModal.loading')}
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
  const { t } = useTranslation();
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
    onQueued(queuedMessage(result, t('host.destroyDatasetModal.queuedMessage', { name })));
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.destroyDatasetModal.title', { name: name || '' })}
      icon="fas fa-trash"
      submitText={t('host.destroyDatasetModal.submit')}
      submitVariant="danger"
      submitIcon="fas fa-trash"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-danger">
        {isSnapshot
          ? t('host.destroyDatasetModal.warningText', { name })
          : t('host.destroyDatasetModal.warningTextWithData', { name })}
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
            ? t('host.destroyDatasetModal.recursiveSnapshot')
            : t('host.destroyDatasetModal.recursiveDataset')}
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
            ? t('host.destroyDatasetModal.deferSnapshot')
            : t('host.destroyDatasetModal.forceDataset')}
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
