import PropTypes from 'prop-types';

import { ContentModal } from '../common';

import { getCategoryTagClass } from './DeviceUtils';

const DeviceDetailsModal = ({ selectedDevice, setSelectedDevice }) => {
  if (!selectedDevice) {
    return null;
  }

  return (
    <ContentModal
      isOpen={!!selectedDevice}
      onClose={() => setSelectedDevice(null)}
      title="Device Details"
      icon="fas fa-microchip"
    >
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Device Name</strong>
                  </td>
                  <td>{selectedDevice.device_name || 'Unknown'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Vendor</strong>
                  </td>
                  <td>{selectedDevice.vendor_name || 'Unknown'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Vendor ID</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.vendor_id || 'N/A'}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Device ID</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.device_id || 'N/A'}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>PCI Address</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.pci_address || 'N/A'}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Category</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${getCategoryTagClass(selectedDevice.device_category)}`}
                    >
                      {selectedDevice.device_category || 'other'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Driver Name</strong>
                  </td>
                  <td>{selectedDevice.driver_name || 'None'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Driver Instance</strong>
                  </td>
                  <td>
                    {selectedDevice.driver_instance !== undefined
                      ? selectedDevice.driver_instance
                      : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Driver Attached</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${selectedDevice.driver_attached ? 'text-bg-success' : 'text-bg-warning'}`}
                    >
                      {selectedDevice.driver_attached ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>PPT Capable</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${selectedDevice.ppt_capable ? 'text-bg-success' : 'text-bg-dark'}`}
                    >
                      {selectedDevice.ppt_capable ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>PPT Device Path</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.ppt_device_path || 'N/A'}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Scan Timestamp</strong>
                  </td>
                  <td>
                    {selectedDevice.scan_timestamp
                      ? new Date(selectedDevice.scan_timestamp).toLocaleString()
                      : 'Unknown'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDevice.assigned_to_zones?.length > 0 && (
        <div className="mt-4">
          <h5 className="fs-6 text-muted">Zone Assignments</h5>
          <div className="d-flex flex-wrap gap-1">
            {selectedDevice.assigned_to_zones.map(zone => (
              <span
                key={zone}
                className="badge text-bg-warning d-inline-flex align-items-center gap-1"
              >
                <i className="fas fa-cube" />
                <span>{zone}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedDevice.found_in_network_interfaces && (
        <div className="mt-4">
          <div className="alert alert-info">
            <p>
              <i className="fas fa-ethernet me-2" />
              This device is also found in network interfaces.
            </p>
          </div>
        </div>
      )}
    </ContentModal>
  );
};

DeviceDetailsModal.propTypes = {
  selectedDevice: PropTypes.object,
  setSelectedDevice: PropTypes.func.isRequired,
};

export default DeviceDetailsModal;
