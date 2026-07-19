import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
}) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Current User Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="fs-5 fw-bold">{t('accounts.usersTab.yourAccount')}</h2>
          <p>
            <strong>{t('accounts.usersTab.labelUsername')}:</strong> {user?.username}
            <span className={`badge ms-2 ${getRoleBadgeClass(user?.role)}`}>{user?.role}</span>
          </p>
          <p>
            <strong>{t('accounts.usersTab.labelEmail')}:</strong> {user?.email}
          </p>
          <p className="small text-muted">{t('accounts.usersTab.profileManagementNote')}</p>
        </div>
      </div>

      {/* Invite User Section */}
      {(user?.role === 'admin' || user?.role === 'super-admin') && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="fs-6 fw-bold mb-2">{t('accounts.usersTab.inviteNewUser')}</h2>
                <p className="text-muted small">
                  {t('accounts.usersTab.inviteDescription', {
                    scope:
                      user?.role === 'super-admin' && viewScope === 'all'
                        ? t('accounts.usersTab.scopeSystem')
                        : t('accounts.usersTab.scopeOrganization'),
                  })}
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
                {t('accounts.usersTab.inviteUserButton')}
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
              {viewScope === 'all'
                ? t('accounts.usersTab.allUsersSystemWide')
                : t('accounts.usersTab.organizationUsers')}
            </h2>
            <div>
              {viewScope === 'all' && (
                <span className="badge text-bg-warning">
                  {t('accounts.usersTab.superAdminView')}
                </span>
              )}
              {viewScope === 'organization' && (
                <span className="badge text-bg-info">
                  {t('accounts.usersTab.organizationView')}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center p-4">
              <span className="spinner-border" role="status" aria-hidden="true" />
              <p className="mt-2">{t('accounts.usersTab.loadingUsers')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t('accounts.usersTab.columnUsername')}</th>
                    <th>{t('accounts.usersTab.columnEmail')}</th>
                    <th>{t('accounts.usersTab.columnOrganization')}</th>
                    <th>{t('accounts.usersTab.columnRole')}</th>
                    <th>{t('accounts.usersTab.columnCreated')}</th>
                    <th>{t('accounts.usersTab.columnLastLogin')}</th>
                    <th>{t('accounts.usersTab.columnStatus')}</th>
                    <th>{t('accounts.usersTab.columnActions')}</th>
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
                          <span className="badge text-bg-info ms-2">
                            {t('accounts.usersTab.youBadge')}
                          </span>
                        )}
                      </td>
                      <td>{targetUser.email}</td>
                      <td>
                        {targetUser.organization_name ? (
                          targetUser.organization_name
                        ) : (
                          <span className="text-muted fst-italic">
                            {targetUser.role === 'super-admin'
                              ? t('accounts.usersTab.systemAdmin')
                              : t('accounts.usersTab.noOrganization')}
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
                              <option value="">{t('accounts.usersTab.selectRole')}</option>
                              <option value="user">{t('accounts.usersTab.roleUser')}</option>
                              <option value="admin">{t('accounts.usersTab.roleAdmin')}</option>
                              {user.role === 'super-admin' && (
                                <option value="super-admin">
                                  {t('accounts.usersTab.roleSuperAdmin')}
                                </option>
                              )}
                            </select>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => handleRoleChange(targetUser.id, newRole)}
                              disabled={!newRole || loading}
                            >
                              {t('accounts.usersTab.buttonSave')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditingUser(null);
                                setNewRole('');
                              }}
                            >
                              {t('accounts.usersTab.buttonCancel')}
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
                          : t('accounts.usersTab.never')}
                      </td>
                      <td>
                        <span
                          className={`badge ${targetUser.is_active ? 'text-bg-success' : 'text-bg-danger'}`}
                        >
                          {targetUser.is_active
                            ? t('accounts.usersTab.statusActive')
                            : t('accounts.usersTab.statusInactive')}
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
                                  {t('accounts.usersTab.buttonEditRole')}
                                </button>
                                {targetUser.is_active ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeactivateUser(targetUser.id)}
                                    disabled={loading}
                                  >
                                    {t('accounts.usersTab.buttonDeactivate')}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleReactivateUser(targetUser.id)}
                                    disabled={loading}
                                  >
                                    {t('accounts.usersTab.buttonReactivate')}
                                  </button>
                                )}
                                {user.role === 'super-admin' && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setDeleteModalUser(targetUser)}
                                    disabled={loading}
                                    title={t('accounts.usersTab.deleteUserTitle')}
                                  >
                                    {t('accounts.usersTab.buttonDelete')}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small">
                            {targetUser.id === user.id
                              ? t('accounts.usersTab.cannotModifySelf')
                              : t('accounts.usersTab.noPermission')}
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
};

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
