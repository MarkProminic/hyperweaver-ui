import PropTypes from 'prop-types';

const ConfigActions = ({
  onSave,
  onReset,
  onRestart,
  hasChanges,
  isConfigValid,
  saving,
  loading,
}) => (
  <div className="card">
    <div className="card-body">
      <h3 className="fs-6 fw-bold">Configuration Actions</h3>

      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={!hasChanges || !isConfigValid || saving || loading}
        >
          {saving ? (
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
          ) : (
            <i className="fas fa-save me-2" />
          )}
          <span>Save Configuration</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          disabled={!hasChanges || saving}
        >
          <i className="fas fa-undo me-2" />
          <span>Reset Changes</span>
        </button>
        <button
          type="button"
          className="btn btn-warning"
          onClick={onRestart}
          disabled={saving || loading}
        >
          <i className="fas fa-redo me-2" />
          <span>Restart Service</span>
        </button>
      </div>

      {hasChanges && (
        <div className="alert alert-info mt-3">
          <p>
            You have unsaved changes. Remember to restart the time synchronization service after
            saving to apply the new configuration.
          </p>
        </div>
      )}
    </div>
  </div>
);

ConfigActions.propTypes = {
  onSave: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  hasChanges: PropTypes.bool.isRequired,
  isConfigValid: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ConfigActions;
