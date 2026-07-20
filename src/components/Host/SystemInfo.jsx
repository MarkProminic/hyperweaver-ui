import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ProvisioningTools from './ProvisioningTools.jsx';
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
  currentServer,
}) => {
  const { t } = useTranslation();
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
          <span>{t('host.systemInfo.title')}</span>
        </h5>

        <div className="row g-3">
          {/* System Information with Monitoring & Tasks */}
          <div className="col-12 col-lg-6">
            <h6 className="h6 mb-3 d-flex align-items-center gap-2">
              <i className="fas fa-server text-info" />
              <span>{t('host.systemInfo.systemInfo')}</span>
            </h6>
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.systemInfo.hostname')}</strong>
                  </td>
                  <td>{serverStats.hostname || t('host.systemInfo.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.systemInfo.platform')}</strong>
                  </td>
                  <td>
                    {serverStats.type || t('host.systemInfo.notAvailable')}{' '}
                    {serverStats.release || ''}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.systemInfo.architecture')}</strong>
                  </td>
                  <td>{serverStats.arch || t('host.systemInfo.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.systemInfo.osBuild')}</strong>
                  </td>
                  <td>{serverStats.version || t('host.systemInfo.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.systemInfo.uptime')}</strong>
                  </td>
                  <td>{formatUptime(serverStats.uptime)}</td>
                </tr>
                {/* Monitoring Status in table */}
                {Object.keys(monitoringStatus).length > 0 && (
                  <>
                    <tr>
                      <td>
                        <strong>{t('host.systemInfo.monitoringService')}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${monitoringStatus.isRunning ? 'text-bg-success' : 'text-bg-danger'}`}
                        >
                          {monitoringStatus.isRunning
                            ? t('host.systemInfo.running')
                            : t('host.systemInfo.stopped')}
                        </span>
                        {monitoringStatus.isInitialized && (
                          <span className="badge text-bg-success ms-1">
                            {t('host.systemInfo.initialized')}
                          </span>
                        )}
                      </td>
                    </tr>
                  </>
                )}
                {monitoringHealth.status && (
                  <tr>
                    <td>
                      <strong>{t('host.systemInfo.serviceHealth')}</strong>
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
                      <strong>{t('host.systemInfo.taskQueue')}</strong>
                    </td>
                    <td>
                      <span className="badge text-bg-info me-1">
                        {taskStats.pending || 0} {t('host.systemInfo.pending')}
                      </span>
                      <span className="badge text-bg-success me-1">
                        {taskStats.completed || 0} {t('host.systemInfo.done')}
                      </span>
                      {(taskStats.failed || 0) > 0 && (
                        <span className="badge text-bg-danger">
                          {taskStats.failed} {t('host.systemInfo.failed')}
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {/* SHI SystemInfoBox parity: provisioning tool availability */}
                <ProvisioningTools currentServer={currentServer} />
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
  currentServer: PropTypes.object,
};

export default SystemInfo;
