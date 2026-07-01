import PropTypes from 'prop-types';

const LogControls = ({
  filters,
  onFilterChange,
  onRefresh,
  loading,
  autoRefresh,
  onToggleAutoRefresh,
  isStreaming,
  onToggleStreaming,
  selectedLog,
}) => {
  const getStreamingTitle = () => {
    if (selectedLog?.type === 'fault-manager') {
      return 'Streaming not available for Fault Manager logs';
    }
    return isStreaming ? 'Stop real-time streaming' : 'Start real-time streaming';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-2">
            <div className="mb-3">
              <label className="form-label" htmlFor="log-lines">
                Lines
              </label>
              <input
                id="log-lines"
                className="form-control form-control-sm"
                type="number"
                min="10"
                max="1000"
                value={filters.lines}
                onChange={e => onFilterChange('lines', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="col-3">
            <div className="mb-3">
              <label className="form-label" htmlFor="log-grep">
                Filter (grep)
              </label>
              <input
                id="log-grep"
                className="form-control form-control-sm"
                type="text"
                placeholder="error, warning..."
                value={filters.grep}
                onChange={e => onFilterChange('grep', e.target.value)}
              />
            </div>
          </div>
          <div className="col-3">
            <div className="mb-3">
              <label className="form-label" htmlFor="log-since">
                Since
              </label>
              <input
                id="log-since"
                className="form-control form-control-sm"
                type="datetime-local"
                value={filters.since}
                onChange={e => onFilterChange('since', e.target.value)}
              />
            </div>
          </div>
          <div className="col-1">
            <div className="mb-3">
              <label className="form-label" htmlFor="log-tail">
                Tail
              </label>
              <div className="form-check">
                <input
                  id="log-tail"
                  className="form-check-input"
                  type="checkbox"
                  checked={filters.tail}
                  onChange={e => onFilterChange('tail', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="log-tail">
                  Latest
                </label>
              </div>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <div className="form-label">&nbsp;</div>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={onRefresh}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <div className="form-label">&nbsp;</div>
              <button
                type="button"
                className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-secondary'}`}
                onClick={onToggleAutoRefresh}
                disabled={loading || isStreaming}
              >
                <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} me-2`} />
                <span>{autoRefresh ? 'Stop' : 'Auto'}</span>
              </button>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <div className="form-label">&nbsp;</div>
              <button
                type="button"
                className={`btn btn-sm ${isStreaming ? 'btn-primary' : 'btn-warning'}`}
                onClick={onToggleStreaming}
                disabled={loading || selectedLog?.type === 'fault-manager'}
                title={getStreamingTitle()}
              >
                <i className={`fas ${isStreaming ? 'fa-stop' : 'fa-stream'} me-2`} />
                <span>{isStreaming ? 'Stop Stream' : 'Live Stream'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

LogControls.propTypes = {
  filters: PropTypes.shape({
    lines: PropTypes.number,
    grep: PropTypes.string,
    since: PropTypes.string,
    tail: PropTypes.bool,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  autoRefresh: PropTypes.bool.isRequired,
  onToggleAutoRefresh: PropTypes.func.isRequired,
  isStreaming: PropTypes.bool.isRequired,
  onToggleStreaming: PropTypes.func.isRequired,
  selectedLog: PropTypes.object,
};

export default LogControls;
