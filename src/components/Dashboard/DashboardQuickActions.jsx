import PropTypes from 'prop-types';

import { useMode } from '../../contexts/ModeContext';
import { useServers } from '../../contexts/ServerContext';
import { hasFeature, hasMachines } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';

/**
 * Quick action buttons and machine distribution sidebar. All "Zones"/"Machines" wording is
 * capability-driven via resourceLabel (contract C7) — never hardcoded.
 */
const ZoneDistribution = ({ servers, summary, label }) => (
  <div>
    {servers && servers.length > 0 ? (
      <>
        {servers
          .filter(s => s.success && s.data)
          .map(serverResult => {
            const zoneCount = serverResult.data.allmachines?.length || 0;
            const runningCount = serverResult.data.runningmachines?.length || 0;
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
                    {zoneCount} {resourceLabel(serverResult.server).toLowerCase()} ({percentage}
                    %)
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
          <p className="h5 mb-1">
            {summary?.totalZones || 0} {label}
          </p>
          <p className="small text-muted mb-0">Across {summary?.onlineServers || 0} active hosts</p>
        </div>
      </>
    ) : (
      <div className="text-center text-muted">
        <p className="mb-0">No {label.toLowerCase()} data available</p>
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
  label: PropTypes.string.isRequired,
};

const DashboardQuickActions = ({
  servers,
  summary,
  onNavigateZoneRegister,
  onNavigateZones,
  onNavigateServerRegister,
  onNavigateSettings,
}) => {
  const { isDirect } = useMode();
  const { servers: registryServers } = useServers();
  const plural = resourceLabel(registryServers);
  const singular = resourceLabel(registryServers, { plural: false });
  // Capability-gated (hasMachines): machine actions/distribution hide until at least one
  // agent in scope offers machine management.
  const machinesAvailable = registryServers.some(hasMachines);
  // Create gates on the op-level `machine-create` token (sync-file AGREED): show when
  // any agent in scope advertises it.
  const createAvailable = registryServers.some(server => hasFeature(server, 'machine-create'));

  return (
    <div className="row g-3 mb-3">
      <div className={machinesAvailable ? 'col-12 col-lg-8' : 'col-12'}>
        <div className="card h-100">
          <div className="card-body">
            <h2 className="h4 mb-4 d-flex align-items-center gap-2">
              <i className="fas fa-bolt" />
              <span>Quick Actions</span>
            </h2>

            <div className="row g-3">
              {machinesAvailable && (
                <>
                  {createAvailable && (
                    <div className="col-12 col-sm-6">
                      <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={onNavigateZoneRegister}
                      >
                        <i className="fas fa-plus me-2" />
                        Create New {singular}
                      </button>
                    </div>
                  )}
                  <div className="col-12 col-sm-6">
                    <button type="button" className="btn btn-info w-100" onClick={onNavigateZones}>
                      <i className="fas fa-list me-2" />
                      Manage {plural}
                    </button>
                  </div>
                </>
              )}
              {/* Adding hosts is the aggregator's job (D11) — a Direct-mode agent is
                  single-host by design, so the affordance hides there. */}
              {!isDirect && (
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
              )}
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

      {machinesAvailable && (
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4 mb-4 d-flex align-items-center gap-2">
                <i className="fas fa-chart-pie" />
                <span>{singular} Distribution</span>
              </h2>
              <ZoneDistribution servers={servers} summary={summary} label={plural} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
