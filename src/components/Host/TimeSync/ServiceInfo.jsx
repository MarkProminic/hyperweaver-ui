import PropTypes from 'prop-types';

const TimeSyncServiceInfo = ({ statusInfo }) => {
  const getServiceStatusBadge = (service, status, available) => {
    if (service === 'none' || !available) {
      return <span className="badge text-bg-secondary">Not Available</span>;
    }

    let serviceLabel = service.toUpperCase();
    if (service === 'ntp') {
      serviceLabel = 'NTP';
    } else if (service === 'chrony') {
      serviceLabel = 'Chrony';
    }

    switch (status) {
      case 'available':
        return <span className="badge text-bg-success">{serviceLabel} - Online</span>;
      case 'disabled':
        return <span className="badge text-bg-warning">{serviceLabel} - Disabled</span>;
      case 'unavailable':
        return <span className="badge text-bg-danger">{serviceLabel} - Unavailable</span>;
      default:
        return <span className="badge text-bg-secondary">{serviceLabel} - Unknown</span>;
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">Service Information</h3>
        <div className="table-responsive">
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <strong>Service Type</strong>
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
                  <strong>Current Timezone</strong>
                </td>
                <td className="font-monospace">{statusInfo.timezone || 'Unknown'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Last Status Check</strong>
                </td>
                <td>
                  {statusInfo.last_checked
                    ? new Date(statusInfo.last_checked).toLocaleString()
                    : 'Unknown'}
                </td>
              </tr>
              {statusInfo.service_details && (
                <>
                  <tr>
                    <td>
                      <strong>Service State</strong>
                    </td>
                    <td className="font-monospace">
                      {statusInfo.service_details.state || 'Unknown'}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Service FMRI</strong>
                    </td>
                    <td className="font-monospace">
                      {statusInfo.service_details.fmri || 'Unknown'}
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
              <strong>No Time Synchronization Service Available</strong>
              <br />
              Neither NTP nor Chrony services are available on this system. You may need to install
              and configure a time synchronization service.
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
