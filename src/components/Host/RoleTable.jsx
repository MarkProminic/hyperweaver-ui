import PropTypes from 'prop-types';
import { useState } from 'react';

const RoleTable = ({ roles, loading, onDelete, onViewDetails }) => {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (role, action) => {
    const key = `${role.rolename}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'delete') {
        await onDelete(role);
      } else if (action === 'viewDetails') {
        onViewDetails(role);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const formatShell = shell => {
    if (!shell) {
      return 'N/A';
    }
    const parts = shell.split('/');
    return parts[parts.length - 1] || shell;
  };

  if (loading && roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading roles...</p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-user-shield fa-2x text-muted" />
        <p className="mt-2 text-muted">No roles found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Role Name</th>
            <th>Comment</th>
            <th>Shell</th>
            <th>Authorizations</th>
            <th>Profiles</th>
            <th width="200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.rolename || role.name}>
              <td>
                <div className="d-flex align-items-center">
                  <i className="fas fa-user-shield text-warning me-2" />
                  <span>
                    <strong>{role.rolename}</strong>
                  </span>
                </div>
              </td>
              <td>
                <span className="small" title={role.comment}>
                  {role.comment || 'N/A'}
                </span>
              </td>
              <td>
                <span className="font-monospace small" title={role.shell}>
                  {formatShell(role.shell)}
                </span>
              </td>
              <td>
                {role.authorizations && role.authorizations.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {role.authorizations.slice(0, 2).map(auth => (
                      <span key={auth} className="badge text-bg-info">
                        {auth}
                      </span>
                    ))}
                    {role.authorizations.length > 2 && (
                      <span className="badge text-bg-secondary">
                        +{role.authorizations.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted fst-italic">None</span>
                )}
              </td>
              <td>
                {role.profiles && role.profiles.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {role.profiles.slice(0, 2).map(profile => (
                      <span key={profile} className="badge text-bg-primary">
                        {profile}
                      </span>
                    ))}
                    {role.profiles.length > 2 && (
                      <span className="badge text-bg-secondary">
                        +{role.profiles.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted fst-italic">None</span>
                )}
              </td>
              <td>
                <div className="d-flex gap-2">
                  {/* View Details Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAction(role, 'viewDetails')}
                    disabled={loading}
                    title="View Details"
                  >
                    <i className="fas fa-info-circle" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleAction(role, 'delete')}
                    disabled={loading || actionLoading[`${role.rolename}-delete`]}
                    title="Delete Role"
                  >
                    {actionLoading[`${role.rolename}-delete`] && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

RoleTable.propTypes = {
  roles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default RoleTable;
