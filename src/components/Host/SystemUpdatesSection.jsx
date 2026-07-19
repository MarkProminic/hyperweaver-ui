import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

const AvailableUpdatesTab = ({
  updateData,
  refreshing,
  checkingUpdates,
  onRefreshMetadata,
  onCheckForUpdates,
  onShowInstallModal,
  diskSpaceWarning,
}) => {
  const { t } = useTranslation();
  const [showRawOutput, setShowRawOutput] = useState(false);

  const formatLastChecked = timestamp => {
    if (!timestamp) {
      return 'Never';
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div>
      {/* Header with actions */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <h2 className="fs-5 fw-bold mb-0">{t('host.systemUpdates.title')}</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-info"
            onClick={onRefreshMetadata}
            disabled={refreshing || checkingUpdates}
          >
            {refreshing && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-sync-alt me-2" />
            <span>{t('host.systemUpdates.refreshMetadata')}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onCheckForUpdates}
            disabled={checkingUpdates || refreshing}
          >
            {checkingUpdates && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-search me-2" />
            <span>{t('host.systemUpdates.checkUpdates')}</span>
          </button>
        </div>
      </div>

      {/* Update Status */}
      {updateData && (
        <div className="card">
          <div className="card-body">
            <div className="row g-3">
              <div className="col">
                <div className="mb-3">
                  <div className="form-label">{t('host.systemUpdates.updatesAvailable')}</div>
                  <div>
                    <span
                      className={`badge fs-6 ${updateData.updates_available ? 'text-bg-warning' : 'text-bg-success'}`}
                    >
                      {updateData.updates_available
                        ? t('host.systemUpdates.yes')
                        : t('host.systemUpdates.no')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <div className="form-label">{t('host.systemUpdates.totalUpdates')}</div>
                  <div>
                    <span className="badge fs-6 text-bg-info">{updateData.total_updates || 0}</span>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <div className="form-label">{t('host.systemUpdates.lastChecked')}</div>
                  <div>
                    <span className="text-muted">{formatLastChecked(updateData.last_checked)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Disk Space Warning */}
            {diskSpaceWarning && (
              <div className="alert alert-warning">
                <h4 className="fs-6 fw-bold">
                  <i className="fas fa-exclamation-triangle me-2" />
                  {t('host.systemUpdates.insufficientSpace')}
                </h4>
                <p>
                  <strong>{t('host.systemUpdates.available')}</strong> {diskSpaceWarning.available}
                  <br />
                  <strong>{t('host.systemUpdates.required')}</strong> {diskSpaceWarning.required}
                </p>
                <p className="mt-2">{t('host.systemUpdates.freeUpSpace')}</p>
              </div>
            )}

            {/* Install Updates Button */}
            {updateData.updates_available && !diskSpaceWarning && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  className="btn btn-warning btn-lg"
                  onClick={onShowInstallModal}
                >
                  <i className="fas fa-download me-2" />
                  <span>
                    {t('host.systemUpdates.installUpdates', { count: updateData.total_updates })}
                  </span>
                </button>
              </div>
            )}

            {/* Plan Summary */}
            {updateData.plan_summary && (
              <div className="mt-4">
                <h4 className="fs-6 fw-bold">{t('host.systemUpdates.planSummary')}</h4>
                <div className="row g-3">
                  <div className="col-lg-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <p className="text-uppercase small fw-semibold text-muted">
                          {t('host.systemUpdates.install')}
                        </p>
                        <p className="fs-4 fw-bold">
                          {updateData.plan_summary.packages_to_install || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <p className="text-uppercase small fw-semibold text-muted">
                          {t('host.systemUpdates.update')}
                        </p>
                        <p className="fs-4 fw-bold">
                          {updateData.plan_summary.packages_to_update || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <p className="text-uppercase small fw-semibold text-muted">
                          {t('host.systemUpdates.remove')}
                        </p>
                        <p className="fs-4 fw-bold">
                          {updateData.plan_summary.packages_to_remove || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <p className="text-uppercase small fw-semibold text-muted">
                          {t('host.systemUpdates.downloadSize')}
                        </p>
                        <p className="fs-6 fw-bold">
                          {updateData.plan_summary.total_download_size ||
                            t('host.systemUpdates.unknown')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Output Toggle */}
            {updateData.raw_output && (
              <div className="mt-4">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowRawOutput(!showRawOutput)}
                >
                  <i className={`fas fa-chevron-${showRawOutput ? 'up' : 'down'} me-2`} />
                  <span>
                    {showRawOutput
                      ? t('host.systemUpdates.hideRaw')
                      : t('host.systemUpdates.showRaw')}
                  </span>
                </button>

                {showRawOutput && (
                  <pre className="card card-body mt-2 bg-dark text-light small">
                    {updateData.raw_output}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

AvailableUpdatesTab.propTypes = {
  updateData: PropTypes.object,
  refreshing: PropTypes.bool,
  checkingUpdates: PropTypes.bool,
  onRefreshMetadata: PropTypes.func.isRequired,
  onCheckForUpdates: PropTypes.func.isRequired,
  onShowInstallModal: PropTypes.func.isRequired,
  diskSpaceWarning: PropTypes.object,
};

const UpdateHistoryTab = ({ historyLoading, updateHistory, onRefresh }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <h2 className="fs-5 fw-bold mb-0">{t('host.systemUpdates.historyTitle')}</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRefresh}
            disabled={historyLoading}
          >
            {historyLoading && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-sync-alt me-2" />
            <span>{t('host.systemUpdates.refresh')}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {historyLoading && (
            <div className="text-center p-6">
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p className="mt-2">{t('host.systemUpdates.loadingHistory')}</p>
            </div>
          )}
          {!historyLoading && updateHistory.length === 0 && (
            <div className="text-center p-6">
              <i className="fas fa-history fa-2x text-muted" />
              <p className="mt-2 text-muted">{t('host.systemUpdates.noHistory')}</p>
            </div>
          )}
          {!historyLoading && updateHistory.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>{t('host.systemUpdates.date')}</th>
                    <th>{t('host.systemUpdates.operation')}</th>
                    <th>{t('host.systemUpdates.user')}</th>
                    <th>{t('host.systemUpdates.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {updateHistory.map(entry => (
                    <tr key={`${entry.date}-${entry.operation}-${entry.user}`}>
                      <td>{new Date(entry.date).toLocaleString()}</td>
                      <td>{entry.operation}</td>
                      <td>{entry.user}</td>
                      <td>
                        <span
                          className={`badge ${entry.status === 'Succeeded' ? 'text-bg-success' : 'text-bg-danger'}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

UpdateHistoryTab.propTypes = {
  historyLoading: PropTypes.bool,
  updateHistory: PropTypes.array.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

const SystemUpdatesSection = ({ server, onError }) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeTab, setActiveTab] = useState('updates');

  const { makeAgentRequest } = useServers();

  const checkForUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    try {
      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/updates/check',
        'GET',
        null,
        { format: 'structured' }
      );
      if (response.success) {
        setUpdateData(response.data);
      } else {
        onError(`Failed to check for updates: ${response.error}`);
      }
    } catch (error) {
      onError(`Error checking for updates: ${error.message}`);
    } finally {
      setCheckingUpdates(false);
    }
  }, [server, makeAgentRequest, onError]);

  const loadUpdateHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/updates/history',
        'GET',
        null,
        { limit: 20 }
      );
      if (response.success) {
        setUpdateHistory(response.data.history || []);
      } else {
        onError(`Failed to load update history: ${response.error}`);
      }
    } catch (error) {
      onError(`Error loading update history: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [server, makeAgentRequest, onError]);

  const refreshMetadata = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/updates/refresh',
        'POST',
        {
          full: false,
          publishers: ['omnios'],
        }
      );
      if (response.success) {
        // Wait a moment then check for updates again
        setTimeout(() => {
          checkForUpdates();
        }, 2000);
      } else {
        onError(`Failed to refresh metadata: ${response.error}`);
      }
    } catch (error) {
      onError(`Error refreshing metadata: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [server, makeAgentRequest, onError, checkForUpdates]);

  const installUpdates = useCallback(async () => {
    setInstalling(true);
    try {
      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/updates/install',
        'POST',
        {
          packages: [],
          accept_licenses: true,
          backup_be: true,
          reject_packages: [],
        }
      );
      if (response.success) {
        setShowInstallModal(false);
        // Refresh the update status after installation
        setTimeout(() => {
          checkForUpdates();
          loadUpdateHistory();
        }, 2000);
      } else {
        onError(`Failed to install updates: ${response.error}`);
      }
    } catch (error) {
      onError(`Error installing updates: ${error.message}`);
    } finally {
      setInstalling(false);
    }
  }, [server, makeAgentRequest, onError, checkForUpdates, loadUpdateHistory]);

  // Check for updates on component mount
  useEffect(() => {
    if (server) {
      checkForUpdates();
      loadUpdateHistory();
    }
  }, [server, checkForUpdates, loadUpdateHistory]);

  const getDiskSpaceWarning = () => {
    if (!updateData?.raw_output) {
      return null;
    }

    const output = updateData.raw_output;
    const spaceMatch = output.match(
      /Insufficient disk space.*Available space: (?<available>[\d.]+\s+\w+).*Estimated required: (?<required>[\d.]+\s+\w+)/
    );

    if (spaceMatch && spaceMatch.groups) {
      return {
        available: spaceMatch.groups.available,
        required: spaceMatch.groups.required,
      };
    }
    return null;
  };

  const diskSpaceWarning = getDiskSpaceWarning();

  return (
    <div>
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={e => {
              e.preventDefault();
              setActiveTab('updates');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('updates');
              }
            }}
          >
            <i className="fas fa-download me-2" />
            <span>{t('host.systemUpdates.availableUpdatesTab')}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={e => {
              e.preventDefault();
              setActiveTab('history');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('history');
              }
            }}
          >
            <i className="fas fa-history me-2" />
            <span>{t('host.systemUpdates.updateHistoryTab')}</span>
          </button>
        </li>
      </ul>

      {/* Available Updates Tab */}
      {activeTab === 'updates' && (
        <AvailableUpdatesTab
          updateData={updateData}
          refreshing={refreshing}
          checkingUpdates={checkingUpdates}
          onRefreshMetadata={refreshMetadata}
          onCheckForUpdates={checkForUpdates}
          onShowInstallModal={() => setShowInstallModal(true)}
          diskSpaceWarning={diskSpaceWarning}
        />
      )}

      {/* Update History Tab */}
      {activeTab === 'history' && (
        <UpdateHistoryTab
          historyLoading={historyLoading}
          updateHistory={updateHistory}
          onRefresh={loadUpdateHistory}
        />
      )}

      {/* Install Confirmation Modal */}
      {showInstallModal && (
        <FormModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          onSubmit={installUpdates}
          title={t('host.systemUpdates.confirmTitle')}
          icon="fas fa-download"
          submitText={
            installing
              ? t('host.systemUpdates.installing')
              : t('host.systemUpdates.installUpdates', { count: updateData?.total_updates || 0 })
          }
          submitVariant="is-warning"
          loading={installing}
        >
          <p>
            <strong>
              {t('host.systemUpdates.confirmMessage', { count: updateData?.total_updates || 0 })}
            </strong>
          </p>
          <p>{t('host.systemUpdates.operationWill')}</p>
          <ul>
            <li>{t('host.systemUpdates.op1')}</li>
            <li>{t('host.systemUpdates.op2')}</li>
            <li>{t('host.systemUpdates.op3')}</li>
            <li>{t('host.systemUpdates.op4')}</li>
          </ul>
          <div className="alert alert-warning">
            <p>
              <strong>{t('host.systemUpdates.warningLabel')}</strong>{' '}
              {t('host.systemUpdates.warningMessage')}
            </p>
          </div>
        </FormModal>
      )}
    </div>
  );
};

SystemUpdatesSection.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default SystemUpdatesSection;
