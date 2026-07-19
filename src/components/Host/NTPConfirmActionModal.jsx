import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../common';

const getActionDetails = t => ({
  sync: {
    title: t('host.ntpConfirmActionModal.syncTitle'),
    icon: 'fa-sync-alt',
    buttonClass: 'has-background-primary-dark has-text-primary-light',
    description: t('host.ntpConfirmActionModal.syncDescription'),
    warning: t('host.ntpConfirmActionModal.syncWarning'),
  },
  restart: {
    title: t('host.ntpConfirmActionModal.restartTitle'),
    icon: 'fa-redo',
    buttonClass: 'has-background-warning-dark has-text-warning-light',
    description: t('host.ntpConfirmActionModal.restartDescription'),
    warning: t('host.ntpConfirmActionModal.restartWarning'),
  },
  save: {
    title: t('host.ntpConfirmActionModal.saveTitle'),
    icon: 'fa-save',
    buttonClass: 'has-background-success-dark has-text-success-light',
    description: t('host.ntpConfirmActionModal.saveDescription'),
    warning: t('host.ntpConfirmActionModal.saveWarning'),
  },
  'switch-ntp': {
    title: t('host.ntpConfirmActionModal.switchNtpTitle'),
    icon: 'fa-clock',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: t('host.ntpConfirmActionModal.switchNtpDescription'),
    warning: t('host.ntpConfirmActionModal.switchNtpWarning'),
  },
  'switch-chrony': {
    title: t('host.ntpConfirmActionModal.switchChronyTitle'),
    icon: 'fa-stopwatch',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: t('host.ntpConfirmActionModal.switchChronyDescription'),
    warning: t('host.ntpConfirmActionModal.switchChronyWarning'),
  },
  'switch-ntpsec': {
    title: t('host.ntpConfirmActionModal.switchNtpsecTitle'),
    icon: 'fa-shield-alt',
    buttonClass: 'has-background-info-dark has-text-info-light',
    description: t('host.ntpConfirmActionModal.switchNtpsecDescription'),
    warning: t('host.ntpConfirmActionModal.switchNtpsecWarning'),
  },
});

const getServiceTypeLabel = (serviceType, t) => {
  if (serviceType === 'ntp') {
    return t('host.ntpConfirmActionModal.ntp');
  }
  if (serviceType === 'chrony') {
    return t('host.ntpConfirmActionModal.chrony');
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
  const { t } = useTranslation();
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

  const getActionDetailsInternal = () => {
    if (action === 'timezone') {
      return {
        title: t('host.ntpConfirmActionModal.changeTimezoneTitle'),
        icon: 'fa-clock',
        buttonClass: 'has-background-info-dark has-text-info-light',
        description: t('host.ntpConfirmActionModal.changeTimezoneDescription', {
          timezone: service?.timezone,
        }),
        warning: t('host.ntpConfirmActionModal.changeTimezoneWarning'),
      };
    }

    const actionDetails = getActionDetails(t);
    return (
      actionDetails[action] || {
        title: t('host.ntpConfirmActionModal.confirmAction'),
        icon: 'fa-question-circle',
        buttonClass: 'is-info',
        description: t('host.ntpConfirmActionModal.performActionDescription', { action }),
        warning: t('host.ntpConfirmActionModal.confirmWarning'),
      }
    );
  };

  const actionDetails = getActionDetailsInternal();

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
              {action === 'timezone'
                ? t('host.ntpConfirmActionModal.timezoneInfo')
                : t('host.ntpConfirmActionModal.serviceInfo')}
            </h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {action === 'timezone' ? (
                    <>
                      <tr>
                        <td>
                          <strong>{t('host.ntpConfirmActionModal.currentTimezone')}</strong>
                        </td>
                        <td className="font-monospace">
                          {service.current || t('host.ntpConfirmActionModal.unknown')}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>{t('host.ntpConfirmActionModal.newTimezone')}</strong>
                        </td>
                        <td className="font-monospace">
                          {service.timezone || t('host.ntpConfirmActionModal.unknown')}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {service.service && (
                        <tr>
                          <td>
                            <strong>{t('host.ntpConfirmActionModal.serviceType')}</strong>
                          </td>
                          <td className="font-monospace">
                            {getServiceTypeLabel(service.service, t)}
                          </td>
                        </tr>
                      )}
                      {service.status && (
                        <tr>
                          <td>
                            <strong>{t('host.ntpConfirmActionModal.serviceStatus')}</strong>
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
                            <strong>{t('host.ntpConfirmActionModal.configFile')}</strong>
                          </td>
                          <td className="font-monospace">{service.config_file}</td>
                        </tr>
                      )}
                      {service.timezone && action !== 'timezone' && (
                        <tr>
                          <td>
                            <strong>{t('host.ntpConfirmActionModal.currentTimezone')}</strong>
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
          <strong>{t('host.ntpConfirmActionModal.action')}:</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Action-specific Information */}
      {action === 'sync' && service?.peers && service.peers.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.ntpConfirmActionModal.availableTimeServers')}</h3>
            <div className="small">
              <ul>
                {service.peers.slice(0, 5).map(peer => (
                  <li key={peer.remote} className="font-monospace">
                    {peer.remote}
                    {peer.indicator === '*' && (
                      <span className="badge text-bg-success ms-1">
                        {t('host.ntpConfirmActionModal.primary')}
                      </span>
                    )}
                    {peer.indicator === '+' && (
                      <span className="badge text-bg-info ms-1">
                        {t('host.ntpConfirmActionModal.backup')}
                      </span>
                    )}
                  </li>
                ))}
                {service.peers.length > 5 && (
                  <li className="text-muted">
                    {t('host.ntpConfirmActionModal.moreServers', {
                      count: service.peers.length - 5,
                    })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {action === 'save' && service?.config_exists === false && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.ntpConfirmActionModal.configFileCreation')}</h3>
            <div className="alert alert-info">
              <p>
                <strong>{t('host.ntpConfirmActionModal.newConfigFile')}:</strong>{' '}
                {t('host.ntpConfirmActionModal.configWillBeCreated')}
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'timezone' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.ntpConfirmActionModal.rebootRecommendation')}</h3>
            <div className="alert alert-warning">
              <p>
                <strong>{t('host.ntpConfirmActionModal.systemRebootRecommended')}:</strong>{' '}
                {t('host.ntpConfirmActionModal.rebootText')}
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'restart' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.ntpConfirmActionModal.serviceRestartInfo')}</h3>
            <div className="alert alert-info">
              <p>{t('host.ntpConfirmActionModal.restartWillOccur')}</p>
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
