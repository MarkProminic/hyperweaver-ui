import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getProvisioners,
  importProvisioner,
  deleteProvisioner,
  deleteProvisionerVersion,
  getCatalog,
  getCatalogSources,
  installFromCatalog,
  refreshProvisionerFromSource,
  getSecrets,
} from '../../api/provisioningAPI';
import { makeAgentRequest } from '../../api/serverUtils';
import { pollTaskRow } from '../../utils/taskOperations';
import { ConfirmModal, ContentModal, FormModal } from '../common';

/** Dotted-version compare — true when a is strictly newer than b. */
const versionNewer = (a, b) => {
  const partsA = String(a).split('.');
  const partsB = String(b).split('.');
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i += 1) {
    const segA = partsA[i] ?? '0';
    const segB = partsB[i] ?? '0';
    const numA = Number(segA);
    const numB = Number(segB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      if (segA !== segB) {
        return segA > segB;
      }
    } else if (numA !== numB) {
      return numA > numB;
    }
  }
  return false;
};

const pollTask = (server, taskId, attempts) =>
  pollTaskRow(async () => {
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'tasks',
      'GET',
      null,
      { limit: 50 }
    );
    return result.success ? (result.data?.tasks || []).find(row => row.id === taskId) : null;
  }, attempts);

/**
 * Provisioner management (sync item 11) — the registry surface of the
 * `provisioning` feature token, identical against either agent: list
 * families/versions, import (folder / archive / git — paths are AGENT-HOST
 * locations), delete family or version with the 409-in-use answer surfaced
 * (the agent lists the machines whose specs still reference it).
 */

/**
 * The public-catalog browser: the agent relays catalog.json live (families +
 * versions + checksummed artifacts) and installs run agent-side (op
 * provisioner_catalog_install — sha256 verified before anything lands, then
 * the ordinary import). Source dropdown appears only when the agent carries
 * more than one catalog source; blank = the agent's default.
 */
