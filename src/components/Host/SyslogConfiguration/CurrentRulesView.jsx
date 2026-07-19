import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { processRuleDisplay, getActionTypeDisplay } from './syslogUtils';

/**
 * Current syslog rules table display
 */
const CurrentRulesView = ({ config }) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-4">
          <i className="fas fa-list me-2" />
          <span>{t('hostTime.syslogCurrentRules.heading')}</span>
        </h4>

        {config?.parsed_rules && config.parsed_rules.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('hostTime.syslogCurrentRules.columnLine')}</th>
                  <th>{t('hostTime.syslogCurrentRules.columnFacilityLevel')}</th>
                  <th>{t('hostTime.syslogCurrentRules.columnActionType')}</th>
                  <th>{t('hostTime.syslogCurrentRules.columnTarget')}</th>
                  <th>{t('hostTime.syslogCurrentRules.columnFullRule')}</th>
                </tr>
              </thead>
              <tbody>
                {config.parsed_rules.map(rule => {
                  const processed = processRuleDisplay(rule);
                  const actionDisplay = getActionTypeDisplay(
                    processed.actionType,
                    processed.isComplex
                  );

                  return (
                    <tr
                      key={rule.line_number ?? rule.full_line}
                      className={!processed.isValid ? 'bg-body-tertiary' : ''}
                    >
                      <td>
                        <span className="badge text-bg-secondary">{rule.line_number || '?'}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span
                            className={`font-monospace fw-semibold ${
                              processed.isMultiSelector ? 'text-info' : ''
                            }`}
                          >
                            {processed.selector || t('hostTime.syslogCurrentRules.empty')}
                          </span>
                          {processed.isMultiSelector && (
                            <span className="badge text-bg-info ms-2 d-inline-flex align-items-center gap-1">
                              <i className="fas fa-sitemap" />
                              <span>{t('hostTime.syslogCurrentRules.badgeMulti')}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${actionDisplay.class} d-inline-flex align-items-center gap-1`}
                        >
                          <i className={`fas ${actionDisplay.icon}`} />
                          <span>{actionDisplay.text}</span>
                        </span>
                        {processed.hasConditionals && (
                          <span className="badge text-bg-warning ms-1 d-inline-flex align-items-center gap-1">
                            <i className="fas fa-code" />
                            <span>{t('hostTime.syslogCurrentRules.badgeConditional')}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`font-monospace small ${
                            processed.hasConditionals ? 'text-warning' : ''
                          }`}
                        >
                          {processed.target.length > 50
                            ? `${processed.target.substring(0, 50)}...`
                            : processed.target}
                        </span>
                        {processed.target.length > 50 && (
                          <span className="small text-muted ms-1" title={processed.target}>
                            {t('hostTime.syslogCurrentRules.truncated')}
                          </span>
                        )}
                      </td>
                      <td>
                        <code
                          className={`small ${processed.hasConditionals ? 'text-warning' : ''}`}
                        >
                          {rule.full_line?.length > 80
                            ? `${rule.full_line.substring(0, 80)}...`
                            : rule.full_line || t('hostTime.syslogCurrentRules.incompleteRule')}
                        </code>
                        {rule.full_line?.length > 80 && (
                          <span className="small text-muted ms-1" title={rule.full_line}>
                            {t('hostTime.syslogCurrentRules.truncated')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-4">
            <span className="text-muted">
              <i className="fas fa-list fa-2x" />
            </span>
            <p className="mt-2 text-muted">{t('hostTime.syslogCurrentRules.noRulesMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

CurrentRulesView.propTypes = {
  config: PropTypes.object,
};

export default CurrentRulesView;
