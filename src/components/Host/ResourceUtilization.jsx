import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { bytesToSize } from './utils';

const ResourceUtilization = ({ serverStats, cpuUsagePct, swapSummaryData, arcSizeBytes }) => {
  const { t } = useTranslation();
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
        <span>{t('host.resourceUtilization.title')}</span>
      </h6>
      {/* CPU Usage — cumulative-time deltas from /stats `cpus` (both agents emit
          the array; useHostData computes the percentage between polls). The very
          first sample only baselines, so N/A shows briefly until the re-poll. */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <i className="fas fa-microchip me-2" />
          {t('host.resourceUtilization.cpuUsage')}
          <span className="small text-muted ms-2">
            {t('host.resourceUtilization.cores', {
              count:
                Array.isArray(serverStats.cpus) && serverStats.cpus.length > 0
                  ? serverStats.cpus.length
                  : 'N/A',
            })}
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
          {t('host.resourceUtilization.memoryUsage')}
          <span className="small text-muted ms-2">
            {t('host.resourceUtilization.memorySummary', {
              total: serverStats.totalmem ? bytesToSize(serverStats.totalmem) : 'N/A',
              arc:
                arcPct > 0
                  ? t('host.resourceUtilization.arcSegment', { arc: bytesToSize(arcSizeBytes) })
                  : '',
            })}
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
            title={t('host.resourceUtilization.zfsArc')}
          />
        )}
      </div>

      {/* Swap Usage */}
      {swapSummaryData && Object.keys(swapSummaryData).length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <div>
              <i className="fas fa-hdd me-2" />
              {t('host.resourceUtilization.swapUsage')}
              <span className="small text-muted ms-2">
                {t('host.resourceUtilization.swapSummary', {
                  total: swapSummaryData.totalSwapGB || 'N/A',
                  used: swapSummaryData.usedSwapGB || 'N/A',
                  free: swapSummaryData.freeSwapGB || 'N/A',
                })}
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
