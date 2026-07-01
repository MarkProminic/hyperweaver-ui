import PropTypes from 'prop-types';

const ZoneManager = ({ serverStats, currentServer, handleZoneAction }) => (
  <div className="card mb-5">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="h5 mb-0 d-flex align-items-center gap-2">
            <i className="fas fa-server" />
            <span>Zone Management</span>
          </h3>
        </div>
        <div>
          <div className="d-flex gap-2 flex-wrap">
            <span className="d-inline-flex">
              <span className="badge text-bg-secondary rounded-0">Total</span>
              <span className="badge text-bg-info rounded-0">
                {serverStats.allzones?.length || 0}
              </span>
            </span>
            <span className="d-inline-flex">
              <span className="badge text-bg-secondary rounded-0">Running</span>
              <span className="badge text-bg-success rounded-0">
                {serverStats.runningzones?.length || 0}
              </span>
            </span>
            <span className="d-inline-flex">
              <span className="badge text-bg-secondary rounded-0">Stopped</span>
              <span className="badge text-bg-warning rounded-0">
                {(serverStats.allzones?.length || 0) - (serverStats.runningzones?.length || 0)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <h4 className="h6 mb-3">Zones on {currentServer.hostname}</h4>
          {serverStats.allzones && serverStats.allzones.length > 0 ? (
            <>
              <div className="d-flex flex-wrap gap-1">
                {serverStats.allzones.slice(0, 12).map(zone => (
                  <span
                    key={zone}
                    className={`badge d-inline-flex align-items-center gap-1 ${serverStats.runningzones?.includes(zone) ? 'text-bg-success' : 'text-bg-light'}`}
                  >
                    <i
                      className={`${serverStats.runningzones?.includes(zone) ? 'fas fa-circle' : 'far fa-circle'}`}
                    />
                    <span>{zone}</span>
                  </span>
                ))}
              </div>
              {serverStats.allzones.length > 12 && (
                <p className="small text-muted mt-2">
                  Showing 12 of {serverStats.allzones.length} zones.
                  <a href="/ui/zones" className="ms-1">
                    View all →
                  </a>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted">No zones configured on this host</p>
          )}
        </div>
        <div className="col-12 col-lg-6">
          <h4 className="h6 mb-3">Quick Actions</h4>
          <div className="d-flex flex-wrap gap-2">
            <a href="/ui/zones" className="btn btn-primary">
              <i className="fas fa-eye me-2" />
              <span>View All Zones</span>
            </a>
            <a href="/ui/zone-register" className="btn btn-success">
              <i className="fas fa-plus me-2" />
              <span>Create Zone</span>
            </a>
            {(serverStats.allzones?.length || 0) - (serverStats.runningzones?.length || 0) > 0 && (
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleZoneAction('startAll')}
              >
                <i className="fas fa-play me-2" />
                <span>Start All</span>
              </button>
            )}
            {(serverStats.runningzones?.length || 0) > 0 && (
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => handleZoneAction('stopAll')}
              >
                <i className="fas fa-pause me-2" />
                <span>Stop All</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

ZoneManager.propTypes = {
  serverStats: PropTypes.shape({
    allzones: PropTypes.arrayOf(PropTypes.string),
    runningzones: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
  }).isRequired,
  handleZoneAction: PropTypes.func.isRequired,
};

export default ZoneManager;
