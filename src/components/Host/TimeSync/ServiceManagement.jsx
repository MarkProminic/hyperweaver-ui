import PropTypes from 'prop-types';

const TimeSyncServiceManagement = ({ availableSystems, loading, syncing, onSwitch }) => {
  const getSystemInfo = systemKey => {
    const systemData = {
      ntp: {
        name: 'Traditional NTP',
        icon: 'fa-clock',
        description: 'Network Time Protocol - Traditional UNIX time synchronization service.',
        features: [
          'Mature and widely supported',
          'Standard on most UNIX systems',
          'Uses /etc/inet/ntp.conf',
        ],
      },
      chrony: {
        name: 'Chrony',
        icon: 'fa-stopwatch',
        description: 'Modern time synchronization daemon with enhanced features.',
        features: [
          'Better for intermittent connections',
          'Faster synchronization',
          'Uses /etc/inet/chrony.conf',
        ],
      },
      ntpsec: {
        name: 'NTPsec',
        icon: 'fa-shield-alt',
        description: 'Security-focused NTP implementation with enhanced security features.',
        features: [
          'Enhanced security and code quality',
          'Backward compatible with NTP',
          'Active security maintenance',
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
      return 'Current Service';
    }
    if (!systemData?.can_switch_to) {
      return 'Cannot Switch';
    }
    if (!systemData?.installed) {
      return 'Install & Switch';
    }
    return `Switch to ${systemInfo.name}`;
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">Time Synchronization Service Management</h3>

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
                        {isCurrent && <span className="badge text-bg-success ms-2">Current</span>}
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
                              {systemData.installed ? 'Installed' : 'Not Installed'}
                            </span>
                            {systemData.installed && (
                              <span
                                className={`badge ${systemData.enabled ? 'text-bg-info' : 'text-bg-secondary'}`}
                              >
                                {systemData.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            )}
                          </div>
                          {systemData.package_name && (
                            <p className="small text-muted">Package: {systemData.package_name}</p>
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
              <strong>No Time Synchronization Systems Available</strong>
              <br />
              Unable to detect available time synchronization systems. The system may need package
              installation or configuration.
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
