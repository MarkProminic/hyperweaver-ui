import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

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
        onError(result.message || 'Failed to load groups');
        setGroups([]);
      }
    } catch (err) {
      onError(`Error loading groups: ${err.message}`);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedPattern, filters.includeSystem, filters.limit, onError]);

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
        onError(result.message || `Failed to ${action} group`);
      }
    } catch (err) {
      onError(`Error performing ${action}: ${err.message}`);
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
        <h2 className="fs-5 fw-bold">Group Management</h2>
        <p>
          Manage system groups on <strong>{server.hostname}</strong>. Create, modify, and delete
          groups, and manage group memberships.
        </p>
      </div>

      {/* Group Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-group-name">
                  Filter by Group Name
                </label>
                <input
                  id="filter-group-name"
                  className="form-control"
                  type="text"
                  placeholder="Enter group name pattern..."
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-include-system">
                  Include System Groups
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
                    Show All
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-limit">
                  Limit Results
                </label>
                <select
                  id="filter-limit"
                  className="form-select"
                  value={filters.limit}
                  onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value={25}>25 Groups</option>
                  <option value={50}>50 Groups</option>
                  <option value={100}>100 Groups</option>
                  <option value={200}>200 Groups</option>
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
                  <span>Refresh</span>
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
                  <span>Clear</span>
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
                Groups ({groups.length})
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
                <span>Create Group</span>
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
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={cancelDeleteGroup}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to delete group <strong>{groupToDelete.groupname}</strong>
                    ?
                  </p>
                  <p className="mt-3 text-danger">
                    <i className="fas fa-exclamation-triangle me-2" />
                    <span>This action cannot be undone.</span>
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDeleteGroup}
                    disabled={loading}
                  >
                    Delete Group
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelDeleteGroup}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop fade show"
            onClick={cancelDeleteGroup}
            aria-label="Close modal"
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
