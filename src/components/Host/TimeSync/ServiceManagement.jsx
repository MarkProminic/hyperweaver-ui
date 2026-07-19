import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const TimeSyncServiceManagement = ({ availableSystems, loading, syncing, onSwitch }) => {
  const { t } = useTranslation();

  const getSystemInfo = systemKey => {
    const systemData = {
      ntp: {
        name: t('hostTime.timeSyncServiceManagement.ntpName'),
        icon: 'fa-clock',
        description: t('hostTime.timeSyncServiceManagement.ntpDescription'),
        features: [
          t('hostTime.timeSyncServiceManagement.ntpFeature1'),
          t('hostTime.timeSyncServiceManagement.ntpFeature2'),
          t('hostTime.timeSyncServiceManagement.ntpFeature3'),
        ],
      },
      chrony: {
        name: t('hostTime.timeSyncServiceManagement.chronyName'),
        icon: 'fa-stopwatch',
        description: t('hostTime.timeSyncServiceManagement.chronyDescription'),
        features: [
          t('hostTime.timeSyncServiceManagement.chronyFeature1'),
          t('hostTime.timeSyncServiceManagement.chronyFeature2'),
          t('hostTime.timeSyncServiceManagement.chronyFeature3'),
        ],
      },
      ntpsec: {
        name: t('hostTime.timeSyncServiceManagement.ntpsecName'),
        icon: 'fa-shield-alt',
        description: t('hostTime.timeSyncServiceManagement.ntpsecDescription'),
        features: [
          t('hostTime.timeSyncServiceManagement.ntpsecFeature1'),
          t('hostTime.timeSyncServiceManagement.ntpsecFeature2'),
          t('hostTime.timeSyncServiceManagement.ntpsecFeature3'),
        ],
      },
    };
    return systemData[systemKey] || systemData.ntp;
  };

  const getSystemStatus = systemKey => {
    if (!availableSystems?.available) {
      return null;
    }
    return availableSystems.available[systemKey];
  };

  const getSwitchButtonLabel = (isCurrent, systemData, systemInfo) => {
    if (isCurrent) {
      return t('hostTime.timeSyncServiceManagement.buttonCurrentService');
    }
    if (!systemData?.can_switch_to) {
      return t('hostTime.timeSyncServiceManagement.buttonCannotSwitch');
    }
    if (!systemData?.installed) {
      return t('hostTime.timeSyncServiceManagement.buttonInstallSwitch');
    }
    return t('hostTime.timeSyncServiceManagement.buttonSwitchTo', { service: systemInfo.name });
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncServiceManagement.heading')}</h3>

        {/* Available Systems */}
        {availableSystems?.available && (
          <div className="row g-3">
            {Object.keys(availableSystems.available).map(systemKey => {
              const systemData = getSystemStatus(systemKey);
              const systemInfo = getSystemInfo(systemKey);
              const isCurrent = availableSystems.current?.service === systemKey;

              return (
                <div key={systemKey} className="col-lg-4">
                  <div className={`card ${isCurrent ? 'bg-info-subtle' : ''}`}>
                    <div className="card-header">
                      <div className="d-flex align-items-center">
                        <i className={`fas ${systemInfo.icon} me-2`} />
                        {systemInfo.name}
                        {isCurrent && (
                          <span className="badge text-bg-success ms-2">
                            {t('hostTime.timeSyncServiceManagement.badgeCurrent')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <p>{systemInfo.description}</p>
                      <ul className="small">
                        {systemInfo.features.map(feature => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>

                      {systemData && (
                        <div className="mt-3">
                          <div className="d-flex gap-1 flex-wrap">
                            <span
                              className={`badge ${systemData.installed ? 'text-bg-success' : 'text-bg-warning'}`}
                            >
                              {systemData.installed
                                ? t('hostTime.timeSyncServiceManagement.badgeInstalled')
                                : t('hostTime.timeSyncServiceManagement.badgeNotInstalled')}
                            </span>
                            {systemData.installed && (
                              <span
                                className={`badge ${systemData.enabled ? 'text-bg-info' : 'text-bg-secondary'}`}
                              >
                                {systemData.enabled
                                  ? t('hostTime.timeSyncServiceManagement.badgeEnabled')
                                  : t('hostTime.timeSyncServiceManagement.badgeDisabled')}
                              </span>
                            )}
                          </div>
                          {systemData.package_name && (
                            <p className="small text-muted">
                              {t('hostTime.timeSyncServiceManagement.packageLabel', {
                                name: systemData.package_name,
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="card-footer">
                      <button
                        type="button"
                        className={`btn btn-sm w-100 ${isCurrent ? 'btn-success' : 'btn-info'}`}
                        onClick={() => onSwitch(systemKey)}
                        disabled={isCurrent || !systemData?.can_switch_to || loading || syncing}
                      >
                        {syncing ? (
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                        ) : (
                          <i className={`fas ${isCurrent ? 'fa-check' : 'fa-exchange-alt'} me-2`} />
                        )}
                        <span>{getSwitchButtonLabel(isCurrent, systemData, systemInfo)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No systems available fallback */}
        {!availableSystems?.available && !loading && (
          <div className="alert alert-warning">
            <p>
              <strong>{t('hostTime.timeSyncServiceManagement.noSystemsAvailableTitle')}</strong>
              <br />
              {t('hostTime.timeSyncServiceManagement.noSystemsAvailableMessage')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

TimeSyncServiceManagement.propTypes = {
  availableSystems: PropTypes.shape({
    available: PropTypes.object,
    current: PropTypes.shape({
      service: PropTypes.string,
    }),
  }),
  loading: PropTypes.bool,
  syncing: PropTypes.bool,
  onSwitch: PropTypes.func.isRequired,
};

export default TimeSyncServiceManagement;
