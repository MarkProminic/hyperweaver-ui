import PropTypes from 'prop-types';

import { formatSpeed } from './NetworkingUtils';

const getClassTagColor = ifaceClass => {
  if (ifaceClass === 'phys') {
    return 'text-bg-primary';
  }
  if (ifaceClass === 'vnic') {
    return 'text-bg-info';
  }
  return 'text-bg-dark';
};

const InterfacesTable = ({
  networkInterfaces,
  interfaceSort,
  handleInterfaceSort,
  getSortIcon,
  resetInterfaceSort,
  sectionsCollapsed,
  toggleSection,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-link fs-5 fw-bold mb-0 p-0"
            onClick={resetInterfaceSort}
            title="Click to reset sorting to default"
          >
            <i className="fas fa-ethernet me-2" />
            Network Interfaces ({networkInterfaces.length} interfaces)
            {interfaceSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => toggleSection('interfaces')}
            title={sectionsCollapsed.interfaces ? 'Expand section' : 'Collapse section'}
          >
            <i
              className={`fas ${sectionsCollapsed.interfaces ? 'fa-chevron-down' : 'fa-chevron-up'}`}
            />
          </button>
        </div>
      </div>
      {!sectionsCollapsed.interfaces &&
        (networkInterfaces.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('link')}
                    title="Click to sort by interface name"
                  >
                    Link <i className={`fas ${getSortIcon(interfaceSort, 'link')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('class')}
                    title="Click to sort by interface class"
                  >
                    Class <i className={`fas ${getSortIcon(interfaceSort, 'class')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('state')}
                    title="Click to sort by interface state"
                  >
                    State <i className={`fas ${getSortIcon(interfaceSort, 'state')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('speed')}
                    title="Click to sort by interface speed"
                  >
                    Speed <i className={`fas ${getSortIcon(interfaceSort, 'speed')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('mtu')}
                    title="Click to sort by MTU"
                  >
                    MTU <i className={`fas ${getSortIcon(interfaceSort, 'mtu')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('macaddress')}
                    title="Click to sort by MAC address"
                  >
                    MAC Address <i className={`fas ${getSortIcon(interfaceSort, 'macaddress')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('vid')}
                    title="Click to sort by VLAN ID"
                  >
                    VLAN <i className={`fas ${getSortIcon(interfaceSort, 'vid')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleInterfaceSort('zone')}
                    title="Click to sort by zone"
                  >
                    Zone <i className={`fas ${getSortIcon(interfaceSort, 'zone')}`} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {networkInterfaces.map(iface => (
                  <tr key={iface.link}>
                    <td>
                      <strong>{iface.link}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getClassTagColor(iface.class)}`}>
                        {iface.class}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${iface.state === 'up' ? 'text-bg-success' : 'text-bg-danger'}`}
                      >
                        {iface.state}
                      </span>
                    </td>
                    <td>{formatSpeed(iface.speed)}</td>
                    <td>{iface.mtu || 'N/A'}</td>
                    <td>
                      <code>{iface.macaddress || 'N/A'}</code>
                    </td>
                    <td>{iface.vid || 'N/A'}</td>
                    <td>
                      {iface.zone && iface.zone !== '--' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-warning py-1 px-2 small"
                          onClick={() =>
                            (window.location.href = `/ui/machines?machine=${encodeURIComponent(iface.zone)}`)
                          }
                          title={`Go to zone: ${iface.zone}`}
                        >
                          <i className="fas fa-external-link-alt me-2" />
                          {iface.zone}
                        </button>
                      ) : (
                        <span className="text-muted">Global</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            <p>No network interface data available or monitoring endpoint not configured.</p>
          </div>
        ))}
    </div>
  </div>
);

InterfacesTable.propTypes = {
  networkInterfaces: PropTypes.arrayOf(
    PropTypes.shape({
      link: PropTypes.string.isRequired,
      class: PropTypes.string,
      state: PropTypes.string,
      speed: PropTypes.number,
      mtu: PropTypes.number,
      macaddress: PropTypes.string,
      vid: PropTypes.number,
      zone: PropTypes.string,
    })
  ).isRequired,
  interfaceSort: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleInterfaceSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  resetInterfaceSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.shape({
    interfaces: PropTypes.bool.isRequired,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default InterfacesTable;
