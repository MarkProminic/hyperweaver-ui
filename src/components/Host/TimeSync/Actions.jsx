import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const TimeSyncActions = ({ onAction, onRefresh, loading, syncing, statusAvailable }) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncActions.heading')}</h3>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAction('sync')}
            disabled={!statusAvailable || syncing || loading}
          >
            {syncing ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-sync-alt me-2" />
            )}
            <span>{t('hostTime.timeSyncActions.forceSyncNow')}</span>
          </button>
          <button
            type="button"
            className="btn btn-info"
            onClick={onRefresh}
            disabled={loading || syncing}
          >
            {loading ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-refresh me-2" />
            )}
            <span>{t('hostTime.timeSyncActions.refreshStatus')}</span>
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={() => onAction('restart')}
            disabled={!statusAvailable || syncing || loading}
          >
            <i className="fas fa-redo me-2" />
            <span>{t('hostTime.timeSyncActions.restartService')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

TimeSyncActions.propTypes = {
  onAction: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  syncing: PropTypes.bool,
  statusAvailable: PropTypes.bool,
};

export default TimeSyncActions;
