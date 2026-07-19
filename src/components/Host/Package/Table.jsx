import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PackageTable = ({
  packages,
  loading,
  onInstall,
  onUninstall,
  onViewDetails,
  isSearchMode,
}) => {
  const { t } = useTranslation();
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
      return <span className="badge text-bg-warning">{t('host.packageTable.manual')}</span>;
    }
    if (pkg.installed) {
      return <span className="badge text-bg-success">{t('host.packageTable.installed')}</span>;
    }
    if (pkg.frozen) {
      return <span className="badge text-bg-info">{t('host.packageTable.frozen')}</span>;
    }
    if (isSearchMode) {
      return <span className="badge text-bg-secondary">{t('host.packageTable.available')}</span>;
    }
    return <span className="badge text-bg-secondary">{t('host.packageTable.notInstalled')}</span>;
  };

  const getAvailableActions = pkg => {
    const actions = [];

    if (pkg.installed) {
      // Package is installed - can uninstall
      if (!pkg.frozen) {
        actions.push({
          key: 'uninstall',
          label: t('host.packageTable.uninstall'),
          icon: 'fa-trash',
          class: 'btn-danger',
        });
      }
    } else {
      // Package is not installed - can install
      actions.push({
        key: 'install',
        label: t('host.packageTable.install'),
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
        <p className="mt-2">{t('host.packageTable.loadingPackages')}</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-cube fa-2x text-muted" />
        <p className="mt-2 text-muted">
          {isSearchMode
            ? t('host.packageTable.noPackagesFoundForSearch')
            : t('host.packageTable.noPackagesFound')}
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>{t('host.packageTable.package')}</th>
            <th>{t('host.packageTable.publisher')}</th>
            <th>{t('host.packageTable.version')}</th>
            <th>{t('host.packageTable.status')}</th>
            <th>{t('host.packageTable.size')}</th>
            <th width="200">{t('host.packageTable.actions')}</th>
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
                  <span className="badge text-bg-info">
                    {pkg.publisher || t('host.packageTable.unknown')}
                  </span>
                </td>
                <td>
                  <span className="font-monospace small">
                    {pkg.version || t('host.packageTable.notAvailable')}
                  </span>
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
                      title={t('host.packageTable.viewDetails')}
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
