import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const LoggingSectionRenderer = ({ values, handleFieldChange, loading }) => {
  const { t } = useTranslation();
  return (
    <div className="row align-items-center g-3">
      {/* Logging Level - Left Column */}
      <div className="col-12 col-lg-6">
        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="logging-level">
            <i className="fas fa-layer-group me-2" />
            {t('settings.loggingSectionRenderer.loggingLevel')}
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-list-ul" />
            </span>
            <select
              className="form-select"
              id="logging-level"
              value={values['logging.level'] || 'info'}
              onChange={e => handleFieldChange('logging.level', e.target.value)}
              disabled={loading}
            >
              <option value="error">{t('settings.loggingSectionRenderer.levelError')}</option>
              <option value="warn">{t('settings.loggingSectionRenderer.levelWarn')}</option>
              <option value="info">{t('settings.loggingSectionRenderer.levelInfo')}</option>
              <option value="debug">{t('settings.loggingSectionRenderer.levelDebug')}</option>
            </select>
          </div>
          <p className="form-text text-muted">{t('settings.loggingSectionRenderer.levelHelp')}</p>
        </div>
      </div>

      {/* Logging Enabled - Right Column */}
      <div className="col-12 col-lg-6">
        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="logging-enabled">
            <i className="fas fa-power-off me-2" />
            {t('settings.loggingSectionRenderer.enableLogging')}
          </label>
          <div className="form-check form-switch">
            <input
              id="logging-enabled"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={!!values['logging.enabled']}
              onChange={e => handleFieldChange('logging.enabled', e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="logging-enabled">
              {values['logging.enabled'] ? (
                <span className="text-success">
                  <i className="fas fa-check-circle me-1" />
                  {t('settings.loggingSectionRenderer.loggingEnabled')}
                </span>
              ) : (
                <span className="text-danger">
                  <i className="fas fa-times-circle me-1" />
                  {t('settings.loggingSectionRenderer.loggingDisabled')}
                </span>
              )}
            </label>
          </div>
          <p className="form-text text-muted">{t('settings.loggingSectionRenderer.enableHelp')}</p>
        </div>
      </div>
    </div>
  );
};

LoggingSectionRenderer.propTypes = {
  values: PropTypes.object.isRequired,
  handleFieldChange: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default LoggingSectionRenderer;
