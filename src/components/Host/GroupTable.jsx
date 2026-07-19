import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const GroupTable = ({ groups, loading, onDelete, onViewDetails }) => {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (group, action) => {
    const key = `${group.groupname}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'delete') {
        await onDelete(group);
      } else if (action === 'viewDetails') {
        onViewDetails(group);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getGroupType = group => {
    if (group.gid < 100) {
      return { type: t('host.groupTable.typeSystem'), class: 'text-bg-info' };
    }
    return { type: t('host.groupTable.typeRegular'), class: 'text-bg-success' };
  };

  if (loading && groups.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.groupTable.loading')}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-users fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.groupTable.noData')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('host.groupTable.groupName')}</th>
            <th>{t('host.groupTable.gid')}</th>
            <th>{t('host.groupTable.members')}</th>
            <th>{t('host.groupTable.type')}</th>
            <th width="200">{t('host.groupTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => {
            const groupType = getGroupType(group);

            return (
              <tr key={`${group.gid}-${group.groupname}`}>
                <td>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-users text-primary me-2" />
                    <span>
                      <strong>{group.groupname}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-monospace">{group.gid}</span>
                </td>
                <td>
                  {group.members && group.members.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1">
                      {group.members.slice(0, 3).map(member => (
                        <span key={member} className="badge text-bg-secondary">
                          {member}
                        </span>
                      ))}
                      {group.members.length > 3 && (
                        <span className="badge text-bg-secondary">
                          {t('host.groupTable.moreMembers', { count: group.members.length - 3 })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted fst-italic">{t('host.groupTable.noMembers')}</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${groupType.class}`}>{groupType.type}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAction(group, 'viewDetails')}
                      disabled={loading}
                      title={t('host.groupTable.viewDetails')}
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button - only for non-system groups */}
                    {group.gid >= 100 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleAction(group, 'delete')}
                        disabled={loading || actionLoading[`${group.groupname}-delete`]}
                        title={t('host.groupTable.deleteGroup')}
                      >
                        {actionLoading[`${group.groupname}-delete`] && (
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                        )}
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

GroupTable.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      groupname: PropTypes.string.isRequired,
      gid: PropTypes.number.isRequired,
      members: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default GroupTable;
