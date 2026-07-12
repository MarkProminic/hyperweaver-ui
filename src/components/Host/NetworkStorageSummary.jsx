import PropTypes from 'prop-types';

// Interface rows are the /monitoring/network/interfaces list (same feed the
// Networking page renders) — the /stats payload carries no interface map, so
// this card reads the monitoring data the page already fetches.
// The Storage card is ZFS-shaped (pools/datasets) and renders only where the
// agent advertises `zfs` (Mark, 2026-07-07) — a non-ZFS host gets the network
// card full-width; a ZFS-on-Windows host would advertise the token and get
// the card back.
const NetworkStorageSummary = ({ networkInterfaces, storageSummary, showZfsStorage = true }) => (
  <div className="row g-3 mb-5">
    {/* Network Summary Card */}
    <div className={showZfsStorage ? 'col-12 col-lg-6' : 'col-12'}>
      <div className="card h-100">
        <div className="card-body">
          <h3 className="h5 mb-4 d-flex align-items-center gap-2">
            <i className="fas fa-network-wired" />
            <span>Network Interfaces</span>
          </h3>
          {Array.isArray(networkInterfaces) && networkInterfaces.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Interface</th>
                      <th>Class</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkInterfaces.slice(0, 5).map(iface => (
                      <tr key={iface.link}>
                        <td>
                          <strong>{iface.link}</strong>
                        </td>
                        <td>{iface.class || 'N/A'}</td>
                        <td>
                          <span
                            className={`badge ${iface.state === 'up' ? 'text-bg-success' : 'text-bg-danger'}`}
                          >
                            {iface.state || 'unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {networkInterfaces.length > 5 && (
                <p className="small text-muted mt-2">
                  Showing 5 of {networkInterfaces.length} interfaces.
                  <a href="/ui/host-networking" className="ms-1">
                    View all →
                  </a>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted">No network interfaces found</p>
          )}
        </div>
      </div>
    </div>

    {/* Storage Summary Card — ZFS-shaped, zfs-gated */}
    {showZfsStorage && (
      <div className="col-12 col-lg-6">
        <div className="card h-100">
          <div className="card-body">
            <h3 className="h5 mb-4 d-flex align-items-center gap-2">
              <i className="fas fa-hard-drive" />
              <span>Storage Summary</span>
            </h3>
            {Object.keys(storageSummary).length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <tbody>
                    <tr>
                      <td>
                        <strong>ZFS Pools</strong>
                      </td>
                      <td>{storageSummary.pools?.length || 0}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Datasets</strong>
                      </td>
                      <td>{storageSummary.datasets?.length || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-4">Storage monitoring data not available</p>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

NetworkStorageSummary.propTypes = {
  networkInterfaces: PropTypes.arrayOf(
    PropTypes.shape({
      link: PropTypes.string,
      class: PropTypes.string,
      state: PropTypes.string,
    })
  ).isRequired,
  storageSummary: PropTypes.shape({
    pools: PropTypes.arrayOf(PropTypes.any),
    datasets: PropTypes.arrayOf(PropTypes.any),
  }).isRequired,
  showZfsStorage: PropTypes.bool,
};

export default NetworkStorageSummary;
