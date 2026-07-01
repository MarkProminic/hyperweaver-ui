import PropTypes from 'prop-types';

const ConfigEditor = ({
  configContent,
  setConfigContent,
  backupConfig,
  setBackupConfig,
  isConfigValid,
  saving,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <h3 className="fs-6 fw-bold">Configuration Editor</h3>

      <div className="mb-3">
        <textarea
          className={`form-control font-monospace ${!isConfigValid && configContent ? 'is-invalid' : ''}`}
          rows="15"
          placeholder="Enter NTP configuration..."
          value={configContent}
          onChange={e => setConfigContent(e.target.value)}
          disabled={saving}
        />
        {configContent && !isConfigValid && (
          <p className="form-text text-danger">
            Configuration appears to be invalid. Make sure to include at least one server or pool
            directive.
          </p>
        )}
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="timesync-backup-config"
            className="form-check-input"
            type="checkbox"
            checked={backupConfig}
            onChange={e => setBackupConfig(e.target.checked)}
            disabled={saving}
          />
          <label className="form-check-label" htmlFor="timesync-backup-config">
            Create backup of existing configuration
          </label>
        </div>
        <p className="form-text text-muted">
          Recommended: Create a backup copy before making changes to allow easy recovery.
        </p>
      </div>
    </div>
  </div>
);

ConfigEditor.propTypes = {
  configContent: PropTypes.string.isRequired,
  setConfigContent: PropTypes.func.isRequired,
  backupConfig: PropTypes.bool.isRequired,
  setBackupConfig: PropTypes.func.isRequired,
  isConfigValid: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
};

export default ConfigEditor;
