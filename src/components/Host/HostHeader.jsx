import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import HostPageHeader from './HostPageHeader';

const HostHeader = ({
  currentServer,
  loading,
  refreshInterval,
  setRefreshInterval,
  refreshAllData,
  timeWindow,
  setTimeWindow,
  resolution,
  setResolution,
  autoRefresh,
  setAutoRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <HostPageHeader title={t('host.hostHeader.title')}>
      <select
        className="form-select form-select-sm w-auto"
        value={timeWindow}
        onChange={e => setTimeWindow(e.target.value)}
        disabled={loading}
        title={t('host.hostHeader.timeWindowTitle')}
      >
        <option value="1min">{t('host.hostHeader.timeWindow1min')}</option>
        <option value="5min">{t('host.hostHeader.timeWindow5min')}</option>
        <option value="10min">{t('host.hostHeader.timeWindow10min')}</option>
        <option value="15min">{t('host.hostHeader.timeWindow15min')}</option>
        <option value="30min">{t('host.hostHeader.timeWindow30min')}</option>
        <option value="1hour">{t('host.hostHeader.timeWindow1hour')}</option>
        <option value="3hour">{t('host.hostHeader.timeWindow3hour')}</option>
        <option value="6hour">{t('host.hostHeader.timeWindow6hour')}</option>
        <option value="12hour">{t('host.hostHeader.timeWindow12hour')}</option>
        <option value="24hour">{t('host.hostHeader.timeWindow24hour')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        disabled={loading}
        title={t('host.hostHeader.resolutionTitle')}
      >
        <option value="realtime">{t('host.hostHeader.resolutionRealtime')}</option>
        <option value="high">{t('host.hostHeader.resolutionHigh')}</option>
        <option value="medium">{t('host.hostHeader.resolutionMedium')}</option>
        <option value="low">{t('host.hostHeader.resolutionLow')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={refreshInterval}
        onChange={e => setRefreshInterval(parseInt(e.target.value))}
        disabled={loading || !autoRefresh}
      >
        <option value={1}>1s</option>
        <option value={2}>2s</option>
        <option value={5}>5s</option>
        <option value={10}>10s</option>
        <option value={30}>30s</option>
        <option value={60}>1m</option>
        <option value={300}>5m</option>
      </select>
      <button
        type="button"
        className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-warning'}`}
        onClick={() => setAutoRefresh(!autoRefresh)}
        title={
          autoRefresh
            ? t('host.hostHeader.autoRefreshEnabled')
            : t('host.hostHeader.autoRefreshDisabled')
        }
      >
        <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} me-2`} />
        {autoRefresh ? t('host.hostHeader.auto') : t('host.hostHeader.manual')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => refreshAllData(currentServer)}
        disabled={loading}
      >
        {loading && (
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
        )}
        <i className="fas fa-sync me-2" />
        {t('host.hostHeader.refresh')}
      </button>
    </HostPageHeader>
  );
};

HostHeader.propTypes = {
  currentServer: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  refreshInterval: PropTypes.number.isRequired,
  setRefreshInterval: PropTypes.func.isRequired,
  refreshAllData: PropTypes.func.isRequired,
  timeWindow: PropTypes.string.isRequired,
  setTimeWindow: PropTypes.func.isRequired,
  resolution: PropTypes.string.isRequired,
  setResolution: PropTypes.func.isRequired,
  autoRefresh: PropTypes.bool.isRequired,
  setAutoRefresh: PropTypes.func.isRequired,
};

export default HostHeader;
