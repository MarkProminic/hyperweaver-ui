import PropTypes from 'prop-types';

/**
 * Quick action buttons and zone distribution sidebar.
 */
const ZoneDistribution = ({ servers, summary }) => (
  <div>
    {servers && servers.length > 0 ? (
      <>
        {servers
          .filter(s => s.success && s.data)
          .map(serverResult => {
            const zoneCount = serverResult.data.allzones?.length || 0;
            const runningCount = serverResult.data.runningzones?.length || 0;
            const percentage =
              summary.totalZones > 0 ? Math.round((zoneCount / summary.totalZones) * 100) : 0;

            return (
              <div
                key={`${serverResult.server.hostname}-${serverResult.server.port}`}
                className="mb-3"
              >
                <div className="d-flex justify-content-between mb-1">
                  <strong className="small">{serverResult.server.hostname}</strong>
                  <span className="small">
                    {zoneCount} zones ({percentage}%)
                  </span>
                </div>
                <div
                  className="progress"
                  style={{ height: '0.5rem' }}
                  role="progressbar"
                  aria-valuenow={zoneCount}
                  aria-valuemin={0}
                  aria-valuemax={summary.totalZones || 1}
                >
                  <div
                    className="progress-bar bg-primary"
                    style={{
                      width: `${(zoneCount / (summary.totalZones || 1)) * 100}%`,
                    }}
                  />
                </div>
                <p className="small text-muted mb-0">
                  {runningCount} running, {zoneCount - runningCount} stopped
                </p>
              </div>
            );
          })}

        <hr className="my-3" />

        <div className="text-center">
          <p className="text-uppercase small fw-semibold text-muted mb-1">Total Infrastructure</p>
          <p className="h5 mb-1">{summary?.totalZones || 0} Zones</p>
          <p className="small text-muted mb-0">Across {summary?.onlineServers || 0} active hosts</p>
        </div>
      </>
    ) : (
      <div className="text-center text-muted">
        <p className="mb-0">No zone data available</p>
      </div>
    )}
  </div>
);

ZoneDistribution.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  summary: PropTypes.shape({
    totalZones: PropTypes.number,
    onlineServers: PropTypes.number,
  }).isRequired,
};

const DashboardQuickActions = ({
  servers,
  summary,
  onNavigateZoneRegister,
  onNavigateZones,
  onNavigateServerRegister,
  onNavigateSettings,
}) => (
  <div className="row g-3 mb-3">
    <div className="col-12 col-lg-8">
      <div className="card h-100">
        <div className="card-body">
          <h2 className="h4 mb-4 d-flex align-items-center gap-2">
            <i className="fas fa-bolt" />
            <span>Quick Actions</span>
          </h2>

          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={onNavigateZoneRegister}
              >
                <i className="fas fa-plus me-2" />
                Create New Zone
              </button>
            </div>
            <div className="col-12 col-sm-6">
              <button type="button" className="btn btn-info w-100" onClick={onNavigateZones}>
                <i className="fas fa-list me-2" />
                Manage Zones
              </button>
            </div>
            <div className="col-12 col-sm-6">
              <button
                type="button"
                className="btn btn-success w-100"
                onClick={onNavigateServerRegister}
              >
                <i className="fas fa-server me-2" />
                Add New Host
              </button>
            </div>
            <div className="col-12 col-sm-6">
              <button
                type="button"
                className="btn btn-secondary w-100"
                onClick={onNavigateSettings}
              >
                <i className="fas fa-cog me-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="col-12 col-lg-4">
      <div className="card h-100">
        <div className="card-body">
          <h2 className="h4 mb-4 d-flex align-items-center gap-2">
            <i className="fas fa-chart-pie" />
            <span>Zone Distribution</span>
          </h2>
          <ZoneDistribution servers={servers} summary={summary} />
        </div>
      </div>
    </div>
  </div>
);

DashboardQuickActions.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  summary: PropTypes.shape({
    totalZones: PropTypes.number,
    onlineServers: PropTypes.number,
  }).isRequired,
  onNavigateZoneRegister: PropTypes.func.isRequired,
  onNavigateZones: PropTypes.func.isRequired,
  onNavigateServerRegister: PropTypes.func.isRequired,
  onNavigateSettings: PropTypes.func.isRequired,
};

export default DashboardQuickActions;
