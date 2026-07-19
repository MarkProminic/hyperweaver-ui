import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ServerHelpPanel = ({ useExistingApiKey }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="fs-6 fw-bold mb-3">{t('host.serverHelpPanel.title')}</h3>
      <div className="small">
        <p>
          <strong>{t('host.serverHelpPanel.stepsLabel')}</strong>
        </p>
        <ol>
          <li>{t('host.serverHelpPanel.step1')}</li>
          <li>{t('host.serverHelpPanel.step2')}</li>
          <li>{t('host.serverHelpPanel.step3')}</li>
          <li>{t(`host.serverHelpPanel.step4.${useExistingApiKey ? 'existing' : 'bootstrap'}`)}</li>
          <li>{t('host.serverHelpPanel.step5')}</li>
        </ol>

        <p className="mt-4">
          <strong>{t('host.serverHelpPanel.requirementsLabel')}</strong>
        </p>
        <ul>
          <li>{t('host.serverHelpPanel.req1')}</li>
          {!useExistingApiKey && <li>{t('host.serverHelpPanel.req2')}</li>}
          <li>{t('host.serverHelpPanel.req3')}</li>
          {useExistingApiKey && <li>{t('host.serverHelpPanel.req4')}</li>}
        </ul>

        <p className="mt-4">
          <strong>{t('host.serverHelpPanel.securityLabel')}</strong>
        </p>
        <ul>
          <li>{t('host.serverHelpPanel.sec1')}</li>
          {!useExistingApiKey && <li>{t('host.serverHelpPanel.sec2')}</li>}
          <li>{t('host.serverHelpPanel.sec3')}</li>
        </ul>
      </div>
    </div>
  );
};

ServerHelpPanel.propTypes = {
  useExistingApiKey: PropTypes.bool.isRequired,
};

export default ServerHelpPanel;