const CatalogBrowseModal = ({ isOpen, onClose, server, installedKeys, onQueued }) => {
  const { t } = useTranslation();
  const [sources, setSources] = useState([]);
  const [source, setSource] = useState(''); // '' = the agent's default source
  const [catalog, setCatalog] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState(null); // "name/version" mid-POST

  const loadCatalog = useCallback(
    async sourceName => {
      setCatalog(null);
      setError('');
      const result = await getCatalog(
        server.hostname,
        server.port,
        server.protocol,
        sourceName || null
      );
      if (result.success) {
        // The response IS the catalog document (bare parsed relay, both
        // agents): {name, format_version, updated, provisioners[]}.
        setCatalog(result.data || {});
      } else {
        setCatalog({});
        setError(t('host.provisionerManagement.catalogFetchFailed', { message: result.message }));
      }
    },
    [server, t]
  );

  useEffect(() => {
    if (!isOpen || !server) {
      return;
    }
    setSource('');
    getCatalogSources(server.hostname, server.port, server.protocol).then(result => {
      setSources(result.success && Array.isArray(result.data?.sources) ? result.data.sources : []);
    });
    loadCatalog('');
  }, [isOpen, server, loadCatalog]);

  const install = async (name, version) => {
    const key = `${name}/${version}`;
    setInstalling(key);
    setError('');
    const result = await installFromCatalog(server.hostname, server.port, server.protocol, {
      ...(source && { source_name: source }),
      name,
      version,
    });
    setInstalling(null);
    if (result.success) {
      onQueued(key, result.data?.task_id || null);
      onClose();
    } else {
      setError(t('host.provisionerManagement.installFailed', { message: result.message }));
    }
  };

  const families = Array.isArray(catalog?.provisioners) ? catalog.provisioners : [];

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('host.provisionerManagement.catalogTitle')}
      icon="fas fa-cloud-arrow-down"
    >
      {sources.length > 1 && (
        <div className="mb-3">
          <label className="form-label" htmlFor="catalog-source">
            {t('host.provisionerManagement.catalogSource')}
          </label>
          <select
            id="catalog-source"
            className="form-select"
            value={source}
            onChange={e => {
              setSource(e.target.value);
              loadCatalog(e.target.value);
            }}
          >
            <option value="">{t('host.provisionerManagement.default')}</option>
            {sources.map(entry => (
              <option key={entry.name} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {catalog === null && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-spin me-2" />
          {t('host.provisionerManagement.fetchingCatalog')}
        </p>
      )}
      {catalog !== null && families.length === 0 && !error && (
        <p className="text-muted mb-0">{t('host.provisionerManagement.noProvisionersInCatalog')}</p>
      )}

      {families.map(family => (
        <div className="card mb-3" key={family.name}>
          <div className="card-body">
            <h5 className="fs-6 fw-bold mb-1">
              <i className="fas fa-cubes me-2" />
              {family.name}
            </h5>
            {family.repo && <code className="small text-muted d-block mb-1">{family.repo}</code>}
            {family.description && <p className="text-muted small mb-2">{family.description}</p>}
            {Array.isArray(family.versions) && family.versions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-sm mb-0">
                  <thead>
                    <tr>
                      <th>{t('host.provisionerManagement.version')}</th>
                      <th aria-label={t('host.provisionerManagement.actions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {family.versions.map(version => {
                      const key = `${family.name}/${version.version}`;
                      const installed = installedKeys.has(key);
                      return (
                        <tr key={version.version}>
                          <td>
                            <code className="small">{version.version}</code>
                            {installed && (
                              <span className="badge text-bg-success ms-2">
                                {t('host.provisionerManagement.installed')}
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => install(family.name, version.version)}
                              disabled={installed || installing !== null}
                              title={
                                installed
                                  ? t('host.provisionerManagement.alreadyInstalledTitle')
                                  : t('host.provisionerManagement.installVersionTitle')
                              }
                            >
                              {installing === key ? (
                                <i className="fas fa-spinner fa-spin" />
                              ) : (
                                <>
                                  <i className="fas fa-download me-2" />
                                  {t('host.provisionerManagement.install')}
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted small mb-0">
                {t('host.provisionerManagement.noVersionsPublished')}
              </p>
            )}
          </div>
        </div>
      ))}
    </ContentModal>
  );
};

CatalogBrowseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  installedKeys: PropTypes.instanceOf(Set).isRequired,
  onQueued: PropTypes.func.isRequired,
};
const ProvisionerManagement = ({ server }) => {
  const { t } = useTranslation();
  const [provisioners, setProvisioners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [showImport, setShowImport] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [sourceType, setSourceType] = useState('folder');
  const [importPath, setImportPath] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importBranch, setImportBranch] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [gitKeyNames, setGitKeyNames] = useState(null); // null = not readable (non-admin)
  // {name, version?} — version absent = whole family
  const [deleteTarget, setDeleteTarget] = useState(null);
  // Newest default-catalog version per family — feeds the update badges
  // (HACS-style, Mark's ask 2026-07-17). Advisory: fetch failure = no badges.
  const [catalogNewest, setCatalogNewest] = useState({});

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
      report(t('host.provisionerManagement.loadFailed', { message: result.message }), 'danger');
    }
    setLoading(false);
  }, [server, t]);

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

  // Quiet default-catalog scan on load: newest version per family (the
  // catalog serves versions semver-DESC, so [0] is newest).
  useEffect(() => {
    if (!server) {
      return;
    }
    getCatalog(server.hostname, server.port, server.protocol).then(result => {
      const families =
        result.success && Array.isArray(result.data?.provisioners) ? result.data.provisioners : [];
      setCatalogNewest(
        Object.fromEntries(
          families
            .filter(family => Array.isArray(family.versions) && family.versions.length > 0)
            .map(family => [family.name, family.versions[0].version])
        )
      );
    });
  }, [server]);

  // "Update available" when the catalog's newest is strictly newer than
  // EVERY installed version of the family (an installed dev build newer
  // than the catalog never badges a downgrade).
  const updateFor = collection => {
    const newest = catalogNewest[collection.name];
    if (!newest) {
      return null;
    }
    const installed = (collection.versions || []).map(entry => entry.version);
    if (installed.includes(newest)) {
      return null;
    }
    return installed.every(version => versionNewer(newest, version)) ? newest : null;
  };

  const handleImport = async () => {
    const body = { source_type: sourceType };
    if (sourceType === 'git') {
      if (!importUrl.trim()) {
        report(t('host.provisionerManagement.repoUrlRequired'), 'danger');
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
        report(t('host.provisionerManagement.pathRequired'), 'danger');
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
        t('host.provisionerManagement.importQueued', {
          message: result.data?.message || t('host.provisionerManagement.importQueuedDefault'),
          taskId: result.data?.task_id,
        }),
        'success'
      );
      setImportPath('');
      setImportUrl('');
      setImportBranch('');
      setTokenName('');
    } else {
      report(t('host.provisionerManagement.importFailed', { message: result.message }), 'danger');
    }
  };

  // A queued catalog install tracks its own task to completion, then the
  // registry list refreshes itself — no manual refresh.
  const trackInstall = async (label, taskId) => {
    if (!taskId) {
      report(t('host.provisionerManagement.installQueued', { label }), 'success');
      return;
    }
    report(t('host.provisionerManagement.installing', { label, taskId }), 'info');
    const task = await pollTask(server, taskId, 90);
    if (!task) {
      report(t('host.provisionerManagement.installStillRunning', { label, taskId }), 'warning');
      return;
    }
    if (task.status === 'completed') {
      report(t('host.provisionerManagement.installComplete', { label }), 'success');
      loadProvisioners();
    } else {
      report(
        t('host.provisionerManagement.installFailedStatus', {
          label,
          status: task.status.replace(/_/gu, ' '),
          error: task.error_message || t('host.provisionerManagement.seeTaskLog'),
        }),
        'danger'
      );
    }
  };

  // One-click update to the catalog's newest (default source — the same
  // feed the badges scan).
  const handleUpdate = async (name, version) => {
    const result = await installFromCatalog(server.hostname, server.port, server.protocol, {
      name,
      version,
    });
    if (result.success) {
      trackInstall(`${name}/${version}`, result.data?.task_id || null);
    } else {
      report(t('host.provisionerManagement.updateFailed', { message: result.message }), 'danger');
    }
  };

  // Git-imported families re-run their import against the STORED provenance
  // — new release versions land beside the old ones (non-clobber).
  const handleRefreshSource = async name => {
    const result = await refreshProvisionerFromSource(
      server.hostname,
      server.port,
      server.protocol,
      name
    );
    if (result.success) {
      trackInstall(
        t('host.provisionerManagement.fromSourceLabel', { name }),
        result.data?.task_id || null
      );
    } else {
      report(
        t('host.provisionerManagement.updateFromSourceFailed', { message: result.message }),
        'danger'
      );
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
      report(result.data?.message || t('host.provisionerManagement.deleted'), 'success');
      loadProvisioners();
    } else if (result.status === 409 && Array.isArray(result.data?.machines)) {
      // The in-use answer names the referencing machines — surface them.
      report(
        t('host.provisionerManagement.referencedBy', {
          message: result.message,
          machines: result.data.machines.join(', '),
        }),
        'warning'
      );
    } else {
      report(t('host.provisionerManagement.deleteFailed', { message: result.message }), 'danger');
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
            {t('host.provisionerManagement.importProvisioner')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowCatalog(true)}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            {t('host.provisionerManagement.browseCatalog')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadProvisioners}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            {t('host.provisionerManagement.refresh')}
          </button>
        </div>
        <span className="badge text-bg-secondary">
          {t('host.provisionerManagement.familiesCount', { count: provisioners.length })}
        </span>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && provisioners.length === 0 && (
        <p className="text-muted">{t('host.provisionerManagement.loading')}</p>
      )}
      {!loading && provisioners.length === 0 && (
        <div className="alert alert-info">{t('host.provisionerManagement.emptyRegistry')}</div>
      )}

      {provisioners.map(collection => {
        const update = updateFor(collection);
        return (
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
                    {!collection.valid && (
                      <span className="badge text-bg-danger ms-2">
                        {t('host.provisionerManagement.invalid')}
                      </span>
                    )}
                    {update && (
                      <span className="badge text-bg-warning ms-2">
                        {t('host.provisionerManagement.updateAvailable', { version: update })}
                      </span>
                    )}
                  </h5>
                  {collection.description && (
                    <p className="text-muted small mb-2">{collection.description}</p>
                  )}
                </div>
                <div className="d-flex gap-2">
                  {update && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdate(collection.name, update)}
                      disabled={loading}
                      title={t('host.provisionerManagement.updateToTitle')}
                    >
                      <i className="fas fa-cloud-arrow-down me-2" />
                      {t('host.provisionerManagement.updateTo', { version: update })}
                    </button>
                  )}
                  {collection.source?.source_type === 'git' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleRefreshSource(collection.name)}
                      disabled={loading}
                      title={
                        collection.source.token_name
                          ? t('host.provisionerManagement.reimportFromWithKey', {
                              url: collection.source.url,
                              key: collection.source.token_name,
                            })
                          : t('host.provisionerManagement.reimportFrom', {
                              url: collection.source.url,
                            })
                      }
                    >
                      <i className="fab fa-git-alt me-2" />
                      {t('host.provisionerManagement.updateFromSource')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeleteTarget({ name: collection.name })}
                    disabled={loading}
                  >
                    <i className="fas fa-trash me-2" />
                    {t('host.provisionerManagement.deleteFamily')}
                  </button>
                </div>
              </div>

              {collection.versions?.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped table-sm mb-0">
                    <thead>
                      <tr>
                        <th>{t('host.provisionerManagement.version')}</th>
                        <th>{t('host.provisionerManagement.name')}</th>
                        <th>{t('host.provisionerManagement.description')}</th>
                        <th aria-label={t('host.provisionerManagement.actions')} />
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
        );
      })}

      <FormModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSubmit={handleImport}
        title={t('host.provisionerManagement.importProvisioner')}
        icon="fas fa-file-import"
        submitText={t('host.provisionerManagement.importSubmit')}
        loading={loading}
        showCancelButton
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="import-source-type">
            {t('host.provisionerManagement.source')}
          </label>
          <select
            id="import-source-type"
            className="form-select"
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
          >
            <option value="folder">{t('host.provisionerManagement.sourceFolder')}</option>
            <option value="archive">{t('host.provisionerManagement.sourceArchive')}</option>
            <option value="git">{t('host.provisionerManagement.sourceGit')}</option>
          </select>
        </div>

        {sourceType !== 'git' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="import-path">
              {t('host.provisionerManagement.pathOnAgentHost')}
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
                {t('host.provisionerManagement.repositoryUrl')}
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
                {t('host.provisionerManagement.branch')}
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
                {t('host.provisionerManagement.gitApiKey')}
              </label>
              {gitKeyNames ? (
                <select
                  id="import-token"
                  className="form-select"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                >
                  <option value="">{t('host.provisionerManagement.nonePublicRepo')}</option>
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
                  placeholder={t('host.provisionerManagement.gitApiKeyPlaceholder')}
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                />
              )}
              <p className="form-text text-muted mb-0">
                {t('host.provisionerManagement.gitApiKeyHelp')}
              </p>
            </div>
          </>
        )}
      </FormModal>

      <CatalogBrowseModal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        server={server}
        installedKeys={
          new Set(
            provisioners.flatMap(collection =>
              (collection.versions || []).map(version => `${collection.name}/${version.version}`)
            )
          )
        }
        onQueued={(label, taskId) => trackInstall(label, taskId)}
      />

      {deleteTarget && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={
            deleteTarget.version
              ? t('host.provisionerManagement.deleteVersionTitle')
              : t('host.provisionerManagement.deleteFamilyTitle')
          }
          message={
            deleteTarget.version
              ? t('host.provisionerManagement.deleteVersionMessage', {
                  name: deleteTarget.name,
                  version: deleteTarget.version,
                })
              : t('host.provisionerManagement.deleteFamilyMessage', { name: deleteTarget.name })
          }
          confirmText={t('host.provisionerManagement.delete')}
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
