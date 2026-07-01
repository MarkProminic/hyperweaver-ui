import PropTypes from 'prop-types';

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
}) => (
  <div className="card">
    <div className="card-body">
      <h4 className="fs-6 fw-bold mb-4">
        <i className="fas fa-edit me-2" />
        <span>Configuration Editor</span>
      </h4>

      <div className="mb-3">
        <label className="form-label" htmlFor="syslog-config-editor">
          Syslog Configuration Content
        </label>
        <textarea
          id="syslog-config-editor"
          className="form-control font-monospace"
          rows="20"
          value={configContent}
          onChange={e => setConfigContent(e.target.value)}
          placeholder="# Enter syslog configuration rules here
# Example:
*.notice			/var/adm/messages
mail.info			/var/log/maillog
kern.err			@loghost
*.emerg				*"
          disabled={loading}
          style={{ fontSize: '0.85rem' }}
        />
        <p className="form-text text-muted">
          Edit the complete syslog.conf file content. Use TAB to separate selectors from actions.
        </p>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={`alert ${getValidationColor(validation.errors, validation.warnings)} mt-4`}>
          <h5 className="fs-6 fw-bold">Validation Results</h5>

          {validation.errors && validation.errors.length > 0 && (
            <div>
              <p className="fw-semibold text-danger">Errors:</p>
              <ul>
                {validation.errors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings && validation.warnings.length > 0 && (
            <div>
              <p className="fw-semibold text-warning">Warnings:</p>
              <ul>
                {validation.warnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.parsed_rules && validation.parsed_rules.length > 0 && (
            <div>
              <p className="fw-semibold">Parsed Rules:</p>
              <div className="alert alert-secondary">
                <p className="small mb-0">
                  {validation.parsed_rules.length} rule(s) will be active after applying this
                  configuration.
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
          <span>Validate Configuration</span>
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
          <span>Apply Configuration</span>
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
          <span>Reload Service</span>
        </button>
      </div>
    </div>
  </div>
);

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
