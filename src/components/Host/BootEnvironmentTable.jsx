import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BootEnvironmentTable = ({
  bootEnvironments,
  loading,
  onActivate,
  onMount,
  onUnmount,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (be, action) => {
    const key = `${be.name}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'activate') {
        await onActivate(be);
      } else if (action === 'mount') {
        await onMount(be);
      } else if (action === 'unmount') {
        await onUnmount(be);
      } else if (action === 'delete') {
        await onDelete(be);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getActiveStatusBadge = be => {
    if (be.is_active_now && be.is_active_on_reboot) {
      return <span className="badge text-bg-success">NR</span>;
    }
    if (be.is_active_now) {
      return <span className="badge text-bg-success">N</span>;
    }
    if (be.is_active_on_reboot) {
      return <span className="badge text-bg-info">R</span>;
    }
    return <span className="badge text-bg-secondary">-</span>;
  };

  const getActiveIcon = be => {
    if (be.is_active_now && be.is_active_on_reboot) {
      return <i className="fas fa-check-double text-success" />;
    }
    if (be.is_active_now) {
      return <i className="fas fa-check-circle text-success" />;
    }
    if (be.is_active_on_reboot) {
      return <i className="fas fa-clock text-info" />;
    }
    return <i className="fas fa-circle text-muted" />;
  };

  const getPolicyTag = policy => {
    switch (policy?.toLowerCase()) {
      case 'static':
        return (
          <span className="badge text-bg-info">{t('host.bootEnvironmentTable.policyStatic')}</span>
        );
      case 'dynamic':
        return (
          <span className="badge text-bg-warning">
            {t('host.bootEnvironmentTable.policyDynamic')}
          </span>
        );
      default:
        return (
          <span className="badge text-bg-secondary">
            {policy || t('host.bootEnvironmentTable.unknown')}
          </span>
        );
    }
  };

  const getAvailableActions = be => {
    const actions = [];

    // Can't activate the currently active BE
    if (!be.is_active_on_reboot) {
      actions.push({
        key: 'activate',
        label: t('host.bootEnvironmentTable.labelActivate'),
        icon: 'fa-power-off',
        class: 'btn-success',
      });
    }

    // Mount/Unmount actions based on current state
    if (be.mountpoint === '-' || !be.mountpoint) {
      actions.push({
        key: 'mount',
        label: t('host.bootEnvironmentTable.labelMount'),
        icon: 'fa-folder-open',
        class: 'btn-info',
      });
    } else {
      actions.push({
        key: 'unmount',
        label: t('host.bootEnvironmentTable.labelUnmount'),
        icon: 'fa-folder',
        class: 'btn-warning',
      });
    }

    // Can't delete the currently active BE
    if (!be.is_active_now && !be.is_active_on_reboot) {
      actions.push({
        key: 'delete',
        label: t('host.bootEnvironmentTable.labelDelete'),
        icon: 'fa-trash',
        class: 'btn-danger',
      });
    }

    return actions;
  };

  const formatDate = dateStr => {
    if (!dateStr) {
      return 'N/A';
    }
    try {
      // Handle various date formats from OmniOS
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try parsing as YYYY-MM-DD HH:MM format
        const parts = dateStr.match(/(?:\d{4})-(?:\d{2})-(?:\d{2}) (?:\d{2}):(?:\d{2})/);
        if (parts) {
          return parts[0];
        }
        return dateStr; // Return as-is if we can't parse it
      }
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading && bootEnvironments.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.bootEnvironmentTable.loading')}</p>
      </div>
    );
  }

  if (bootEnvironments.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-layer-group fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.bootEnvironmentTable.empty')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-sm">
        <thead>
          <tr>
            <th>{t('host.bootEnvironmentTable.bootEnv')}</th>
            <th>{t('host.bootEnvironmentTable.activeStatus')}</th>
            <th>{t('host.bootEnvironmentTable.mountpoint')}</th>
            <th>{t('host.bootEnvironmentTable.spaceUsed')}</th>
            <th>{t('host.bootEnvironmentTable.policy')}</th>
            <th>{t('host.bootEnvironmentTable.created')}</th>
            <th width="200">{t('host.bootEnvironmentTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {bootEnvironments.map((be, index) => {
            const availableActions = getAvailableActions(be);

            return (
              <tr key={be.name || index}>
                <td>
                  <div className="d-flex align-items-center">
                    {getActiveIcon(be)}
                    <span className="ms-2">
                      <strong className="font-monospace">{be.name}</strong>
                      {be.is_temporary && (
                        <span className="badge text-bg-warning ms-2">
                          {t('host.bootEnvironmentTable.temporary')}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    {getActiveStatusBadge(be)}
                    <span className="ms-2 small">
                      {be.is_active_now &&
                        be.is_active_on_reboot &&
                        t('host.bootEnvironmentTable.activeReboot')}
                      {be.is_active_now &&
                        !be.is_active_on_reboot &&
                        t('host.bootEnvironmentTable.activeNow')}
                      {!be.is_active_now &&
                        be.is_active_on_reboot &&
                        t('host.bootEnvironmentTable.activeOnReboot')}
                      {!be.is_active_now &&
                        !be.is_active_on_reboot &&
                        t('host.bootEnvironmentTable.inactive')}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-monospace small">
                    {be.mountpoint === '-'
                      ? t('host.bootEnvironmentTable.notMounted')
                      : be.mountpoint}
                  </span>
                </td>
                <td>
                  <span className="small">
                    {be.space || t('host.bootEnvironmentTable.notAvailable')}
                  </span>
                </td>
                <td>{getPolicyTag(be.policy)}</td>
                <td>
                  <span className="small">{formatDate(be.created)}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* Action Buttons */}
                    {availableActions.map(action => {
                      const key = `${be.name}-${action.key}`;
                      const isLoading = actionLoading[key];

                      return (
                        <button
                          type="button"
                          key={action.key}
                          className={`btn btn-sm ${action.class}`}
                          onClick={() => handleAction(be, action.key)}
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

BootEnvironmentTable.propTypes = {
  bootEnvironments: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onActivate: PropTypes.func.isRequired,
  onMount: PropTypes.func.isRequired,
  onUnmount: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default BootEnvironmentTable;
