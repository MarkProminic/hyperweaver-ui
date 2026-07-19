import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const TimeSyncServiceInfo = ({ statusInfo }) => {
  const { t } = useTranslation();

  const getServiceStatusBadge = (service, status, available) => {
    if (service === 'none' || !available) {
      return (
        <span className="badge text-bg-secondary">
          {t('hostTime.timeSyncServiceInfo.notAvailable')}
        </span>
      );
    }

    let serviceLabel = service.toUpperCase();
    if (service === 'ntp') {
      serviceLabel = 'NTP';
    } else if (service === 'chrony') {
      serviceLabel = 'Chrony';
    }

    switch (status) {
      case 'available':
        return (
          <span className="badge text-bg-success">
            {t('hostTime.timeSyncServiceInfo.statusOnline', { service: serviceLabel })}
          </span>
        );
      case 'disabled':
        return (
          <span className="badge text-bg-warning">
            {t('hostTime.timeSyncServiceInfo.statusDisabled', { service: serviceLabel })}
          </span>
        );
      case 'unavailable':
        return (
          <span className="badge text-bg-danger">
            {t('hostTime.timeSyncServiceInfo.statusUnavailable', { service: serviceLabel })}
          </span>
        );
      default:
        return (
          <span className="badge text-bg-secondary">
            {t('hostTime.timeSyncServiceInfo.statusUnknown', { service: serviceLabel })}
          </span>
        );
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncServiceInfo.heading')}</h3>
        <div className="table-responsive">
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncServiceInfo.serviceType')}</strong>
                </td>
                <td>
                  {getServiceStatusBadge(
                    statusInfo.service,
                    statusInfo.status,
                    statusInfo.available
                  )}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncServiceInfo.currentTimezone')}</strong>
                </td>
                <td className="font-monospace">
                  {statusInfo.timezone || t('hostTime.timeSyncServiceInfo.unknown')}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncServiceInfo.lastStatusCheck')}</strong>
                </td>
                <td>
                  {statusInfo.last_checked
                    ? new Date(statusInfo.last_checked).toLocaleString()
                    : t('hostTime.timeSyncServiceInfo.unknown')}
                </td>
              </tr>
              {statusInfo.service_details && (
                <>
                  <tr>
                    <td>
                      <strong>{t('hostTime.timeSyncServiceInfo.serviceState')}</strong>
                    </td>
                    <td className="font-monospace">
                      {statusInfo.service_details.state ||
                        t('hostTime.timeSyncServiceInfo.unknown')}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t('hostTime.timeSyncServiceInfo.serviceFmri')}</strong>
                    </td>
                    <td className="font-monospace">
                      {statusInfo.service_details.fmri || t('hostTime.timeSyncServiceInfo.unknown')}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {!statusInfo.available && (
          <div className="alert alert-warning">
            <p>
              <strong>{t('hostTime.timeSyncServiceInfo.noServiceAvailableTitle')}</strong>
              <br />
              {t('hostTime.timeSyncServiceInfo.noServiceAvailableMessage')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

TimeSyncServiceInfo.propTypes = {
  statusInfo: PropTypes.shape({
    service: PropTypes.string,
    status: PropTypes.string,
    available: PropTypes.bool,
    timezone: PropTypes.string,
    last_checked: PropTypes.string,
    service_details: PropTypes.shape({
      state: PropTypes.string,
      fmri: PropTypes.string,
    }),
  }).isRequired,
};

export default TimeSyncServiceInfo;
