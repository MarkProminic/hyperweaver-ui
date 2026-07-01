import PropTypes from 'prop-types';
import { useState } from 'react';

import { FormModal } from '../common';

const ACTION_DETAILS = {
  sync: {
    title: 'Force Time Synchronization',
    icon: 'fa-sync-alt',
    buttonClass: 'has-background-primary-dark has-text-primary-light',
    description: 'Force immediate time synchronization with configured NTP servers.',
    warning:
      'This will attempt to synchronize the system clock immediately. The operation may take a few moments to complete.',
  },
  restart: {
    title: 'Restart Time Synchronization Service',
    icon: 'fa-redo',
    buttonClass: 'has-background-warning-dark has-text-warning-light',
    description: 'Restart the time synchronization service to apply configuration changes.',
    warning:
      'The service will be briefly unavailable during restart. Time synchronization will resume automatically.',
  },
  save: {
    title: 'Save NTP Configuration',
    icon: 'fa-save',
    buttonClass: 'has-background-success-dark has-text-success-light',
    description: 'Save the current configuration to the NTP configuration file.',
    warning:
      'This will overwrite the existing configuration. A restart of the time synchronization service may be required to apply changes.',
  },
  'switch-ntp': {
    title: 'Switch to Traditional NTP',
    icon: 'fa-clock',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: 'Switch to traditional Network Time Protocol (NTP) for time synchronization.',
    warning:
      'This operation will disable the current service, install NTP if needed, preserve server configurations where possible, and enable NTP service.',
  },
  'switch-chrony': {
    title: 'Switch to Chrony',
    icon: 'fa-stopwatch',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: 'Switch to modern Chrony daemon for enhanced time synchronization.',
    warning:
      'This operation will disable the current service, install Chrony if needed, preserve server configurations where possible, and enable Chrony service.',
  },
  'switch-ntpsec': {
    title: 'Switch to NTPsec',
    icon: 'fa-shield-alt',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: 'Switch to security-focused NTPsec implementation for enhanced security.',
    warning:
      'This operation will disable the current service, install NTPsec if needed, preserve server configurations where possible, and enable NTPsec service.',
  },
};

const getServiceTypeLabel = serviceType => {
  if (serviceType === 'ntp') {
    return 'NTP';
  }
  if (serviceType === 'chrony') {
    return 'Chrony';
  }
  return serviceType.toUpperCase();
};

const getStatusTagColor = status => {
  if (status === 'available') {
    return 'text-bg-success';
  }
  if (status === 'disabled') {
    return 'text-bg-warning';
  }
  return 'text-bg-danger';
};

const getSubmitVariant = buttonClass => {
  if (buttonClass.includes('warning')) {
    return 'is-warning';
  }
  if (buttonClass.includes('success')) {
    return 'is-success';
  }
  if (buttonClass.includes('primary')) {
    return 'is-primary';
  }
  return 'is-info';
};

const NTPConfirmActionModal = ({ service, action, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await onConfirm();
      if (result && result.success) {
        onClose();
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const getActionDetails = () => {
    if (action === 'timezone') {
      return {
        title: 'Change System Timezone',
        icon: 'fa-clock',
        buttonClass: 'has-background-info-dark has-text-info-light',
        description: `Change the system timezone to "${service?.timezone}".`,
        warning:
          'Timezone changes may require a system reboot for full effect. Some services may continue using the old timezone until restarted.',
      };
    }

    return (
      ACTION_DETAILS[action] || {
        title: 'Confirm Action',
        icon: 'fa-question-circle',
        buttonClass: 'is-info',
        description: `Perform ${action} action.`,
        warning: 'Please confirm this action.',
      }
    );
  };

  const actionDetails = getActionDetails();

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={actionDetails.title}
      icon={`fas ${actionDetails.icon}`}
      submitText={loading ? 'Processing...' : actionDetails.title}
      submitVariant={getSubmitVariant(actionDetails.buttonClass)}
      loading={loading}
    >
      {/* Service Information */}
      {service && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">
              {action === 'timezone' ? 'Timezone Information' : 'Service Information'}
            </h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {action === 'timezone' ? (
                    <>
                      <tr>
                        <td>
                          <strong>Current Timezone</strong>
                        </td>
                        <td className="font-monospace">{service.current || 'Unknown'}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>New Timezone</strong>
                        </td>
                        <td className="font-monospace">{service.timezone || 'Unknown'}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {service.service && (
                        <tr>
                          <td>
                            <strong>Service Type</strong>
                          </td>
                          <td className="font-monospace">{getServiceTypeLabel(service.service)}</td>
                        </tr>
                      )}
                      {service.status && (
                        <tr>
                          <td>
                            <strong>Service Status</strong>
                          </td>
                          <td>
                            <span className={`badge ${getStatusTagColor(service.status)}`}>
                              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      )}
                      {service.config_file && (
                        <tr>
                          <td>
                            <strong>Configuration File</strong>
                          </td>
                          <td className="font-monospace">{service.config_file}</td>
                        </tr>
                      )}
                      {service.timezone && action !== 'timezone' && (
                        <tr>
                          <td>
                            <strong>Current Timezone</strong>
                          </td>
                          <td className="font-monospace">{service.timezone}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action Description */}
      <div
        className={`alert ${action === 'timezone' || action === 'restart' ? 'alert-warning' : 'alert-info'}`}
      >
        <p>
          <strong>Action:</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Action-specific Information */}
      {action === 'sync' && service?.peers && service.peers.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Available Time Servers</h3>
            <div className="small">
              <ul>
                {service.peers.slice(0, 5).map(peer => (
                  <li key={peer.remote} className="font-monospace">
                    {peer.remote}
                    {peer.indicator === '*' && (
                      <span className="badge text-bg-success ms-1">Primary</span>
                    )}
                    {peer.indicator === '+' && (
                      <span className="badge text-bg-info ms-1">Backup</span>
                    )}
                  </li>
                ))}
                {service.peers.length > 5 && (
                  <li className="text-muted">...and {service.peers.length - 5} more servers</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {action === 'save' && service?.config_exists === false && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Configuration File Creation</h3>
            <div className="alert alert-info">
              <p>
                <strong>New Configuration File:</strong> The configuration file does not exist and
                will be created.
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'timezone' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Reboot Recommendation</h3>
            <div className="alert alert-warning">
              <p>
                <strong>System Reboot Recommended:</strong> For the timezone change to take full
                effect across all system services, a system reboot is recommended after this change.
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'restart' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Service Restart Information</h3>
            <div className="alert alert-info">
              <p>
                The time synchronization service will be stopped and restarted. This is required to
                apply configuration changes and may take a few seconds to complete.
              </p>
            </div>
          </div>
        </div>
      )}
    </FormModal>
  );
};

NTPConfirmActionModal.propTypes = {
  service: PropTypes.shape({
    current: PropTypes.string,
    timezone: PropTypes.string,
    service: PropTypes.string,
    status: PropTypes.string,
    config_file: PropTypes.string,
    config_exists: PropTypes.bool,
    peers: PropTypes.arrayOf(
      PropTypes.shape({
        remote: PropTypes.string.isRequired,
        indicator: PropTypes.string,
      })
    ),
  }),
  action: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default NTPConfirmActionModal;
