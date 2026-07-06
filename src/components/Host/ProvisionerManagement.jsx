import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  getProvisioners,
  importProvisioner,
  deleteProvisioner,
  deleteProvisionerVersion,
  getSecrets,
} from '../../api/provisioningAPI';
import { ConfirmModal, FormModal } from '../common';

/**
 * Provisioner management (sync item 11) — the registry surface of the
 * `provisioning` feature token, identical against either agent: list
 * families/versions, import (folder / archive / git — paths are AGENT-HOST
 * locations), delete family or version with the 409-in-use answer surfaced
 * (the agent lists the machines whose specs still reference it).
 */
const ProvisionerManagement = ({ server }) => {
  const [provisioners, setProvisioners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [showImport, setShowImport] = useState(false);
  const [sourceType, setSourceType] = useState('folder');
  const [importPath, setImportPath] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importBranch, setImportBranch] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [gitKeyNames, setGitKeyNames] = useState(null); // null = not readable (non-admin)
  // {name, version?} — version absent = whole family
  const [deleteTarget, setDeleteTarget] = useState(null);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadProvisioners = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await getProvisioners(server.hostname, server.port, server.protocol);
    if (result.success) {
      setProvisioners(result.data?.provisioners || []);
    } else {
      report(`Failed to load provisioners: ${result.message}`, 'danger');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    loadProvisioners();
  }, [loadProvisioners]);

  // git_api_keys names feed the import modal's token dropdown. /secrets is
  // admin-only — a rejection just degrades the dropdown to a text input.
  useEffect(() => {
    if (!server) {
      return;
    }
    getSecrets(server.hostname, server.port, server.protocol).then(result => {
      setGitKeyNames(
        result.success ? (result.data?.git_api_keys || []).map(entry => entry.name) : null
      );
    });
  }, [server]);

  const handleImport = async () => {
    const body = { source_type: sourceType };
    if (sourceType === 'git') {
      if (!importUrl.trim()) {
        report('A repository URL is required.', 'danger');
        return;
      }
      body.url = importUrl.trim();
      if (importBranch.trim()) {
        body.branch = importBranch.trim();
      }
      if (tokenName.trim()) {
        body.token_name = tokenName.trim();
      }
    } else {
      if (!importPath.trim()) {
        report('A path on the agent host is required.', 'danger');
        return;
      }
      body.path = importPath.trim();
    }

    setLoading(true);
    const result = await importProvisioner(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      setShowImport(false);
      report(
        `${result.data?.message || 'Import queued'} (task ${result.data?.task_id}) — refresh once it completes`,
        'success'
      );
      setImportPath('');
      setImportUrl('');
      setImportBranch('');
      setTokenName('');
    } else {
      report(`Import failed: ${result.message}`, 'danger');
    }
  };

  const handleDelete = async () => {
    const { name, version } = deleteTarget;
    setLoading(true);
    const result = version
      ? await deleteProvisionerVersion(server.hostname, server.port, server.protocol, name, version)
      : await deleteProvisioner(server.hostname, server.port, server.protocol, name);
    setLoading(false);
    setDeleteTarget(null);
    if (result.success) {
      report(result.data?.message || 'Deleted', 'success');
      loadProvisioners();
    } else if (result.status === 409 && Array.isArray(result.data?.machines)) {
      // The in-use answer names the referencing machines — surface them.
      report(`${result.message} — referenced by: ${result.data.machines.join(', ')}`, 'warning');
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowImport(true)}
            disabled={loading}
          >
            <i className="fas fa-file-import me-2" />
            Import Provisioner
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadProvisioners}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            Refresh
          </button>
        </div>
        <span className="badge text-bg-secondary">{provisioners.length} families</span>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && provisioners.length === 0 && <p className="text-muted">Loading…</p>}
      {!loading && provisioners.length === 0 && (
        <div className="alert alert-info">
          No provisioners in this host&apos;s registry yet — import one to enable machine creation.
        </div>
      )}

      {provisioners.map(collection => (
        <div className="card mb-3" key={collection.name}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="fs-6 fw-bold mb-1">
                  <i className="fas fa-cubes me-2" />
                  {/* metadata.label = optional display name (sync convention,
                      2026-07-06); the slug stays visible — import/delete and
                      machine specs address the family by it. */}
                  {collection.metadata?.label || collection.name}
                  {collection.metadata?.label && (
                    <code className="small text-muted ms-2">{collection.name}</code>
                  )}
                  {!collection.valid && <span className="badge text-bg-danger ms-2">Invalid</span>}
                </h5>
                {collection.description && (
                  <p className="text-muted small mb-2">{collection.description}</p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => setDeleteTarget({ name: collection.name })}
                disabled={loading}
              >
                <i className="fas fa-trash me-2" />
                Delete Family
              </button>
            </div>

            {collection.versions?.length > 0 && (
              <div className="table-responsive">
                <table className="table table-striped table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {collection.versions.map(version => (
                      <tr key={version.dir}>
                        <td>
                          <code className="small">{version.version}</code>
                        </td>
                        <td>{version.name || '-'}</td>
                        <td className="small">{version.description || '-'}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setDeleteTarget({ name: collection.name, version: version.version })
                            }
                            disabled={loading}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}

      <FormModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSubmit={handleImport}
        title="Import Provisioner"
        icon="fas fa-file-import"
        submitText="Import"
        loading={loading}
        showCancelButton
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="import-source-type">
            Source
          </label>
          <select
            id="import-source-type"
            className="form-select"
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
          >
            <option value="folder">Folder on the agent host</option>
            <option value="archive">Archive on the agent host (.tar.gz / .tgz / .zip)</option>
            <option value="git">Git repository (http/https)</option>
          </select>
        </div>

        {sourceType !== 'git' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="import-path">
              Path (on the agent host)
            </label>
            <input
              id="import-path"
              className="form-control"
              type="text"
              value={importPath}
              onChange={e => setImportPath(e.target.value)}
            />
          </div>
        )}

        {sourceType === 'git' && (
          <>
            <div className="mb-3">
              <label className="form-label" htmlFor="import-url">
                Repository URL
              </label>
              <input
                id="import-url"
                className="form-control"
                type="text"
                placeholder="https://…"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="import-branch">
                Branch (blank = default)
              </label>
              <input
                id="import-branch"
                className="form-control"
                type="text"
                value={importBranch}
                onChange={e => setImportBranch(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="import-token">
                Git API Key (private repositories)
              </label>
              {gitKeyNames ? (
                <select
                  id="import-token"
                  className="form-select"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                >
                  <option value="">None (public repository)</option>
                  {gitKeyNames.map(keyName => (
                    <option key={keyName} value={keyName}>
                      {keyName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="import-token"
                  className="form-control"
                  type="text"
                  placeholder="git_api_keys secret name (blank = public)"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                />
              )}
              <p className="form-text text-muted mb-0">
                Names an entry under Global Secrets → Git API Keys; the key itself never leaves the
                agent.
              </p>
            </div>
          </>
        )}
      </FormModal>

      {deleteTarget && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={deleteTarget.version ? 'Delete Provisioner Version' : 'Delete Provisioner Family'}
          message={
            deleteTarget.version
              ? `Delete ${deleteTarget.name}/${deleteTarget.version}? The agent refuses while any machine references it.`
              : `Delete the whole ${deleteTarget.name} family (every version)? The agent refuses while any machine references it.`
          }
          confirmText="Delete"
          icon="fas fa-trash"
          loading={loading}
        />
      )}
    </div>
  );
};

ProvisionerManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default ProvisionerManagement;
