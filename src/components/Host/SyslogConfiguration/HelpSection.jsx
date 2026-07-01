import PropTypes from 'prop-types';

import { getServiceType } from './syslogUtils';

/**
 * Syslog configuration help section with service-specific examples and notes
 */
const HelpSection = ({ config }) => {
  const serviceType = getServiceType(config);

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-question-circle me-2" />
          <span>{serviceType.display} Configuration Help</span>
        </h4>

        <div className="small">
          <div className="row g-3">
            <div className="col">
              <p>
                <strong>Common Examples:</strong>
              </p>
              <ul>
                <li>
                  <code>*.notice /var/adm/messages</code> - All notices to messages
                </li>
                <li>
                  <code>mail.* /var/log/maillog</code> - All mail logs to maillog
                </li>
                <li>
                  <code>kern.err @loghost</code> - Kernel errors to remote host
                </li>
                <li>
                  <code>*.emerg *</code> - Emergency messages to all users
                </li>
                {serviceType.name === 'syslog' && (
                  <li>
                    <code>ifdef(`LOGHOST&apos;, action1, action2)</code> - Conditional m4 macro
                  </li>
                )}
              </ul>
            </div>
            <div className="col">
              <p>
                <strong>Service Information:</strong>
              </p>
              <ul>
                <li>
                  <strong>Service:</strong> {serviceType.display}
                </li>
                <li>
                  <strong>Config File:</strong> {config?.config_file || 'Unknown'}
                </li>
                <li>
                  <strong>FMRI:</strong> {config?.service_fmri || 'Unknown'}
                </li>
                {serviceType.name === 'rsyslog' && (
                  <li>
                    <strong>Features:</strong> Advanced filtering, modules, templates
                  </li>
                )}
                {serviceType.name === 'syslog' && (
                  <li>
                    <strong>Features:</strong> m4 macros, conditional processing
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Service-specific notes */}
          {serviceType.name === 'rsyslog' && (
            <div className="alert alert-info mt-3">
              <p className="small mb-0">
                <strong>rsyslog Notes:</strong> Modern syslog implementation with advanced features
                like modules, templates, and enhanced filtering. Supports both traditional syslog
                syntax and extended rsyslog directives.
              </p>
            </div>
          )}

          {serviceType.name === 'syslog' && (
            <div className="alert alert-info mt-3">
              <p className="small mb-0">
                <strong>Traditional Syslog Notes:</strong> Classic syslog implementation with m4
                macro preprocessing. Supports conditional statements using ifdef() and backtick
                syntax for complex rule logic.
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
