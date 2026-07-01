import PropTypes from 'prop-types';

const RoutingTable = ({ routes, sectionsCollapsed, toggleSection }) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h4 className="fs-5 fw-bold mb-0">
            <i className="fas fa-route me-2" />
            Routing Table
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => toggleSection('routingTable')}
            title={sectionsCollapsed.routingTable ? 'Expand section' : 'Collapse section'}
          >
            <i
              className={`fas ${sectionsCollapsed.routingTable ? 'fa-chevron-down' : 'fa-chevron-up'}`}
            />
          </button>
        </div>
      </div>
      {!sectionsCollapsed.routingTable &&
        (routes.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>Interface</th>
                  <th>Destination</th>
                  <th>Gateway</th>
                  <th>Metric</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route, index) => (
                  <tr key={route.destination || index}>
                    <td>
                      <strong>{route.interface || 'N/A'}</strong>
                    </td>
                    <td>
                      <code>{route.destination || 'N/A'}</code>
                    </td>
                    <td>
                      <code>{route.gateway || 'N/A'}</code>
                    </td>
                    <td>N/A</td>
                    <td>
                      <span className="badge text-bg-dark">Static</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            <p>No routing table data available or monitoring endpoint not configured.</p>
          </div>
        ))}
    </div>
  </div>
);

RoutingTable.propTypes = {
  routes: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default RoutingTable;
