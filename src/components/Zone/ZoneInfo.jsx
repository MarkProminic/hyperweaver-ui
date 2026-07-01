import PropTypes from 'prop-types';

const ZoneInfo = ({ zoneDetails, monitoringHealth, getZoneStatus, selectedZone }) => {
  if (!zoneDetails || !zoneDetails.zone_info) {
    return null;
  }

  const { zone_info, configuration } = zoneDetails;

  const getHealthClass = status => {
    if (status === 'healthy') {
      return 'text-success';
    }
    if (status === 'warning') {
      return 'text-warning';
    }
    return 'text-danger';
  };

  const renderConfigurationRows = () => {
    if (!configuration) {
      return null;
    }

    return (
      <>
        <tr>
          <td className="px-3 py-2">
            <strong>Zone Name</strong>
          </td>
          <td className="px-3 py-2">
            <code className="small">{configuration.zonename}</code>
          </td>
        </tr>
        <tr>
          <td className="px-3 py-2">
            <strong>Zone Path</strong>
          </td>
          <td className="px-3 py-2">
            <code className="small">{configuration.zonepath}</code>
          </td>
        </tr>
        {configuration.bootargs && (
          <tr>
            <td className="px-3 py-2">
              <strong>Boot Args</strong>
            </td>
            <td className="px-3 py-2">
              <code className="small">{configuration.bootargs || 'None'}</code>
            </td>
          </tr>
        )}
        {configuration.hostid && (
          <tr>
            <td className="px-3 py-2">
              <strong>Host ID</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.hostid || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration.pool && (
          <tr>
            <td className="px-3 py-2">
              <strong>Pool</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.pool || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration['scheduling-class'] && (
          <tr>
            <td className="px-3 py-2">
              <strong>Scheduling Class</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">
                {configuration['scheduling-class'] || 'None'}
              </span>
            </td>
          </tr>
        )}
        {configuration.limitpriv && (
          <tr>
            <td className="px-3 py-2">
              <strong>Limit Privileges</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.limitpriv || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration['fs-allowed'] && (
          <tr>
            <td className="px-3 py-2">
              <strong>FS Allowed</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">
                {configuration['fs-allowed'] || 'None'}
              </span>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-info-circle me-2" />
          Zone Information
        </h4>
        <div className="table-responsive">
          <table className="table table-striped small">
            <tbody>
              <tr>
                <td className="px-3 py-2">
                  <strong>System Status</strong>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`fw-semibold ${getZoneStatus(selectedZone) === 'running' ? 'text-success' : 'text-danger'}`}
                  >
                    {getZoneStatus(selectedZone) === 'running' ? 'Running' : 'Stopped'}
                  </span>
                </td>
              </tr>
              {Object.keys(monitoringHealth).length > 0 && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Host Health</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`fw-semibold ${getHealthClass(monitoringHealth.status)}`}>
                      {monitoringHealth.status
                        ? monitoringHealth.status.charAt(0).toUpperCase() +
                          monitoringHealth.status.slice(1)
                        : 'Unknown'}
                    </span>
                    {(monitoringHealth.networkErrors > 0 || monitoringHealth.storageErrors > 0) && (
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {monitoringHealth.networkErrors > 0 && (
                          <span className="badge text-bg-warning">
                            Net Errors: {monitoringHealth.networkErrors}
                          </span>
                        )}
                        {monitoringHealth.storageErrors > 0 && (
                          <span className="badge text-bg-warning">
                            Storage Errors: {monitoringHealth.storageErrors}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-2">
                  <strong>Last Seen</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted">
                    {zone_info.last_seen ? new Date(zone_info.last_seen).toLocaleString() : 'N/A'}
                  </span>
                </td>
              </tr>
              {(zone_info.is_orphaned || zone_info.auto_discovered) && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Flags</strong>
                  </td>
                  <td className="px-3 py-2">
                    <div className="d-flex flex-wrap gap-1">
                      {zone_info.is_orphaned && (
                        <span className="badge text-bg-warning">Orphaned</span>
                      )}
                      {zone_info.auto_discovered && (
                        <span className="badge text-bg-info">Auto-discovered</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {renderConfigurationRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

ZoneInfo.propTypes = {
  zoneDetails: PropTypes.shape({
    zone_info: PropTypes.shape({
      last_seen: PropTypes.string,
      is_orphaned: PropTypes.bool,
      auto_discovered: PropTypes.bool,
    }),
    configuration: PropTypes.shape({
      zonename: PropTypes.string,
      zonepath: PropTypes.string,
      bootargs: PropTypes.string,
      hostid: PropTypes.string,
      pool: PropTypes.string,
      'scheduling-class': PropTypes.string,
      limitpriv: PropTypes.string,
      'fs-allowed': PropTypes.string,
    }),
  }),
  monitoringHealth: PropTypes.shape({
    status: PropTypes.string,
    networkErrors: PropTypes.number,
    storageErrors: PropTypes.number,
  }),
  getZoneStatus: PropTypes.func.isRequired,
  selectedZone: PropTypes.string,
};

export default ZoneInfo;
