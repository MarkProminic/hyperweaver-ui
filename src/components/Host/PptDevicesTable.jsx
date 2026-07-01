import PropTypes from 'prop-types';

const PptDevicesTable = ({ pptStatus, sectionsCollapsed, toggleSection, setSelectedDevice }) => {
  if (!pptStatus.ppt_devices || pptStatus.ppt_devices.length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-bolt me-2" />
              <span>PPT-Capable Devices ({pptStatus.ppt_devices.length} devices)</span>
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('pptDevices')}
              title={sectionsCollapsed.pptDevices ? 'Expand section' : 'Collapse section'}
            >
              <i
                className={`fas ${sectionsCollapsed.pptDevices ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.pptDevices && (
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>PCI Address</th>
                  <th>PPT Device Path</th>
                  <th>Assignment Status</th>
                  <th>Assigned Zones</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pptStatus.ppt_devices.map((device, index) => (
                  <tr key={device.id || index}>
                    <td>
                      <strong>{device.device_name || 'Unknown Device'}</strong>
                    </td>
                    <td>
                      <code>{device.pci_address || 'N/A'}</code>
                    </td>
                    <td>
                      <code>{device.ppt_device_path || 'N/A'}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          device.assigned_to_zones?.length ? 'text-bg-warning' : 'text-bg-success'
                        }`}
                      >
                        {device.assigned_to_zones?.length ? 'Assigned' : 'Available'}
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
                    <td>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => setSelectedDevice(device)}
                        title="View device details"
                        type="button"
                      >
                        <i className="fas fa-info-circle me-2" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

PptDevicesTable.propTypes = {
  pptStatus: PropTypes.shape({
    ppt_devices: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.any,
        device_name: PropTypes.string,
        pci_address: PropTypes.string,
        ppt_device_path: PropTypes.string,
        assigned_to_zones: PropTypes.arrayOf(PropTypes.string),
      })
    ),
  }).isRequired,
  sectionsCollapsed: PropTypes.shape({
    pptDevices: PropTypes.bool,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
  setSelectedDevice: PropTypes.func.isRequired,
};

export default PptDevicesTable;
