import { Helmet } from '@dr.pogodin/react-helmet';
import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { useHostSystemManagement } from '../hooks/useHostSystemManagement';
import { canManageSettings } from '../utils/permissions';

import ApiKeysTab from './ApiKeysTab';
import { ContentModal, FormModal } from './common';
import HostPageHeader from './Host/HostPageHeader';

// Helper function moved outside component
const organizeBySection = settingsData => {
  const sections = [];

  const collectSectionContent = (obj, basePath = []) => {
    const content = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a subsection
        content.push({
          type: 'subsection',
          name: key,
          path: [...basePath, key],
          fields: collectSectionContent(value, [...basePath, key]),
        });
      } else {
        // This is a field
        content.push({
          type: 'field',
          key,
          value,
          path: [...basePath, key],
        });
      }
    });

    return content;
  };

  Object.entries(settingsData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sections.push({
        name: key,
        content: collectSectionContent(value, [key]),
      });
    }
  });

  return sections;
};

// Editable JSON field for array/object values that have no flat representation
// (e.g. artifact storage locations: an array of objects, which would otherwise
// stringify to "[object Object]"). The raw text is held locally so the user can
// type freely; the value is only committed to settings when the JSON parses.
const JsonField = ({ fieldId, label, value, onChange, description }) => {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  // Resync when the value changes from outside (settings reload / server switch)
  // without clobbering an in-progress edit that already matches the value.
  useEffect(() => {
    setText(prev => {
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(value)) {
          return prev;
        }
      } catch {
        // prev is mid-edit invalid JSON; fall through to adopt the new value
      }
      return JSON.stringify(value, null, 2);
    });
    setError('');
  }, [value]);

  const handleChange = e => {
    const next = e.target.value;
    setText(next);
    try {
      onChange(JSON.parse(next));
      setError('');
    } catch (parseErr) {
      setError(parseErr.message);
    }
  };

  return (
    <div className="col-12">
      <div className="mb-3">
        <label className="form-label" htmlFor={fieldId}>
          {label}
        </label>
        <textarea
          id={fieldId}
          className={`form-control font-monospace${error ? ' is-invalid' : ''}`}
          rows="8"
          value={text}
          onChange={handleChange}
          spellCheck={false}
        />
        {error ? (
          <div className="invalid-feedback">
            Invalid JSON — changes won&apos;t be saved until corrected.
          </div>
        ) : (
          <p className="form-text text-muted">
            {description || 'Structured value, edited as JSON.'}
          </p>
        )}
      </div>
    </div>
  );
};

JsonField.propTypes = {
  fieldId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  onChange: PropTypes.func.isRequired,
  description: PropTypes.string,
};

