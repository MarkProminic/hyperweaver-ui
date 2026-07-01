import PropTypes from 'prop-types';
import { useState } from 'react';

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
        title: 'Delete User',
        message: `Are you sure you want to delete user "${user.username}"?\n\nThis will also remove their home directory and personal group.`,
        confirmText: 'Delete',
        variant: 'is-danger',
      });
    } else if (action === 'lock') {
      setConfirmAction({
        type: 'lock',
        user,
        title: 'Lock User Account',
        message: `Are you sure you want to lock user "${user.username}"?`,
        confirmText: 'Lock',
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
      return <i className="fas fa-cog text-info" title="System User" />;
    }
    return <i className="fas fa-user text-success" title="Regular User" />;
  };

  const getUserStatusTag = user => {
    if (user.uid < 100 && !user.comment?.includes('User')) {
      return <span className="badge text-bg-info">System</span>;
    }
    return <span className="badge text-bg-success">Active</span>;
  };

  const formatShell = shell => {
    if (!shell) {
      return 'N/A';
    }
    const parts = shell.split('/');
    return parts[parts.length - 1] || shell;
  };

  const formatHome = home => {
    if (!home) {
      return 'N/A';
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
        <p className="mt-2">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-users fa-2x text-muted" />
        <p className="mt-2 text-muted">No users found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Username</th>
            <th>UID</th>
            <th>GID</th>
            <th>Comment</th>
            <th>Home Directory</th>
            <th>Shell</th>
            <th>Status</th>
            <th width="280">Actions</th>
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
                  {user.comment || 'N/A'}
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
                    title="Edit User"
                  >
                    <i className="fas fa-edit" />
                  </button>

                  {/* Set Password Button */}
                  <button
                    type="button"
                    className="btn btn-sm btn-info"
                    onClick={() => handleActionClick(user, 'setPassword')}
                    disabled={loading}
                    title="Set Password"
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
                      title="Lock Account"
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
                    title="View Details"
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
                      title="Delete User"
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
