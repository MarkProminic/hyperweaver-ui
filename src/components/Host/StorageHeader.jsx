import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import HostPageHeader from './HostPageHeader';

const StorageHeader = ({
  loading,
  autoRefresh,
  setAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  resolution,
  setResolution,
  selectedServer,
  loadStorageData,
  timeWindow,
  setTimeWindow,
}) => {
  const { t } = useTranslation();

  return (
    <HostPageHeader title={t('host.storageHeader.title')}>
      <select
        className="form-select form-select-sm w-auto"
        value={timeWindow}
        onChange={e => setTimeWindow(e.target.value)}
        disabled={loading}
        title={t('host.storageHeader.timeWindowTitle')}
      >
        <option value="1min">{t('host.storageHeader.time1min')}</option>
        <option value="5min">{t('host.storageHeader.time5min')}</option>
        <option value="10min">{t('host.storageHeader.time10min')}</option>
        <option value="15min">{t('host.storageHeader.time15min')}</option>
        <option value="30min">{t('host.storageHeader.time30min')}</option>
        <option value="1hour">{t('host.storageHeader.time1hour')}</option>
        <option value="3hour">{t('host.storageHeader.time3hour')}</option>
        <option value="6hour">{t('host.storageHeader.time6hour')}</option>
        <option value="12hour">{t('host.storageHeader.time12hour')}</option>
        <option value="24hour">{t('host.storageHeader.time24hour')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        disabled={loading}
        title={t('host.storageHeader.resolutionTitle')}
      >
        <option value="realtime">{t('host.storageHeader.resolutionRealtime')}</option>
        <option value="high">{t('host.storageHeader.resolutionHigh')}</option>
        <option value="medium">{t('host.storageHeader.resolutionMedium')}</option>
        <option value="low">{t('host.storageHeader.resolutionLow')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={refreshInterval}
        onChange={e => setRefreshInterval(parseInt(e.target.value))}
        disabled={loading || !autoRefresh}
      >
        <option value={1}>{t('host.storageHeader.interval1s')}</option>
        <option value={2}>{t('host.storageHeader.interval2s')}</option>
        <option value={5}>{t('host.storageHeader.interval5s')}</option>
        <option value={10}>{t('host.storageHeader.interval10s')}</option>
        <option value={30}>{t('host.storageHeader.interval30s')}</option>
        <option value={60}>{t('host.storageHeader.interval1m')}</option>
        <option value={300}>{t('host.storageHeader.interval5m')}</option>
      </select>
      <button
        type="button"
        className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-warning'}`}
        onClick={() => setAutoRefresh(!autoRefresh)}
        title={
          autoRefresh
            ? t('host.storageHeader.autoRefreshEnabled')
            : t('host.storageHeader.autoRefreshDisabled')
        }
      >
        <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} me-2`} />
        {autoRefresh ? t('host.storageHeader.auto') : t('host.storageHeader.manual')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => selectedServer && loadStorageData(selectedServer)}
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
        {t('host.storageHeader.refresh')}
      </button>
    </HostPageHeader>
  );
};

StorageHeader.propTypes = {
  loading: PropTypes.bool.isRequired,
  autoRefresh: PropTypes.bool.isRequired,
  setAutoRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number.isRequired,
  setRefreshInterval: PropTypes.func.isRequired,
  resolution: PropTypes.string.isRequired,
  setResolution: PropTypes.func.isRequired,
  selectedServer: PropTypes.object,
  loadStorageData: PropTypes.func.isRequired,
  timeWindow: PropTypes.string.isRequired,
  setTimeWindow: PropTypes.func.isRequired,
};

export default StorageHeader;
