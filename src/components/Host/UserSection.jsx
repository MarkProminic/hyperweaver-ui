import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { useDebounce } from '../../utils/debounce';

import SetPasswordModal from './SetPasswordModal';
import UserCreateModal from './UserCreateModal';
import UserDetailsModal from './UserDetailsModal';
import UserEditModal from './UserEditModal';
import UserTable from './UserTable';

const UserSection = ({ server, onError }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [filters, setFilters] = useState({
    pattern: '',
    includeSystem: false,
    limit: 50,
  });

  const { makeAgentRequest } = useServers();

  // Debounce the pattern filter to avoid excessive API calls
  const debouncedPattern = useDebounce(filters.pattern, 500);

  const loadUsers = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (debouncedPattern) {
        params.username = debouncedPattern;
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
        'system/users',
        'GET',
        null,
        params
      );

      if (result.success) {
        setUsers(result.data?.users || []);
      } else {
        onError(result.message || 'Failed to load users');
        setUsers([]);
      }
    } catch (err) {
      onError(`Error loading users: ${err.message}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedPattern, filters, onError]);

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

  const handleUserAction = async (username, action, options = {}) => {
    if (!server || !makeAgentRequest) {
      return { success: false, message: 'Server not available' };
    }

    try {
      setLoading(true);
      onError('');

      let endpoint;
      let method;
      let body;
      const params = {};

      if (action === 'delete') {
        endpoint = `system/users/${encodeURIComponent(username)}`;
        method = 'DELETE';
        if (options.removeHome !== undefined) {
          params.remove_home = options.removeHome;
        }
        if (options.deletePersonalGroup !== undefined) {
          params.delete_personal_group = options.deletePersonalGroup;
        }
      } else if (action === 'lock') {
        endpoint = `system/users/${encodeURIComponent(username)}/lock`;
        method = 'POST';
      } else if (action === 'unlock') {
        endpoint = `system/users/${encodeURIComponent(username)}/unlock`;
        method = 'POST';
      } else if (action === 'setPassword') {
        endpoint = `system/users/${encodeURIComponent(username)}/password`;
        method = 'POST';
        body = {
          password: options.password,
          force_change: options.forceChange || false,
          unlock_account: options.unlockAccount || false,
        };
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        method,
        body,
        params
      );

      if (result.success) {
        if (result.data?.task_id) {
          // Task-based operation, poll for completion
          pollTask(result.data.task_id);
        }
        await loadUsers();
        return { success: true, message: result.message };
      }
      onError(result.message || `Failed to ${action} user`);
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = `Error performing ${action}: ${err.message}`;
      onError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleViewDetails = async user => {
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
        `system/users/${encodeURIComponent(user.username)}/attributes`,
        'GET'
      );

      if (result.success) {
        setSelectedUser({ ...user, attributes: result.data });
        setShowDetailsModal(true);
      } else {
        onError(result.message || 'Failed to load user details');
      }
    } catch (err) {
      onError(`Error loading user details: ${err.message}`);
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

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">User Management</h2>
        <p>
          Manage system users on <strong>{server.hostname}</strong>. Create, modify, and delete user
          accounts, set passwords, and manage user permissions.
        </p>
      </div>

      {/* User Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-username">
                  Filter by Username
                </label>
                <input
                  id="filter-username"
                  className="form-control"
                  type="text"
                  placeholder="Enter username pattern..."
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-include-system">
                  Include System Users
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
                  className="form-select w-auto"
                  value={filters.limit}
                  onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value={25}>25 Users</option>
                  <option value={50}>50 Users</option>
                  <option value={100}>100 Users</option>
                  <option value={200}>200 Users</option>
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
                  onClick={loadUsers}
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

      {/* Users Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                Users ({users.length})
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
                <span>Create User</span>
              </button>
            </div>
          </div>

          <UserTable
            users={users}
            loading={loading}
            onEdit={user => {
              setSelectedUser(user);
              setShowEditModal(true);
            }}
            onDelete={user =>
              handleUserAction(user.username, 'delete', {
                removeHome: true,
                deletePersonalGroup: true,
              })
            }
            onLock={user => handleUserAction(user.username, 'lock')}
            onUnlock={user => handleUserAction(user.username, 'unlock')}
            onSetPassword={user => {
              setSelectedUser(user);
              setShowPasswordModal(true);
            }}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* User Create Modal */}
      {showCreateModal && (
        <UserCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadUsers();
          }}
          onError={onError}
        />
      )}

      {/* User Edit Modal */}
      {showEditModal && selectedUser && (
        <UserEditModal
          server={server}
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
          onError={onError}
        />
      )}

      {/* Set Password Modal */}
      {showPasswordModal && selectedUser && (
        <SetPasswordModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onSuccess={async passwordData => {
            await handleUserAction(selectedUser.username, 'setPassword', passwordData);
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

UserSection.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default UserSection;
