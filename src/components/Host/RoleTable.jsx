import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const RoleTable = ({ roles, loading, onDelete, onViewDetails }) => {
  const { t } = useTranslation();
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
      return t('host.roleTable.notAvailable');
    }
    const parts = shell.split('/');
    return parts[parts.length - 1] || shell;
  };

  if (loading && roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.roleTable.loadingRoles')}</p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-user-shield fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.roleTable.noRolesFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('host.roleTable.roleName')}</th>
            <th>{t('host.roleTable.comment')}</th>
            <th>{t('host.roleTable.shell')}</th>
            <th>{t('host.roleTable.authorizations')}</th>
            <th>{t('host.roleTable.profiles')}</th>
            <th width="200">{t('host.roleTable.actions')}</th>
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
                  {role.comment || t('host.roleTable.notAvailable')}
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
                        {t('host.roleTable.more', { count: role.authorizations.length - 2 })}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted fst-italic">{t('host.roleTable.none')}</span>
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
                        {t('host.roleTable.more', { count: role.profiles.length - 2 })}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted fst-italic">{t('host.roleTable.none')}</span>
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
                    title={t('host.roleTable.viewDetails')}
                  >
                    <i className="fas fa-info-circle" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleAction(role, 'delete')}
                    disabled={loading || actionLoading[`${role.rolename}-delete`]}
                    title={t('host.roleTable.deleteRole')}
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
