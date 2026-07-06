import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getArtifacts, scanArtifacts, deleteArtifact, getSecrets } from '../../api/provisioningAPI';
import { FormModal } from '../common';

import {
  UploadModal,
  RegisterModal,
  DownloadModal,
  HclDownloadModal,
} from './InstallerFilesModals';

/**
 * Installer Files (sync item 12 — SHI's file cache page): the hash-verified
 * cache the provisioning pipeline mounts machines from. One shared contract,
 * token-addressed (`artifacts` ∧ `provisioning`, the caller gates) — never
 * keyed to hypervisor or agent. Rows with exists:false are seeded
 * EXPECTATIONS (hash known, binary not present yet); machine starts REFUSE
 * roles[].files references that are absent, unhashed, or hash-mismatched.
 */

const KIND_OPTIONS = ['installer', 'fixpack', 'hotfix'];

const formatSize = bytes => {
  if (!bytes) {
    return '-';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const order = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** order).toFixed(order === 0 ? 0 : 1)} ${units[order]}`;
};

// Mirrors the agent's Artifact.Verified() plus the display-only distinctions.
const artifactStatus = artifact => {
  if (!artifact.exists) {
    return { label: 'Missing', className: 'text-bg-secondary', title: 'Expected, not present' };
  }
  if (!artifact.sha256) {
    return { label: 'Unhashed', className: 'text-bg-warning', title: 'Never hashed — run a scan' };
  }
  if (!artifact.expected_sha256) {
    return {
      label: 'Hashed',
      className: 'text-bg-info',
      title: 'Hashed; no expectation on record',
    };
  }
  if (artifact.sha256.toLowerCase() === artifact.expected_sha256.toLowerCase()) {
    return { label: 'Verified', className: 'text-bg-success', title: 'Hash matches expectation' };
  }
  return {
    label: 'Mismatch',
    className: 'text-bg-danger',
    title: `File ${artifact.sha256} ≠ expected ${artifact.expected_sha256}`,
  };
};

const InstallerFiles = ({ server }) => {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [roleFilter, setRoleFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [presenceFilter, setPresenceFilter] = useState('');
  const [verifyChecksums, setVerifyChecksums] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // upload|register|download|hcl
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteFileToo, setDeleteFileToo] = useState(false);
  // null = /secrets not readable — the modals degrade to free-text inputs.
  const [secretNames, setSecretNames] = useState({ hcl: null, resources: null });

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadArtifacts = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await getArtifacts(server.hostname, server.port, server.protocol);
    if (result.success) {
      setArtifacts(result.data?.artifacts || []);
    } else {
      report(`Failed to load the file cache: ${result.message}`, 'danger');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

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
    () => [...new Set(artifacts.map(artifact => artifact.role))].sort(),
    [artifacts]
  );

  const visible = artifacts.filter(
    artifact =>
      (!roleFilter || artifact.role === roleFilter) &&
      (!kindFilter || artifact.kind === kindFilter) &&
      (!presenceFilter || String(artifact.exists) === presenceFilter)
  );

  const handleScan = async () => {
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

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteArtifact(
      server.hostname,
      server.port,
      server.protocol,
      deleteTarget.id,
      deleteFileToo
    );
    setLoading(false);
    setDeleteTarget(null);
    setDeleteFileToo(false);
    if (result.success) {
      report(result.data?.message || 'Deleted', 'success');
      loadArtifacts();
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
    }
  };

  const handleModalDone = text => {
    report(text, 'success');
    loadArtifacts();
  };

  return (
    <div>
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
            onClick={handleScan}
            disabled={loading}
          >
            <i className="fas fa-magnifying-glass me-2" />
            Scan Cache
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadArtifacts}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            Refresh
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3">
          <select
            className="form-select form-select-sm"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select form-select-sm"
            aria-label="Filter by kind"
            value={kindFilter}
            onChange={e => setKindFilter(e.target.value)}
          >
            <option value="">All kinds</option>
            {KIND_OPTIONS.map(kind => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select
            className="form-select form-select-sm"
            aria-label="Filter by presence"
            value={presenceFilter}
            onChange={e => setPresenceFilter(e.target.value)}
          >
            <option value="">Present + missing</option>
            <option value="true">Present only</option>
            <option value="false">Missing only (expected)</option>
          </select>
        </div>
        <div className="col-6 col-md-3 text-end">
          <span className="badge text-bg-secondary">
            {visible.length} / {artifacts.length} entries
          </span>
        </div>
      </div>

      {loading && artifacts.length === 0 && <p className="text-muted">Loading…</p>}
      {!loading && artifacts.length === 0 && (
        <div className="alert alert-info">
          The file cache is empty — upload, register, or download installer files, or run a scan to
          pick up files already under the cache directory.
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th>Role</th>
                <th>Kind</th>
                <th>Filename</th>
                <th>Version</th>
                <th>Size</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map(artifact => {
                const status = artifactStatus(artifact);
                return (
                  <tr key={artifact.id}>
                    <td>{artifact.role}</td>
                    <td>{artifact.kind}</td>
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
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        aria-label={`Delete ${artifact.filename}`}
                        onClick={() => setDeleteTarget(artifact)}
                        disabled={loading}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadModal
        isOpen={activeModal === 'upload'}
        onClose={() => setActiveModal(null)}
        server={server}
        roleOptions={roleOptions}
        onDone={handleModalDone}
      />
      <RegisterModal
        isOpen={activeModal === 'register'}
        onClose={() => setActiveModal(null)}
        server={server}
        roleOptions={roleOptions}
        onDone={handleModalDone}
      />
      <DownloadModal
        isOpen={activeModal === 'download'}
        onClose={() => setActiveModal(null)}
        server={server}
        roleOptions={roleOptions}
        resourceNames={secretNames.resources}
        onDone={handleModalDone}
      />
      <HclDownloadModal
        isOpen={activeModal === 'hcl'}
        onClose={() => setActiveModal(null)}
        server={server}
        roleOptions={roleOptions}
        hclKeyNames={secretNames.hcl}
        onDone={handleModalDone}
      />

      {deleteTarget && (
        <FormModal
          isOpen
          onClose={() => {
            setDeleteTarget(null);
            setDeleteFileToo(false);
          }}
          onSubmit={handleDelete}
          title="Delete Cache Entry"
          icon="fas fa-trash"
          submitText={deleteFileToo ? 'Delete Entry + File' : 'Delete Entry'}
          submitVariant="danger"
          loading={loading}
          showCancelButton
        >
          <p>
            Delete the registry entry for{' '}
            <code>
              {deleteTarget.role}/{deleteTarget.kind}/{deleteTarget.filename}
            </code>
            ? Any hash expectation on the entry is removed with it.
          </p>
          <div className="form-check form-switch">
            <input
              id="artifact-delete-file-too"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={deleteFileToo}
              onChange={e => setDeleteFileToo(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="artifact-delete-file-too">
              Also delete the cached file from disk (otherwise a later scan re-registers it)
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
