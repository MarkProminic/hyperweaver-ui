import PropTypes from 'prop-types';

const IpAddressTable = ({ ipAddresses, sectionsCollapsed, toggleSection }) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h4 className="fs-5 fw-bold mb-0">
            <i className="fas fa-globe me-2" />
            IP Addresses
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => toggleSection('ipAddresses')}
            title={sectionsCollapsed.ipAddresses ? 'Expand section' : 'Collapse section'}
          >
            <i
              className={`fas ${sectionsCollapsed.ipAddresses ? 'fa-chevron-down' : 'fa-chevron-up'}`}
            />
          </button>
        </div>
      </div>
      {!sectionsCollapsed.ipAddresses &&
        (ipAddresses.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>Interface</th>
                  <th>IP Address</th>
                  <th>Netmask/Prefix</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ipAddresses.map(ip => (
                  <tr key={`${ip.interface}-${ip.ip_address}`}>
                    <td>
                      <strong>{ip.interface}</strong>
                    </td>
                    <td>
                      <code>{ip.ip_address}</code>
                    </td>
                    <td>
                      <code>{ip.prefix_length ? `/${ip.prefix_length}` : 'N/A'}</code>
                    </td>
                    <td>
                      <span className="badge text-bg-info">{ip.ip_version || 'IPv4'}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${ip.state === 'ok' || ip.state === 'up' ? 'text-bg-success' : 'text-bg-warning'}`}
                      >
                        {ip.state || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            <p>No IP address data available or monitoring endpoint not configured.</p>
          </div>
        ))}
    </div>
  </div>
);

IpAddressTable.propTypes = {
  ipAddresses: PropTypes.arrayOf(
    PropTypes.shape({
      interface: PropTypes.string.isRequired,
      ip_address: PropTypes.string.isRequired,
      prefix_length: PropTypes.number,
      ip_version: PropTypes.string,
      state: PropTypes.string,
    })
  ).isRequired,
  sectionsCollapsed: PropTypes.shape({
    ipAddresses: PropTypes.bool.isRequired,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default IpAddressTable;
