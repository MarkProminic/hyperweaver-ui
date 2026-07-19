import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { useDebounce } from '../../utils/debounce';

import GroupCreateModal from './GroupCreateModal';
import GroupDetailsModal from './GroupDetailsModal';
import GroupTable from './GroupTable';

const GroupSection = ({ server, onError }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [filters, setFilters] = useState({
    pattern: '',
    includeSystem: false,
    limit: 50,
  });

  const { makeAgentRequest } = useServers();
  const { t } = useTranslation();

  // Debounce the pattern filter to avoid excessive API calls
  const debouncedPattern = useDebounce(filters.pattern, 500);

  const loadGroups = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (debouncedPattern) {
        params.groupname = debouncedPattern;
      }
      if (filters.includeSystem) {
        params.include_system = true;
      }
      if (filters.limit) {
        params.limit = filters.limit;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/groups',
        'GET',
        null,
        params
      );

      if (result.success) {
        setGroups(result.data?.groups || []);
      } else {
        onError(result.message || t('host.groupSection.errors.loadFailed'));
        setGroups([]);
      }
    } catch (err) {
      onError(t('host.groupSection.errors.loadError', { message: err.message }));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [
    server,
    makeAgentRequest,
    debouncedPattern,
    filters.includeSystem,
    filters.limit,
    onError,
    t,
  ]);

  // Load groups on component mount and when filters change
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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

  const handleGroupAction = async (groupname, action) => {
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
        `system/groups/${encodeURIComponent(groupname)}`,
        'DELETE'
      );

      if (result.success) {
        // Poll task if task_id is returned
        if (result.data?.task_id) {
          pollTask(result.data.task_id);
        }
        await loadGroups();
      } else {
        onError(result.message || t('host.groupSection.errors.actionFailed', { action }));
      }
    } catch (err) {
      onError(t('host.groupSection.errors.actionError', { action, message: err.message }));
    } finally {
      setLoading(false);
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
      includeSystem: false,
      limit: 50,
    });
  };

  const handleDeleteGroup = group => {
    setGroupToDelete(group);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      handleGroupAction(groupToDelete.groupname, 'delete');
      setShowDeleteConfirmModal(false);
      setGroupToDelete(null);
    }
  };

  const cancelDeleteGroup = () => {
    setShowDeleteConfirmModal(false);
    setGroupToDelete(null);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.groupSection.title')}</h2>
        <p>
          {t('host.groupSection.manageOn')} <strong>{server.hostname}</strong>.{' '}
          {t('host.groupSection.manageActions')}
        </p>
      </div>

      {/* Group Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-group-name">
                  {t('host.groupSection.filterByName')}
                </label>
                <input
                  id="filter-group-name"
                  className="form-control"
                  type="text"
                  placeholder={t('host.groupSection.filterByNamePlaceholder')}
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-include-system">
                  {t('host.groupSection.includeSystemGroups')}
                </label>
                <div className="form-check form-switch">
                  <input
                    id="filter-include-system"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.includeSystem}
                    onChange={e => handleFilterChange('includeSystem', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="filter-include-system">
                    {t('host.groupSection.showAll')}
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-limit">
                  {t('host.groupSection.limitResults')}
                </label>
                <select
                  id="filter-limit"
                  className="form-select"
                  value={filters.limit}
                  onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value={25}>{t('host.groupSection.groupsOption', { count: 25 })}</option>
                  <option value={50}>{t('host.groupSection.groupsOption', { count: 50 })}</option>
                  <option value={100}>{t('host.groupSection.groupsOption', { count: 100 })}</option>
                  <option value={200}>{t('host.groupSection.groupsOption', { count: 200 })}</option>
                </select>
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
                  onClick={loadGroups}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>{t('host.groupSection.refresh')}</span>
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
                  <span>{t('host.groupSection.clear')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {t('host.groupSection.groupsCount', { count: groups.length })}
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
                <span>{t('host.groupSection.createGroup')}</span>
              </button>
            </div>
          </div>

          <GroupTable
            groups={groups}
            loading={loading}
            onDelete={handleDeleteGroup}
            onViewDetails={group => {
              setSelectedGroup(group);
              setShowDetailsModal(true);
            }}
          />
        </div>
      </div>

      {/* Group Details Modal */}
      {showDetailsModal && selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGroup(null);
          }}
        />
      )}

      {/* Group Create Modal */}
      {showCreateModal && (
        <GroupCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && groupToDelete && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('host.groupSection.confirmDelete')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label={t('host.groupSection.close')}
                    onClick={cancelDeleteGroup}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    {t('host.groupSection.deletePrompt')} <strong>{groupToDelete.groupname}</strong>
                    ?
                  </p>
                  <p className="mt-3 text-danger">
                    <i className="fas fa-exclamation-triangle me-2" />
                    <span>{t('host.groupSection.cannotBeUndone')}</span>
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDeleteGroup}
                    disabled={loading}
                  >
                    {t('host.groupSection.deleteGroup')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelDeleteGroup}>
                    {t('host.groupSection.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop fade show"
            onClick={cancelDeleteGroup}
            aria-label={t('host.groupSection.closeModal')}
          />
        </>
      )}
    </div>
  );
};

GroupSection.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default GroupSection;
