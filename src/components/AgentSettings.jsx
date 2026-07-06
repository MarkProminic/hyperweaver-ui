import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { useHostSystemManagement } from '../hooks/useHostSystemManagement';
import { hasFeature } from '../utils/capabilities';
import { canManageSettings } from '../utils/permissions';

import AgentSecretsTab from './AgentSecretsTab';
import SettingsFieldList, { organizeBySection, schemaNodeForPath } from './AgentSettingsFields';
import { AgentSettingsBackupModal, AgentSettingsConfirmModal } from './AgentSettingsModals';
import AgentSettingsOrchestration, { isOrchestrationSection } from './AgentSettingsOrchestration';
import ApiKeysTab from './ApiKeysTab';
import HostPageHeader from './Host/HostPageHeader';

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

  if (!user || !canManageSettings(user.role)) {
    return <div>Access Denied</div>;
  }

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
              {/* Global secrets ride the provisioning surface (sync item 11) —
                  a store of its own, deliberately OUT of GET /settings. */}
              {hasFeature(currentServer, 'provisioning') && (
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'secrets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('secrets')}
                    role="tab"
                    aria-selected={activeTab === 'secrets'}
                  >
                    <span>Global Secrets</span>
                  </button>
                </li>
              )}
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
                  const sectionNode = schemaNodeForPath(schema, [section.name]);
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
                      {isOrchestrationSection(section.name) && (
                        <AgentSettingsOrchestration
                          orchestrationStatus={orchestrationStatus}
                          zonePriorities={zonePriorities}
                          orchestrationLoading={orchestrationLoading}
                          onEnable={handleEnableOrchestration}
                          onDisable={handleDisableOrchestration}
                          onTest={handleTestOrchestration}
                          onRefreshPriorities={loadZonePriorities}
                        />
                      )}

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
                            <div className="row g-3">
                              <SettingsFieldList
                                items={directFields}
                                schema={schema}
                                onSettingChange={handleSettingChange}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {subsections.map(sub => {
                        const subFieldCount = sub.fields.filter(i => i.type === 'field').length;
                        const subCardHelp = schemaNodeForPath(schema, sub.path)?.description;
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
                              <div className="row g-3">
                                <SettingsFieldList
                                  items={sub.fields}
                                  schema={schema}
                                  onSettingChange={handleSettingChange}
                                />
                              </div>
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
                {hasFeature(currentServer, 'provisioning') && (
                  <div className={`tab-pane ${activeTab === 'secrets' ? 'active' : ''}`}>
                    <AgentSecretsTab />
                  </div>
                )}
              </div>
            )}

            {/* Backup Modal */}
            {showBackupModal && (
              <AgentSettingsBackupModal
                isOpen={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                backups={backups}
                loading={loading}
                onRestore={filename => {
                  requestRestoreBackup(filename);
                  setShowBackupModal(false);
                }}
                onDelete={requestDeleteBackup}
              />
            )}

            {/* Confirmation Modal */}
            {confirmDialog.isOpen && (
              <AgentSettingsConfirmModal
                confirmDialog={confirmDialog}
                loading={loading}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
