import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ContentModal from '../common/ContentModal';

const UserDetailsModal = ({ user, onClose }) => {
  const { t } = useTranslation();
  const formatValue = value => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">N/A</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="text-muted">None</span>;
    }
    return value;
  };

  const getUserType = () => {
    if (user.uid < 100 && !user.comment?.includes('User')) {
      return { type: t('host.userDetailsModal.systemUser'), class: 'text-bg-info' };
    }
    return { type: t('host.userDetailsModal.regularUser'), class: 'text-bg-success' };
  };

  const userType = getUserType();

  const getAccountStatusClass = status => {
    if (status === 'active') {
      return 'text-bg-success';
    }
    if (status === 'locked') {
      return 'text-bg-danger';
    }
    return 'text-bg-warning';
  };

  const getPasswordStatusClass = status => {
    if (status === 'set') {
      return 'text-bg-success';
    }
    if (status === 'expired') {
      return 'text-bg-warning';
    }
    return 'text-bg-secondary';
  };

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={`User Details: ${user.username}`}
      icon="fas fa-user"
      aria-label={`User details for ${user.username}`}
    >
      <div className="row g-3">
        {/* Basic Information */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-info-circle me-2" />
            <span>{t('host.userDetailsModal.basicInformation')}</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Username</strong>
                  </td>
                  <td className="font-monospace">{user.username}</td>
                </tr>
                <tr>
                  <td>
                    <strong>User ID (UID)</strong>
                  </td>
                  <td className="font-monospace">{user.uid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Group ID (GID)</strong>
                  </td>
                  <td className="font-monospace">{user.gid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>User Type</strong>
                  </td>
                  <td>
                    <span className={`badge ${userType.class}`}>{userType.type}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Comment</strong>
                  </td>
                  <td>{formatValue(user.comment)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Home Directory</strong>
                  </td>
                  <td className="font-monospace">{formatValue(user.home)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Shell</strong>
                  </td>
                  <td className="font-monospace">{formatValue(user.shell)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Extended Attributes */}
        <div className="col">
          <h4 className="fs-5 fw-bold">
            <i className="fas fa-shield-alt me-2" />
            <span>{t('host.userDetailsModal.rbacAttributes')}</span>
          </h4>

          {user.attributes ? (
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {user.attributes.groups && (
                    <tr>
                      <td>
                        <strong>Secondary Groups</strong>
                      </td>
                      <td>
                        {user.attributes.groups.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {user.attributes.groups.map(group => (
                              <span key={group} className="badge text-bg-secondary">
                                {group}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  )}

                  {user.attributes.authorizations && (
                    <tr>
                      <td>
                        <strong>Authorizations</strong>
                      </td>
                      <td>
                        {user.attributes.authorizations.length > 0 ? (
                          <div>
                            {user.attributes.authorizations.map(auth => (
                              <div key={auth} className="font-monospace small">
                                {auth}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  )}

                  {user.attributes.profiles && (
                    <tr>
                      <td>
                        <strong>Profiles</strong>
                      </td>
                      <td>
                        {user.attributes.profiles.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {user.attributes.profiles.map(profile => (
                              <span key={profile} className="badge text-bg-primary">
                                {profile}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  )}

                  {user.attributes.roles && (
                    <tr>
                      <td>
                        <strong>Roles</strong>
                      </td>
                      <td>
                        {user.attributes.roles.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {user.attributes.roles.map(role => (
                              <span key={role} className="badge text-bg-warning">
                                {role}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                    </tr>
                  )}

                  {user.attributes.project && (
                    <tr>
                      <td>
                        <strong>Project</strong>
                      </td>
                      <td className="font-monospace">{user.attributes.project}</td>
                    </tr>
                  )}

                  {user.attributes.account_status && (
                    <tr>
                      <td>
                        <strong>Account Status</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${getAccountStatusClass(
                            user.attributes.account_status
                          )}`}
                        >
                          {user.attributes.account_status}
                        </span>
                      </td>
                    </tr>
                  )}

                  {user.attributes.password_status && (
                    <tr>
                      <td>
                        <strong>Password Status</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${getPasswordStatusClass(
                            user.attributes.password_status
                          )}`}
                        >
                          {user.attributes.password_status}
                        </span>
                      </td>
                    </tr>
                  )}

                  {user.attributes.last_login && (
                    <tr>
                      <td>
                        <strong>Last Login</strong>
                      </td>
                      <td className="font-monospace">{user.attributes.last_login}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p className="mb-0">
                Extended attributes not loaded. Click &quot;View Details&quot; to load full user
                information.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Additional System Information */}
      {user.attributes && Object.keys(user.attributes).length > 0 && (
        <>
          <hr />
          <h4 className="fs-6 fw-bold">
            <i className="fas fa-cog me-2" />
            <span>Raw Attributes</span>
          </h4>
          <div>
            <pre className="bg-body-tertiary p-3 small">
              {JSON.stringify(user.attributes, null, 2)}
            </pre>
          </div>
        </>
      )}
    </ContentModal>
  );
};

UserDetailsModal.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    uid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    comment: PropTypes.string,
    home: PropTypes.string,
    shell: PropTypes.string,
    attributes: PropTypes.shape({
      groups: PropTypes.arrayOf(PropTypes.string),
      authorizations: PropTypes.arrayOf(PropTypes.string),
      profiles: PropTypes.arrayOf(PropTypes.string),
      roles: PropTypes.arrayOf(PropTypes.string),
      project: PropTypes.string,
      account_status: PropTypes.string,
      password_status: PropTypes.string,
      last_login: PropTypes.string,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default UserDetailsModal;
