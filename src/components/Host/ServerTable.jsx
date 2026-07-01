import PropTypes from 'prop-types';
import { useState } from 'react';

const ServerTable = ({ servers, onEdit, onDelete, loading }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  // Mask API key for security (show first 6 and last 4 characters)
  const maskApiKey = apiKey => {
    if (!apiKey || apiKey.length < 10) {
      return 'Not Set';
    }
    const start = apiKey.substring(0, 6);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  };

  // Copy API key to clipboard
  const copyApiKey = async (apiKey, serverId) => {
    if (!apiKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(serverId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };
  if (servers.length === 0) {
    return (
      <div className="text-center p-6">
        <i className="fas fa-server fa-3x mb-3 text-muted" />
        <h3 className="fs-4 text-muted">No Servers Configured</h3>
        <p className="text-muted mb-4">
          You haven&apos;t added any Servers yet. Add a server to start managing zones.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>No</th>
            <th>Hostname</th>
            <th>Protocol</th>
            <th>Port</th>
            <th>Entity Name</th>
            <th>API Key</th>
            <th>Last Used</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server, index) => (
            <tr key={`${server.hostname}:${server.port}`}>
              <td>{index + 1}</td>
              <td>
                <strong>{server.hostname || server.serverHostname || 'No hostname'}</strong>
                {!server.hostname && !server.serverHostname && (
                  <small className="text-danger d-block">
                    Missing hostname data - Check console
                  </small>
                )}
              </td>
              <td>{server.protocol}</td>
              <td>{server.port}</td>
              <td>{server.entityName}</td>
              <td>
                <div className="input-group">
                  {server.api_key && (
                    <button
                      type="button"
                      className={`btn btn-sm ${copiedKey === server.id ? 'btn-success' : 'btn-light'}`}
                      onClick={() => copyApiKey(server.api_key, server.id)}
                      title={copiedKey === server.id ? 'Copied!' : 'Copy API Key'}
                      disabled={loading}
                    >
                      <i className={`fas ${copiedKey === server.id ? 'fa-check' : 'fa-copy'}`} />
                    </button>
                  )}
                  <span className="badge text-bg-light">{maskApiKey(server.api_key)}</span>
                </div>
              </td>
              <td>{server.lastUsed ? new Date(server.lastUsed).toLocaleDateString() : 'Never'}</td>
              <td>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={() => onEdit(server.hostname)}
                    disabled={loading}
                    title="Edit Server"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(server.id)}
                    disabled={loading}
                    title="Remove Server"
                  >
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

ServerTable.propTypes = {
  servers: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ServerTable;
