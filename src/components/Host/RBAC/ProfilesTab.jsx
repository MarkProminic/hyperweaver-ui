import PropTypes from 'prop-types';

const ProfilesTab = ({ profiles, loading, copyToClipboard }) => {
  if (loading && profiles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading profiles...</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-id-card fa-2x text-muted" />
        <p className="mt-2 text-muted">No profiles found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Profile Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(profile => (
            <tr key={profile.name}>
              <td>
                <strong>{profile.name}</strong>
              </td>
              <td className="small" title={profile.description}>
                {profile.description || 'N/A'}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(profile.name)}
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

ProfilesTab.propTypes = {
  profiles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default ProfilesTab;
