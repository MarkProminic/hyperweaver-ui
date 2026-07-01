import PropTypes from 'prop-types';
import { useState } from 'react';

const ServiceTable = ({ services, loading, onAction, onViewDetails, onViewProperties }) => {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (service, action) => {
    const key = `${service.fmri}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onAction(service.fmri, action);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStateIcon = state => {
    switch (state.toLowerCase()) {
      case 'online':
        return <i className="fas fa-check-circle text-success" />;
      case 'disabled':
        return <i className="fas fa-circle text-muted" />;
      case 'offline':
        return <i className="fas fa-times-circle text-danger" />;
      case 'legacy_run':
        return <i className="fas fa-legacy text-info" />;
      case 'maintenance':
        return <i className="fas fa-exclamation-triangle text-warning" />;
      default:
        return <i className="fas fa-question-circle text-muted" />;
    }
  };

  const getStateTag = state => {
    switch (state.toLowerCase()) {
      case 'online':
        return <span className="badge text-bg-success">{state}</span>;
      case 'disabled':
        return <span className="badge text-bg-secondary">{state}</span>;
      case 'offline':
        return <span className="badge text-bg-danger">{state}</span>;
      case 'legacy_run':
        return <span className="badge text-bg-info">{state}</span>;
      case 'maintenance':
        return <span className="badge text-bg-warning">{state}</span>;
      default:
        return <span className="badge text-bg-secondary">{state}</span>;
    }
  };

  const getAvailableActions = state => {
    const lowerState = state.toLowerCase();
    const actions = [];

    if (lowerState === 'disabled') {
      actions.push({
        key: 'enable',
        label: 'Enable',
        icon: 'fa-play',
        class: 'btn-success',
      });
    } else if (lowerState === 'online') {
      actions.push({
        key: 'disable',
        label: 'Disable',
        icon: 'fa-stop',
        class: 'btn-warning',
      });
      actions.push({
        key: 'restart',
        label: 'Restart',
        icon: 'fa-redo',
        class: 'btn-info',
      });
    }

    // Refresh is available for most states
    if (!['legacy_run'].includes(lowerState)) {
      actions.push({
        key: 'refresh',
        label: 'Refresh',
        icon: 'fa-sync',
        class: 'btn-light',
      });
    }

    return actions;
  };

  const getServiceName = fmri => {
    // Extract service name from FMRI
    if (fmri.startsWith('svc:/')) {
      const parts = fmri.split('/');
      return parts[parts.length - 1] || fmri;
    } else if (fmri.startsWith('lrc:/')) {
      const parts = fmri.split('/');
      return parts[parts.length - 1] || fmri;
    }
    return fmri;
  };

  if (loading && services.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading services...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-cogs fa-2x text-muted" />
        <p className="mt-2 text-muted">No services found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Service</th>
            <th>FMRI</th>
            <th>State</th>
            <th>Start Time</th>
            <th width="280">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service, index) => {
            const availableActions = getAvailableActions(service.state);

            return (
              <tr key={service.fmri || index}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {getStateIcon(service.state)}
                    <span>
                      <strong>{getServiceName(service.fmri)}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-monospace small" title={service.fmri}>
                    {service.fmri}
                  </span>
                </td>
                <td>{getStateTag(service.state)}</td>
                <td>
                  <span className="small">{service.stime || 'N/A'}</span>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    {/* Action Buttons */}
                    {availableActions.map(action => {
                      const key = `${service.fmri}-${action.key}`;
                      const isLoading = actionLoading[key];

                      return (
                        <button
                          type="button"
                          key={action.key}
                          className={`btn btn-sm ${action.class}`}
                          onClick={() => handleAction(service, action.key)}
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

                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewDetails(service)}
                      disabled={loading}
                      title="View Details"
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* View Properties Button - only for non-legacy services */}
                    {!service.fmri.startsWith('lrc:') && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => onViewProperties(service)}
                        disabled={loading}
                        title="View Properties"
                      >
                        <i className="fas fa-list" />
                      </button>
                    )}
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

ServiceTable.propTypes = {
  services: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onViewProperties: PropTypes.func.isRequired,
};
export default ServiceTable;
