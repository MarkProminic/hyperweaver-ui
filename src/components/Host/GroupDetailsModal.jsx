import PropTypes from 'prop-types';

import ContentModal from '../common/ContentModal';

const GroupDetailsModal = ({ group, onClose }) => {
  const getGroupType = () => {
    if (group.gid < 100) {
      return { type: 'System Group', class: 'text-bg-info' };
    }
    return { type: 'Regular Group', class: 'text-bg-success' };
  };

  const groupType = getGroupType();

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={`Group Details: ${group.groupname}`}
      icon="fas fa-users"
      aria-label={`Group details for ${group.groupname}`}
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
                    <strong>Group Name</strong>
                  </td>
                  <td className="font-monospace">{group.groupname}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Group ID (GID)</strong>
                  </td>
                  <td className="font-monospace">{group.gid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Group Type</strong>
                  </td>
                  <td>
                    <span className={`badge ${groupType.class}`}>{groupType.type}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Member Count</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-secondary">
                      {group.members ? group.members.length : 0} members
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
            <span>Group Members</span>
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
              <p>This group has no members assigned.</p>
              <p className="mt-2 mb-0">
                <strong>Tip:</strong> Add users to this group by editing their user accounts in the
                Users section.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <hr />
      <h4 className="fs-6 fw-bold">
        <i className="fas fa-cog me-2" />
        <span>Group Management</span>
      </h4>

      <div>
        <div className="alert alert-secondary">
          <p>
            <strong>Managing Group Membership:</strong>
          </p>
          <ul className="mb-0">
            <li>
              To add users to this group, edit the user&apos;s secondary groups in User Management
            </li>
            <li>
              To remove users, edit their user account and remove this group from their secondary
              groups
            </li>
            <li>Primary group assignments are managed automatically during user creation</li>
          </ul>
        </div>

        {group.gid < 100 && (
          <div className="alert alert-warning">
            <p>
              <strong>System Group:</strong>
            </p>
            <p className="mb-0">
              This is a system group (GID &lt; 100). Modifying system groups may affect system
              functionality.
            </p>
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
