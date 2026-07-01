import PropTypes from 'prop-types';

import ContentModal from '../common/ContentModal';

const RoleDetailsModal = ({ role, onClose }) => {
  const formatValue = value => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">N/A</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="text-muted">None</span>;
    }
    return value;
  };

  const formatShell = shell => {
    if (!shell) {
      return 'N/A';
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
            <span>Basic Information</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Role Name</strong>
                  </td>
                  <td className="font-monospace">{role.rolename}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Comment</strong>
                  </td>
                  <td>{formatValue(role.comment)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Shell</strong>
                  </td>
                  <td className="font-monospace">{formatShell(role.shell)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Home Directory</strong>
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
            <span>RBAC Configuration</span>
          </h4>

          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Authorizations</strong>
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
                      <span className="text-muted">None</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Profiles</strong>
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
                      <span className="text-muted">None</span>
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
        <span>Role Usage</span>
      </h4>

      <div>
        <div className="alert alert-secondary">
          <p>
            <strong>How Roles Work:</strong>
          </p>
          <ul>
            <li>Roles are special accounts that provide collections of privileges</li>
            <li>
              Users can be granted the ability to assume roles using <code>su</code> or{' '}
              <code>pfexec</code>
            </li>
            <li>
              When a user assumes a role, they gain the role&apos;s authorizations and profiles
            </li>
            <li>
              Roles typically use the profile shell (<code>/bin/pfsh</code>) for RBAC enforcement
            </li>
            <li>Users must be explicitly granted permission to assume specific roles</li>
          </ul>
        </div>

        <div className="alert alert-info">
          <p>
            <strong>Assigning Roles to Users:</strong>
          </p>
          <p>
            To allow users to assume this role, edit their user account and add &quot;
            <strong>{role.rolename}</strong>&quot; to their roles list in the User Management
            section.
          </p>
        </div>
      </div>

      {/* Shell Information */}
      {role.shell && (
        <div className="alert alert-warning">
          <p>
            <strong>Shell Configuration:</strong>
          </p>
          <p>
            This role uses <code>{role.shell}</code>.
            {role.shell === '/bin/pfsh'
              ? ' This is the recommended profile shell for RBAC roles.'
              : ' Consider using /bin/pfsh for proper RBAC privilege enforcement.'}
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