const AgentSettings = () => {
  const { user } = useAuth();
  const { currentServer, makeAgentRequest } = useServers();
  const [settings, setSettings] = useState(null);
  const [schema, setSchema] = useState(null);
  const [backups, setBackups] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Zone orchestration state
  const [orchestrationStatus, setOrchestrationStatus] = useState(null);
  const [zonePriorities, setZonePriorities] = useState(null);
  const [orchestrationLoading, setOrchestrationLoading] = useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    variant: 'is-primary',
  });

  const [showBackupModal, setShowBackupModal] = useState(false);

  // Hook for orchestration functions
  const {
    getZoneOrchestrationStatus,
    enableZoneOrchestration,
    disableZoneOrchestration,
    getZonePriorities,
    testZoneOrchestration,
  } = useHostSystemManagement();

  const loadSettings = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    try {
      setLoading(true);
      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'settings'
      );

      if (response.success) {
        setSettings(response.data);
        // Set the first tab as active if none is selected
        const sections = organizeBySection(response.data);
        if (!activeTab && sections.length > 0) {
          setActiveTab(sections[0].name);
        }
      } else {
        setMsg(`Failed to load settings: ${response.message}`);
      }
    } catch (loadErr) {
      console.error('Error loading settings:', loadErr);
      setMsg(`Error loading settings: ${loadErr.response?.data?.message || loadErr.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentServer, makeAgentRequest, activeTab]);

  // Schema-driven decoration (sync-file contract 2026-07-05): GET /settings/schema
  // serves per-key metadata — type/description/default/min/max/enum, object fields
  // nested under `properties`, free-form map fields as `keys`/`values` vocabularies.
  // The VALUES from GET /settings stay the source of form structure; the schema only
  // decorates. No schema on the wire → fields render undecorated, one code path.
  const loadSchema = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    const response = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'settings/schema'
    );
    setSchema(response.success ? response.data : null);
  }, [currentServer, makeAgentRequest]);

  const loadBackups = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    try {
      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'settings/backups'
      );
      if (response.success) {
        setBackups(response.data);
      }
    } catch (backupsErr) {
      console.error('Error loading backups:', backupsErr);
    }
  }, [currentServer, makeAgentRequest]);

  // Zone orchestration functions
  const loadOrchestrationStatus = useCallback(async () => {
    if (!currentServer) {
      return;
    }

    try {
      const result = await getZoneOrchestrationStatus(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol
      );

      if (result.success) {
        setOrchestrationStatus(result.data);
      }
    } catch (statusErr) {
      console.error('Error loading orchestration status:', statusErr);
    }
  }, [currentServer, getZoneOrchestrationStatus]);

  const loadZonePriorities = useCallback(async () => {
    if (!currentServer) {
      return;
    }

    try {
      const result = await getZonePriorities(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol
      );

      if (result.success) {
        setZonePriorities(result.data);
      }
    } catch (prioritiesErr) {
      console.error('Error loading zone priorities:', prioritiesErr);
    }
  }, [currentServer, getZonePriorities]);

  // Load settings on component mount
  useEffect(() => {
    if (user && canManageSettings(user.role) && currentServer) {
      loadSettings();
      loadSchema();
      loadBackups();
    }
  }, [user, currentServer, loadSettings, loadSchema, loadBackups]);

  // Load orchestration data when component mounts or server changes
  useEffect(() => {
    if (currentServer && user && canManageSettings(user.role)) {
      loadOrchestrationStatus();
      loadZonePriorities();
    }
  }, [currentServer, user, loadOrchestrationStatus, loadZonePriorities]);

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  const saveSettings = async () => {
    if (!currentServer) {
      return;
    }
    setLoading(true);
    setMsg('');

    try {
      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'settings',
        'PUT',
        settings
      );

      if (response.success) {
        setMsg('Settings saved successfully.');
      } else {
        setMsg(`Failed to save settings: ${response.message}`);
      }
    } catch (saveErr) {
      console.error('Error saving settings:', saveErr);
      setMsg(`Error saving settings: ${saveErr.response?.data?.message || saveErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performRestoreBackup = async filename => {
    try {
      setLoading(true);
      setMsg('');

      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `settings/restore/${filename}`,
        'POST'
      );

      if (response.success) {
        setMsg('Backup restored successfully.');
        await loadSettings();
      } else {
        setMsg(`Failed to restore backup: ${response.message}`);
      }
    } catch (restoreErr) {
      console.error('Error restoring backup:', restoreErr);
      setMsg(`Error restoring backup: ${restoreErr.response?.data?.message || restoreErr.message}`);
    } finally {
      setLoading(false);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const requestRestoreBackup = filename => {
    if (!currentServer) {
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Backup',
      message: `Are you sure you want to restore the configuration from ${filename}? This will overwrite current settings.`,
      onConfirm: () => performRestoreBackup(filename),
      confirmText: 'Restore',
      variant: 'is-warning',
    });
  };

  const performRestartServer = async () => {
    try {
      setLoading(true);
      setMsg('Initiating server restart...');

      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'server/restart',
        'POST'
      );

      if (response.success) {
        setMsg('Server restart initiated.');
      } else {
        setMsg(`Failed to restart server: ${response.message}`);
      }
    } catch (restartErr) {
      console.error('Error restarting server:', restartErr);
      setMsg(
        `Error restarting server: ${restartErr.response?.data?.message || restartErr.message}`
      );
    } finally {
      setLoading(false);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const requestRestartServer = () => {
    if (!currentServer) {
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Restart Server',
      message: 'Are you sure you want to restart the Agent?',
      onConfirm: performRestartServer,
      confirmText: 'Restart',
      variant: 'is-danger',
    });
  };

  const performDeleteBackup = async filename => {
    try {
      setLoading(true);
      setMsg('');

      const response = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `settings/backups/${filename}`,
        'DELETE'
      );

      if (response.success) {
        setMsg('Backup deleted successfully.');
        await loadBackups(); // Refresh the list
      } else {
        setMsg(`Failed to delete backup: ${response.message}`);
      }
    } catch (deleteErr) {
      console.error('Error deleting backup:', deleteErr);
      setMsg(`Error deleting backup: ${deleteErr.response?.data?.message || deleteErr.message}`);
    } finally {
      setLoading(false);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const requestDeleteBackup = filename => {
    if (!currentServer) {
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Backup',
      message: `Are you sure you want to permanently delete the backup ${filename}? This action cannot be undone.`,
      onConfirm: () => performDeleteBackup(filename),
      confirmText: 'Delete',
      variant: 'is-danger',
    });
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      setMsg('Creating backup...');

      // Trigger a save which creates a backup automatically
      await saveSettings();
      await loadBackups();
      setMsg('Backup created successfully');
    } catch (backupErr) {
      console.error('Error creating backup:', backupErr);
      setMsg(`Error creating backup: ${backupErr.response?.data?.message || backupErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableOrchestration = async () => {
    if (!currentServer) {
      return;
    }

    try {
      setOrchestrationLoading(true);
      const result = await enableZoneOrchestration(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol
      );

      if (result.success) {
        setMsg('Zone orchestration enabled successfully');
        await loadOrchestrationStatus();
      } else {
        setMsg(`Failed to enable orchestration: ${result.message}`);
      }
    } catch (enableErr) {
      console.error('Error enabling orchestration:', enableErr);
      setMsg('Error enabling zone orchestration');
    } finally {
      setOrchestrationLoading(false);
    }
  };

  const handleDisableOrchestration = async () => {
    if (!currentServer) {
      return;
    }

    try {
      setOrchestrationLoading(true);
      const result = await disableZoneOrchestration(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol
      );

      if (result.success) {
        setMsg('Zone orchestration disabled successfully');
        await loadOrchestrationStatus();
      } else {
        setMsg(`Failed to disable orchestration: ${result.message}`);
      }
    } catch (disableErr) {
      console.error('Error disabling orchestration:', disableErr);
      setMsg('Error disabling zone orchestration');
    } finally {
      setOrchestrationLoading(false);
    }
  };

  const handleTestOrchestration = async (strategy = 'parallel_by_priority') => {
    if (!currentServer) {
      return;
    }

    try {
      setOrchestrationLoading(true);
      const result = await testZoneOrchestration(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        strategy
      );

      if (result.success) {
        setMsg(
          `Orchestration test completed: ${result.data.total_machines} machines, estimated ${result.data.estimated_duration}s duration`
        );
        console.log('Orchestration test result:', result.data);
      } else {
        setMsg(`Failed to test orchestration: ${result.message}`);
      }
    } catch (testErr) {
      console.error('Error testing orchestration:', testErr);
      setMsg('Error testing zone orchestration');
    } finally {
      setOrchestrationLoading(false);
    }
  };

  // Check if a section is orchestration-related
  const isOrchestrationSection = sectionName =>
    sectionName === 'zones' ||
    sectionName.includes('orchestration') ||
    sectionName.includes('zone_management');

  // Render orchestration control panel
  const renderOrchestrationControls = () => (
    <div className="card mb-4 bg-dark text-light">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-layer-group text-info me-2" />
          <span>Zone Orchestration Control</span>
        </h4>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="mb-3">
              <p className="form-label small">Status</p>
              <div>
                <span
                  className={`badge ${orchestrationStatus?.orchestration_enabled ? 'text-bg-success' : 'text-bg-secondary'}`}
                >
                  {orchestrationStatus?.orchestration_enabled ? '🟢 Enabled' : '🔴 Disabled'}
                </span>
                <span className="badge text-bg-info ms-2">
                  Controller: {orchestrationStatus?.controller || 'unknown'}
                </span>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={handleEnableOrchestration}
                disabled={orchestrationLoading || orchestrationStatus?.orchestration_enabled}
              >
                <i className="fas fa-play me-2" />
                <span>Enable</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={handleDisableOrchestration}
                disabled={orchestrationLoading || !orchestrationStatus?.orchestration_enabled}
              >
                <i className="fas fa-pause me-2" />
                <span>Disable</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => handleTestOrchestration()}
                disabled={orchestrationLoading}
              >
                <i className="fas fa-vial me-2" />
                <span>Test</span>
              </button>
            </div>
          </div>
        </div>

        {zonePriorities && (
          <div className="mt-4">
            <p className="form-label small">Zone Priorities</p>
            <div className="mb-3">
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(zonePriorities.priority_groups || {}).map(
                  ([priority, machines]) => (
                    <span key={priority} className="badge text-bg-light">
                      Priority {priority}: {machines.length} machines
                    </span>
                  )
                )}
              </div>
            </div>
            <p className="form-text text-muted">
              Total machines: {zonePriorities.total_machines || 0} |
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={loadZonePriorities}
                disabled={orchestrationLoading}
              >
                Refresh
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (!user || !canManageSettings(user.role)) {
    return <div>Access Denied</div>;
  }

  // Walk the schema to the descriptor for a field path. Object nodes nest their
  // children under `properties`; free-form map nodes (e.g. logging.categories)
  // describe every child through a `values` vocabulary instead — synthesized here
  // as an enum so map entries render as dropdowns.
  const schemaNodeForPath = path => {
    let node = schema?.[path[0]];
    for (let i = 1; i < path.length; i++) {
      if (!node) {
        return null;
      }
      if (node.properties) {
        node = node.properties[path[i]];
      } else if (Array.isArray(node.values)) {
        node = { type: 'string', enum: node.values };
      } else {
        return null;
      }
    }
    return node || null;
  };

  const renderField = item => {
    const { key, value, path } = item;
    const fieldId = path.join('.');
    const descriptor = schemaNodeForPath(path);
    const help = descriptor?.description;

    // Boolean → Bootstrap switch; the label carries the field name.
    if (typeof value === 'boolean') {
      return (
        <div key={fieldId} className="col-12 col-lg-6">
          <div className="mb-3">
            <div className="form-check form-switch">
              <input
                id={fieldId}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={value}
                onChange={e => handleSettingChange(path, e.target.checked)}
              />
              <label className="form-check-label" htmlFor={fieldId}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
            </div>
            {help && <p className="form-text text-muted mb-0">{help}</p>}
          </div>
        </div>
      );
    }

    const isArray = Array.isArray(value);

    // Arrays of objects (e.g. artifact storage locations) have no flat input —
    // edit them as JSON instead of stringifying each entry to "[object Object]".
    if (isArray && value.some(entry => entry !== null && typeof entry === 'object')) {
      return (
        <JsonField
          key={fieldId}
          fieldId={fieldId}
          label={key.replace(/_/g, ' ')}
          value={value}
          onChange={parsed => handleSettingChange(path, parsed)}
          description={help}
        />
      );
    }

    let inputElement;
    if (!isArray && Array.isArray(descriptor?.enum)) {
      // Schema enum → dropdown. A current value outside the vocabulary (hand-edited
      // config) stays selectable so opening the page never silently rewrites it.
      inputElement = (
        <select
          id={fieldId}
          className="form-select"
          value={value}
          onChange={e =>
            handleSettingChange(
              path,
              typeof value === 'number' ? Number(e.target.value) : e.target.value
            )
          }
        >
          {!descriptor.enum.includes(value) && <option value={value}>{String(value)}</option>}
          {descriptor.enum.map(option => (
            <option key={option} value={option}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    } else if (isArray) {
      inputElement = (
        <textarea
          id={fieldId}
          className="form-control"
          rows="6"
          value={value.join('\n')}
          onChange={e => handleSettingChange(path, e.target.value.split('\n'))}
        />
      );
    } else {
      // Empty string is a meaningful default on some fields ("resolve at runtime") —
      // the schema description states what empty resolves to, surfaced as placeholder.
      inputElement = (
        <input
          id={fieldId}
          className="form-control"
          type={typeof value === 'number' ? 'number' : 'text'}
          value={value}
          min={typeof value === 'number' ? descriptor?.min : undefined}
          max={typeof value === 'number' ? descriptor?.max : undefined}
          placeholder={value === '' && help ? help : undefined}
          onChange={e =>
            handleSettingChange(
              path,
              typeof value === 'number' ? Number(e.target.value) : e.target.value
            )
          }
        />
      );
    }

    return (
      <div key={fieldId} className={isArray ? 'col-12' : 'col-12 col-lg-6'}>
        <div className="mb-3">
          <label className="form-label" htmlFor={fieldId}>
            {key.replace(/_/g, ' ')}
          </label>
          {inputElement}
          {help && <p className="form-text text-muted mb-0">{help}</p>}
        </div>
      </div>
    );
  };

  // Render a list of items (fields + nested subsections) as grid columns in a row.
  const renderItems = items =>
    items.map(item => {
      if (item.type === 'subsection') {
        const subHelp = schemaNodeForPath(item.path)?.description;
        return (
          <div key={item.name} className="col-12">
            <h4 className="fs-6 fw-semibold text-muted mt-2 mb-2">
              {item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            {subHelp && <p className="form-text text-muted">{subHelp}</p>}
            <div className="row g-3">{renderItems(item.fields)}</div>
          </div>
        );
      }
      return renderField(item);
    });

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Agent Settings - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      {/* Use consistent toggle switch styling with main Hyperweaver settings */}
      <div className="container-fluid p-0">
        <div className="card">
          <HostPageHeader title="Agent Settings">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={saveSettings}
              disabled={loading || !settings}
            >
              <i className="fas fa-save me-2" />
              <span>Save</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={createBackup}
              disabled={loading}
            >
              <i className="fas fa-download me-2" />
              <span>Backup</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => setShowBackupModal(true)}
              disabled={loading}
            >
              <i className="fas fa-history me-2" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={requestRestartServer}
              disabled={loading}
            >
              <i className="fas fa-redo me-2" />
              <span>Restart</span>
            </button>
          </HostPageHeader>
          {settings && currentServer && (
            <ul className="nav nav-tabs pt-2 mb-0">
              {organizeBySection(settings).map(section => (
                <li key={section.name} className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === section.name ? 'active' : ''}`}
                    onClick={() => setActiveTab(section.name)}
                    role="tab"
                    aria-selected={activeTab === section.name}
                  >
                    <span>
                      {section.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </button>
                </li>
              ))}
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'api_management' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api_management')}
                  role="tab"
                  aria-selected={activeTab === 'api_management'}
                >
                  <span>API Management</span>
                </button>
              </li>
            </ul>
          )}

          <div className="p-4">
            {msg && <div className="alert alert-info py-2 mb-3">{msg}</div>}
            {!currentServer && (
              <div className="alert alert-warning">
                Please select a host from the navbar to manage its settings.
              </div>
            )}
            {loading && <p className="text-muted">Loading...</p>}
            {settings && currentServer && (
              <div className="tab-content">
                {organizeBySection(settings).map(section => {
                  const directFields = section.content.filter(i => i.type === 'field');
                  const subsections = section.content.filter(i => i.type === 'subsection');
                  const sectionNode = schemaNodeForPath([section.name]);
                  const sectionHelp = sectionNode?.description;
                  return (
                    <div
                      key={section.name}
                      className={`tab-pane ${activeTab === section.name ? 'active' : ''}`}
                    >
                      {/* Schema section descriptors carry requires_restart (D13 shape) —
                          surfaced per Mark's go (sync OPEN ITEM 1). */}
                      {sectionNode?.requires_restart && (
                        <div className="alert alert-warning py-2 mb-3">
                          <i className="fas fa-triangle-exclamation me-2" />
                          Changes in this section require an agent restart to take effect.
                        </div>
                      )}

                      {/* Special handling for orchestration sections */}
                      {isOrchestrationSection(section.name) && renderOrchestrationControls()}

                      {directFields.length > 0 && (
                        <div className="card mb-4">
                          <div className="card-body">
                            <h2 className="fs-5 fw-bold mb-3">
                              {section.name
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase())}
                              <span className="badge text-bg-light ms-2">
                                {directFields.length} setting
                                {directFields.length !== 1 ? 's' : ''}
                              </span>
                            </h2>
                            {sectionHelp && <p className="form-text text-muted">{sectionHelp}</p>}
                            <div className="row g-3">{renderItems(directFields)}</div>
                          </div>
                        </div>
                      )}

                      {subsections.map(sub => {
                        const subFieldCount = sub.fields.filter(i => i.type === 'field').length;
                        const subCardHelp = schemaNodeForPath(sub.path)?.description;
                        return (
                          <div key={sub.name} className="card mb-4">
                            <div className="card-body">
                              <h3 className="fs-6 fw-bold mb-3">
                                {sub.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {subFieldCount > 0 && (
                                  <span className="badge text-bg-light ms-2">
                                    {subFieldCount} setting
                                    {subFieldCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </h3>
                              {subCardHelp && <p className="form-text text-muted">{subCardHelp}</p>}
                              <div className="row g-3">{renderItems(sub.fields)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div className={`tab-pane ${activeTab === 'api_management' ? 'active' : ''}`}>
                  <ApiKeysTab />
                </div>
              </div>
            )}

            {/* Backup Modal */}
            {showBackupModal && (
              <ContentModal
                isOpen={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                title="Configuration Backups"
                icon="fas fa-history"
              >
                {backups.length === 0 ? (
                  <p className="text-muted">No backups available</p>
                ) : (
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Created</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map(backup => (
                        <tr key={backup.filename}>
                          <td>{backup.filename}</td>
                          <td>{new Date(backup.createdAt).toLocaleString()}</td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-warning w-100"
                                onClick={() => {
                                  requestRestoreBackup(backup.filename);
                                  setShowBackupModal(false);
                                }}
                                disabled={loading}
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger w-100"
                                onClick={() => requestDeleteBackup(backup.filename)}
                                disabled={loading}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ContentModal>
            )}

            {/* Confirmation Modal */}
            {confirmDialog.isOpen && (
              <FormModal
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onSubmit={e => {
                  e.preventDefault();
                  if (confirmDialog.onConfirm) {
                    confirmDialog.onConfirm();
                  }
                }}
                title={confirmDialog.title}
                submitText={confirmDialog.confirmText}
                submitVariant={confirmDialog.variant}
                loading={loading}
                showCancelButton
              >
                <p>{confirmDialog.message}</p>
              </FormModal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
