import PropTypes from 'prop-types';

const NetworkStorageSummary = ({ serverStats, storageSummary }) => (
  <div className="row g-3 mb-5">
    {/* Network Summary Card */}
    <div className="col-12 col-lg-6">
      <div className="card h-100">
        <div className="card-body">
          <h3 className="h5 mb-4 d-flex align-items-center gap-2">
            <i className="fas fa-network-wired" />
            <span>Network Interfaces</span>
          </h3>
          {Object.keys(serverStats.networkInterfaces || {}).length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Interface</th>
                      <th>Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(serverStats.networkInterfaces || {})
                      .slice(0, 5)
                      .map(([interfaceName, addresses]) => (
                        <tr key={interfaceName}>
                          <td>
                            <strong>{interfaceName}</strong>
                          </td>
                          <td>
                            {Array.isArray(addresses) && addresses.length > 0
                              ? addresses[0].address
                              : 'No IP'}
                          </td>
                          <td>
                            <span className="badge text-bg-success">UP</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {Object.keys(serverStats.networkInterfaces || {}).length > 5 && (
                <p className="small text-muted mt-2">
                  Showing 5 of {Object.keys(serverStats.networkInterfaces || {}).length} interfaces.
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

    {/* Storage Summary Card */}
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
  </div>
);

NetworkStorageSummary.propTypes = {
  serverStats: PropTypes.shape({
    networkInterfaces: PropTypes.objectOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          address: PropTypes.string,
        })
      )
    ),
  }).isRequired,
  storageSummary: PropTypes.shape({
    pools: PropTypes.arrayOf(PropTypes.any),
    datasets: PropTypes.arrayOf(PropTypes.any),
  }).isRequired,
};

export default NetworkStorageSummary;
