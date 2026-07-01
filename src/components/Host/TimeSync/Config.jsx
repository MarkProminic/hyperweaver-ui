import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../../contexts/ServerContext';
import NTPConfirmActionModal from '../NTPConfirmActionModal';

import ConfigActions from './Config/Actions';
import ConfigEditor from './Config/Editor';
import ConfigInfo from './Config/Info';
import ServerManagement from './Config/ServerManagement';
import ConfigTemplates from './Config/Templates';

const TimeSyncConfig = ({ server, onError }) => {
  const [configInfo, setConfigInfo] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [backupConfig, setBackupConfig] = useState(false);
  const [serverList, setServerList] = useState([]);
  const [newServer, setNewServer] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');

  const { makeAgentRequest } = useServers();

  const extractServersFromConfig = config => {
    const serverLines = config
      .split('\n')
      .filter(line => line.trim().startsWith('server ') || line.trim().startsWith('pool '));

    const servers = serverLines
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[1] || '';
      })
      .filter(srv => srv);

    setServerList(servers);
  };

  const loadTimeSyncConfig = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/config',
        'GET'
      );

      if (result.success) {
        setConfigInfo(result.data);
        setConfigContent(result.data.current_config || '');

        // Extract server list from current config
        if (result.data.current_config) {
          extractServersFromConfig(result.data.current_config);
        }
      } else {
        onError(result.message || 'Failed to load time synchronization configuration');
      }
    } catch (err) {
      onError(`Error loading time synchronization configuration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError]);

  const loadTimeSyncStatus = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/status',
        'GET'
      );

      if (result.success) {
        setStatusInfo(result.data);
      } else {
        // Don't show error for status - it's used for restart functionality
        console.warn('Failed to load time sync status:', result.message);
      }
    } catch (err) {
      console.warn('Error loading time sync status:', err.message);
    }
  }, [server, makeAgentRequest]);

  // Load configuration on component mount
  useEffect(() => {
    loadTimeSyncConfig();
    loadTimeSyncStatus(); // Also load status for restart functionality
  }, [loadTimeSyncConfig, loadTimeSyncStatus]);

  const handleSaveConfig = async () => {
    if (!server || !makeAgentRequest) {
      return { success: false };
    }

    try {
      setSaving(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/config',
        'PUT',
        {
          config_content: configContent,
          backup_existing: backupConfig,
          created_by: 'api',
        }
      );

      if (result.success) {
        // Show success message and refresh config
        console.log('Configuration updated successfully');
        setTimeout(() => loadTimeSyncConfig(), 1000);
        return { success: true };
      }
      onError(result.message || 'Failed to save configuration');
      return { success: false };
    } catch (err) {
      onError(`Error saving configuration: ${err.message}`);
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = () => {
    if (!configInfo?.suggested_defaults?.config_template) {
      onError('No template available');
      return;
    }

    setConfigContent(configInfo.suggested_defaults.config_template);
    extractServersFromConfig(configInfo.suggested_defaults.config_template);
  };

  const handleAddServer = () => {
    if (!newServer.trim()) {
      onError('Please enter a server address');
      return;
    }

    const serverEntry = `server ${newServer.trim()}`;
    const updatedConfig = `${configContent}\n${serverEntry}`;
    setConfigContent(updatedConfig);
    setServerList([...serverList, newServer.trim()]);
    setNewServer('');
  };

  const handleRemoveServer = serverToRemove => {
    // Remove from visual list
    const updatedList = serverList.filter(srv => srv !== serverToRemove);
    setServerList(updatedList);

    // Remove from config content
    const lines = configContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      return (
        !(trimmedLine.startsWith('server ') && trimmedLine.includes(serverToRemove)) &&
        !(trimmedLine.startsWith('pool ') && trimmedLine.includes(serverToRemove))
      );
    });
    setConfigContent(filteredLines.join('\n'));
  };

  const handleServiceRestart = async () => {
    if (!server || !makeAgentRequest) {
      return { success: false };
    }

    if (!statusInfo?.service_details?.fmri) {
      onError('Service FMRI not available. Cannot restart service.');
      return { success: false };
    }

    try {
      setSaving(true); // Reuse saving state for restart
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'services/action',
        'POST',
        {
          fmri: encodeURIComponent(statusInfo.service_details.fmri),
          action: 'restart',
          options: {},
        }
      );

      if (result.success) {
        console.log('Service restart initiated successfully');
        // Refresh status after restart
        setTimeout(() => loadTimeSyncStatus(), 2000);
        return { success: true };
      }
      onError(result.message || 'Failed to restart time synchronization service');
      return { success: false };
    } catch (err) {
      console.error('Error restarting service:', err);
      onError(`Error restarting time synchronization service: ${err.message}`);
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleServiceAction = action => {
    setActionType(action);
    setShowActionModal(true);
  };

  const getConfirmHandler = () => {
    switch (actionType) {
      case 'save':
        return handleSaveConfig;
      case 'restart':
        return handleServiceRestart;
      default:
        return () => Promise.resolve({ success: true });
    }
  };

  const isConfigValid = config => {
    if (!config.trim()) {
      return false;
    }

    // Basic validation - should have at least one server or pool line
    const lines = config.split('\n');
    return lines.some(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('server ') || trimmed.startsWith('pool ');
    });
  };

  const hasChanges = configContent !== (configInfo?.current_config || '');

  if (loading && !configInfo) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading time synchronization configuration...</p>
      </div>
    );
  }

  const getServiceDescription = () => {
    if (configInfo?.service === 'ntp') {
      return ' Using traditional NTP service.';
    }
    if (configInfo?.service === 'chrony') {
      return ' Using Chrony time synchronization.';
    }
    return ' Service type will be detected automatically.';
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">NTP Configuration Management</h2>
        <p>
          Configure time synchronization settings on <strong>{server.hostname}</strong>.
          {getServiceDescription()}
        </p>
      </div>

      <ConfigInfo configInfo={configInfo} />

      <ConfigTemplates
        configInfo={configInfo}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        onLoadTemplate={handleLoadTemplate}
        onRefresh={loadTimeSyncConfig}
        loading={loading}
        saving={saving}
      />

      <ServerManagement
        serverList={serverList}
        newServer={newServer}
        setNewServer={setNewServer}
        onAddServer={handleAddServer}
        onRemoveServer={handleRemoveServer}
        saving={saving}
      />

      <ConfigEditor
        configContent={configContent}
        setConfigContent={setConfigContent}
        backupConfig={backupConfig}
        setBackupConfig={setBackupConfig}
        isConfigValid={isConfigValid(configContent)}
        saving={saving}
      />

      <ConfigActions
        onSave={() => handleServiceAction('save')}
        onReset={() => setConfigContent(configInfo?.current_config || '')}
        onRestart={() => handleServiceAction('restart')}
        hasChanges={hasChanges}
        isConfigValid={isConfigValid(configContent)}
        saving={saving}
        loading={loading}
      />

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <NTPConfirmActionModal
          service={configInfo}
          action={actionType}
          onClose={() => {
            setShowActionModal(false);
            setActionType('');
          }}
          onConfirm={getConfirmHandler()}
        />
      )}
    </div>
  );
};

TimeSyncConfig.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default TimeSyncConfig;
