import PropTypes from 'prop-types';

const TimeSyncPeerTable = ({ peers, loading }) => {
  const getPeerStatusIndicator = indicator => {
    switch (indicator) {
      case '*':
        return {
          icon: '⭐',
          description: 'Primary server (selected for synchronization)',
          color: 'text-success',
        };
      case '+':
        return {
          icon: '✅',
          description: 'Backup server (good candidate)',
          color: 'text-info',
        };
      case '-':
        return {
          icon: '❌',
          description: 'Rejected server (unreliable)',
          color: 'text-danger',
        };
      case 'x':
        return {
          icon: '⚠️',
          description: 'False ticker (bad time)',
          color: 'text-warning',
        };
      case '.':
        return {
          icon: '⚪',
          description: 'Excess peer (not used)',
          color: 'text-muted',
        };
      case ' ':
        return {
          icon: '⚠️',
          description: 'Candidate server (being evaluated)',
          color: 'text-warning',
        };
      default:
        return {
          icon: '❓',
          description: 'Unknown status',
          color: 'text-muted',
        };
    }
  };

  const formatOffset = offset => {
    if (typeof offset !== 'number') {
      return 'N/A';
    }
    return `${offset >= 0 ? '+' : ''}${offset.toFixed(1)}ms`;
  };

  const formatDelay = delay => {
    if (typeof delay !== 'number') {
      return 'N/A';
    }
    return `${delay.toFixed(1)}ms`;
  };

  const formatJitter = jitter => {
    if (typeof jitter !== 'number') {
      return 'N/A';
    }
    return `${jitter.toFixed(1)}ms`;
  };

  const getHealthColor = (value, thresholds) => {
    if (typeof value !== 'number') {
      return '';
    }
    if (value <= thresholds.good) {
      return 'text-success';
    }
    if (value <= thresholds.warning) {
      return 'text-warning';
    }
    return 'text-danger';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">
          Time Server Peers ({peers.length})
          {loading && (
            <span className="ms-2">
              <i className="fas fa-spinner fa-spin" />
            </span>
          )}
        </h3>

        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Status</th>
                <th>Server</th>
                <th>Stratum</th>
                <th>Delay</th>
                <th>Offset</th>
                <th>Jitter</th>
                <th>Reach %</th>
              </tr>
            </thead>
            <tbody>
              {peers.map(peer => {
                const statusDetails = getPeerStatusIndicator(peer.indicator);
                return (
                  <tr key={peer.remote || peer.name || Math.random()}>
                    <td>
                      <span className={statusDetails.color} title={statusDetails.description}>
                        {statusDetails.icon}
                      </span>
                      <span className="small ms-1">{peer.status || 'Unknown'}</span>
                    </td>
                    <td className="font-monospace">
                      {peer.remote || peer.name || 'Unknown Server'}
                    </td>
                    <td>{peer.stratum || 'N/A'}</td>
                    <td
                      className={getHealthColor(peer.delay, {
                        good: 50,
                        warning: 200,
                      })}
                    >
                      {formatDelay(peer.delay)}
                    </td>
                    <td
                      className={getHealthColor(Math.abs(peer.offset), {
                        good: 10,
                        warning: 100,
                      })}
                    >
                      {formatOffset(peer.offset)}
                    </td>
                    <td
                      className={getHealthColor(peer.jitter, {
                        good: 10,
                        warning: 50,
                      })}
                    >
                      {formatJitter(peer.jitter)}
                    </td>
                    <td
                      className={getHealthColor(100 - (peer.reachability_percent || 0), {
                        good: 10,
                        warning: 50,
                      })}
                    >
                      {peer.reachability_percent !== undefined
                        ? `${peer.reachability_percent}%`
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="small mt-3">
          <p>
            <strong>Status Indicators:</strong>
          </p>
          <p>
            ⭐ Primary server (active) • ✅ Backup server • ❌ Rejected server • ⚠️
            Candidate/Problem • ⚪ Excess peer
          </p>
          <p>
            <strong>Health Colors:</strong> <span className="text-success">Green (good)</span> •{' '}
            <span className="text-warning">Yellow (warning)</span> •{' '}
            <span className="text-danger">Red (problem)</span>
          </p>
        </div>
      </div>
    </div>
  );
};

TimeSyncPeerTable.propTypes = {
  peers: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
};

export default TimeSyncPeerTable;
