import PropTypes from 'prop-types';

const MachineNetwork = ({ configuration }) => {
  if (!configuration || !configuration.net || configuration.net.length === 0) {
    return null;
  }

  return (
    <div className="card mb-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-network-wired me-2" />
          Network Configuration
        </h4>

        {/* Network Interface and IP Type */}
        <div className="mb-3">
          <div className="table-responsive">
            <table className="table table-striped small">
              <tbody>
                <tr>
                  <td className="px-3 py-2">
                    <strong>Network Interface Driver</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-muted font-monospace">
                      {configuration.netif || 'N/A'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    <strong>IP Type</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-muted font-monospace">
                      {configuration['ip-type'] || 'N/A'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Virtual NICs (dladm show-vnic format) */}
        <div className="mb-3">
          <h5 className="fs-6 text-muted mb-2">Virtual NICs</h5>
          <div className="table-responsive">
            <table className="table table-striped small">
              <thead>
                <tr>
                  <th className="px-3 py-2">LINK</th>
                  <th className="px-3 py-2">OVER</th>
                  <th className="px-3 py-2">MACADDRESS</th>
                  <th className="px-3 py-2">VID</th>
                  <th className="px-3 py-2">MACADDRTYPE</th>
                </tr>
              </thead>
              <tbody>
                {(configuration.net || [])
                  .filter(netInterface => netInterface !== null && netInterface !== undefined)
                  .map((netInterface, index) => (
                    <tr key={netInterface?.['mac-addr'] || index}>
                      <td className="px-3 py-2">
                        <span className="text-muted font-monospace">
                          {netInterface?.['global-nic'] || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-muted font-monospace">
                          {netInterface?.physical || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-muted font-monospace">
                          {netInterface?.['mac-addr'] || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-muted font-monospace">
                          {netInterface?.['vlan-id'] || '0'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-muted font-monospace">
                          {netInterface?.['mac-addr-type'] || 'fixed'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

MachineNetwork.propTypes = {
  configuration: PropTypes.shape({
    netif: PropTypes.string,
    'ip-type': PropTypes.string,
    net: PropTypes.arrayOf(
      PropTypes.shape({
        'global-nic': PropTypes.string,
        physical: PropTypes.string,
        'mac-addr': PropTypes.string,
        'vlan-id': PropTypes.string,
        'mac-addr-type': PropTypes.string,
      })
    ),
  }),
};

export default MachineNetwork;
