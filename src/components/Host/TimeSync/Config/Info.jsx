import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ConfigInfo = ({ configInfo }) => {
  const { t } = useTranslation();

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
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncConfigInfo.heading')}</h3>
        <div className="table-responsive">
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncConfigInfo.serviceType')}</strong>
                </td>
                <td className="font-monospace">{getServiceType(configInfo.service)}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncConfigInfo.configurationFile')}</strong>
                </td>
                <td className="font-monospace">{configInfo.config_file}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t('hostTime.timeSyncConfigInfo.fileExists')}</strong>
                </td>
                <td>
                  <span
                    className={`badge ${configInfo.config_exists ? 'text-bg-success' : 'text-bg-warning'}`}
                  >
                    {configInfo.config_exists
                      ? t('hostTime.timeSyncConfigInfo.yes')
                      : t('hostTime.timeSyncConfigInfo.no')}
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
