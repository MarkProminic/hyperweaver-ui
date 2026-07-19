import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { getValidationColor } from './syslogUtils';

/**
 * Configuration text editor with validation and action buttons
 */
const ConfigEditorView = ({
  configContent,
  setConfigContent,
  validation,
  loading,
  validationLoading,
  validateConfiguration,
  applyConfiguration,
  reloadSyslog,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-4">
          <i className="fas fa-edit me-2" />
          <span>{t('hostTime.syslogConfigEditor.heading')}</span>
        </h4>

        <div className="mb-3">
          <label className="form-label" htmlFor="syslog-config-editor">
            {t('hostTime.syslogConfigEditor.contentLabel')}
          </label>
          <textarea
            id="syslog-config-editor"
            className="form-control font-monospace"
            rows="20"
            value={configContent}
            onChange={e => setConfigContent(e.target.value)}
            placeholder={t('hostTime.syslogConfigEditor.placeholder')}
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
          />
          <p className="form-text text-muted">{t('hostTime.syslogConfigEditor.helpText')}</p>
        </div>

        {/* Validation Results */}
        {validation && (
          <div
            className={`alert ${getValidationColor(validation.errors, validation.warnings)} mt-4`}
          >
            <h5 className="fs-6 fw-bold">
              {t('hostTime.syslogConfigEditor.validationResultsHeading')}
            </h5>

            {validation.errors && validation.errors.length > 0 && (
              <div>
                <p className="fw-semibold text-danger">
                  {t('hostTime.syslogConfigEditor.errorsLabel')}
                </p>
                <ul>
                  {validation.errors.map(error => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings && validation.warnings.length > 0 && (
              <div>
                <p className="fw-semibold text-warning">
                  {t('hostTime.syslogConfigEditor.warningsLabel')}
                </p>
                <ul>
                  {validation.warnings.map(warning => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.parsed_rules && validation.parsed_rules.length > 0 && (
              <div>
                <p className="fw-semibold">{t('hostTime.syslogConfigEditor.parsedRulesLabel')}</p>
                <div className="alert alert-secondary">
                  <p className="small mb-0">
                    {t('hostTime.syslogConfigEditor.rulesActiveMessage', {
                      count: validation.parsed_rules.length,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor Action Buttons */}
        <div className="d-flex gap-2 mt-4">
          <button
            type="button"
            className="btn btn-info"
            onClick={validateConfiguration}
            disabled={loading || validationLoading}
          >
            {validationLoading ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-check-circle me-2" />
            )}
            <span>{t('hostTime.syslogConfigEditor.validateButton')}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={applyConfiguration}
            disabled={loading || validationLoading}
          >
            {loading ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-save me-2" />
            )}
            <span>{t('hostTime.syslogConfigEditor.applyButton')}</span>
          </button>

          <button
            type="button"
            className="btn btn-warning"
            onClick={reloadSyslog}
            disabled={loading || validationLoading}
          >
            {loading ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-redo me-2" />
            )}
            <span>{t('hostTime.syslogConfigEditor.reloadButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ConfigEditorView.propTypes = {
  configContent: PropTypes.string.isRequired,
  setConfigContent: PropTypes.func.isRequired,
  validation: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  validationLoading: PropTypes.bool.isRequired,
  validateConfiguration: PropTypes.func.isRequired,
  applyConfiguration: PropTypes.func.isRequired,
  reloadSyslog: PropTypes.func.isRequired,
};

export default ConfigEditorView;
