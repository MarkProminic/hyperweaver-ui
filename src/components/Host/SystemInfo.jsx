import PropTypes from 'prop-types';

import ResourceUtilization from './ResourceUtilization.jsx';
import { formatUptime } from './utils.js';

const SystemInfo = ({
  serverStats,
  cpuUsagePct,
  monitoringStatus,
  monitoringHealth,
  taskStats,
  swapSummaryData,
  arcSizeBytes,
}) => {
  const getHealthStatusClass = status => {
    if (status === 'healthy') {
      return 'text-bg-success';
    }
    if (status === 'warning') {
      return 'text-bg-warning';
    }
    return 'text-bg-danger';
  };

  return (
    <div className="card mb-5">
      <div className="card-body">
        <h5 className="h5 mb-4 d-flex align-items-center gap-2">
          <i className="fas fa-tachometer-alt" />
          <span>Host Overview</span>
        </h5>

        <div className="row g-3">
          {/* System Information with Monitoring & Tasks */}
          <div className="col-12 col-lg-6">
            <h6 className="h6 mb-3 d-flex align-items-center gap-2">
              <i className="fas fa-server text-info" />
              <span>System Information</span>
            </h6>
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td>
                    <strong>Hostname</strong>
                  </td>
                  <td>{serverStats.hostname || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Platform</strong>
                  </td>
                  <td>
                    {serverStats.type || 'N/A'} {serverStats.release || ''}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Architecture</strong>
                  </td>
                  <td>{serverStats.arch || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Agent Version</strong>
                  </td>
                  <td>{serverStats.version || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Uptime</strong>
                  </td>
                  <td>{formatUptime(serverStats.uptime)}</td>
                </tr>
                {/* Monitoring Status in table */}
                {Object.keys(monitoringStatus).length > 0 && (
                  <>
                    <tr>
                      <td>
                        <strong>Monitoring Service</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${monitoringStatus.isRunning ? 'text-bg-success' : 'text-bg-danger'}`}
                        >
                          {monitoringStatus.isRunning ? 'Running' : 'Stopped'}
                        </span>
                        {monitoringStatus.isInitialized && (
                          <span className="badge text-bg-success ms-1">Initialized</span>
                        )}
                      </td>
                    </tr>
                  </>
                )}
                {monitoringHealth.status && (
                  <tr>
                    <td>
                      <strong>Service Health</strong>
                    </td>
                    <td>
                      <span className={`badge ${getHealthStatusClass(monitoringHealth.status)}`}>
                        {monitoringHealth.status}
                      </span>
                    </td>
                  </tr>
                )}
                {/* Task Queue Status in table */}
                {Object.keys(taskStats).length > 0 && (
                  <tr>
                    <td>
                      <strong>Task Queue</strong>
                    </td>
                    <td>
                      <span className="badge text-bg-info me-1">
                        {taskStats.pending || 0} Pending
                      </span>
                      <span className="badge text-bg-success me-1">
                        {taskStats.completed || 0} Done
                      </span>
                      {(taskStats.failed || 0) > 0 && (
                        <span className="badge text-bg-danger">{taskStats.failed} Failed</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resource Utilization */}
          <ResourceUtilization
            serverStats={serverStats}
            cpuUsagePct={cpuUsagePct}
            swapSummaryData={swapSummaryData}
            arcSizeBytes={arcSizeBytes}
          />
        </div>
      </div>
    </div>
  );
};

SystemInfo.propTypes = {
  serverStats: PropTypes.shape({
    hostname: PropTypes.string,
    type: PropTypes.string,
    release: PropTypes.string,
    arch: PropTypes.string,
    version: PropTypes.string,
    uptime: PropTypes.number,
    cpus: PropTypes.array,
    totalmem: PropTypes.number,
    freemem: PropTypes.number,
  }),
  cpuUsagePct: PropTypes.number,
  monitoringStatus: PropTypes.shape({
    isRunning: PropTypes.bool,
    isInitialized: PropTypes.bool,
  }),
  monitoringHealth: PropTypes.shape({
    status: PropTypes.string,
  }),
  taskStats: PropTypes.shape({
    pending: PropTypes.number,
    completed: PropTypes.number,
    failed: PropTypes.number,
  }),
  swapSummaryData: PropTypes.object,
  arcSizeBytes: PropTypes.number,
};

export default SystemInfo;
