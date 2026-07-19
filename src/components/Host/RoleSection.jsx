import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { useDebounce } from '../../utils/debounce';
import { ConfirmModal } from '../common';

import RoleCreateModal from './RoleCreateModal';
import RoleDetailsModal from './RoleDetailsModal';
import RoleTable from './RoleTable';

const RoleSection = ({ server, onError }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [filters, setFilters] = useState({
    pattern: '',
    limit: 50,
  });

  const { makeAgentRequest } = useServers();
  const { t } = useTranslation();

  // Debounce the pattern filter to avoid excessive API calls
  const debouncedPattern = useDebounce(filters.pattern, 500);

  const loadRoles = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (debouncedPattern) {
        params.rolename = debouncedPattern;
      }
      if (filters.limit) {
        params.limit = filters.limit;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/roles',
        'GET',
        null,
        params
      );

      if (result.success) {
        setRoles(result.data?.roles || []);
      } else {
        onError(result.message || t('host.roleSection.errors.loadFailed'));
        setRoles([]);
      }
    } catch (err) {
      onError(t('host.roleSection.errors.loadError', { message: err.message }));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedPattern, filters.limit, onError, t]);

  const pollTask = useCallback(
    taskId => {
      const checkTaskStatus = async pollCount => {
        const maxPolls = 30;

        if (pollCount >= maxPolls) {
          return;
        }

        try {
          const taskResult = await makeAgentRequest(
            server.hostname,
            server.port,
            server.protocol,
            `tasks/${taskId}`,
            'GET'
          );

          if (taskResult.success) {
            const status = taskResult.data?.status;
            if (status === 'completed' || status === 'failed') {
              if (status === 'failed' && taskResult.data?.error_message) {
                onError(taskResult.data.error_message);
              }
              return;
            }
          }

          // Schedule next poll after delay
          setTimeout(() => {
            void checkTaskStatus(pollCount + 1);
          }, 1000);
        } catch (err) {
          console.error('Error polling task:', err);
        }
      };

      void checkTaskStatus(0);
    },
    [server, makeAgentRequest, onError]
  );

  // Load roles on component mount and when filters change
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleRoleAction = async (rolename, action, options = {}) => {
    if (!server || !makeAgentRequest) {
      return { success: false, message: t('host.roleSection.errors.serverNotAvailable') };
    }

    try {
      setLoading(true);
      onError('');

      let endpoint;
      let method;
      const params = {};

      if (action === 'delete') {
        endpoint = `system/roles/${encodeURIComponent(rolename)}`;
        method = 'DELETE';
        if (options.removeHome !== undefined) {
          params.remove_home = options.removeHome;
        }
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        method,
        null,
        params
      );

      if (result.success) {
        // Poll task if task_id is returned
        if (result.data?.task_id) {
          pollTask(result.data.task_id);
        }
        await loadRoles();
        return { success: true, message: result.message };
      }
      onError(result.message || t('host.roleSection.errors.actionFailed', { action }));
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = t('host.roleSection.errors.actionError', { action, message: err.message });
      onError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = role => {
    setRoleToDelete(role);
  };

  const handleConfirmDelete = async () => {
    if (roleToDelete) {
      await handleRoleAction(roleToDelete.rolename, 'delete', {
        removeHome: true,
      });
      setRoleToDelete(null);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      pattern: '',
      limit: 50,
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.roleSection.title')}</h2>
        <p>
          {t('host.roleSection.manageOn')} <strong>{server.hostname}</strong>.{' '}
          {t('host.roleSection.manageActions')}
        </p>
      </div>

      {/* Role Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-pattern">
                  {t('host.roleSection.filterByName')}
                </label>
                <input
                  id="filter-pattern"
                  className="form-control"
                  type="text"
                  placeholder={t('host.roleSection.filterByNamePlaceholder')}
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-limit">
                  {t('host.roleSection.limitResults')}
                </label>
                <select
                  id="filter-limit"
                  className="form-select"
                  value={filters.limit}
                  onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value={25}>{t('host.roleSection.rolesOption', { count: 25 })}</option>
                  <option value={50}>{t('host.roleSection.rolesOption', { count: 50 })}</option>
                  <option value={100}>{t('host.roleSection.rolesOption', { count: 100 })}</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="refresh-button">
                  {t('host.roleSection.refresh')}
                </label>
                <div>
                  <button
                    id="refresh-button"
                    type="button"
                    className="btn btn-info"
                    onClick={loadRoles}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    <span>{t('host.roleSection.refresh')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="clear-button">
                  {t('host.roleSection.clear')}
                </label>
                <div>
                  <button
                    id="clear-button"
                    type="button"
                    className="btn btn-secondary"
                    onClick={clearFilters}
                    disabled={loading}
                  >
                    <i className="fas fa-times me-2" />
                    <span>{t('host.roleSection.clear')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {t('host.roleSection.rolesCount', { count: roles.length })}
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
                <span>{t('host.roleSection.createRole')}</span>
              </button>
            </div>
          </div>

          <RoleTable
            roles={roles}
            loading={loading}
            onDelete={handleDeleteRole}
            onViewDetails={role => {
              setSelectedRole(role);
              setShowDetailsModal(true);
            }}
          />
        </div>
      </div>

      {/* Role Details Modal */}
      {showDetailsModal && selectedRole && (
        <RoleDetailsModal
          role={selectedRole}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRole(null);
          }}
        />
      )}

      {/* Role Create Modal */}
      {showCreateModal && (
        <RoleCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRoles();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <ConfirmModal
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={t('host.roleSection.deleteRoleTitle')}
          message={t('host.roleSection.deleteRoleMessage', { rolename: roleToDelete.rolename })}
          confirmText={t('host.roleSection.delete')}
          confirmVariant="is-danger"
          loading={loading}
        />
      )}
    </div>
  );
};

RoleSection.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default RoleSection;
