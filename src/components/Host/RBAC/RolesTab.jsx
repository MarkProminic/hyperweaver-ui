import PropTypes from 'prop-types';

const RolesTab = ({ roles, loading, copyToClipboard }) => {
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
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.name}>
              <td>
                <div className="d-flex align-items-center">
                  <i className="fas fa-user-shield text-warning me-2" />
                  <span>
                    <strong>{role.name}</strong>
                  </span>
                </div>
              </td>
              <td className="small" title={role.description}>
                {role.description || 'N/A'}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(role.name)}
                  title="Copy to clipboard"
                >
                  <i className="fas fa-copy" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

RolesTab.propTypes = {
  roles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default RolesTab;
