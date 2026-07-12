import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { hasFeature } from '../../utils/capabilities';
import { canCreateMachines } from '../../utils/permissions';
import { resourceLabel } from '../../utils/resourceLabel';

const MachineManager = ({ serverStats, currentServer, handleMachineAction }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plural = resourceLabel(currentServer);
  const singular = resourceLabel(currentServer, { plural: false });

  // Create opens the machine-create wizard on the Machines page (?create=1) —
  // the SAME gate as its header button: machine-create ∧ provisioner-registry
  // tokens + admin. (Previously this linked to /ui/zone-register, the legacy
  // setup form — a dead-wrong target.)
  const createAvailable =
    hasFeature(currentServer, 'machine-create') &&
    hasFeature(currentServer, 'provisioner-registry') &&
    canCreateMachines(user?.role);

  return (
    <div className="card mb-5">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h3 className="h5 mb-0 d-flex align-items-center gap-2">
              <i className="fas fa-server" />
              <span>{singular} Management</span>
            </h3>
          </div>
          <div>
            <div className="d-flex gap-2 flex-wrap">
              <span className="d-inline-flex">
                <span className="badge text-bg-secondary rounded-0">Total</span>
                <span className="badge text-bg-info rounded-0">
                  {serverStats.allmachines?.length || 0}
                </span>
              </span>
              <span className="d-inline-flex">
                <span className="badge text-bg-secondary rounded-0">Running</span>
                <span className="badge text-bg-success rounded-0">
                  {serverStats.runningmachines?.length || 0}
                </span>
              </span>
              <span className="d-inline-flex">
                <span className="badge text-bg-secondary rounded-0">Stopped</span>
                <span className="badge text-bg-warning rounded-0">
                  {(serverStats.allmachines?.length || 0) -
                    (serverStats.runningmachines?.length || 0)}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <h4 className="h6 mb-3">
              {plural} on {currentServer.hostname}
            </h4>
            {serverStats.allmachines && serverStats.allmachines.length > 0 ? (
              <>
                <div className="d-flex flex-wrap gap-1">
                  {serverStats.allmachines.slice(0, 12).map(zone => (
                    <span
                      key={zone}
                      className={`badge d-inline-flex align-items-center gap-1 ${serverStats.runningmachines?.includes(zone) ? 'text-bg-success' : 'text-bg-light'}`}
                    >
                      <i
                        className={`${serverStats.runningmachines?.includes(zone) ? 'fas fa-circle' : 'far fa-circle'}`}
                      />
                      <span>{zone}</span>
                    </span>
                  ))}
                </div>
                {serverStats.allmachines.length > 12 && (
                  <p className="small text-muted mt-2">
                    Showing 12 of {serverStats.allmachines.length} {plural.toLowerCase()}.
                    <a href="/ui/machines" className="ms-1">
                      View all →
                    </a>
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted">No {plural.toLowerCase()} configured on this host</p>
            )}
          </div>
          <div className="col-12 col-lg-6">
            <h4 className="h6 mb-3">Quick Actions</h4>
            <div className="d-flex flex-wrap gap-2">
              <a href="/ui/machines" className="btn btn-primary">
                <i className="fas fa-eye me-2" />
                <span>View All {plural}</span>
              </a>
              {createAvailable && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => navigate('/ui/machines?create=1')}
                >
                  <i className="fas fa-plus me-2" />
                  <span>New {singular}</span>
                </button>
              )}
              {(serverStats.allmachines?.length || 0) - (serverStats.runningmachines?.length || 0) >
                0 && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleMachineAction('startAll')}
                >
                  <i className="fas fa-play me-2" />
                  <span>Start All</span>
                </button>
              )}
              {(serverStats.runningmachines?.length || 0) > 0 && (
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => handleMachineAction('stopAll')}
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
};

MachineManager.propTypes = {
  serverStats: PropTypes.shape({
    allmachines: PropTypes.arrayOf(PropTypes.string),
    runningmachines: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
  }).isRequired,
  handleMachineAction: PropTypes.func.isRequired,
};

export default MachineManager;
