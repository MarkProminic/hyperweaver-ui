import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmModal } from '../common';

const UserTable = ({
  users,
  loading,
  onEdit,
  onDelete,
  onLock,
  onUnlock,
  onSetPassword,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const executeAction = async (user, action) => {
    const key = `${user.username}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'delete') {
        await onDelete(user);
      } else if (action === 'lock') {
        await onLock(user);
      } else if (action === 'unlock') {
        await onUnlock(user);
      } else if (action === 'edit') {
        onEdit(user);
      } else if (action === 'setPassword') {
        onSetPassword(user);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
      setConfirmAction(null);
    }
  };

  const handleActionClick = (user, action) => {
    if (action === 'delete') {
      setConfirmAction({
        type: 'delete',
        user,
        title: t('host.userTable.deleteUserTitle'),
        message: t('host.userTable.deleteUserConfirm', { username: user.username }),
        confirmText: t('host.userTable.delete'),
        variant: 'is-danger',
      });
    } else if (action === 'lock') {
      setConfirmAction({
        type: 'lock',
        user,
        title: t('host.userTable.lockUserAccountTitle'),
        message: t('host.userTable.lockUserConfirm', { username: user.username }),
        confirmText: t('host.userTable.lock'),
        variant: 'is-warning',
      });
    } else {
      executeAction(user, action);
    }
  };

  const getUserStatusIcon = user => {
    // Determine user status based on available information
    // This is a simplified approach - actual implementation might need more logic
    if (user.uid < 100 && !user.comment?.includes('User')) {
      return <i className="fas fa-cog text-info" title={t('host.userTable.systemUser')} />;
    }
    return <i className="fas fa-user text-success" title={t('host.userTable.regularUser')} />;
  };

  const getUserStatusTag = user => {
    if (user.uid < 100 && !user.comment?.includes('User')) {
      return <span className="badge text-bg-info">{t('host.userTable.system')}</span>;
    }
    return <span className="badge text-bg-success">{t('host.userTable.active')}</span>;
  };

  const formatShell = shell => {
    if (!shell) {
      return t('host.userTable.notAvailable');
    }
    const parts = shell.split('/');
    return parts[parts.length - 1] || shell;
  };

  const formatHome = home => {
    if (!home) {
      return t('host.userTable.notAvailable');
    }
    if (home.length > 25) {
      return `...${home.slice(-22)}`;
    }
    return home;
  };

  if (loading && users.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.userTable.loadingUsers')}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-users fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.userTable.noUsersFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('host.userTable.username')}</th>
            <th>{t('host.userTable.uid')}</th>
            <th>{t('host.userTable.gid')}</th>
            <th>{t('host.userTable.comment')}</th>
            <th>{t('host.userTable.homeDirectory')}</th>
            <th>{t('host.userTable.shell')}</th>
            <th>{t('host.userTable.status')}</th>
            <th width="280">{t('host.userTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.username || index}>
              <td>
                <div className="d-flex align-items-center">
                  {getUserStatusIcon(user)}
                  <span className="ms-2">
                    <strong>{user.username}</strong>
                  </span>
                </div>
              </td>
              <td>
                <span className="font-monospace">{user.uid}</span>
              </td>
              <td>
                <span className="font-monospace">{user.gid}</span>
              </td>
              <td>
                <span className="small" title={user.comment}>
                  {user.comment || t('host.userTable.notAvailable')}
                </span>
              </td>
              <td>
                <span className="font-monospace small" title={user.home}>
                  {formatHome(user.home)}
                </span>
              </td>
              <td>
                <span className="font-monospace small" title={user.shell}>
                  {formatShell(user.shell)}
                </span>
              </td>
              <td>{getUserStatusTag(user)}</td>
              <td>
                <div className="d-flex gap-2">
                  {/* Edit Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleActionClick(user, 'edit')}
                    disabled={loading}
                    title={t('host.userTable.editUser')}
                  >
                    <i className="fas fa-edit" />
                  </button>

                  {/* Set Password Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-info"
                    onClick={() => handleActionClick(user, 'setPassword')}
                    disabled={loading}
                    title={t('host.userTable.setPassword')}
                  >
                    <i className="fas fa-key" />
                  </button>

                  {/* Lock/Unlock Button - only for non-system users */}
                  {user.uid >= 100 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => handleActionClick(user, 'lock')}
                      disabled={loading}
                      title={t('host.userTable.lockAccount')}
                    >
                      <i className="fas fa-lock" />
                    </button>
                  )}

                  {/* View Details Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => onViewDetails(user)}
                    disabled={loading}
                    title={t('host.userTable.viewDetails')}
                  >
                    <i className="fas fa-info-circle" />
                  </button>

                  {/* Delete Button - only for non-system users */}
                  {user.uid >= 100 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleActionClick(user, 'delete')}
                      disabled={loading || actionLoading[`${user.username}-delete`]}
                      title={t('host.userTable.deleteUser')}
                    >
                      {actionLoading[`${user.username}-delete`] ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                      ) : (
                        <i className="fas fa-trash" />
                      )}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => executeAction(confirmAction.user, confirmAction.type)}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          confirmVariant={confirmAction.variant}
          loading={actionLoading[`${confirmAction.user.username}-${confirmAction.type}`]}
        />
      )}
    </div>
  );
};

UserTable.propTypes = {
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onLock: PropTypes.func.isRequired,
  onUnlock: PropTypes.func.isRequired,
  onSetPassword: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default UserTable;
