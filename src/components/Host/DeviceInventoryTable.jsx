import PropTypes from 'prop-types';

import {
  getCategoryTagClass,
  getDeviceStatusColor,
  getDeviceStatusText,
  getPPTStatusColor,
  getPPTStatusText,
} from './DeviceUtils';

const DeviceInventoryTable = ({
  devices,
  deviceSort,
  handleDeviceSort,
  getSortIcon,
  setSelectedDevice,
  sectionsCollapsed,
  toggleSection,
  loading,
  handleDeviceRefresh,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
            onClick={() => handleDeviceSort('device_name')}
            title="Click to reset sorting to default"
            type="button"
          >
            <i className="fas fa-microchip me-2" />
            <span>PCI Device Inventory ({devices.length} devices)</span>
            {deviceSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-warning"
            onClick={handleDeviceRefresh}
            disabled={loading}
            title="Refresh device discovery"
          >
            {loading && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-sync me-2" />
            <span>Discover</span>
          </button>
          <button
            className="btn btn-sm btn-link"
            onClick={() => toggleSection('inventory')}
            title={sectionsCollapsed.inventory ? 'Expand section' : 'Collapse section'}
          >
            <i
              className={`fas ${sectionsCollapsed.inventory ? 'fa-chevron-down' : 'fa-chevron-up'}`}
            />
          </button>
        </div>
      </div>
      {!sectionsCollapsed.inventory &&
        (devices.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('device_name')}
                    title="Click to sort by device name"
                  >
                    Device Name <i className={`fas ${getSortIcon(deviceSort, 'device_name')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('vendor_name')}
                    title="Click to sort by vendor"
                  >
                    Vendor <i className={`fas ${getSortIcon(deviceSort, 'vendor_name')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('pci_address')}
                    title="Click to sort by PCI address"
                  >
                    PCI Address <i className={`fas ${getSortIcon(deviceSort, 'pci_address')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('device_category')}
                    title="Click to sort by category"
                  >
                    Category <i className={`fas ${getSortIcon(deviceSort, 'device_category')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('driver_name')}
                    title="Click to sort by driver"
                  >
                    Driver <i className={`fas ${getSortIcon(deviceSort, 'driver_name')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('driver_attached')}
                    title="Click to sort by driver status"
                  >
                    Status <i className={`fas ${getSortIcon(deviceSort, 'driver_attached')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleDeviceSort('ppt_enabled')}
                    title="Click to sort by PPT status"
                  >
                    PPT Status <i className={`fas ${getSortIcon(deviceSort, 'ppt_enabled')}`} />
                  </th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, index) => (
                  <tr
                    key={device.id || index}
                    className="cursor-pointer"
                    onClick={() => setSelectedDevice(device)}
                    title="Click to view device details"
                  >
                    <td>
                      <strong>{device.device_name || 'Unknown Device'}</strong>
                    </td>
                    <td>{device.vendor_name || 'Unknown'}</td>
                    <td>
                      <code>{device.pci_address || 'N/A'}</code>
                    </td>
                    <td>
                      <span className={`badge ${getCategoryTagClass(device.device_category)}`}>
                        {device.device_category || 'other'}
                      </span>
                    </td>
                    <td>{device.driver_name || 'None'}</td>
                    <td>
                      <span className={`badge ${getDeviceStatusColor(device)}`}>
                        {getDeviceStatusText(device)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getPPTStatusColor(device)}`}>
                        {getPPTStatusText(device)}
                      </span>
                    </td>
                    <td>
                      {device.assigned_to_zones?.length ? (
                        <div className="d-flex flex-wrap gap-1">
                          {device.assigned_to_zones.map(zone => (
                            <span key={zone} className="badge text-bg-warning">
                              {zone}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            <p>No devices found matching the current filters.</p>
          </div>
        ))}
    </div>
  </div>
);

DeviceInventoryTable.propTypes = {
  devices: PropTypes.array.isRequired,
  deviceSort: PropTypes.array.isRequired,
  handleDeviceSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  setSelectedDevice: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  handleDeviceRefresh: PropTypes.func.isRequired,
};

export default DeviceInventoryTable;
