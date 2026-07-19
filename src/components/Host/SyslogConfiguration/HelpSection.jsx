import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { getServiceType } from './syslogUtils';

/**
 * Syslog configuration help section with service-specific examples and notes
 */
const HelpSection = ({ config }) => {
  const { t } = useTranslation();
  const serviceType = getServiceType(config);

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-question-circle me-2" />
          <span>{t('hostTime.syslogHelpSection.heading', { service: serviceType.display })}</span>
        </h4>

        <div className="small">
          <div className="row g-3">
            <div className="col">
              <p>
                <strong>{t('hostTime.syslogHelpSection.commonExamplesLabel')}</strong>
              </p>
              <ul>
                <li>
                  <code>*.notice /var/adm/messages</code> -{' '}
                  {t('hostTime.syslogHelpSection.exampleNotices')}
                </li>
                <li>
                  <code>mail.* /var/log/maillog</code> -{' '}
                  {t('hostTime.syslogHelpSection.exampleMailLogs')}
                </li>
                <li>
                  <code>kern.err @loghost</code> -{' '}
                  {t('hostTime.syslogHelpSection.exampleKernelErrors')}
                </li>
                <li>
                  <code>*.emerg *</code> - {t('hostTime.syslogHelpSection.exampleEmergency')}
                </li>
                {serviceType.name === 'syslog' && (
                  <li>
                    <code>ifdef(`LOGHOST&apos;, action1, action2)</code> -{' '}
                    {t('hostTime.syslogHelpSection.exampleConditionalMacro')}
                  </li>
                )}
              </ul>
            </div>
            <div className="col">
              <p>
                <strong>{t('hostTime.syslogHelpSection.serviceInfoLabel')}</strong>
              </p>
              <ul>
                <li>
                  <strong>{t('hostTime.syslogHelpSection.serviceField')}</strong>{' '}
                  {serviceType.display}
                </li>
                <li>
                  <strong>{t('hostTime.syslogHelpSection.configFileField')}</strong>{' '}
                  {config?.config_file || t('hostTime.syslogHelpSection.unknown')}
                </li>
                <li>
                  <strong>{t('hostTime.syslogHelpSection.fmriField')}</strong>{' '}
                  {config?.service_fmri || t('hostTime.syslogHelpSection.unknown')}
                </li>
                {serviceType.name === 'rsyslog' && (
                  <li>
                    <strong>{t('hostTime.syslogHelpSection.featuresField')}</strong>{' '}
                    {t('hostTime.syslogHelpSection.rsyslogFeatures')}
                  </li>
                )}
                {serviceType.name === 'syslog' && (
                  <li>
                    <strong>{t('hostTime.syslogHelpSection.featuresField')}</strong>{' '}
                    {t('hostTime.syslogHelpSection.syslogFeatures')}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Service-specific notes */}
          {serviceType.name === 'rsyslog' && (
            <div className="alert alert-info mt-3">
              <p className="small mb-0">
                <strong>{t('hostTime.syslogHelpSection.rsyslogNotesTitle')}</strong>{' '}
                {t('hostTime.syslogHelpSection.rsyslogNotesBody')}
              </p>
            </div>
          )}

          {serviceType.name === 'syslog' && (
            <div className="alert alert-info mt-3">
              <p className="small mb-0">
                <strong>{t('hostTime.syslogHelpSection.syslogNotesTitle')}</strong>{' '}
                {t('hostTime.syslogHelpSection.syslogNotesBody')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

HelpSection.propTypes = {
  config: PropTypes.object,
};

export default HelpSection;
