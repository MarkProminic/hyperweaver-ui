import PropTypes from 'prop-types';
import { useState } from 'react';

const PackageTable = ({
  packages,
  loading,
  onInstall,
  onUninstall,
  onViewDetails,
  isSearchMode,
}) => {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (pkg, action) => {
    const key = `${pkg.name}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'install') {
        await onInstall(pkg);
      } else if (action === 'uninstall') {
        await onUninstall(pkg);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStatusIcon = pkg => {
    if (pkg.installed && pkg.manually_installed) {
      return <i className="fas fa-star text-warning" />;
    }
    if (pkg.installed) {
      return <i className="fas fa-check-circle text-success" />;
    }
    if (pkg.frozen) {
      return <i className="fas fa-snowflake text-info" />;
    }
    return <i className="fas fa-circle text-muted" />;
  };

  const getStatusTag = pkg => {
    if (pkg.installed && pkg.manually_installed) {
      return <span className="badge text-bg-warning">Manual</span>;
    }
    if (pkg.installed) {
      return <span className="badge text-bg-success">Installed</span>;
    }
    if (pkg.frozen) {
      return <span className="badge text-bg-info">Frozen</span>;
    }
    if (isSearchMode) {
      return <span className="badge text-bg-secondary">Available</span>;
    }
    return <span className="badge text-bg-secondary">Not Installed</span>;
  };

  const getAvailableActions = pkg => {
    const actions = [];

    if (pkg.installed) {
      // Package is installed - can uninstall
      if (!pkg.frozen) {
        actions.push({
          key: 'uninstall',
          label: 'Uninstall',
          icon: 'fa-trash',
          class: 'btn-danger',
        });
      }
    } else {
      // Package is not installed - can install
      actions.push({
        key: 'install',
        label: 'Install',
        icon: 'fa-download',
        class: 'btn-success',
      });
    }

    return actions;
  };

  const formatSize = size => {
    if (!size) {
      return 'N/A';
    }

    // Parse size strings like "2.61 MB", "1.2 GB", etc.
    const sizeStr = size.toString();
    if (sizeStr.includes('GB')) {
      return sizeStr;
    }
    if (sizeStr.includes('MB')) {
      return sizeStr;
    }
    if (sizeStr.includes('KB')) {
      return sizeStr;
    }

    // If it's just a number, assume bytes and convert
    const bytes = parseInt(size);
    if (isNaN(bytes)) {
      return size;
    }

    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  if (loading && packages.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading packages...</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-cube fa-2x text-muted" />
        <p className="mt-2 text-muted">
          {isSearchMode ? 'No packages found for your search' : 'No packages found'}
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Package</th>
            <th>Publisher</th>
            <th>Version</th>
            <th>Status</th>
            <th>Size</th>
            <th width="200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg, index) => {
            const availableActions = getAvailableActions(pkg);

            return (
              <tr key={pkg.name || index}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStatusIcon(pkg)}
                    <span className="ms-2">
                      <strong className="font-monospace">{pkg.name}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="badge text-bg-info">{pkg.publisher || 'Unknown'}</span>
                </td>
                <td>
                  <span className="font-monospace small">{pkg.version || 'N/A'}</span>
                </td>
                <td>{getStatusTag(pkg)}</td>
                <td>
                  <span className="small">{formatSize(pkg.size)}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* Action Buttons */}
                    {availableActions.map(action => {
                      const key = `${pkg.name}-${action.key}`;
                      const isLoading = actionLoading[key];

                      return (
                        <button
                          key={action.key}
                          type="button"
                          className={`btn btn-sm ${action.class}`}
                          onClick={() => handleAction(pkg, action.key)}
                          disabled={loading || isLoading}
                          title={action.label}
                        >
                          {isLoading ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <i className={`fas ${action.icon}`} />
                          )}
                        </button>
                      );
                    })}

                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewDetails(pkg)}
                      disabled={loading}
                      title="View Details"
                    >
                      <i className="fas fa-info-circle" />
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

PackageTable.propTypes = {
  packages: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
  onUninstall: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  isSearchMode: PropTypes.bool.isRequired,
};

export default PackageTable;
