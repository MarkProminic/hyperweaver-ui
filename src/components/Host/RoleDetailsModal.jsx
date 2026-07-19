import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ContentModal from '../common/ContentModal';

const RoleDetailsModal = ({ role, onClose }) => {
  const { t } = useTranslation();
  const formatValue = value => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">{t('host.roleDetailsModal.notAvailable')}</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? (
        value.join(', ')
      ) : (
        <span className="text-muted">{t('host.roleDetailsModal.none')}</span>
      );
    }
    return value;
  };

  const formatShell = shell => {
    if (!shell) {
      return t('host.roleDetailsModal.notAvailable');
    }
    return shell;
  };

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={`Role Details: ${role.rolename}`}
      icon="fas fa-user-shield"
      aria-label={`Role details for ${role.rolename}`}
    >
      <div className="row g-3">
        {/* Basic Information */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-info-circle me-2" />
            <span>{t('host.roleDetailsModal.basicInformation')}</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.roleName')}</strong>
                  </td>
                  <td className="font-monospace">{role.rolename}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.comment')}</strong>
                  </td>
                  <td>{formatValue(role.comment)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.shell')}</strong>
                  </td>
                  <td className="font-monospace">{formatShell(role.shell)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.homeDirectory')}</strong>
                  </td>
                  <td className="font-monospace">{formatValue(role.home)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RBAC Configuration */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-shield-alt me-2" />
            <span>{t('host.roleDetailsModal.rbacConfiguration')}</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.authorizations')}</strong>
                  </td>
                  <td>
                    {role.authorizations && role.authorizations.length > 0 ? (
                      <div>
                        {role.authorizations.map(auth => (
                          <div key={auth} className="font-monospace small">
                            <span className="badge text-bg-info me-1">{auth}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">{t('host.roleDetailsModal.none')}</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>{t('host.roleDetailsModal.profiles')}</strong>
                  </td>
                  <td>
                    {role.profiles && role.profiles.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {role.profiles.map(profile => (
                          <span key={profile} className="badge text-bg-primary">
                            {profile}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">{t('host.roleDetailsModal.none')}</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role Usage Information */}
      <hr />
      <h4 className="fs-6 fw-bold">
        <i className="fas fa-user-friends me-2" />
        <span>{t('host.roleDetailsModal.roleUsage')}</span>
      </h4>

      <div>
        <div className="alert alert-secondary">
          <p>
            <strong>{t('host.roleDetailsModal.howRolesWork')}</strong>
          </p>
          <ul>
            <li>{t('host.roleDetailsModal.rolesAreSpecialAccounts')}</li>
            <li>{t('host.roleDetailsModal.usersCanBeGrantedAbility')}</li>
            <li>{t('host.roleDetailsModal.whenUserAssumesRole')}</li>
            <li>{t('host.roleDetailsModal.rolesTypicallyUseProfileShell')}</li>
            <li>{t('host.roleDetailsModal.usersMustBeExplicitlyGranted')}</li>
          </ul>
        </div>

        <div className="alert alert-info">
          <p>
            <strong>{t('host.roleDetailsModal.assigningRolesToUsers')}</strong>
          </p>
          <p>
            {t('host.roleDetailsModal.toAllowUsersToAssumeThisRole', { rolename: role.rolename })}
          </p>
        </div>
      </div>

      {/* Shell Information */}
      {role.shell && (
        <div className="alert alert-warning">
          <p>
            <strong>{t('host.roleDetailsModal.shellConfiguration')}</strong>
          </p>
          <p>
            {t('host.roleDetailsModal.thisRoleUses', { shell: role.shell })}
            {role.shell === '/bin/pfsh'
              ? ` ${t('host.roleDetailsModal.recommendedProfileShell')}`
              : ` ${t('host.roleDetailsModal.considerUsingProfileShell')}`}
          </p>
        </div>
      )}
    </ContentModal>
  );
};

RoleDetailsModal.propTypes = {
  role: PropTypes.shape({
    rolename: PropTypes.string.isRequired,
    comment: PropTypes.string,
    shell: PropTypes.string,
    home: PropTypes.string,
    authorizations: PropTypes.arrayOf(PropTypes.string),
    profiles: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RoleDetailsModal;
