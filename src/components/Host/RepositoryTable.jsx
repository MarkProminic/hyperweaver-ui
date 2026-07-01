import PropTypes from 'prop-types';
import { useState } from 'react';

const RepositoryTable = ({ repositories, loading, onToggle, onEdit, onDelete }) => {
  const [actionLoading, setActionLoading] = useState({});
  const handleAction = async (repo, action) => {
    const key = `${repo.name}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'enable') {
        await onToggle(repo.name, true);
      } else if (action === 'disable') {
        await onToggle(repo.name, false);
      } else if (action === 'edit') {
        await onEdit(repo);
      } else if (action === 'delete') {
        await onDelete(repo.name);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };
  const getStatusIcon = repo => {
    const isEnabled = repo.enabled !== false;
    if (repo.status === 'online' && isEnabled) {
      return <i className="fas fa-check-circle text-success" />;
    }
    if (repo.status === 'online' && !isEnabled) {
      return <i className="fas fa-pause-circle text-warning" />;
    }
    return <i className="fas fa-times-circle text-danger" />;
  };

  const getStatusTag = repo => {
    const isEnabled = repo.enabled !== false;
    if (repo.status === 'online' && isEnabled) {
      return <span className="badge text-bg-success">Online</span>;
    }
    if (repo.status === 'online' && !isEnabled) {
      return <span className="badge text-bg-warning">Disabled</span>;
    }
    return <span className="badge text-bg-danger">Offline</span>;
  };
  const getTypeTag = type => {
    switch (type?.toLowerCase()) {
      case 'origin':
        return <span className="badge text-bg-primary">Origin</span>;
      case 'mirror':
        return <span className="badge text-bg-info">Mirror</span>;
      default:
        return <span className="badge text-bg-secondary">{type || 'Unknown'}</span>;
    }
  };
  const getProxyTag = proxy => {
    if (proxy === 'T' || proxy === true) {
      return <span className="badge text-bg-warning">Yes</span>;
    }
    return <span className="badge text-bg-secondary">No</span>;
  };

  const getAvailableActions = repo => {
    const actions = [];
    const isEnabled = repo.enabled !== false;

    if (isEnabled) {
      actions.push({
        key: 'disable',
        label: 'Disable',
        icon: 'fa-pause',
        class: 'btn-warning',
      });
    } else {
      actions.push({
        key: 'enable',
        label: 'Enable',
        icon: 'fa-play',
        class: 'btn-success',
      });
    }

    return actions;
  };
  const formatLocation = location => {
    if (!location) {
      return 'N/A';
    }

    // Truncate long URLs
    if (location.length > 50) {
      return `${location.substring(0, 50)}...`;
    }
    return location;
  };
  if (loading && repositories.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading repositories...</p>
      </div>
    );
  }
  if (repositories.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-database fa-2x text-muted" />
        <p className="mt-2 text-muted">No repositories found</p>
      </div>
    );
  }
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Publisher</th>
            <th>Type</th>
            <th>Status</th>
            <th>Location</th>
            <th>Proxy</th>
            <th width="150">Actions</th>
          </tr>
        </thead>
        <tbody>
          {repositories.map(repo => {
            const availableActions = getAvailableActions(repo);
            return (
              <tr key={`${repo.name}-${repo.type}`}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStatusIcon(repo)}
                    <span className="ms-2">
                      <strong className="font-monospace">{repo.name}</strong>
                    </span>
                  </div>
                </td>
                <td>{getTypeTag(repo.type)}</td>
                <td>{getStatusTag(repo)}</td>
                <td>
                  <span className="small font-monospace" title={repo.location}>
                    {formatLocation(repo.location)}
                  </span>
                </td>
                <td>{getProxyTag(repo.proxy)}</td>
                <td>
                  <div className="d-flex gap-2">
                    {/* Enable/Disable Buttons */}
                    {availableActions.map(action => {
                      const key = `${repo.name}-${action.key}`;
                      const isLoading = actionLoading[key];

                      return (
                        <button
                          key={action.key}
                          type="button"
                          className={`btn btn-sm ${action.class}`}
                          onClick={() => handleAction(repo, action.key)}
                          disabled={loading || isLoading}
                          title={action.label}
                        >
                          {isLoading && (
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            />
                          )}
                          <i className={`fas ${action.icon}`} />
                        </button>
                      );
                    })}

                    {/* Edit Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleAction(repo, 'edit')}
                      disabled={loading}
                      title="Edit Repository"
                    >
                      <i className="fas fa-edit" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleAction(repo, 'delete')}
                      disabled={loading}
                      title="Delete Repository"
                    >
                      <i className="fas fa-trash" />
                    </button>
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

RepositoryTable.propTypes = {
  repositories: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default RepositoryTable;
