import PropTypes from 'prop-types';

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
}) => (
  <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
    <div>
      <strong>Host Overview - {currentServer.hostname}</strong>
    </div>
    <div>
      <div className="d-flex gap-2 flex-wrap">
        <select
          className="form-select form-select-sm w-auto"
          value={timeWindow}
          onChange={e => setTimeWindow(e.target.value)}
          disabled={loading}
          title="Select time window for charts"
        >
          <option value="1min">1 Minute</option>
          <option value="5min">5 Minutes</option>
          <option value="10min">10 Minutes</option>
          <option value="15min">15 Minutes</option>
          <option value="30min">30 Minutes</option>
          <option value="1hour">1 Hour</option>
          <option value="3hour">3 Hours</option>
          <option value="6hour">6 Hours</option>
          <option value="12hour">12 Hours</option>
          <option value="24hour">24 Hours</option>
        </select>
        <select
          className="form-select form-select-sm w-auto"
          value={resolution}
          onChange={e => setResolution(e.target.value)}
          disabled={loading}
          title="Chart resolution - controls the number of data points"
        >
          <option value="realtime">Real-time (125 points)</option>
          <option value="high">High (38 points)</option>
          <option value="medium">Medium (13 points)</option>
          <option value="low">Low (5 points)</option>
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
          title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
        >
          <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} me-2`} />
          {autoRefresh ? 'Auto' : 'Manual'}
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
          Refresh
        </button>
      </div>
    </div>
  </div>
);

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
