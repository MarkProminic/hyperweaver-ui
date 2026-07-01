import PropTypes from 'prop-types';

import { bytesToSize, getCpuCount } from './utils';

const ResourceUtilization = ({ serverStats, swapSummaryData }) => (
  <div className="col-12 col-lg-6">
    <h6 className="h6 mb-3 d-flex align-items-center gap-2">
      <i className="fas fa-chart-pie text-warning" />
      <span>Resource Utilization</span>
    </h6>
    {/* CPU Usage */}
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div>
        <i className="fas fa-microchip me-2" />
        CPU Usage
      </div>
      <div>
        <span>
          {serverStats.loadavg && getCpuCount(serverStats) !== 'N/A'
            ? `${((parseFloat(serverStats.loadavg[0]) / getCpuCount(serverStats)) * 100).toFixed(1)}%`
            : '0%'}
        </span>
      </div>
    </div>
    <div
      className="progress mb-4"
      style={{ height: '0.5rem' }}
      role="progressbar"
      aria-valuenow={
        serverStats.loadavg && getCpuCount(serverStats) !== 'N/A'
          ? Math.min((parseFloat(serverStats.loadavg[0]) / getCpuCount(serverStats)) * 100, 100)
          : 0
      }
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-bar bg-info"
        style={{
          width: `${
            serverStats.loadavg && getCpuCount(serverStats) !== 'N/A'
              ? Math.min((parseFloat(serverStats.loadavg[0]) / getCpuCount(serverStats)) * 100, 100)
              : 0
          }%`,
        }}
      />
    </div>

    {/* Memory Usage */}
    <div className="d-flex justify-content-between align-items-center mb-1">
      <div>
        <i className="fas fa-memory me-2" />
        Memory Usage
        <span className="small text-muted ms-2">
          (Total: {serverStats.totalmem ? bytesToSize(serverStats.totalmem) : 'N/A'})
        </span>
      </div>
      <div>
        <span>
          {serverStats.totalmem && serverStats.freemem
            ? `${(((serverStats.totalmem - serverStats.freemem) / serverStats.totalmem) * 100).toFixed(1)}%`
            : 'N/A'}
        </span>
      </div>
    </div>
    <div
      className="progress mb-4"
      style={{ height: '0.5rem' }}
      role="progressbar"
      aria-valuenow={
        serverStats.totalmem && serverStats.freemem
          ? ((serverStats.totalmem - serverStats.freemem) / serverStats.totalmem) * 100
          : 0
      }
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-bar bg-warning"
        style={{
          width: `${
            serverStats.totalmem && serverStats.freemem
              ? ((serverStats.totalmem - serverStats.freemem) / serverStats.totalmem) * 100
              : 0
          }%`,
        }}
      />
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
              {swapSummaryData.usedSwapGB || 'N/A'} GB, Free: {swapSummaryData.freeSwapGB || 'N/A'}{' '}
              GB)
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

ResourceUtilization.propTypes = {
  serverStats: PropTypes.object,
  swapSummaryData: PropTypes.object,
};

export default ResourceUtilization;
