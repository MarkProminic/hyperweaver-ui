import PropTypes from 'prop-types';

const AuthorizationsTab = ({ authorizations, loading, copyToClipboard }) => {
  if (loading && authorizations.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading authorizations...</p>
      </div>
    );
  }

  if (authorizations.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-shield-alt fa-2x text-muted" />
        <p className="mt-2 text-muted">No authorizations found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Authorization</th>
            <th>Short Description</th>
            <th>Long Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {authorizations.map(auth => (
            <tr key={auth.name}>
              <td>
                <code className="small">{auth.name}</code>
              </td>
              <td className="small">{auth.short_description || 'N/A'}</td>
              <td className="small" title={auth.long_description}>
                {auth.long_description && auth.long_description.length > 50
                  ? `${auth.long_description.substring(0, 50)}...`
                  : auth.long_description || 'N/A'}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(auth.name)}
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

AuthorizationsTab.propTypes = {
  authorizations: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default AuthorizationsTab;
