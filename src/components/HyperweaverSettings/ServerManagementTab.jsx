import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ConfirmModal } from '../common';
import OrgAssignmentModal from '../Host/OrgAssignmentModal';
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
  const [orgTarget, setOrgTarget] = useState(null);
  const [allowInsecure, setAllowInsecure] = useState(false);

  const { removeServer, addServer, testServer, updateServer, refreshServers, selectServer } =
    serverContext;

  const resetForm = useCallback(() => {
    setHostname('');
    setPort('5001');
    setProtocol('https');
    setEntityName('Hyperweaver-Production');
    setApiKey('');
    setUseExistingApiKey(false);
    setAllowInsecure(false);
    setTestResult(null);
    setMsg(null);
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

  const handleDeleteServer = useCallback(
    async serverId => {
      try {
        setLoading(true);
        setMsg(null);
        const result = await removeServer(serverId);
        if (result.success) {
          setMsg({ text: t('settings.serverManagementTab.serverRemoved'), variant: 'success' });
        } else {
          setMsg({
            text: result.message || t('settings.serverManagementTab.failedRemove'),
            variant: 'danger',
          });
        }
      } catch {
        setMsg({ text: t('settings.serverManagementTab.errorRemoving'), variant: 'danger' });
      } finally {
        setLoading(false);
        setConfirmDelete(null);
      }
    },
    [removeServer, setMsg, t]
  );

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

  const handleToggleInsecure = useCallback(
    async server => {
      try {
        setLoading(true);
        setMsg(null);
        const result = await updateServer(server.id, !server.allow_insecure);
        if (result.success) {
          setMsg({
            text: server.allow_insecure
              ? t('settings.serverManagementTab.insecureRevoked', { hostname: server.hostname })
              : t('settings.serverManagementTab.insecureAccepted', { hostname: server.hostname }),
            variant: 'success',
          });
        } else {
          setMsg({
            text: result.message || t('settings.serverManagementTab.failedUpdate'),
            variant: 'danger',
          });
        }
      } catch {
        setMsg({ text: t('settings.serverManagementTab.errorUpdating'), variant: 'danger' });
      } finally {
        setLoading(false);
      }
    },
    [updateServer, setMsg, t]
  );

  const handleTestConnection = useCallback(async () => {
    if (!hostname || !port || !protocol) {
      setMsg({ text: t('settings.serverManagementTab.fillHostPortProtocol'), variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      setMsg({ text: t('settings.serverManagementTab.testingConnection'), variant: 'info' });
      setTestResult(null);
      const result = await testServer({
        hostname,
        port: parseInt(port),
        protocol,
        allowInsecure,
      });
      if (result.success) {
        setTestResult('success');
        setMsg({ text: t('settings.serverManagementTab.testSuccess'), variant: 'success' });
      } else {
        setTestResult('error');
        setMsg({
          text: t('settings.serverManagementTab.testFailed', { message: result.message }),
          variant: 'danger',
        });
      }
    } catch {
      setTestResult('error');
      setMsg({ text: t('settings.serverManagementTab.testFailedGeneric'), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [hostname, port, protocol, allowInsecure, testServer, setMsg, setTestResult, t]);

  const handleAddServer = useCallback(
    async e => {
      e.preventDefault();
      if (!hostname || !port || !protocol) {
        setMsg({
          text: t('settings.serverManagementTab.hostPortProtocolRequired'),
          variant: 'warning',
        });
        return;
      }
      if (useExistingApiKey && !apiKey) {
        setMsg({ text: t('settings.serverManagementTab.apiKeyRequired'), variant: 'warning' });
        return;
      }
      if (!useExistingApiKey && !entityName) {
        setMsg({ text: t('settings.serverManagementTab.entityNameRequired'), variant: 'warning' });
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
        setMsg({
          text: t('settings.serverManagementTab.duplicateServer', { protocol, hostname, port }),
          variant: 'danger',
        });
        return;
      }
      try {
        setLoading(true);
        setMsg(null);
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
          setMsg({ text: t('settings.serverManagementTab.serverAdded'), variant: 'success' });
          await refreshServers();
          setShowAddForm(false);
          resetForm();
        } else {
          setTestResult('error');
          setMsg({ text: result.message, variant: 'danger' });
        }
      } catch {
        setTestResult('error');
        setMsg({ text: t('settings.serverManagementTab.unexpectedError'), variant: 'danger' });
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
              onAssignOrgs={server => setOrgTarget(server)}
              loading={loading}
            />
          )}
        </div>
      </div>

      {orgTarget && (
        <OrgAssignmentModal
          isOpen
          onClose={saved => {
            if (saved) {
              setMsg({ text: t('settings.serverManagementTab.orgsUpdated'), variant: 'success' });
            }
            setOrgTarget(null);
          }}
          serverId={orgTarget.id}
          targetLabel={orgTarget.hostname}
        />
      )}

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
