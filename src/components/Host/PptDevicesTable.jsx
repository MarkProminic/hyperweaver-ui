import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const PptDevicesTable = ({ pptStatus, sectionsCollapsed, toggleSection, setSelectedDevice }) => {
  const { t } = useTranslation();
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
              <span>
                {t('host.pptDevicesTable.title', { count: pptStatus.ppt_devices.length })}
              </span>
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('pptDevices')}
              title={
                sectionsCollapsed.pptDevices
                  ? t('host.pptDevicesTable.expandSection')
                  : t('host.pptDevicesTable.collapseSection')
              }
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
                  <th>{t('host.pptDevicesTable.deviceName')}</th>
                  <th>{t('host.pptDevicesTable.pciAddress')}</th>
                  <th>{t('host.pptDevicesTable.pptDevicePath')}</th>
                  <th>{t('host.pptDevicesTable.assignmentStatus')}</th>
                  <th>{t('host.pptDevicesTable.assignedZones')}</th>
                  <th>{t('host.pptDevicesTable.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pptStatus.ppt_devices.map((device, index) => (
                  <tr key={device.id || index}>
                    <td>
                      <strong>
                        {device.device_name || t('host.pptDevicesTable.unknownDevice')}
                      </strong>
                    </td>
                    <td>
                      <code>{device.pci_address || t('host.pptDevicesTable.notAvailable')}</code>
                    </td>
                    <td>
                      <code>
                        {device.ppt_device_path || t('host.pptDevicesTable.notAvailable')}
                      </code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          device.assigned_to_zones?.length ? 'text-bg-warning' : 'text-bg-success'
                        }`}
                      >
                        {device.assigned_to_zones?.length
                          ? t('host.pptDevicesTable.assigned')
                          : t('host.pptDevicesTable.available')}
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
                        <span className="text-muted">{t('host.pptDevicesTable.none')}</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => setSelectedDevice(device)}
                        title={t('host.pptDevicesTable.viewDeviceDetails')}
                        type="button"
                      >
                        <i className="fas fa-info-circle me-2" />
                        <span>{t('host.pptDevicesTable.details')}</span>
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
