import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
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
          setMsg('Server removed successfully!');
        } else {
          setMsg(result.message || 'Failed to remove server');
        }
      } catch {
        setMsg('Error removing server. Please try again.');
      } finally {
        setLoading(false);
        setConfirmDelete(null);
      }
    },
    [removeServer, setMsg]
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
            `Self-signed TLS ${server.allow_insecure ? 'no longer accepted' : 'now accepted'} for ${server.hostname}.`
          );
        } else {
          setMsg(result.message || 'Failed to update server');
        }
      } catch {
        setMsg('Error updating server. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [updateServer, setMsg]
  );

  // Handle connection test
  const handleTestConnection = useCallback(async () => {
    if (!hostname || !port || !protocol) {
      setMsg('Please fill in hostname, port, and protocol first');
      return;
    }
    try {
      setLoading(true);
      setMsg('Testing connection...');
      setTestResult(null);
      const result = await testServer({
        hostname,
        port: parseInt(port),
        protocol,
        allowInsecure,
      });
      if (result.success) {
        setTestResult('success');
        setMsg('Connection test successful! Server is reachable and ready for bootstrap.');
      } else {
        setTestResult('error');
        setMsg(`Connection test failed: ${result.message}`);
      }
    } catch {
      setTestResult('error');
      setMsg('Connection test failed. Please check your server details.');
    } finally {
      setLoading(false);
    }
  }, [hostname, port, protocol, allowInsecure, testServer, setMsg, setTestResult]);

  // Handle server addition
  const handleAddServer = useCallback(
    async e => {
      e.preventDefault();
      if (!hostname || !port || !protocol) {
        setMsg('Hostname, port, and protocol are required');
        return;
      }
      if (useExistingApiKey && !apiKey) {
        setMsg('API key is required when using existing API key option');
        return;
      }
      if (!useExistingApiKey && !entityName) {
        setMsg('Entity name is required when bootstrapping');
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
        setMsg(`Server ${protocol}://${hostname}:${port} is already registered.`);
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
          setMsg('Server added successfully! Refreshing servers...');
          await refreshServers();
          setShowAddForm(false);
          resetForm();
        } else {
          setTestResult('error');
          setMsg(result.message);
        }
      } catch {
        setTestResult('error');
        setMsg('An unexpected error occurred. Please try again.');
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
    ]
  );

  return (
    <>
      <div className="card mb-4">
        <div className="card-body">
          {/* Server Management Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fs-5 fw-bold">Servers</h2>
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
              {showAddForm ? 'Cancel' : 'Add Server'}
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
                  Test Connection
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {useExistingApiKey ? 'Add Server' : 'Bootstrap Server'}
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
        title="Remove Server"
        message="Are you sure you want to remove this server? This will remove the server connection."
        confirmText="Remove Server"
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
