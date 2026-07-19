import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
}) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
              onClick={() => handleDeviceSort('device_name')}
              title={t('host.deviceInventoryTable.resetSortTitle')}
              type="button"
            >
              <i className="fas fa-microchip me-2" />
              <span>
                {t('host.deviceInventoryTable.titleWithCount', { count: devices.length })}
              </span>
              {deviceSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-warning"
              onClick={handleDeviceRefresh}
              disabled={loading}
              title={t('host.deviceInventoryTable.discoverTitle')}
            >
              {loading && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              <i className="fas fa-sync me-2" />
              <span>{t('host.deviceInventoryTable.discoverButton')}</span>
            </button>
            <button
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('inventory')}
              title={
                sectionsCollapsed.inventory
                  ? t('host.deviceInventoryTable.expand')
                  : t('host.deviceInventoryTable.collapse')
              }
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
                      title={t('host.deviceInventoryTable.sortNameTitle')}
                    >
                      {t('host.deviceInventoryTable.nameHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'device_name')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('vendor_name')}
                      title={t('host.deviceInventoryTable.sortVendorTitle')}
                    >
                      {t('host.deviceInventoryTable.vendorHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'vendor_name')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('pci_address')}
                      title={t('host.deviceInventoryTable.sortPciAddressTitle')}
                    >
                      {t('host.deviceInventoryTable.pciAddressHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'pci_address')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('device_category')}
                      title={t('host.deviceInventoryTable.sortCategoryTitle')}
                    >
                      {t('host.deviceInventoryTable.categoryHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'device_category')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('driver_name')}
                      title={t('host.deviceInventoryTable.sortDriverTitle')}
                    >
                      {t('host.deviceInventoryTable.driverHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'driver_name')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('driver_attached')}
                      title={t('host.deviceInventoryTable.sortStatusTitle')}
                    >
                      {t('host.deviceInventoryTable.statusHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'driver_attached')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDeviceSort('ppt_enabled')}
                      title={t('host.deviceInventoryTable.sortPptStatusTitle')}
                    >
                      {t('host.deviceInventoryTable.pptStatusHeader')}{' '}
                      <i className={`fas ${getSortIcon(deviceSort, 'ppt_enabled')}`} />
                    </th>
                    <th>{t('host.deviceInventoryTable.assignedToHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => (
                    <tr
                      key={device.id || index}
                      className="cursor-pointer"
                      onClick={() => setSelectedDevice(device)}
                      title={t('host.deviceInventoryTable.rowTitle')}
                    >
                      <td>
                        <strong>
                          {device.device_name || t('host.deviceInventoryTable.unknownDevice')}
                        </strong>
                      </td>
                      <td>{device.vendor_name || t('host.deviceInventoryTable.unknown')}</td>
                      <td>
                        <code>
                          {device.pci_address || t('host.deviceInventoryTable.notAvailable')}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${getCategoryTagClass(device.device_category)}`}>
                          {device.device_category || t('host.deviceInventoryTable.otherCategory')}
                        </span>
                      </td>
                      <td>{device.driver_name || t('host.deviceInventoryTable.none')}</td>
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
                          <span className="text-muted">{t('host.deviceInventoryTable.none')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p>{t('host.deviceInventoryTable.empty')}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

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
