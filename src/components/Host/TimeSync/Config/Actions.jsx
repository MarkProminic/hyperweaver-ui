import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ConfigActions = ({
  onSave,
  onReset,
  onRestart,
  hasChanges,
  isConfigValid,
  saving,
  loading,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncConfigActions.heading')}</h3>

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
            <span>{t('hostTime.timeSyncConfigActions.saveConfiguration')}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReset}
            disabled={!hasChanges || saving}
          >
            <i className="fas fa-undo me-2" />
            <span>{t('hostTime.timeSyncConfigActions.resetChanges')}</span>
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={onRestart}
            disabled={saving || loading}
          >
            <i className="fas fa-redo me-2" />
            <span>{t('hostTime.timeSyncConfigActions.restartService')}</span>
          </button>
        </div>

        {hasChanges && (
          <div className="alert alert-info mt-3">
            <p>{t('hostTime.timeSyncConfigActions.unsavedChangesWarning')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

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
