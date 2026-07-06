import PropTypes from 'prop-types';

import { bytesToSize } from './utils';

const ResourceUtilization = ({ serverStats, cpuUsagePct, swapSummaryData, arcSizeBytes }) => {
  const usedMemPct =
    serverStats.totalmem && serverStats.freemem
      ? ((serverStats.totalmem - serverStats.freemem) / serverStats.totalmem) * 100
      : null;
  // ARC is kernel memory already counted inside "used", so it renders as a
  // carve-out segment of the same bar — clamped to the used amount because the
  // /stats and monitoring samples aren't taken at the same instant.
  const arcPct =
    usedMemPct !== null && arcSizeBytes > 0
      ? (Math.min(arcSizeBytes, serverStats.totalmem - serverStats.freemem) /
          serverStats.totalmem) *
        100
      : 0;

  return (
    <div className="col-12 col-lg-6">
      <h6 className="h6 mb-3 d-flex align-items-center gap-2">
        <i className="fas fa-chart-pie text-warning" />
        <span>Resource Utilization</span>
      </h6>
      {/* CPU Usage — cumulative-time deltas from /stats `cpus` (both agents emit
          the array; useHostData computes the percentage between polls). The very
          first sample only baselines, so N/A shows briefly until the re-poll. */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <i className="fas fa-microchip me-2" />
          CPU Usage
          <span className="small text-muted ms-2">
            (Cores:{' '}
            {Array.isArray(serverStats.cpus) && serverStats.cpus.length > 0
              ? serverStats.cpus.length
              : 'N/A'}
            )
          </span>
        </div>
        <div>
          <span>{typeof cpuUsagePct === 'number' ? `${cpuUsagePct.toFixed(1)}%` : 'N/A'}</span>
        </div>
      </div>
      <div
        className="progress mb-4"
        style={{ height: '0.5rem' }}
        role="progressbar"
        aria-valuenow={typeof cpuUsagePct === 'number' ? Math.round(cpuUsagePct) : 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-bar bg-info"
          style={{
            width: `${typeof cpuUsagePct === 'number' ? cpuUsagePct : 0}%`,
          }}
        />
      </div>

      {/* Memory Usage — when the agent reports ZFS ARC, its share of the used
          memory shows as a second (stacked) segment of the same bar */}
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <i className="fas fa-memory me-2" />
          Memory Usage
          <span className="small text-muted ms-2">
            (Total: {serverStats.totalmem ? bytesToSize(serverStats.totalmem) : 'N/A'}
            {arcPct > 0 ? `, ARC: ${bytesToSize(arcSizeBytes)}` : ''})
          </span>
        </div>
        <div>
          <span>{usedMemPct !== null ? `${usedMemPct.toFixed(1)}%` : 'N/A'}</span>
        </div>
      </div>
      <div
        className="progress mb-4"
        style={{ height: '0.5rem' }}
        role="progressbar"
        aria-valuenow={usedMemPct !== null ? usedMemPct : 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-bar bg-warning"
          style={{
            width: `${usedMemPct !== null ? usedMemPct - arcPct : 0}%`,
          }}
        />
        {arcPct > 0 && (
          <div
            className="progress-bar bg-success"
            style={{ width: `${arcPct}%` }}
            title="ZFS ARC"
          />
        )}
      </div>

      {/* Swap Usage */}
      {swapSummaryData && Object.keys(swapSummaryData).length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <div>
              <i className="fas fa-hdd me-2" />
              Swap Usage
              <span className="small text-muted ms-2">
                (Total: {swapSummaryData.totalSwapGB || 'N/A'} GB, Used:{' '}
                {swapSummaryData.usedSwapGB || 'N/A'} GB, Free:{' '}
                {swapSummaryData.freeSwapGB || 'N/A'} GB)
              </span>
            </div>
            <div>
              <span>
                {typeof swapSummaryData.overallUtilization === 'number'
                  ? `${swapSummaryData.overallUtilization.toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
          <div
            className="progress mb-4"
            style={{ height: '0.5rem' }}
            role="progressbar"
            aria-valuenow={
              typeof swapSummaryData.overallUtilization === 'number'
                ? swapSummaryData.overallUtilization
                : 0
            }
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-bar bg-info"
              style={{
                width: `${
                  typeof swapSummaryData.overallUtilization === 'number'
                    ? swapSummaryData.overallUtilization
                    : 0
                }%`,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

ResourceUtilization.propTypes = {
  serverStats: PropTypes.object,
  cpuUsagePct: PropTypes.number,
  swapSummaryData: PropTypes.object,
  arcSizeBytes: PropTypes.number,
};

export default ResourceUtilization;
