import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ConfirmModal } from '../common';
import ServerForm from '../Host/ServerForm';
import ServerHelpPanel from '../Host/ServerHelpPanel';
import ServerStatusCard from '../Host/ServerStatusCard';
import ServerTable from '../Host/ServerTable';

/**
 * ServerManagementTab - Server management UI for Hyperweaver Settings
 * Handles adding, editing, deleting, and testing Agent servers
 */
const ServerManagementTab = ({
  servers,
  showAddForm,
  setShowAddForm,
  hostname,
  setHostname,
  port,
  setPort,
  protocol,
  setProtocol,
  entityName,
  setEntityName,
  apiKey,
  setApiKey,
  useExistingApiKey,
  setUseExistingApiKey,
  testResult,
  setTestResult,
  setMsg,
  serverContext,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Only consumed at submit time, so the flag lives here instead of the parent's form state
  const [allowInsecure, setAllowInsecure] = useState(false);

  const { removeServer, addServer, testServer, updateServer, refreshServers, selectServer } =
    serverContext;

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setHostname('');
    setPort('5001');
    setProtocol('https');
    setEntityName('Hyperweaver-Production');
    setApiKey('');
    setUseExistingApiKey(false);
    setAllowInsecure(false);
    setTestResult(null);
    setMsg('');
  }, [
    setHostname,
    setPort,
    setProtocol,
    setEntityName,
    setApiKey,
    setUseExistingApiKey,
    setTestResult,
    setMsg,
  ]);

  // Handle server deletion
  const handleDeleteServer = useCallback(
    async serverId => {
      try {
        setLoading(true);
        setMsg('');
        const result = await removeServer(serverId);
        if (result.success) {
          setMsg(t('settings.serverManagementTab.serverRemoved'));
        } else {
          setMsg(result.message || t('settings.serverManagementTab.failedRemove'));
        }
      } catch {
        setMsg(t('settings.serverManagementTab.errorRemoving'));
      } finally {
        setLoading(false);
        setConfirmDelete(null);
      }
    },
    [removeServer, setMsg, t]
  );

  // Handle server editing
  const handleEditServer = useCallback(
    serverHostname => {
      const server = servers.find(s => s.hostname === serverHostname);
      if (server) {
        selectServer(server);
        navigate('/ui/host-manage');
      }
    },
    [servers, selectServer, navigate]
  );

  // Toggle a row's allow_insecure flag (self-signed TLS acceptance)
  const handleToggleInsecure = useCallback(
    async server => {
      try {
        setLoading(true);
        setMsg('');
        const result = await updateServer(server.id, !server.allow_insecure);
        if (result.success) {
          setMsg(
            server.allow_insecure
              ? t('settings.serverManagementTab.insecureRevoked', { hostname: server.hostname })
              : t('settings.serverManagementTab.insecureAccepted', { hostname: server.hostname })
          );
        } else {
          setMsg(result.message || t('settings.serverManagementTab.failedUpdate'));
        }
      } catch {
        setMsg(t('settings.serverManagementTab.errorUpdating'));
      } finally {
        setLoading(false);
      }
    },
    [updateServer, setMsg, t]
  );

  // Handle connection test
  const handleTestConnection = useCallback(async () => {
    if (!hostname || !port || !protocol) {
      setMsg(t('settings.serverManagementTab.fillHostPortProtocol'));
      return;
    }
    try {
      setLoading(true);
      setMsg(t('settings.serverManagementTab.testingConnection'));
      setTestResult(null);
      const result = await testServer({
        hostname,
        port: parseInt(port),
        protocol,
        allowInsecure,
      });
      if (result.success) {
        setTestResult('success');
        setMsg(t('settings.serverManagementTab.testSuccess'));
      } else {
        setTestResult('error');
        setMsg(t('settings.serverManagementTab.testFailed', { message: result.message }));
      }
    } catch {
      setTestResult('error');
      setMsg(t('settings.serverManagementTab.testFailedGeneric'));
    } finally {
      setLoading(false);
    }
  }, [hostname, port, protocol, allowInsecure, testServer, setMsg, setTestResult, t]);

  // Handle server addition
  const handleAddServer = useCallback(
    async e => {
      e.preventDefault();
      if (!hostname || !port || !protocol) {
        setMsg(t('settings.serverManagementTab.hostPortProtocolRequired'));
        return;
      }
      if (useExistingApiKey && !apiKey) {
        setMsg(t('settings.serverManagementTab.apiKeyRequired'));
        return;
      }
      if (!useExistingApiKey && !entityName) {
        setMsg(t('settings.serverManagementTab.entityNameRequired'));
        return;
      }
      const isDuplicate = servers.some(
        server =>
          server.hostname === hostname &&
          server.port === parseInt(port) &&
          server.protocol === protocol
      );
      if (isDuplicate) {
        setTestResult('error');
        setMsg(t('settings.serverManagementTab.duplicateServer', { protocol, hostname, port }));
        return;
      }
      try {
        setLoading(true);
        setMsg('');
        setTestResult(null);
        const serverData = {
          hostname,
          port: parseInt(port),
          protocol,
          entityName: entityName || 'Hyperweaver-Production',
          allowInsecure,
        };
        if (useExistingApiKey) {
          serverData.apiKey = apiKey;
        }
        const result = await addServer(serverData);
        if (result.success) {
          setTestResult('success');
          setMsg(t('settings.serverManagementTab.serverAdded'));
          await refreshServers();
          setShowAddForm(false);
          resetForm();
        } else {
          setTestResult('error');
          setMsg(result.message);
        }
      } catch {
        setTestResult('error');
        setMsg(t('settings.serverManagementTab.unexpectedError'));
      } finally {
        setLoading(false);
      }
    },
    [
      hostname,
      port,
      protocol,
      useExistingApiKey,
      apiKey,
      allowInsecure,
      entityName,
      servers,
      addServer,
      refreshServers,
      setShowAddForm,
      resetForm,
      setMsg,
      setTestResult,
      t,
    ]
  );

  return (
    <>
      <div className="card mb-4">
        <div className="card-body">
          {/* Server Management Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fs-5 fw-bold">{t('settings.serverManagementTab.servers')}</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  resetForm();
                }
              }}
            >
              <i className={`fas fa-${showAddForm ? 'times' : 'plus'} me-2`} />
              {showAddForm
                ? t('settings.serverManagementTab.cancel')
                : t('settings.serverManagementTab.addServer')}
            </button>
          </div>

          {/* Add Server Form or Server Table */}
          {showAddForm ? (
            <form onSubmit={handleAddServer} autoComplete="off">
              <div className="row g-3">
                <div className="col-12 col-lg-8">
                  <ServerForm
                    hostname={hostname}
                    setHostname={setHostname}
                    port={port}
                    setPort={setPort}
                    protocol={protocol}
                    setProtocol={setProtocol}
                    entityName={entityName}
                    setEntityName={setEntityName}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    useExistingApiKey={useExistingApiKey}
                    setUseExistingApiKey={setUseExistingApiKey}
                    allowInsecure={allowInsecure}
                    setAllowInsecure={setAllowInsecure}
                    loading={loading}
                  />
                </div>
                <div className="col-12 col-lg-4">
                  <ServerHelpPanel useExistingApiKey={useExistingApiKey} />
                  <ServerStatusCard testResult={testResult} useExistingApiKey={useExistingApiKey} />
                </div>
              </div>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={handleTestConnection}
                  disabled={loading}
                >
                  {loading && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {t('settings.serverManagementTab.testConnection')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {useExistingApiKey
                    ? t('settings.serverManagementTab.addServer')
                    : t('settings.serverManagementTab.bootstrapServer')}
                </button>
              </div>
            </form>
          ) : (
            <ServerTable
              servers={servers}
              onEdit={handleEditServer}
              onDelete={serverId => {
                setConfirmDelete(serverId);
              }}
              onToggleInsecure={handleToggleInsecure}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => {
          setConfirmDelete(null);
        }}
        onConfirm={() => {
          handleDeleteServer(confirmDelete);
        }}
        title={t('settings.serverManagementTab.removeServerTitle')}
        message={t('settings.serverManagementTab.removeServerMessage')}
        confirmText={t('settings.serverManagementTab.removeServerTitle')}
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={loading}
      />
    </>
  );
};

ServerManagementTab.propTypes = {
  servers: PropTypes.array.isRequired,
  showAddForm: PropTypes.bool.isRequired,
  setShowAddForm: PropTypes.func.isRequired,
  hostname: PropTypes.string.isRequired,
  setHostname: PropTypes.func.isRequired,
  port: PropTypes.string.isRequired,
  setPort: PropTypes.func.isRequired,
  protocol: PropTypes.string.isRequired,
  setProtocol: PropTypes.func.isRequired,
  entityName: PropTypes.string.isRequired,
  setEntityName: PropTypes.func.isRequired,
  apiKey: PropTypes.string.isRequired,
  setApiKey: PropTypes.func.isRequired,
  useExistingApiKey: PropTypes.bool.isRequired,
  setUseExistingApiKey: PropTypes.func.isRequired,
  testResult: PropTypes.string,
  setTestResult: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  serverContext: PropTypes.shape({
    removeServer: PropTypes.func.isRequired,
    addServer: PropTypes.func.isRequired,
    testServer: PropTypes.func.isRequired,
    updateServer: PropTypes.func.isRequired,
    refreshServers: PropTypes.func.isRequired,
    selectServer: PropTypes.func.isRequired,
  }).isRequired,
};

export default ServerManagementTab;
