import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

import { getCategoryTagClass } from './DeviceUtils';

const DeviceDetailsModal = ({ selectedDevice, setSelectedDevice }) => {
  const { t } = useTranslation();

  if (!selectedDevice) {
    return null;
  }

  return (
    <ContentModal
      isOpen={!!selectedDevice}
      onClose={() => setSelectedDevice(null)}
      title={t('host.deviceDetailsModal.title')}
      icon="fas fa-microchip"
    >
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.deviceName')}</strong>
                  </td>
                  <td>{selectedDevice.device_name || t('host.deviceDetailsModal.unknown')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.vendor')}</strong>
                  </td>
                  <td>{selectedDevice.vendor_name || t('host.deviceDetailsModal.unknown')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.vendorId')}</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.vendor_id || t('host.deviceDetailsModal.na')}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.deviceId')}</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.device_id || t('host.deviceDetailsModal.na')}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.pciAddress')}</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.pci_address || t('host.deviceDetailsModal.na')}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.category')}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${getCategoryTagClass(selectedDevice.device_category)}`}
                    >
                      {selectedDevice.device_category || t('host.deviceDetailsModal.other')}
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
                    <strong>{t('host.deviceDetailsModal.driverName')}</strong>
                  </td>
                  <td>{selectedDevice.driver_name || t('host.deviceDetailsModal.none')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.driverInstance')}</strong>
                  </td>
                  <td>
                    {selectedDevice.driver_instance !== undefined
                      ? selectedDevice.driver_instance
                      : t('host.deviceDetailsModal.na')}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.driverAttached')}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${selectedDevice.driver_attached ? 'text-bg-success' : 'text-bg-warning'}`}
                    >
                      {selectedDevice.driver_attached
                        ? t('host.deviceDetailsModal.yes')
                        : t('host.deviceDetailsModal.no')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.pptCapable')}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${selectedDevice.ppt_capable ? 'text-bg-success' : 'text-bg-dark'}`}
                    >
                      {selectedDevice.ppt_capable
                        ? t('host.deviceDetailsModal.yes')
                        : t('host.deviceDetailsModal.no')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.pptDevicePath')}</strong>
                  </td>
                  <td>
                    <code>{selectedDevice.ppt_device_path || t('host.deviceDetailsModal.na')}</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.deviceDetailsModal.scanTimestamp')}</strong>
                  </td>
                  <td>
                    {selectedDevice.scan_timestamp
                      ? new Date(selectedDevice.scan_timestamp).toLocaleString()
                      : t('host.deviceDetailsModal.unknown')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDevice.assigned_to_zones?.length > 0 && (
        <div className="mt-4">
          <h5 className="fs-6 text-muted">{t('host.deviceDetailsModal.zoneAssignments')}</h5>
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
              {t('host.deviceDetailsModal.alsoInNetworkInterfaces')}
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
