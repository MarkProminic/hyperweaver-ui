import PropTypes from 'prop-types';

const LoggingSectionRenderer = ({ values, handleFieldChange, loading }) => (
  <div className="row align-items-center g-3">
    {/* Logging Level - Left Column */}
    <div className="col-12 col-lg-6">
      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="logging-level">
          <i className="fas fa-layer-group me-2" />
          Logging Level
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
            <option value="error">Error - Critical issues only</option>
            <option value="warn">Warning - Errors + warnings</option>
            <option value="info">Info - General operations</option>
            <option value="debug">Debug - Detailed diagnostics</option>
          </select>
        </div>
        <p className="form-text text-muted">
          Controls the minimum level of messages that will be logged to console and files
        </p>
      </div>
    </div>

    {/* Logging Enabled - Right Column */}
    <div className="col-12 col-lg-6">
      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor="logging-enabled">
          <i className="fas fa-power-off me-2" />
          Enable Logging
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
                Logging is enabled
              </span>
            ) : (
              <span className="text-danger">
                <i className="fas fa-times-circle me-1" />
                Logging is disabled
              </span>
            )}
          </label>
        </div>
        <p className="form-text text-muted">
          Disable only for testing - logging is essential for troubleshooting
        </p>
      </div>
    </div>
  </div>
);

LoggingSectionRenderer.propTypes = {
  values: PropTypes.object.isRequired,
  handleFieldChange: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default LoggingSectionRenderer;
