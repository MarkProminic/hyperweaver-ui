import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAllMachines, getTask } from '../../api/machineAPI';
import {
  getTemplates,
  getTemplateSources,
  getRemoteTemplates,
  pullTemplate,
  deleteTemplate,
  exportTemplate,
  publishTemplate,
  moveTemplate,
} from '../../api/provisioningAPI';
import { makeAgentRequest } from '../../api/serverUtils';
import { flattenBoxCatalog, pickDefaultSource } from '../../utils/boxCatalog';
import { ConfirmModal, FormModal, PathInput } from '../common';
import TaskDetailModal from '../TaskDetailModal';

/**
 * Template registry view (item 14 + catalog §7 — the COMPLETE verb set):
 * list, pull, per-row delete/move, and machine-sourced export/publish.
 * Every mutation is a 202 task — the task stream opens after queueing.
 * Gated on the `templates` token by the caller (config-gated, both agents).
 */

const formatSize = bytes => {
  if (!bytes) {
    return '-';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const order = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** order).toFixed(order === 0 ? 0 : 1)} ${units[order]}`;
};

const TemplatesManagement = ({ server }) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [showPull, setShowPull] = useState(false);
  const [organization, setOrganization] = useState('');
  const [boxName, setBoxName] = useState('');
  const [version, setVersion] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [remoteBoxes, setRemoteBoxes] = useState([]);
  const [remoteSourceName, setRemoteSourceName] = useState('');
  const [sources, setSources] = useState([]);
  const [catalogPick, setCatalogPick] = useState('');
  // Add-registry modal (Mark's ask: a way to ENTER new box registries) —
  // sources are agent config; the save reads /settings, appends to
  // template_sources.sources, and writes the WHOLE category back (PUT
  // merges per top-level key — a bare partial would clobber siblings).
  const [showAddSource, setShowAddSource] = useState(false);
  // '' = adding; a name = editing that source (credential fields left
  // blank mean UNCHANGED — the fetched entry's values round-trip verbatim;
  // sync ask pending on whether GET /settings masks them).
  const [editingSourceName, setEditingSourceName] = useState('');
  const [deleteSource, setDeleteSource] = useState(null);
  // Registry auth is API-key-only (Mark's ruling: "API keys, PERIOD"):
  // sources[] = {name, url, enabled, default, auth_token, ca_file}. The
  // agent's strict parser REFUSES configs carrying the dead username/
  // api_key keys — saveSources strips them from every entry it writes.
  const [sourceForm, setSourceForm] = useState({
    name: '',
    url: '',
    isDefault: false,
    auth_token: '',
    ca_file: '',
  });
  // §7 verbs: per-row delete/move; machine-sourced export/publish.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [movePath, setMovePath] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [machineRows, setMachineRows] = useState([]);
  const [exportForm, setExportForm] = useState({ machine: '', filename: '' });
  const [publishForm, setPublishForm] = useState({
    machine: '',
    source: '',
    organization: '',
    boxName: '',
    version: '',
    description: '',
    architecture: '',
  });
  const [followTask, setFollowTask] = useState(null);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadTemplates = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await getTemplates(server.hostname, server.port, server.protocol);
    if (result.success) {
      setTemplates(result.data?.templates || []);
      setMsg('');
    } else {
      report(`Failed to load templates: ${result.message}`, 'danger');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Sources list; the DEFAULT one preselects for the pull catalog.
  const loadSources = useCallback(() => {
    if (!server) {
      return;
    }
    getTemplateSources(server.hostname, server.port, server.protocol).then(result => {
      const list = result.success && Array.isArray(result.data?.sources) ? result.data.sources : [];
      setSources(list);
      const source = pickDefaultSource(list);
      setRemoteSourceName(prev => prev || source?.name || '');
    });
  }, [server]);

  useEffect(() => {
    setRemoteBoxes([]);
    setRemoteSourceName('');
    setCatalogPick('');
    loadSources();
  }, [loadSources]);

  // THE registry's available templates (Mark's ask: pick a registry, SEE
  // its catalog, pick a box → it downloads locally and machines can use
  // it). Refetches whenever the picked source changes.
  useEffect(() => {
    if (!server || !remoteSourceName) {
      return;
    }
    setRemoteBoxes([]);
    setCatalogPick('');
    getRemoteTemplates(server.hostname, server.port, server.protocol, remoteSourceName).then(
      catalog => {
        setRemoteBoxes(catalog.success ? flattenBoxCatalog(catalog.data) : []);
      }
    );
  }, [server, remoteSourceName]);

  const pickedEntry = remoteBoxes.find(entry => entry.value === catalogPick) || null;

  /**
   * All registry lifecycle writes go through one path: read the WHOLE
   * template_sources category, transform sources[], write the category
   * back (PUT merges per top-level key — a bare partial would clobber
   * siblings like local_storage_path).
   */
  const saveSources = async (transform, successText) => {
    setLoading(true);
    const current = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'settings'
    );
    if (!current.success) {
      setLoading(false);
      report(`Could not read settings: ${current.message}`, 'danger');
      return false;
    }
    const category =
      current.data?.template_sources || current.data?.settings?.template_sources || {};
    const existing = Array.isArray(category.sources) ? category.sources : [];
    const nextSources = transform(existing);
    if (nextSources === null) {
      setLoading(false);
      return false;
    }
    // The dead username/api_key keys must NEVER survive into the PUT —
    // the agent's strict parser refuses configs carrying them (a stale
    // pre-ruling config would otherwise brick every registry write).
    const cleanedSources = nextSources.map(entry => {
      const { username, api_key, ...rest } = entry;
      void username;
      void api_key;
      return rest;
    });
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'settings',
      'PUT',
      { template_sources: { ...category, sources: cleanedSources } }
    );
    setLoading(false);
    if (result.success) {
      report(successText, 'success');
      loadSources();
      return true;
    }
    report(`Registry update failed: ${result.message}`, 'danger');
    return false;
  };

  const resetSourceForm = () =>
    setSourceForm({
      name: '',
      url: '',
      isDefault: false,
      auth_token: '',
      ca_file: '',
    });

  const handleSaveSource = async () => {
    if (!sourceForm.name.trim() || !sourceForm.url.trim()) {
      report('A registry needs a name and a URL.', 'danger');
      return;
    }
    const editing = editingSourceName;
    const ok = await saveSources(
      existing => {
        // Credential fields: typed = overwrite; blank on EDIT = keep the
        // fetched entry's values (they round-trip verbatim in `base`).
        const base = editing ? existing.find(source => source.name === editing) || {} : {};
        const entry = {
          ...base,
          name: sourceForm.name.trim(),
          url: sourceForm.url.trim(),
          enabled: base.enabled !== false,
          default: sourceForm.isDefault,
        };
        if (sourceForm.auth_token.trim()) {
          entry.auth_token = sourceForm.auth_token.trim();
        }
        if (sourceForm.ca_file.trim()) {
          entry.ca_file = sourceForm.ca_file.trim();
        }
        const others = existing.filter(source => source.name !== (editing || entry.name));
        const rest = sourceForm.isDefault
          ? others.map(source => ({ ...source, default: false }))
          : others;
        return [...rest, entry];
      },
      `Registry "${sourceForm.name.trim()}" ${editing ? 'updated' : 'added'}.`
    );
    if (ok) {
      setShowAddSource(false);
      setEditingSourceName('');
      resetSourceForm();
    }
  };

  const handleToggleSource = source =>
    saveSources(
      existing =>
        existing.map(entry =>
          entry.name === source.name ? { ...entry, enabled: source.enabled === false } : entry
        ),
      `Registry "${source.name}" ${source.enabled === false ? 'enabled' : 'disabled'}.`
    );

  const handleSetDefault = source =>
    saveSources(
      existing => existing.map(entry => ({ ...entry, default: entry.name === source.name })),
      `"${source.name}" is now the default registry.`
    );

  const handleRemoveSource = async () => {
    const target = deleteSource;
    setDeleteSource(null);
    await saveSources(
      existing => existing.filter(entry => entry.name !== target.name),
      `Registry "${target.name}" removed (downloaded templates stay).`
    );
  };

  // Machine picker rows for export/publish — export requires stopped
  // (catalog §13: pre-check status, disable with a tooltip).
  const loadMachineRows = () => {
    getAllMachines(server.hostname, server.port, server.protocol).then(result => {
      setMachineRows(result.success ? result.data?.machines || [] : []);
    });
  };

  // Every §7 mutation answers 202 {task_id} — open the task stream.
  const followQueuedTask = async taskId => {
    if (!taskId) {
      return;
    }
    const result = await getTask(server.hostname, server.port, server.protocol, taskId);
    if (result.success && result.data) {
      setFollowTask(result.data.task || result.data);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteTemplate(
      server.hostname,
      server.port,
      server.protocol,
      deleteTarget.id
    );
    setLoading(false);
    setDeleteTarget(null);
    if (result.success) {
      report(result.data?.message || 'Template delete queued', 'success');
      await followQueuedTask(result.data?.task_id);
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
    }
  };

  const handleMove = async () => {
    if (!movePath.trim()) {
      report('Move needs a target storage root path.', 'danger');
      return;
    }
    setLoading(true);
    const result = await moveTemplate(
      server.hostname,
      server.port,
      server.protocol,
      moveTarget.id,
      movePath.trim()
    );
    setLoading(false);
    if (result.success) {
      setMoveTarget(null);
      setMovePath('');
      report(result.data?.message || 'Template move queued', 'success');
      await followQueuedTask(result.data?.task_id);
    } else {
      report(`Move failed: ${result.message}`, 'danger');
    }
  };

  const handleExport = async () => {
    if (!exportForm.machine) {
      report('Export needs a machine.', 'danger');
      return;
    }
    setLoading(true);
    const body = { machine_name: exportForm.machine };
    if (exportForm.filename.trim()) {
      body.filename = exportForm.filename.trim();
    }
    const result = await exportTemplate(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      setShowExport(false);
      report(
        result.data?.message || 'Export queued — the box path and sha256 land in the task output',
        'success'
      );
      await followQueuedTask(result.data?.task_id);
    } else {
      report(`Export failed: ${result.message}`, 'danger');
    }
  };

  const handlePublish = async () => {
    const { machine, source, organization: org, boxName: box, version: ver } = publishForm;
    if (!machine || !source || !org.trim() || !box.trim() || !ver.trim()) {
      report('Publish needs a machine, a source, and organization/box/version.', 'danger');
      return;
    }
    setLoading(true);
    const body = {
      machine_name: machine,
      source_name: source,
      organization: org.trim(),
      box_name: box.trim(),
      version: ver.trim(),
    };
    if (publishForm.description.trim()) {
      body.description = publishForm.description.trim();
    }
    if (publishForm.architecture.trim()) {
      body.architecture = publishForm.architecture.trim();
    }
    const result = await publishTemplate(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      setShowPublish(false);
      report(result.data?.message || 'Publish queued (export → upload → release)', 'success');
      await followQueuedTask(result.data?.task_id);
    } else {
      report(`Publish failed: ${result.message}`, 'danger');
    }
  };

  const handleCatalogPick = value => {
    setCatalogPick(value);
    const entry = remoteBoxes.find(row => row.value === value);
    if (entry) {
      setOrganization(entry.organization);
      setBoxName(entry.boxName);
      setVersion(entry.versions[0] || '');
      setArchitecture(entry.architectures[0] || '');
    }
  };

  const handlePull = async () => {
    if (!organization.trim() || !boxName.trim() || !version.trim()) {
      report('Organization, box name, and a SPECIFIC version are required.', 'danger');
      return;
    }
    setLoading(true);
    const body = {
      organization: organization.trim(),
      box_name: boxName.trim(),
      version: version.trim(),
    };
    if (architecture.trim()) {
      body.architecture = architecture.trim();
    }
    if (remoteSourceName) {
      body.source_name = remoteSourceName;
    }
    const result = await pullTemplate(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      setShowPull(false);
      report(
        `${result.data?.message || 'Download queued'}${result.data?.task_id ? ` (task ${result.data.task_id})` : ''} — refresh once it completes`,
        'success'
      );
    } else {
      report(`Pull failed: ${result.message}`, 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowPull(true)}
            disabled={loading}
          >
            <i className="fas fa-cloud-arrow-down me-2" />
            {t('host.templatesManagement.pullTemplate')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => {
              loadMachineRows();
              setShowExport(true);
            }}
            disabled={loading}
            title={t('host.templatesManagement.exportMachineTooltip')}
          >
            <i className="fas fa-file-export me-2" />
            {t('host.templatesManagement.exportMachine')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => {
              loadMachineRows();
              setPublishForm(prev => ({
                ...prev,
                source: prev.source || pickDefaultSource(sources)?.name || '',
              }));
              setShowPublish(true);
            }}
            disabled={loading}
            title={t('host.templatesManagement.publishTooltip')}
          >
            <i className="fas fa-cloud-arrow-up me-2" />
            {t('host.templatesManagement.publish')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadTemplates}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            {t('host.templatesManagement.refresh')}
          </button>
        </div>
        <span className="badge text-bg-secondary">
          {t('host.templatesManagement.templatesCount', { count: templates.length })}
        </span>
      </div>

      {/* Where boxes COME FROM (Mark's nit: no visible way to set BoxVault/
          HashiCorp as a provider). Sources are agent config —
          template_sources.sources[] — edited on the Agent Settings page;
          the default one feeds the wizard's box dropdown. */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
            <span className="fw-semibold">{t('host.templatesManagement.boxRegistries')}</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setEditingSourceName('');
                resetSourceForm();
                setShowAddSource(true);
              }}
              disabled={loading}
            >
              <i className="fas fa-plus me-1" />
              {t('host.templatesManagement.addRegistry')}
            </button>
          </div>
          {sources.length === 0 && (
            <span className="text-muted small">
              {t('host.templatesManagement.noRegistriesConfigured')}
            </span>
          )}
          <div className="d-flex flex-column gap-1">
            {sources.map(source => (
              <div className="d-flex align-items-center gap-2 flex-wrap" key={source.name}>
                <code className="small">{source.name}</code>
                <span className="text-muted small">{source.url}</span>
                {source.default && (
                  <span className="badge text-bg-success">
                    {t('host.templatesManagement.default')}
                  </span>
                )}
                {source.enabled === false && (
                  <span className="badge text-bg-secondary">
                    {t('host.templatesManagement.disabled')}
                  </span>
                )}
                <span className="ms-auto d-inline-flex gap-1">
                  {!source.default && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success py-0"
                      title={t('host.templatesManagement.makeDefaultRegistry')}
                      onClick={() => handleSetDefault(source)}
                      disabled={loading}
                    >
                      <i className="fas fa-star" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0"
                    title={
                      source.enabled === false
                        ? t('host.templatesManagement.enable')
                        : t('host.templatesManagement.disable')
                    }
                    onClick={() => handleToggleSource(source)}
                    disabled={loading}
                  >
                    <i
                      className={`fas ${source.enabled === false ? 'fa-toggle-off' : 'fa-toggle-on'}`}
                    />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning py-0"
                    title={t('host.templatesManagement.edit')}
                    onClick={() => {
                      setEditingSourceName(source.name);
                      setSourceForm({
                        name: source.name,
                        url: source.url || '',
                        isDefault: !!source.default,
                        auth_token: '',
                        ca_file: '',
                      });
                      setShowAddSource(true);
                    }}
                    disabled={loading}
                  >
                    <i className="fas fa-pen-to-square" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-0"
                    title={t('host.templatesManagement.removeRegistry')}
                    onClick={() => setDeleteSource(source)}
                    disabled={loading}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <p className="form-text text-muted mb-0 mt-1">
            A source is a BoxVault/Vagrant-registry URL (+ optional credentials); mark one{' '}
            <code>default: true</code> to feed the create wizard&apos;s box list. Local template
            storage lives under <code>template_sources.local_storage_path</code> on the same page.
          </p>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && templates.length === 0 && (
        <p className="text-muted">{t('host.templatesManagement.loading')}</p>
      )}
      {!loading && templates.length === 0 && (
        <div className="alert alert-info">{t('host.templatesManagement.noTemplatesYet')}</div>
      )}

      {templates.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th>{t('host.templatesManagement.box')}</th>
                <th>{t('host.templatesManagement.version')}</th>
                <th>{t('host.templatesManagement.architecture')}</th>
                <th>{t('host.templatesManagement.provider')}</th>
                <th>{t('host.templatesManagement.size')}</th>
                <th>{t('host.templatesManagement.downloaded')}</th>
                <th>{t('host.templatesManagement.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr
                  key={`${template.organization}/${template.box_name}/${template.version}/${template.architecture}`}
                >
                  <td>
                    <code className="small">
                      {template.organization}/{template.box_name}
                    </code>
                  </td>
                  <td>{template.version}</td>
                  <td>{template.architecture || '-'}</td>
                  <td>{template.provider || '-'}</td>
                  <td className="small">{formatSize(template.size)}</td>
                  <td className="small">
                    {template.downloaded_at
                      ? new Date(template.downloaded_at).toLocaleString()
                      : '-'}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0"
                        title={t('host.templatesManagement.moveToStorageRoot')}
                        onClick={() => {
                          setMoveTarget(template);
                          setMovePath('');
                        }}
                        disabled={loading || !template.id}
                      >
                        <i className="fas fa-folder-tree" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0"
                        title={t('host.templatesManagement.deleteTemplate')}
                        onClick={() => setDeleteTarget(template)}
                        disabled={loading || !template.id}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        isOpen={showPull}
        onClose={() => setShowPull(false)}
        onSubmit={handlePull}
        title={t('host.templatesManagement.pullTemplate')}
        icon="fas fa-cloud-arrow-down"
        submitText={t('host.templatesManagement.queueDownload')}
        loading={loading}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-pull-source">
              {t('host.templatesManagement.registry')}
            </label>
            <select
              id="template-pull-source"
              className="form-select"
              value={remoteSourceName}
              onChange={e => setRemoteSourceName(e.target.value)}
              disabled={sources.length === 0}
            >
              {sources.length === 0 && (
                <option value="">
                  {t('host.templatesManagement.noRegistriesConfiguredOption')}
                </option>
              )}
              {sources.map(source => (
                <option key={source.name} value={source.name}>
                  {source.name}
                  {source.default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="template-pull-catalog">
              {t('host.templatesManagement.availableTemplates', {
                source: remoteSourceName || t('host.templatesManagement.theRegistry'),
              })}
            </label>
            <select
              id="template-pull-catalog"
              className="form-select"
              value={catalogPick}
              onChange={e => handleCatalogPick(e.target.value)}
              disabled={remoteBoxes.length === 0}
            >
              <option value="">
                {remoteBoxes.length > 0
                  ? t('host.templatesManagement.selectTemplate')
                  : t('host.templatesManagement.catalogEmptyOrUnreachable')}
              </option>
              {remoteBoxes.map(entry => (
                <option key={entry.value} value={entry.value}>
                  {entry.value}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-pull-org">
              {t('host.templatesManagement.organization')}
            </label>
            <input
              id="template-pull-org"
              className="form-control"
              type="text"
              placeholder={t('host.templatesManagement.organizationPlaceholder')}
              value={organization}
              onChange={e => setOrganization(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-pull-box">
              {t('host.templatesManagement.boxName')}
            </label>
            <input
              id="template-pull-box"
              className="form-control"
              type="text"
              placeholder={t('host.templatesManagement.boxNamePlaceholder')}
              value={boxName}
              onChange={e => setBoxName(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-pull-version">
              {t('host.templatesManagement.versionSpecific')}
            </label>
            {pickedEntry && pickedEntry.versions.length > 0 ? (
              <select
                id="template-pull-version"
                className="form-select"
                value={version}
                onChange={e => setVersion(e.target.value)}
              >
                {pickedEntry.versions.map(versionNumber => (
                  <option key={versionNumber} value={versionNumber}>
                    {versionNumber}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="template-pull-version"
                className="form-control"
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
              />
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-pull-arch">
              {t('host.templatesManagement.architectureOptional')}
            </label>
            {pickedEntry && pickedEntry.architectures.length > 0 ? (
              <select
                id="template-pull-arch"
                className="form-select"
                value={architecture}
                onChange={e => setArchitecture(e.target.value)}
              >
                <option value="">{t('host.templatesManagement.defaultOption')}</option>
                {pickedEntry.architectures.map(arch => (
                  <option key={arch} value={arch}>
                    {arch}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="template-pull-arch"
                className="form-control"
                type="text"
                placeholder={t('host.templatesManagement.amd64Placeholder')}
                value={architecture}
                onChange={e => setArchitecture(e.target.value)}
              />
            )}
          </div>
        </div>
      </FormModal>

      {deleteTarget && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={t('host.templatesManagement.deleteTemplate')}
          message={t('host.templatesManagement.deleteTemplateConfirm', {
            template: `${deleteTarget.organization}/${deleteTarget.box_name} ${deleteTarget.version}`,
          })}
          confirmText={t('host.templatesManagement.delete')}
          loading={loading}
        />
      )}

      {moveTarget && (
        <FormModal
          isOpen
          onClose={() => setMoveTarget(null)}
          onSubmit={handleMove}
          title={t('host.templatesManagement.moveTemplate', {
            template: `${moveTarget.organization}/${moveTarget.box_name} ${moveTarget.version}`,
          })}
          icon="fas fa-folder-tree"
          submitText={t('host.templatesManagement.queueMove')}
          loading={loading}
          showCancelButton
        >
          <label className="form-label" htmlFor="template-move-path">
            {t('host.templatesManagement.newStorageRoot')}
          </label>
          <PathInput
            id="template-move-path"
            value={movePath}
            onChange={setMovePath}
            server={server}
            pickTitle={t('host.templatesManagement.pickNewStorageRoot')}
          />
        </FormModal>
      )}

      <FormModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onSubmit={handleExport}
        title={t('host.templatesManagement.exportMachineToBox')}
        icon="fas fa-file-export"
        submitText={t('host.templatesManagement.queueExport')}
        loading={loading}
        showCancelButton
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="template-export-machine">
            {t('host.templatesManagement.machineMustBeStopped')}
          </label>
          <select
            id="template-export-machine"
            className="form-select"
            value={exportForm.machine}
            onChange={e => setExportForm({ ...exportForm, machine: e.target.value })}
            required
          >
            <option value="">{t('host.templatesManagement.select')}</option>
            {machineRows.map(row => (
              <option
                key={row.name}
                value={row.name}
                disabled={(row.status || '').toLowerCase() === 'running'}
              >
                {row.name}
                {(row.status || '').toLowerCase() === 'running'
                  ? ` (${t('host.templatesManagement.runningStopFirst')})`
                  : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2">
          <label className="form-label" htmlFor="template-export-filename">
            {t('host.templatesManagement.filenameOptional')}
          </label>
          <input
            id="template-export-filename"
            className="form-control"
            type="text"
            value={exportForm.filename}
            onChange={e => setExportForm({ ...exportForm, filename: e.target.value })}
          />
        </div>
        <p className="form-text text-muted mb-0">
          {t('host.templatesManagement.resultingBoxPathLandInTaskOutput')}
        </p>
      </FormModal>

      <FormModal
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        onSubmit={handlePublish}
        title={t('host.templatesManagement.publishMachineToRegistry')}
        icon="fas fa-cloud-arrow-up"
        submitText={t('host.templatesManagement.queuePublish')}
        loading={loading}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-machine">
              {t('host.templatesManagement.machineMustBeStopped')}
            </label>
            <select
              id="template-publish-machine"
              className="form-select"
              value={publishForm.machine}
              onChange={e => setPublishForm({ ...publishForm, machine: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {machineRows.map(row => (
                <option
                  key={row.name}
                  value={row.name}
                  disabled={(row.status || '').toLowerCase() === 'running'}
                >
                  {row.name}
                  {(row.status || '').toLowerCase() === 'running' ? ' (running — stop first)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-source">
              {t('host.templatesManagement.registrySourceLabel')}
            </label>
            <select
              id="template-publish-source"
              className="form-select"
              value={publishForm.source}
              onChange={e => setPublishForm({ ...publishForm, source: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {sources.map(source => (
                <option key={source.name} value={source.name}>
                  {source.name}
                  {source.default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-org">
              {t('host.templatesManagement.organization')}
            </label>
            <input
              id="template-publish-org"
              className="form-control"
              type="text"
              value={publishForm.organization}
              onChange={e => setPublishForm({ ...publishForm, organization: e.target.value })}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-box">
              {t('host.templatesManagement.boxName')}
            </label>
            <input
              id="template-publish-box"
              className="form-control"
              type="text"
              value={publishForm.boxName}
              onChange={e => setPublishForm({ ...publishForm, boxName: e.target.value })}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-version">
              {t('host.templatesManagement.version')}
            </label>
            <input
              id="template-publish-version"
              className="form-control"
              type="text"
              value={publishForm.version}
              onChange={e => setPublishForm({ ...publishForm, version: e.target.value })}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="template-publish-arch">
              {t('host.templatesManagement.architectureOptional')}
            </label>
            <input
              id="template-publish-arch"
              className="form-control"
              type="text"
              placeholder={t('host.templatesManagement.amd64Placeholder')}
              value={publishForm.architecture}
              onChange={e => setPublishForm({ ...publishForm, architecture: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="template-publish-description">
              {t('host.templatesManagement.descriptionOptional')}
            </label>
            <input
              id="template-publish-description"
              className="form-control"
              type="text"
              value={publishForm.description}
              onChange={e => setPublishForm({ ...publishForm, description: e.target.value })}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={showAddSource}
        onClose={() => setShowAddSource(false)}
        onSubmit={handleSaveSource}
        title={
          editingSourceName
            ? t('host.templatesManagement.editRegistry', { name: editingSourceName })
            : t('host.templatesManagement.addBoxRegistry')
        }
        icon="fas fa-cloud"
        submitText={
          editingSourceName
            ? t('host.templatesManagement.save')
            : t('host.templatesManagement.addRegistry')
        }
        loading={loading}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="source-name">
              {t('host.templatesManagement.name')}
            </label>
            <input
              id="source-name"
              className="form-control"
              placeholder={t('host.templatesManagement.boxvaultPlaceholder')}
              value={sourceForm.name}
              onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })}
              required
            />
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="source-url">
              {t('host.templatesManagement.urlBoxVaultLabel')}
            </label>
            <input
              id="source-url"
              className="form-control"
              placeholder={t('host.templatesManagement.urlPlaceholder')}
              value={sourceForm.url}
              onChange={e => setSourceForm({ ...sourceForm, url: e.target.value })}
              required
            />
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input
                id="source-default"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={sourceForm.isDefault}
                onChange={e => setSourceForm({ ...sourceForm, isDefault: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="source-default">
                {t('host.templatesManagement.makeDefaultRegistryFeedsWizard')}
              </label>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="source-token">
              {t('host.templatesManagement.registryApiKey')}
            </label>
            <input
              id="source-token"
              className="form-control"
              value={sourceForm.auth_token}
              onChange={e => setSourceForm({ ...sourceForm, auth_token: e.target.value })}
            />
            <span className="form-text text-muted">
              {t('host.templatesManagement.apiKeyHelp', {
                blankKeepsExisting: editingSourceName
                  ? t('host.templatesManagement.blankKeepsExisting')
                  : '',
              })}
            </span>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="source-cafile">
              {t('host.templatesManagement.caFileLabel')}
            </label>
            <PathInput
              id="source-cafile"
              value={sourceForm.ca_file}
              onChange={next => setSourceForm(prev => ({ ...prev, ca_file: next }))}
              server={server}
              mode="file"
              pickTitle={t('host.templatesManagement.pickCaFile')}
            />
          </div>
        </div>
      </FormModal>

      {deleteSource && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteSource(null)}
          onConfirm={handleRemoveSource}
          title={t('host.templatesManagement.removeRegistry')}
          message={t('host.templatesManagement.removeRegistryConfirm', {
            name: deleteSource.name,
          })}
          confirmText={t('host.templatesManagement.remove')}
          loading={loading}
        />
      )}

      {followTask && (
        <TaskDetailModal
          task={followTask}
          onClose={() => {
            setFollowTask(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
};

TemplatesManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default TemplatesManagement;
