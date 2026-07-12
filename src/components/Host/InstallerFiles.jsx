import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const artifactStatus = artifact => {
  if (artifact.file_exists === false) {
    return { label: 'Missing', className: 'text-bg-secondary', title: 'Expected, not present' };
  }
  if (artifact.checksum_verified === false) {
    return {
      label: 'Mismatch',
      className: 'text-bg-danger',
      title: `File ${artifact.checksum} ≠ expected ${artifact.expected_sha256 || '(recorded expectation)'}`,
    };
  }
  if (artifact.checksum_verified === true) {
    return { label: 'Verified', className: 'text-bg-success', title: 'Hash matches expectation' };
  }
  if (!artifact.checksum) {
    return { label: 'Unhashed', className: 'text-bg-warning', title: 'Never hashed — run a scan' };
  }
  return { label: 'Hashed', className: 'text-bg-info', title: 'Hashed; no expectation on record' };
};

/** Storage locations card: list, add/edit, enable/disable, delete, scan. */
const LocationsCard = ({ server, locations, onRefresh, report }) => {
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
      report('A location needs a name and a path.', 'danger');
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
      report(`Location "${body.name}" ${editing ? 'updated' : 'added'}.`, 'success');
      onRefresh();
    } else {
      report(`Location save failed: ${result.message}`, 'danger');
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
        `Location "${location.name}" ${location.enabled === false ? 'enabled' : 'disabled'}.`,
        'success'
      );
      onRefresh();
    } else {
      report(`Location update failed: ${result.message}`, 'danger');
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
      report(
        `${result.data?.message || `Location "${target.name}" delete queued`}${result.data?.task_id ? ` (task ${result.data.task_id})` : ''}`,
        'success'
      );
      onRefresh();
    } else {
      report(`Location delete failed: ${result.message}`, 'danger');
    }
  };

  const handleScan = async location => {
    setBusy(true);
    const result = await scanArtifacts(server.hostname, server.port, server.protocol, {
      storage_path_id: location.id,
    });
    setBusy(false);
    if (result.success) {
      report(
        `${result.data?.message || `Scan of "${location.name}" queued`} (task ${result.data?.task_id})`,
        'success'
      );
    } else {
      report(`Scan failed: ${result.message}`, 'danger');
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
          <span className="fw-semibold">Storage Locations</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAdd}
            disabled={busy}
          >
            <i className="fas fa-plus me-1" />
            Add Location
          </button>
        </div>
        <div className="d-flex flex-column gap-1">
          {locations.map(location => (
            <div className="d-flex align-items-center gap-2 flex-wrap" key={location.id}>
              <span className="badge text-bg-info">{location.type}</span>
              <span className="fw-semibold small">{location.name}</span>
              <code className="small">{location.path}</code>
              {location.source === 'builtin' && (
                <span className="badge text-bg-light">built-in</span>
              )}
              {location.enabled === false && (
                <span className="badge text-bg-secondary">disabled</span>
              )}
              <span className="text-muted small">
                {location.file_count ?? 0} files · {formatSize(location.total_size)}
              </span>
              {location.scan_errors > 0 && (
                <i
                  className="fas fa-triangle-exclamation text-warning"
                  title={location.last_error_message || `${location.scan_errors} scan errors`}
                />
              )}
              <span className="ms-auto d-inline-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning py-0"
                  title="Scan this location"
                  onClick={() => handleScan(location)}
                  disabled={busy}
                >
                  <i className="fas fa-magnifying-glass" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-0"
                  title={location.enabled === false ? 'Enable' : 'Disable'}
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
                      title="Edit"
                      onClick={() => openEdit(location)}
                      disabled={busy}
                    >
                      <i className="fas fa-pen-to-square" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0"
                      title="Delete this location"
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
            <span className="text-muted small">none yet — the agent seeds its built-ins</span>
          )}
        </div>
      </div>

      <FormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
        title={editing ? `Edit Location: ${editing.name}` : 'Add Storage Location'}
        icon="fas fa-folder-tree"
        submitText={editing ? 'Save' : 'Add Location'}
        loading={busy}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="location-name">
              Name
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
              Type{editing ? ' (fixed at creation)' : ''}
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
              Path (agent host{editing ? ' — fixed at creation' : ''})
            </label>
            {editing ? (
              <input id="location-path" className="form-control" value={form.path} disabled />
            ) : (
              <PathInput
                id="location-path"
                value={form.path}
                onChange={next => setForm(prev => ({ ...prev, path: next }))}
                server={server}
                pickTitle="Pick the storage root"
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
                Enabled
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
          title={`Delete Location: ${deleteTarget.name}`}
          icon="fas fa-trash"
          submitText="Queue Delete"
          submitVariant="danger"
          loading={busy}
          showCancelButton
        >
          <p>
            Remove <code>{deleteTarget.path}</code> from the storage locations?
          </p>
          {[
            ['recursive', 'Also delete the files under it (recursive)'],
            ['remove_db_records', 'Remove its registry records'],
            ['force', 'Force'],
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
        report(`Failed to load artifacts: ${result.message}`, 'danger');
      }
    },
    [server, typeFilter, locationFilter, search]
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
        `${result.data?.message || 'Scan queued'} (task ${result.data?.task_id}) — refresh once it completes`,
        'success'
      );
    } else {
      report(`Scan failed: ${result.message}`, 'danger');
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
      report(
        `${result.data?.message || 'Delete queued'}${result.data?.task_id ? ` (task ${result.data.task_id})` : ''} — refresh once it completes`,
        'success'
      );
      setSelected([]);
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
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
      report(`Download failed: ${result.message}`, 'danger');
    }
  };

  const handleTransfer = async () => {
    const { artifact, kind } = transferTarget;
    if (!transferDest) {
      report('Pick a destination location.', 'danger');
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
      report(
        `${result.data?.message || `${kind} queued`}${result.data?.task_id ? ` (task ${result.data.task_id})` : ''}`,
        'success'
      );
    } else {
      report(`${kind} failed: ${result.message}`, 'danger');
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
            Upload
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setActiveModal('register')}
            disabled={loading}
          >
            <i className="fas fa-file-import me-2" />
            Register Path
          </button>
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={() => setActiveModal('download')}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            Download URL
          </button>
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={() => setActiveModal('hcl')}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            HCL Portal
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setDeleteOpen(true)}
              disabled={loading}
            >
              <i className="fas fa-trash me-2" />
              Delete Selected ({selected.length})
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
              Re-hash all
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={handleScanAll}
            disabled={loading}
          >
            <i className="fas fa-magnifying-glass me-2" />
            Scan All
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => loadArtifacts(0)}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            Refresh
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-2">
          <select
            className="form-select form-select-sm"
            aria-label="Filter by type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
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
            aria-label="Filter by location"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          >
            <option value="">All locations</option>
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
            aria-label="Search filenames"
            placeholder="Search filenames…"
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
            Search
          </button>
        </div>
        <div className="col-12 col-md-2 text-end">
          <span className="badge text-bg-secondary">
            {artifacts.length}
            {pagination?.total !== undefined ? ` / ${pagination.total}` : ''} entries
          </span>
        </div>
      </div>

      {loading && artifacts.length === 0 && <p className="text-muted">Loading…</p>}
      {!loading && artifacts.length === 0 && (
        <div className="alert alert-info">
          No artifacts yet — upload, register, or download files, or run a scan to pick up files
          already under a storage location.
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th aria-label="Select" />
                <th>Type</th>
                <th>Location</th>
                <th>Role</th>
                <th>Filename</th>
                <th>Version</th>
                <th>Size</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {artifacts.map(artifact => {
                const status = artifactStatus(artifact);
                return (
                  <tr key={artifact.id}>
                    <td>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={`Select ${artifact.filename}`}
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
                          title="Download"
                          onClick={() => handleDownload(artifact)}
                          disabled={loading || artifact.file_exists === false}
                        >
                          <i className="fas fa-download" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0"
                          title="Move to another location (same type)"
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
                          title="Copy to another location (same type)"
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
              Load more
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
          title={`${transferTarget.kind === 'move' ? 'Move' : 'Copy'}: ${transferTarget.artifact.filename}`}
          icon="fas fa-arrows-turn-right"
          submitText={transferTarget.kind === 'move' ? 'Queue Move' : 'Queue Copy'}
          loading={loading}
          showCancelButton
        >
          <label className="form-label" htmlFor="artifact-transfer-dest">
            Destination location (same type: {transferTarget.artifact.file_type})
          </label>
          <select
            id="artifact-transfer-dest"
            className="form-select"
            value={transferDest}
            onChange={e => setTransferDest(e.target.value)}
          >
            <option value="">Select…</option>
            {transferOptions.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} — {location.path}
              </option>
            ))}
          </select>
          {transferOptions.length === 0 && (
            <p className="form-text text-warning mb-0">
              No other {transferTarget.artifact.file_type} location exists — add one above first.
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
          title={`Delete ${selected.length} artifact${selected.length === 1 ? '' : 's'}`}
          icon="fas fa-trash"
          submitText={deleteFilesToo ? 'Delete Entries + Files' : 'Delete Entries'}
          submitVariant="danger"
          loading={loading}
          showCancelButton
        >
          <p>
            Delete the selected registry entries? Without the switch below the files stay on disk
            and a later scan re-registers them.
          </p>
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
              Also delete the files from disk
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
