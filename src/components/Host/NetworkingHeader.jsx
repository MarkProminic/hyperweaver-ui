import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import HostPageHeader from './HostPageHeader';

const NetworkingHeader = ({
  loading,
  autoRefresh,
  setAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  resolution,
  setResolution,
  selectedServer,
  loadNetworkData,
  timeWindow,
  setTimeWindow,
}) => {
  const { t } = useTranslation();

  return (
    <HostPageHeader title={t('host.networkingHeader.title')}>
      <select
        className="form-select form-select-sm w-auto"
        value={timeWindow}
        onChange={e => setTimeWindow(e.target.value)}
        disabled={loading}
        title={t('host.networkingHeader.timeWindowTitle')}
      >
        <option value="1min">{t('host.networkingHeader.tw1min')}</option>
        <option value="5min">{t('host.networkingHeader.tw5min')}</option>
        <option value="10min">{t('host.networkingHeader.tw10min')}</option>
        <option value="15min">{t('host.networkingHeader.tw15min')}</option>
        <option value="30min">{t('host.networkingHeader.tw30min')}</option>
        <option value="1hour">{t('host.networkingHeader.tw1hour')}</option>
        <option value="3hour">{t('host.networkingHeader.tw3hour')}</option>
        <option value="6hour">{t('host.networkingHeader.tw6hour')}</option>
        <option value="12hour">{t('host.networkingHeader.tw12hour')}</option>
        <option value="24hour">{t('host.networkingHeader.tw24hour')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={resolution}
        onChange={e => setResolution(e.target.value)}
        disabled={loading}
        title={t('host.networkingHeader.resolutionTitle')}
      >
        <option value="realtime">{t('host.networkingHeader.resRealtime')}</option>
        <option value="high">{t('host.networkingHeader.resHigh')}</option>
        <option value="medium">{t('host.networkingHeader.resMedium')}</option>
        <option value="low">{t('host.networkingHeader.resLow')}</option>
      </select>
      <select
        className="form-select form-select-sm w-auto"
        value={refreshInterval}
        onChange={e => setRefreshInterval(parseInt(e.target.value))}
        disabled={loading || !autoRefresh}
      >
        <option value={1}>{t('host.networkingHeader.int1s')}</option>
        <option value={2}>{t('host.networkingHeader.int2s')}</option>
        <option value={5}>{t('host.networkingHeader.int5s')}</option>
        <option value={10}>{t('host.networkingHeader.int10s')}</option>
        <option value={30}>{t('host.networkingHeader.int30s')}</option>
        <option value={60}>{t('host.networkingHeader.int1m')}</option>
        <option value={300}>{t('host.networkingHeader.int5m')}</option>
      </select>
      <button
        type="button"
        className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-warning'}`}
        onClick={() => setAutoRefresh(!autoRefresh)}
        title={
          autoRefresh
            ? t('host.networkingHeader.autoEnabled')
            : t('host.networkingHeader.autoDisabled')
        }
      >
        <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} me-2`} />
        {autoRefresh ? t('host.networkingHeader.auto') : t('host.networkingHeader.manual')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => selectedServer && loadNetworkData(selectedServer)}
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
        {t('host.networkingHeader.refresh')}
      </button>
    </HostPageHeader>
  );
};

NetworkingHeader.propTypes = {
  loading: PropTypes.bool.isRequired,
  autoRefresh: PropTypes.bool.isRequired,
  setAutoRefresh: PropTypes.func.isRequired,
  refreshInterval: PropTypes.number.isRequired,
  setRefreshInterval: PropTypes.func.isRequired,
  resolution: PropTypes.string.isRequired,
  setResolution: PropTypes.func.isRequired,
  selectedServer: PropTypes.object,
  loadNetworkData: PropTypes.func.isRequired,
  timeWindow: PropTypes.string.isRequired,
  setTimeWindow: PropTypes.func.isRequired,
};

export default NetworkingHeader;
