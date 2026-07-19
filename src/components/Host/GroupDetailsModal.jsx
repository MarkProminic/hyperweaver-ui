import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ContentModal from '../common/ContentModal';

const GroupDetailsModal = ({ group, onClose }) => {
  const { t } = useTranslation();

  const getGroupType = () => {
    if (group.gid < 100) {
      return { type: t('host.groupDetailsModal.systemGroup'), class: 'text-bg-info' };
    }
    return { type: t('host.groupDetailsModal.regularGroup'), class: 'text-bg-success' };
  };

  const groupType = getGroupType();

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.groupDetailsModal.title', { groupname: group.groupname })}
      icon="fas fa-users"
      aria-label={t('host.groupDetailsModal.ariaLabel', { groupname: group.groupname })}
    >
      <div className="row g-3">
        {/* Basic Information */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-info-circle me-2" />
            <span>{t('host.groupDetailsModal.basicInfo')}</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.groupDetailsModal.groupName')}</strong>
                  </td>
                  <td className="font-monospace">{group.groupname}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.groupDetailsModal.groupId')}</strong>
                  </td>
                  <td className="font-monospace">{group.gid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.groupDetailsModal.groupType')}</strong>
                  </td>
                  <td>
                    <span className={`badge ${groupType.class}`}>{groupType.type}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.groupDetailsModal.memberCount')}</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-secondary">
                      {t('host.groupDetailsModal.memberCountDisplay', {
                        count: group.members ? group.members.length : 0,
                      })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Members */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-user-friends me-2" />
            <span>{t('host.groupDetailsModal.groupMembers')}</span>
          </h4>

          {group.members && group.members.length > 0 ? (
            <div className="d-flex flex-wrap gap-1">
              {group.members.map(member => (
                <span
                  key={member}
                  className="badge text-bg-secondary d-inline-flex align-items-center gap-1"
                >
                  <i className="fas fa-user" />
                  <span>{member}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              <p>{t('host.groupDetailsModal.noMembers')}</p>
              <p className="mt-2 mb-0">
                <strong>{t('host.groupDetailsModal.tip')}:</strong>{' '}
                {t('host.groupDetailsModal.tipText')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <hr />
      <h4 className="fs-6 fw-bold">
        <i className="fas fa-cog me-2" />
        <span>{t('host.groupDetailsModal.groupManagement')}</span>
      </h4>

      <div>
        <div className="alert alert-secondary">
          <p>
            <strong>{t('host.groupDetailsModal.managingMembership')}:</strong>
          </p>
          <ul className="mb-0">
            <li>{t('host.groupDetailsModal.addUsersText')}</li>
            <li>{t('host.groupDetailsModal.removeUsersText')}</li>
            <li>{t('host.groupDetailsModal.primaryGroupText')}</li>
          </ul>
        </div>

        {group.gid < 100 && (
          <div className="alert alert-warning">
            <p>
              <strong>{t('host.groupDetailsModal.systemGroupWarning')}:</strong>
            </p>
            <p className="mb-0">{t('host.groupDetailsModal.systemGroupWarningText')}</p>
          </div>
        )}
      </div>
    </ContentModal>
  );
};

GroupDetailsModal.propTypes = {
  group: PropTypes.shape({
    groupname: PropTypes.string.isRequired,
    gid: PropTypes.number.isRequired,
    members: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default GroupDetailsModal;
