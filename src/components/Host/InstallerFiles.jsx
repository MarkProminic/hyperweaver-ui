import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getArtifacts,
  getArtifactStoragePaths,
  createArtifactStoragePath,
  updateArtifactStoragePath,
  deleteArtifactStoragePath,
  scanArtifacts,
  deleteArtifacts,
  moveArtifact,
  copyArtifact,
  getSecrets,
} from '../../api/provisioningAPI';
import { makeAgentRequest } from '../../api/serverUtils';
import { FormModal, PathInput } from '../common';

import {
  UploadModal,
  RegisterModal,
  DownloadModal,
  HclDownloadModal,
} from './InstallerFilesModals';

// Artifact storage (the merged system): typed locations (iso | image |
// installer | fixpack | hotfix) + ONE registry over them. Installer-family
// locations store per role; iso/image are flat. Every mutation is a 202
// task. Machine starts refuse roles[].files references that are absent,
// unhashed, or hash-mismatched.

const TYPES = ['iso', 'image', 'installer', 'fixpack', 'hotfix'];

const PAGE_SIZE = 200;

const formatSize = bytes => {
  if (!bytes) {
    return '-';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const order = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** order).toFixed(order === 0 ? 0 : 1)} ${units[order]}`;
};

const artifactStatus = (artifact, t) => {
  if (artifact.file_exists === false) {
    return {
      label: t('host.installerFiles.statusMissing'),
      className: 'text-bg-secondary',
      title: t('host.installerFiles.statusMissingTitle'),
    };
  }
  if (artifact.checksum_verified === false) {
    return {
      label: t('host.installerFiles.statusMismatch'),
      className: 'text-bg-danger',
      title: t('host.installerFiles.statusMismatchTitle', {
        checksum: artifact.checksum,
        expected: artifact.expected_sha256 || t('host.installerFiles.recordedExpectation'),
      }),
    };
  }
  if (artifact.checksum_verified === true) {
    return {
      label: t('host.installerFiles.statusVerified'),
      className: 'text-bg-success',
      title: t('host.installerFiles.statusVerifiedTitle'),
    };
  }
  if (!artifact.checksum) {
    return {
      label: t('host.installerFiles.statusUnhashed'),
      className: 'text-bg-warning',
      title: t('host.installerFiles.statusUnhashedTitle'),
    };
  }
  return {
    label: t('host.installerFiles.statusHashed'),
    className: 'text-bg-info',
    title: t('host.installerFiles.statusHashedTitle'),
  };
};

/** Storage locations card: list, add/edit, enable/disable, delete, scan. */
const LocationsCard = ({ server, locations, onRefresh, report }) => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', path: '', type: 'iso', enabled: true });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpts, setDeleteOpts] = useState({
    recursive: false,
    remove_db_records: true,
    force: false,
  });
  const [busy, setBusy] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', path: '', type: 'iso', enabled: true });
    setFormOpen(true);
  };
  const openEdit = location => {
    setEditing(location);
    setForm({
      name: location.name,
      path: location.path,
      type: location.type,
      enabled: location.enabled !== false,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || (!editing && !form.path.trim())) {
      report(t('host.installerFiles.locationNamePathRequired'), 'danger');
      return;
    }
    setBusy(true);
    // PUT mutates name/enabled only — path and type are fixed at creation.
    const body = editing
      ? { name: form.name.trim(), enabled: form.enabled }
      : { name: form.name.trim(), path: form.path.trim(), type: form.type, enabled: form.enabled };
    const result = editing
      ? await updateArtifactStoragePath(
          server.hostname,
          server.port,
          server.protocol,
          editing.id,
          body
        )
      : await createArtifactStoragePath(server.hostname, server.port, server.protocol, body);
    setBusy(false);
    if (result.success) {
      setFormOpen(false);
      report(
        editing
          ? t('host.installerFiles.locationUpdated', { name: body.name })
          : t('host.installerFiles.locationAdded', { name: body.name }),
        'success'
      );
      onRefresh();
    } else {
      report(t('host.installerFiles.locationSaveFailed', { message: result.message }), 'danger');
    }
  };

  const handleToggle = async location => {
    setBusy(true);
    const result = await updateArtifactStoragePath(
      server.hostname,
      server.port,
      server.protocol,
      location.id,
      { enabled: location.enabled === false }
    );
    setBusy(false);
    if (result.success) {
      report(
        location.enabled === false
          ? t('host.installerFiles.locationEnabled', { name: location.name })
          : t('host.installerFiles.locationDisabled', { name: location.name }),
        'success'
      );
      onRefresh();
    } else {
      report(t('host.installerFiles.locationUpdateFailed', { message: result.message }), 'danger');
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusy(true);
    const result = await deleteArtifactStoragePath(
      server.hostname,
      server.port,
      server.protocol,
      target.id,
      deleteOpts
    );
    setBusy(false);
    if (result.success) {
      const base =
        result.data?.message ||
        t('host.installerFiles.locationDeleteQueued', { name: target.name });
      report(
        result.data?.task_id
          ? t('host.installerFiles.messageWithTask', { message: base, taskId: result.data.task_id })
          : base,
        'success'
      );
      onRefresh();
    } else {
      report(t('host.installerFiles.locationDeleteFailed', { message: result.message }), 'danger');
    }
  };

  const handleScan = async location => {
    setBusy(true);
    const result = await scanArtifacts(server.hostname, server.port, server.protocol, {
      storage_path_id: location.id,
    });
    setBusy(false);
    if (result.success) {
      const base =
        result.data?.message || t('host.installerFiles.scanOfQueued', { name: location.name });
      report(
        t('host.installerFiles.messageWithTask', { message: base, taskId: result.data?.task_id }),
        'success'
      );
    } else {
      report(t('host.installerFiles.scanFailed', { message: result.message }), 'danger');
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
          <span className="fw-semibold">{t('host.installerFiles.storageLocations')}</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAdd}
            disabled={busy}
          >
            <i className="fas fa-plus me-1" />
            {t('host.installerFiles.addLocation')}
          </button>
        </div>
        <div className="d-flex flex-column gap-1">
          {locations.map(location => (
            <div className="d-flex align-items-center gap-2 flex-wrap" key={location.id}>
              <span className="badge text-bg-info">{location.type}</span>
              <span className="fw-semibold small">{location.name}</span>
              <code className="small">{location.path}</code>
              {location.source === 'builtin' && (
                <span className="badge text-bg-light">{t('host.installerFiles.builtIn')}</span>
              )}
              {location.enabled === false && (
                <span className="badge text-bg-secondary">{t('host.installerFiles.disabled')}</span>
              )}
              <span className="text-muted small">
                {t('host.installerFiles.filesSize', {
                  count: location.file_count ?? 0,
                  size: formatSize(location.total_size),
                })}
              </span>
              {location.scan_errors > 0 && (
                <i
                  className="fas fa-triangle-exclamation text-warning"
                  title={
                    location.last_error_message ||
                    t('host.installerFiles.scanErrorsCount', { count: location.scan_errors })
                  }
                />
              )}
              <span className="ms-auto d-inline-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning py-0"
                  title={t('host.installerFiles.scanThisLocation')}
                  onClick={() => handleScan(location)}
                  disabled={busy}
                >
                  <i className="fas fa-magnifying-glass" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-0"
                  title={
                    location.enabled === false
                      ? t('host.installerFiles.enable')
                      : t('host.installerFiles.disable')
                  }
                  onClick={() => handleToggle(location)}
                  disabled={busy}
                >
                  <i
                    className={`fas ${location.enabled === false ? 'fa-toggle-off' : 'fa-toggle-on'}`}
                  />
                </button>
                {location.source !== 'builtin' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning py-0"
                      title={t('host.installerFiles.edit')}
                      onClick={() => openEdit(location)}
                      disabled={busy}
                    >
                      <i className="fas fa-pen-to-square" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0"
                      title={t('host.installerFiles.deleteThisLocation')}
                      onClick={() => setDeleteTarget(location)}
                      disabled={busy}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
          {locations.length === 0 && (
            <span className="text-muted small">{t('host.installerFiles.noLocationsYet')}</span>
          )}
        </div>
      </div>

      <FormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
        title={
          editing
            ? t('host.installerFiles.editLocationTitle', { name: editing.name })
            : t('host.installerFiles.addStorageLocation')
        }
        icon="fas fa-folder-tree"
        submitText={editing ? t('host.installerFiles.save') : t('host.installerFiles.addLocation')}
        loading={busy}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="location-name">
              {t('host.installerFiles.name')}
            </label>
            <input
              id="location-name"
              className="form-control"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="location-type">
              {editing ? t('host.installerFiles.typeFixed') : t('host.installerFiles.type')}
            </label>
            <select
              id="location-type"
              className="form-select"
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              disabled={!!editing}
            >
              {TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label" htmlFor="location-path">
              {editing
                ? t('host.installerFiles.pathAgentHostFixed')
                : t('host.installerFiles.pathAgentHost')}
            </label>
            {editing ? (
              <input id="location-path" className="form-control" value={form.path} disabled />
            ) : (
              <PathInput
                id="location-path"
                value={form.path}
                onChange={next => setForm(prev => ({ ...prev, path: next }))}
                server={server}
                pickTitle={t('host.installerFiles.pickStorageRoot')}
              />
            )}
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input
                id="location-enabled"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={form.enabled}
                onChange={e => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor="location-enabled">
                {t('host.installerFiles.enabled')}
              </label>
            </div>
          </div>
        </div>
      </FormModal>

      {deleteTarget && (
        <FormModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onSubmit={handleDelete}
          title={t('host.installerFiles.deleteLocationTitle', { name: deleteTarget.name })}
          icon="fas fa-trash"
          submitText={t('host.installerFiles.queueDelete')}
          submitVariant="danger"
          loading={busy}
          showCancelButton
        >
          <p>
            {t('host.installerFiles.removeLocationBefore')} <code>{deleteTarget.path}</code>{' '}
            {t('host.installerFiles.removeLocationAfter')}
          </p>
          {[
            ['recursive', t('host.installerFiles.deleteOptRecursive')],
            ['remove_db_records', t('host.installerFiles.deleteOptRemoveRecords')],
            ['force', t('host.installerFiles.deleteOptForce')],
          ].map(([key, label]) => (
            <div className="form-check form-switch" key={key}>
              <input
                id={`location-delete-${key}`}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={deleteOpts[key]}
                onChange={e => setDeleteOpts(prev => ({ ...prev, [key]: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor={`location-delete-${key}`}>
                {label}
              </label>
            </div>
          ))}
        </FormModal>
      )}
    </div>
  );
};

LocationsCard.propTypes = {
  server: PropTypes.object.isRequired,
  locations: PropTypes.array.isRequired,
  onRefresh: PropTypes.func.isRequired,
  report: PropTypes.func.isRequired,
};

const InstallerFiles = ({ server }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [search, setSearch] = useState('');
  const [verifyChecksums, setVerifyChecksums] = useState(false);
  const [selected, setSelected] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // upload|register|download|hcl
  const [transferTarget, setTransferTarget] = useState(null); // {artifact, kind: 'move'|'copy'}
  const [transferDest, setTransferDest] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFilesToo, setDeleteFilesToo] = useState(false);
  // null = /secrets not readable — the modals degrade to free-text inputs.
  const [secretNames, setSecretNames] = useState({ hcl: null, resources: null });

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadLocations = useCallback(async () => {
    if (!server) {
      return;
    }
    const result = await getArtifactStoragePaths(server.hostname, server.port, server.protocol);
    // The list answers {paths: [...], total_paths} — arrays only, never an
    // object fallback.
    setLocations(result.success && Array.isArray(result.data?.paths) ? result.data.paths : []);
  }, [server]);

  const loadArtifacts = useCallback(
    async (offset = 0) => {
      if (!server) {
        return;
      }
      setLoading(true);
      const filters = { limit: PAGE_SIZE, offset };
      if (typeFilter) {
        filters.type = typeFilter;
      }
      if (locationFilter) {
        filters.storage_path_id = locationFilter;
      }
      if (search.trim()) {
        filters.search = search.trim();
      }
      const result = await getArtifacts(server.hostname, server.port, server.protocol, filters);
      setLoading(false);
      if (result.success) {
        const rows = result.data?.artifacts || [];
        setArtifacts(prev => (offset > 0 ? [...prev, ...rows] : rows));
        setPagination(result.data?.pagination || null);
        setSelected([]);
      } else {
        report(t('host.installerFiles.loadArtifactsFailed', { message: result.message }), 'danger');
      }
    },
    [server, typeFilter, locationFilter, search, t]
  );

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadArtifacts(0);
    // search applies on the Search button/Enter — not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, typeFilter, locationFilter]);

  useEffect(() => {
    if (!server) {
      return;
    }
    getSecrets(server.hostname, server.port, server.protocol).then(result => {
      setSecretNames(
        result.success
          ? {
              hcl: (result.data?.hcl_download_portal_api_keys || []).map(entry => entry.name),
              resources: (result.data?.custom_resource_url || []).map(entry => entry.name),
            }
          : { hcl: null, resources: null }
      );
    });
  }, [server]);

  const roleOptions = useMemo(
    () => [...new Set(artifacts.map(artifact => artifact.role).filter(Boolean))].sort(),
    [artifacts]
  );

  const toggleSelected = id =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleScanAll = async () => {
    setLoading(true);
    const result = await scanArtifacts(server.hostname, server.port, server.protocol, {
      verify_checksums: verifyChecksums,
    });
    setLoading(false);
    if (result.success) {
      report(
        t('host.installerFiles.scanQueuedFull', {
          message: result.data?.message || t('host.installerFiles.scanQueuedDefault'),
          taskId: result.data?.task_id,
        }),
        'success'
      );
    } else {
      report(t('host.installerFiles.scanFailed', { message: result.message }), 'danger');
    }
  };

  const handleBatchDelete = async () => {
    setDeleteOpen(false);
    setLoading(true);
    const result = await deleteArtifacts(server.hostname, server.port, server.protocol, {
      artifact_ids: selected,
      delete_files: deleteFilesToo,
    });
    setLoading(false);
    setDeleteFilesToo(false);
    if (result.success) {
      const base = result.data?.message || t('host.installerFiles.deleteQueuedDefault');
      report(
        result.data?.task_id
          ? t('host.installerFiles.deleteQueuedFull', {
              message: base,
              taskId: result.data.task_id,
            })
          : t('host.installerFiles.refreshOnceComplete', { message: base }),
        'success'
      );
      setSelected([]);
    } else {
      report(t('host.installerFiles.deleteFailed', { message: result.message }), 'danger');
    }
  };

  const handleDownload = async artifact => {
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      `artifacts/${artifact.id}/download`,
      'GET',
      null,
      null,
      true,
      null,
      'blob'
    );
    if (result.success && result.data instanceof Blob) {
      const url = URL.createObjectURL(result.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = artifact.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } else {
      report(t('host.installerFiles.downloadFailed', { message: result.message }), 'danger');
    }
  };

  const handleTransfer = async () => {
    const { artifact, kind } = transferTarget;
    if (!transferDest) {
      report(t('host.installerFiles.pickDestination'), 'danger');
      return;
    }
    setLoading(true);
    const call = kind === 'move' ? moveArtifact : copyArtifact;
    const result = await call(
      server.hostname,
      server.port,
      server.protocol,
      artifact.id,
      transferDest
    );
    setLoading(false);
    if (result.success) {
      setTransferTarget(null);
      setTransferDest('');
      const base =
        result.data?.message ||
        (kind === 'move'
          ? t('host.installerFiles.moveQueued')
          : t('host.installerFiles.copyQueued'));
      report(
        result.data?.task_id
          ? t('host.installerFiles.messageWithTask', { message: base, taskId: result.data.task_id })
          : base,
        'success'
      );
    } else {
      report(
        kind === 'move'
          ? t('host.installerFiles.moveFailed', { message: result.message })
          : t('host.installerFiles.copyFailed', { message: result.message }),
        'danger'
      );
    }
  };

  const handleModalDone = text => {
    report(text, 'success');
    loadArtifacts(0);
  };

  const transferOptions = transferTarget
    ? locations.filter(
        location =>
          location.type === transferTarget.artifact.file_type &&
          location.id !== transferTarget.artifact.storage_location_id
      )
    : [];

  return (
    <div>
      <LocationsCard
        server={server}
        locations={locations}
        onRefresh={() => {
          loadLocations();
          loadArtifacts(0);
        }}
        report={report}
      />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setActiveModal('upload')}
            disabled={loading}
          >
            <i className="fas fa-upload me-2" />
            {t('host.installerFiles.upload')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setActiveModal('register')}
            disabled={loading}
          >
            <i className="fas fa-file-import me-2" />
            {t('host.installerFiles.registerPath')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={() => setActiveModal('download')}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            {t('host.installerFiles.downloadUrl')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={() => setActiveModal('hcl')}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            {t('host.installerFiles.hclPortal')}
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setDeleteOpen(true)}
              disabled={loading}
            >
              <i className="fas fa-trash me-2" />
              {t('host.installerFiles.deleteSelected', { count: selected.length })}
            </button>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch mb-0">
            <input
              id="artifact-scan-verify"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={verifyChecksums}
              onChange={e => setVerifyChecksums(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="artifact-scan-verify">
              {t('host.installerFiles.reHashAll')}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={handleScanAll}
            disabled={loading}
          >
            <i className="fas fa-magnifying-glass me-2" />
            {t('host.installerFiles.scanAll')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadArtifacts(0)}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            {t('host.installerFiles.refresh')}
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            aria-label={t('host.installerFiles.filterByType')}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">{t('host.installerFiles.allTypes')}</option>
            {TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select form-select-sm"
            aria-label={t('host.installerFiles.filterByLocation')}
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          >
            <option value="">{t('host.installerFiles.allLocations')}</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-8 col-md-4">
          <input
            className="form-control form-control-sm"
            aria-label={t('host.installerFiles.searchFilenames')}
            placeholder={t('host.installerFiles.searchFilenamesPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                loadArtifacts(0);
              }
            }}
          />
        </div>
        <div className="col-4 col-md-1">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary w-100"
            onClick={() => loadArtifacts(0)}
            disabled={loading}
          >
            {t('host.installerFiles.search')}
          </button>
        </div>
        <div className="col-12 col-md-2 text-end">
          <span className="badge text-bg-secondary">
            {pagination?.total !== undefined
              ? t('host.installerFiles.entriesCountTotal', {
                  shown: artifacts.length,
                  total: pagination.total,
                })
              : t('host.installerFiles.entriesCount', { count: artifacts.length })}
          </span>
        </div>
      </div>

      {loading && artifacts.length === 0 && (
        <p className="text-muted">{t('host.installerFiles.loading')}</p>
      )}
      {!loading && artifacts.length === 0 && (
        <div className="alert alert-info">{t('host.installerFiles.emptyArtifacts')}</div>
      )}

      {artifacts.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th aria-label={t('host.installerFiles.colSelect')} />
                <th>{t('host.installerFiles.colType')}</th>
                <th>{t('host.installerFiles.colLocation')}</th>
                <th>{t('host.installerFiles.colRole')}</th>
                <th>{t('host.installerFiles.colFilename')}</th>
                <th>{t('host.installerFiles.colVersion')}</th>
                <th>{t('host.installerFiles.colSize')}</th>
                <th>{t('host.installerFiles.colStatus')}</th>
                <th aria-label={t('host.installerFiles.colActions')} />
              </tr>
            </thead>
            <tbody>
              {artifacts.map(artifact => {
                const status = artifactStatus(artifact, t);
                return (
                  <tr key={artifact.id}>
                    <td>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={t('host.installerFiles.selectArtifact', {
                          filename: artifact.filename,
                        })}
                        checked={selected.includes(artifact.id)}
                        onChange={() => toggleSelected(artifact.id)}
                      />
                    </td>
                    <td>{artifact.file_type}</td>
                    <td className="small">{artifact.storage_location?.name || '-'}</td>
                    <td>{artifact.role || '-'}</td>
                    <td>
                      <code className="small">{artifact.filename}</code>
                    </td>
                    <td className="small">{artifact.version || '-'}</td>
                    <td className="small">{formatSize(artifact.size)}</td>
                    <td>
                      <span className={`badge ${status.className}`} title={status.title}>
                        {status.label}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0"
                          title={t('host.installerFiles.download')}
                          onClick={() => handleDownload(artifact)}
                          disabled={loading || artifact.file_exists === false}
                        >
                          <i className="fas fa-download" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0"
                          title={t('host.installerFiles.moveToLocation')}
                          onClick={() => {
                            setTransferTarget({ artifact, kind: 'move' });
                            setTransferDest('');
                          }}
                          disabled={loading || artifact.file_exists === false}
                        >
                          <i className="fas fa-arrows-turn-right" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0"
                          title={t('host.installerFiles.copyToLocation')}
                          onClick={() => {
                            setTransferTarget({ artifact, kind: 'copy' });
                            setTransferDest('');
                          }}
                          disabled={loading || artifact.file_exists === false}
                        >
                          <i className="fas fa-copy" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pagination?.has_more && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => loadArtifacts(artifacts.length)}
              disabled={loading}
            >
              {t('host.installerFiles.loadMore')}
            </button>
          )}
        </div>
      )}

      <UploadModal
        isOpen={activeModal === 'upload'}
        onClose={() => setActiveModal(null)}
        server={server}
        locations={locations}
        roleOptions={roleOptions}
        onDone={handleModalDone}
      />
      <RegisterModal
        isOpen={activeModal === 'register'}
        onClose={() => setActiveModal(null)}
        server={server}
        locations={locations}
        roleOptions={roleOptions}
        onDone={handleModalDone}
      />
      <DownloadModal
        isOpen={activeModal === 'download'}
        onClose={() => setActiveModal(null)}
        server={server}
        locations={locations}
        roleOptions={roleOptions}
        resourceNames={secretNames.resources}
        onDone={handleModalDone}
      />
      <HclDownloadModal
        isOpen={activeModal === 'hcl'}
        onClose={() => setActiveModal(null)}
        server={server}
        locations={locations}
        roleOptions={roleOptions}
        hclKeyNames={secretNames.hcl}
        onDone={handleModalDone}
      />

      {transferTarget && (
        <FormModal
          isOpen
          onClose={() => setTransferTarget(null)}
          onSubmit={handleTransfer}
          title={
            transferTarget.kind === 'move'
              ? t('host.installerFiles.moveTitle', { filename: transferTarget.artifact.filename })
              : t('host.installerFiles.copyTitle', { filename: transferTarget.artifact.filename })
          }
          icon="fas fa-arrows-turn-right"
          submitText={
            transferTarget.kind === 'move'
              ? t('host.installerFiles.queueMove')
              : t('host.installerFiles.queueCopy')
          }
          loading={loading}
          showCancelButton
        >
          <label className="form-label" htmlFor="artifact-transfer-dest">
            {t('host.installerFiles.destinationLocation', {
              type: transferTarget.artifact.file_type,
            })}
          </label>
          <select
            id="artifact-transfer-dest"
            className="form-select"
            value={transferDest}
            onChange={e => setTransferDest(e.target.value)}
          >
            <option value="">{t('host.installerFiles.select')}</option>
            {transferOptions.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} — {location.path}
              </option>
            ))}
          </select>
          {transferOptions.length === 0 && (
            <p className="form-text text-warning mb-0">
              {t('host.installerFiles.noOtherLocation', {
                type: transferTarget.artifact.file_type,
              })}
            </p>
          )}
        </FormModal>
      )}

      {deleteOpen && (
        <FormModal
          isOpen
          onClose={() => {
            setDeleteOpen(false);
            setDeleteFilesToo(false);
          }}
          onSubmit={handleBatchDelete}
          title={t('host.installerFiles.deleteArtifactsTitle', { count: selected.length })}
          icon="fas fa-trash"
          submitText={
            deleteFilesToo
              ? t('host.installerFiles.deleteEntriesFiles')
              : t('host.installerFiles.deleteEntries')
          }
          submitVariant="danger"
          loading={loading}
          showCancelButton
        >
          <p>{t('host.installerFiles.deleteEntriesHelp')}</p>
          <div className="form-check form-switch">
            <input
              id="artifact-delete-files-too"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={deleteFilesToo}
              onChange={e => setDeleteFilesToo(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="artifact-delete-files-too">
              {t('host.installerFiles.alsoDeleteFiles')}
            </label>
          </div>
        </FormModal>
      )}
    </div>
  );
};

InstallerFiles.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default InstallerFiles;
