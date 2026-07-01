import PropTypes from 'prop-types';

const ConfigInfo = ({ configInfo }) => {
  if (!configInfo) {
    return null;
  }

  const getServiceType = service => {
    if (service === 'ntp') {
      return 'NTP';
    }
    if (service === 'chrony') {
      return 'Chrony';
    }
    return 'Auto-detect';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">Configuration File Information</h3>
        <div className="table-responsive">
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <strong>Service Type</strong>
                </td>
                <td className="font-monospace">{getServiceType(configInfo.service)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Configuration File</strong>
                </td>
                <td className="font-monospace">{configInfo.config_file}</td>
              </tr>
              <tr>
                <td>
                  <strong>File Exists</strong>
                </td>
                <td>
                  <span
                    className={`badge ${configInfo.config_exists ? 'text-bg-success' : 'text-bg-warning'}`}
                  >
                    {configInfo.config_exists ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

ConfigInfo.propTypes = {
  configInfo: PropTypes.shape({
    service: PropTypes.string,
    config_file: PropTypes.string,
    config_exists: PropTypes.bool,
  }),
};

export default ConfigInfo;
