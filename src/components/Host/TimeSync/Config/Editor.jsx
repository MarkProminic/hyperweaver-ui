import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ConfigEditor = ({
  configContent,
  setConfigContent,
  backupConfig,
  setBackupConfig,
  isConfigValid,
  saving,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncConfigEditor.heading')}</h3>

        <div className="mb-3">
          <textarea
            className={`form-control font-monospace ${!isConfigValid && configContent ? 'is-invalid' : ''}`}
            rows="15"
            placeholder={t('hostTime.timeSyncConfigEditor.placeholder')}
            value={configContent}
            onChange={e => setConfigContent(e.target.value)}
            disabled={saving}
          />
          {configContent && !isConfigValid && (
            <p className="form-text text-danger">
              {t('hostTime.timeSyncConfigEditor.invalidConfigError')}
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
              {t('hostTime.timeSyncConfigEditor.backupCheckbox')}
            </label>
          </div>
          <p className="form-text text-muted">
            {t('hostTime.timeSyncConfigEditor.backupRecommendation')}
          </p>
        </div>
      </div>
    </div>
  );
};

ConfigEditor.propTypes = {
  configContent: PropTypes.string.isRequired,
  setConfigContent: PropTypes.func.isRequired,
  backupConfig: PropTypes.bool.isRequired,
  setBackupConfig: PropTypes.func.isRequired,
  isConfigValid: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
};

export default ConfigEditor;
