import PropTypes from 'prop-types';

import { canModifyUser, getRoleBadgeClass, getNotificationClass } from './accountUtils';

/**
 * Users tab content - user info, invite section, and users table
 */
const UsersTab = ({
  user,
  allUsers,
  loading,
  viewScope,
  editingUser,
  setEditingUser,
  newRole,
  setNewRole,
  organizations,
  setShowInviteModal,
  inviteLoading,
  inviteMsg,
  handleRoleChange,
  handleDeactivateUser,
  handleReactivateUser,
  setDeleteModalUser,
  loadOrganizations,
}) => (
  <>
    {/* Current User Info */}
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="fs-5 fw-bold">Your Account</h2>
        <p>
          <strong>Username:</strong> {user?.username}
          <span className={`badge ms-2 ${getRoleBadgeClass(user?.role)}`}>{user?.role}</span>
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p className="small text-muted">
          You can manage your profile and change your password in the Profile section.
        </p>
      </div>
    </div>

    {/* Invite User Section */}
    {(user?.role === 'admin' || user?.role === 'super-admin') && (
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fs-6 fw-bold mb-2">Invite New User</h2>
              <p className="text-muted small">
                Send an email invitation to join{' '}
                {user?.role === 'super-admin' && viewScope === 'all'
                  ? 'the system'
                  : 'your organization'}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowInviteModal(true);
                if (user?.role === 'super-admin' && organizations.length === 0) {
                  loadOrganizations();
                }
              }}
              disabled={loading || inviteLoading}
            >
              <i className="fas fa-envelope me-2" />
              Invite User
            </button>
          </div>

          {inviteMsg && (
            <div className={`alert ${getNotificationClass(inviteMsg)} mt-3`}>
              <p>{inviteMsg}</p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Users Table */}
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fs-5 fw-bold">
            {viewScope === 'all' ? 'All Users (System-wide)' : 'Organization Users'}
          </h2>
          <div>
            {viewScope === 'all' && <span className="badge text-bg-warning">Super Admin View</span>}
            {viewScope === 'organization' && (
              <span className="badge text-bg-info">Organization View</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center p-4">
            <span className="spinner-border" role="status" aria-hidden="true" />
            <p className="mt-2">Loading users...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(targetUser => (
                  <tr key={targetUser.id}>
                    <td>
                      <strong>
                        {targetUser.id === user.id ? user.username : targetUser.username}
                      </strong>
                      {targetUser.id === user.id && (
                        <span className="badge text-bg-info ms-2">You</span>
                      )}
                    </td>
                    <td>{targetUser.email}</td>
                    <td>
                      {targetUser.organization_name ? (
                        targetUser.organization_name
                      ) : (
                        <span className="text-muted fst-italic">
                          {targetUser.role === 'super-admin' ? 'System Admin' : 'No Organization'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingUser === targetUser.id ? (
                        <div className="input-group input-group-sm">
                          <select
                            className="form-select"
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                          >
                            <option value="">Select Role</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            {user.role === 'super-admin' && (
                              <option value="super-admin">Super Admin</option>
                            )}
                          </select>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => handleRoleChange(targetUser.id, newRole)}
                            disabled={!newRole || loading}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingUser(null);
                              setNewRole('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(targetUser.role)}`}>
                          {targetUser.role}
                        </span>
                      )}
                    </td>
                    <td>{new Date(targetUser.created_at).toLocaleDateString()}</td>
                    <td>
                      {targetUser.last_login
                        ? new Date(targetUser.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <span
                        className={`badge ${targetUser.is_active ? 'text-bg-success' : 'text-bg-danger'}`}
                      >
                        {targetUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {canModifyUser(user, targetUser) ? (
                        <div className="d-flex gap-1">
                          {editingUser !== targetUser.id && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                onClick={() => {
                                  setEditingUser(targetUser.id);
                                  setNewRole(targetUser.role);
                                }}
                                disabled={loading}
                              >
                                Edit Role
                              </button>
                              {targetUser.is_active ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeactivateUser(targetUser.id)}
                                  disabled={loading}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleReactivateUser(targetUser.id)}
                                  disabled={loading}
                                >
                                  Reactivate
                                </button>
                              )}
                              {user.role === 'super-admin' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => setDeleteModalUser(targetUser)}
                                  disabled={loading}
                                  title="Permanent deletion (Super Admin only)"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted small">
                          {targetUser.id === user.id ? 'Cannot modify self' : 'No permission'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);

UsersTab.propTypes = {
  user: PropTypes.object.isRequired,
  allUsers: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  viewScope: PropTypes.string.isRequired,
  editingUser: PropTypes.number,
  setEditingUser: PropTypes.func.isRequired,
  newRole: PropTypes.string.isRequired,
  setNewRole: PropTypes.func.isRequired,
  organizations: PropTypes.array.isRequired,
  setShowInviteModal: PropTypes.func.isRequired,
  inviteLoading: PropTypes.bool.isRequired,
  inviteMsg: PropTypes.string.isRequired,
  handleRoleChange: PropTypes.func.isRequired,
  handleDeactivateUser: PropTypes.func.isRequired,
  handleReactivateUser: PropTypes.func.isRequired,
  setDeleteModalUser: PropTypes.func.isRequired,
  loadOrganizations: PropTypes.func.isRequired,
};

export default UsersTab;
