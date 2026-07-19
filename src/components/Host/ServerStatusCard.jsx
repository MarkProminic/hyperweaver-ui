import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ServerStatusCard = ({ testResult, useExistingApiKey }) => {
  const { t } = useTranslation();

  if (!testResult) {
    return null;
  }

  return (
    <div className="mt-3">
      <h3 className="fs-6 fw-bold mb-2">{t('host.serverStatusCard.title')}</h3>
      {testResult === 'success' && (
        <div className="alert alert-success">
          <p>
            <strong>{t('host.serverStatusCard.successTitle')}</strong>
          </p>
          <p>
            {t('host.serverStatusCard.successMsg', {
              mode: useExistingApiKey ? 'setup' : 'bootstrap',
            })}
          </p>
        </div>
      )}
      {testResult === 'error' && (
        <div className="alert alert-danger">
          <p>
            <strong>{t('host.serverStatusCard.errorTitle')}</strong>
          </p>
          <p>{t('host.serverStatusCard.errorMsg')}</p>
        </div>
      )}
      {testResult === 'warning' && (
        <div className="alert alert-warning">
          <p>
            <strong>{t('host.serverStatusCard.warningTitle')}</strong>
          </p>
          <p>{t('host.serverStatusCard.warningMsg')}</p>
        </div>
      )}
    </div>
  );
};

ServerStatusCard.propTypes = {
  testResult: PropTypes.string,
  useExistingApiKey: PropTypes.bool.isRequired,
};

export default ServerStatusCard;
