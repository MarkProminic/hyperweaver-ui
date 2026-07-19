import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';

import BootEnvironmentTable from './BootEnvironmentTable';
import ConfirmActionModal from './ConfirmActionModal';
import CreateBEModal from './CreateBEModal';

const BootEnvironmentManagement = ({ server }) => {
  const [bootEnvironments, setBootEnvironments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBE, setSelectedBE] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    status: '',
    showDetailed: false,
    showSnapshots: false,
  });

  const { makeAgentRequest } = useServers();
  const { t } = useTranslation();

  const loadBootEnvironments = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {};
      if (filters.showDetailed) {
        params.detailed = true;
      }
      if (filters.showSnapshots) {
        params.snapshots = true;
      }
      if (filters.name) {
        params.name = filters.name;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/boot-environments',
        'GET',
        null,
        params
      );

      if (result.success) {
        const beList = result.data?.boot_environments || [];
        const filteredBEs = beList.filter(be => {
          if (filters.status) {
            if (filters.status === 'active' && !be.is_active_now) {
              return false;
            }
            if (filters.status === 'reboot' && !be.is_active_on_reboot) {
              return false;
            }
            if (filters.status === 'inactive' && (be.is_active_now || be.is_active_on_reboot)) {
              return false;
            }
          }
          return true;
        });
        setBootEnvironments(filteredBEs);
      } else {
        setError(result.message || t('host.bootEnvironmentManagement.errors.loadFailed'));
        setBootEnvironments([]);
      }
    } catch (err) {
      setError(t('host.bootEnvironmentManagement.errors.loadError', { message: err.message }));
      setBootEnvironments([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, filters, t]);

  useEffect(() => {
    loadBootEnvironments();
  }, [loadBootEnvironments]);

  const handleBEAction = async (beName, action, options = {}) => {
    if (!server || !makeAgentRequest) {
      return {
        success: false,
        message: t('host.bootEnvironmentManagement.errors.noServerConnection'),
      };
    }

    try {
      setLoading(true);
      setError('');

      let endpoint;
      let method;
      let requestData;
      let queryParams = null;

      switch (action) {
        case 'activate':
          endpoint = `system/boot-environments/${encodeURIComponent(beName)}/activate`;
          method = 'POST';
          requestData = {
            temporary: options.temporary || false,
          };
          break;
        case 'mount':
          endpoint = `system/boot-environments/${encodeURIComponent(beName)}/mount`;
          method = 'POST';
          requestData = {
            mountpoint: options.mountpoint || `/mnt/${beName}`,
            shared_mode: options.sharedMode || 'ro',
          };
          break;
        case 'unmount':
          endpoint = `system/boot-environments/${encodeURIComponent(beName)}/unmount`;
          method = 'POST';
          requestData = {
            force: options.force || false,
          };
          break;
        case 'delete':
          endpoint = `system/boot-environments/${encodeURIComponent(beName)}`;
          method = 'DELETE';
          requestData = null;
          queryParams = {};
          if (options.force) {
            queryParams.force = true;
          }
          if (options.snapshots) {
            queryParams.snapshots = true;
          }
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        method,
        requestData,
        queryParams
      );

      if (result.success) {
        await loadBootEnvironments();
        return { success: true, data: result.data };
      }
      setError(
        result.message || t('host.bootEnvironmentManagement.errors.actionFailed', { action })
      );
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = t('host.bootEnvironmentManagement.errors.actionError', {
        action,
        message: err.message,
      });
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const handleShowActionModal = (be, action) => {
    setSelectedBE(be);
    setActionType(action);
    setShowActionModal(true);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      status: '',
      showDetailed: false,
      showSnapshots: false,
    });
  };

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>{t('host.bootEnvironmentManagement.selectServer')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.bootEnvironmentManagement.title')}</h2>
        <p>
          {t('host.bootEnvironmentManagement.manageOn')} <strong>{server.hostname}</strong>.{' '}
          {t('host.bootEnvironmentManagement.manageActions')}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Boot Environment Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="be-filter-name" className="form-label">
                  {t('host.bootEnvironmentManagement.filterByName')}
                </label>
                <input
                  id="be-filter-name"
                  className="form-control"
                  type="text"
                  placeholder={t('host.bootEnvironmentManagement.filterByNamePlaceholder')}
                  value={filters.name}
                  onChange={e => handleFilterChange('name', e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label htmlFor="be-filter-status" className="form-label">
                  {t('host.bootEnvironmentManagement.filterByStatus')}
                </label>
                <select
                  id="be-filter-status"
                  className="form-select"
                  value={filters.status}
                  onChange={e => handleFilterChange('status', e.target.value)}
                >
                  <option value="">{t('host.bootEnvironmentManagement.statusAll')}</option>
                  <option value="active">
                    {t('host.bootEnvironmentManagement.statusActiveNow')}
                  </option>
                  <option value="reboot">
                    {t('host.bootEnvironmentManagement.statusActiveOnReboot')}
                  </option>
                  <option value="inactive">
                    {t('host.bootEnvironmentManagement.statusInactive')}
                  </option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block">
                  {t('host.bootEnvironmentManagement.showDetailed')}
                </span>
                <div className="form-check form-switch">
                  <input
                    id="be-filter-detailed"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.showDetailed}
                    onChange={e => handleFilterChange('showDetailed', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="be-filter-detailed">
                    {t('host.bootEnvironmentManagement.details')}
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block">
                  {t('host.bootEnvironmentManagement.showSnapshots')}
                </span>
                <div className="form-check form-switch">
                  <input
                    id="be-filter-snapshots"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.showSnapshots}
                    onChange={e => handleFilterChange('showSnapshots', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="be-filter-snapshots">
                    {t('host.bootEnvironmentManagement.snapshots')}
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadBootEnvironments}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>{t('host.bootEnvironmentManagement.refresh')}</span>
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <i className="fas fa-times me-2" />
                  <span>{t('host.bootEnvironmentManagement.clear')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boot Environments Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {t('host.bootEnvironmentManagement.bootEnvironmentsCount', {
                  count: bootEnvironments.length,
                })}
                {loading && (
                  <span className="ms-2">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                )}
              </h3>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                disabled={loading}
              >
                <i className="fas fa-plus me-2" />
                <span>{t('host.bootEnvironmentManagement.createBootEnvironment')}</span>
              </button>
            </div>
          </div>

          <BootEnvironmentTable
            bootEnvironments={bootEnvironments}
            loading={loading}
            onActivate={be => handleShowActionModal(be, 'activate')}
            onMount={be => handleShowActionModal(be, 'mount')}
            onUnmount={be => handleShowActionModal(be, 'unmount')}
            onDelete={be => handleShowActionModal(be, 'delete')}
          />
        </div>
      </div>

      {/* Create Boot Environment Modal */}
      {showCreateModal && (
        <CreateBEModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadBootEnvironments();
          }}
          onError={setError}
        />
      )}

      {/* Confirm Action Modal */}
      {showActionModal && selectedBE && (
        <ConfirmActionModal
          bootEnvironment={selectedBE}
          action={actionType}
          onClose={() => {
            setShowActionModal(false);
            setSelectedBE(null);
          }}
          onConfirm={handleBEAction}
        />
      )}
    </div>
  );
};

BootEnvironmentManagement.propTypes = {
  server: PropTypes.object.isRequired,
};

export default BootEnvironmentManagement;
