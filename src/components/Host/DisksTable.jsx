import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatBytes, getHealthColor } from './StorageUtils';

const getTemperatureTagClass = temperature => {
  if (temperature > 60) {
    return 'text-bg-danger';
  }
  if (temperature > 45) {
    return 'text-bg-warning';
  }
  return 'text-bg-success';
};

const getDiskKey = disk =>
  disk.serial_number ||
  disk.serial ||
  disk.serialNumber ||
  disk.device_name ||
  disk.device ||
  disk.name;

const DisksTable = ({
  storageDisks,
  diskSort,
  handleDiskSort,
  getSortIcon,
  resetDiskSort,
  sectionsCollapsed,
  toggleSection,
}) => {
  const { t } = useTranslation();

  const getPoolDisplay = disk => {
    if (disk.pool_assignment) {
      return <strong>{disk.pool_assignment}</strong>;
    }
    if (disk.pool) {
      return <strong>{disk.pool}</strong>;
    }
    return (
      <span className="text-muted">
        {disk.is_available
          ? t('host.disksTable.availableStatus')
          : t('host.disksTable.unassignedStatus')}
      </span>
    );
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
              onClick={resetDiskSort}
              title={t('host.disksTable.resetSortTitle')}
              type="button"
            >
              <i className="fas fa-hard-drive me-2" />
              <span>{t('host.disksTable.titleWithCount', { count: storageDisks.length })}</span>
              {diskSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link btn-sm"
              type="button"
              onClick={() => toggleSection('disks')}
              title={
                sectionsCollapsed.disks
                  ? t('host.disksTable.expand')
                  : t('host.disksTable.collapse')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.disks ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.disks && (
          <>
            {storageDisks.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover table-sm">
                  <thead>
                    <tr>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('device_name')}
                        title={t('host.disksTable.sortDeviceTitle')}
                      >
                        {t('host.disksTable.deviceHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'device_name')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('model')}
                        title={t('host.disksTable.sortModelTitle')}
                      >
                        {t('host.disksTable.modelHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'model')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('serial_number')}
                        title={t('host.disksTable.sortSerialTitle')}
                      >
                        {t('host.disksTable.serialHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'serial_number')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('capacity_bytes')}
                        title={t('host.disksTable.sortSizeTitle')}
                      >
                        {t('host.disksTable.sizeHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'capacity_bytes')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('disk_type')}
                        title={t('host.disksTable.sortTypeTitle')}
                      >
                        {t('host.disksTable.typeHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'disk_type')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('health')}
                        title={t('host.disksTable.sortHealthTitle')}
                      >
                        {t('host.disksTable.healthHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'health')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('temperature')}
                        title={t('host.disksTable.sortTemperatureTitle')}
                      >
                        {t('host.disksTable.temperatureHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'temperature')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={() => handleDiskSort('pool_assignment')}
                        title={t('host.disksTable.sortPoolTitle')}
                      >
                        {t('host.disksTable.poolHeader')}{' '}
                        <i className={`fas ${getSortIcon(diskSort, 'pool_assignment')}`} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {storageDisks.map(disk => (
                      <tr key={getDiskKey(disk)}>
                        <td>
                          <strong>{disk.device_name || disk.device || disk.name}</strong>
                        </td>
                        <td>{disk.model || disk.product || t('host.disksTable.notAvailable')}</td>
                        <td>
                          <code className="small">
                            {disk.serial_number ||
                              disk.serial ||
                              disk.serialNumber ||
                              t('host.disksTable.notAvailable')}
                          </code>
                        </td>
                        <td>{formatBytes(disk.capacity_bytes || disk.size || disk.capacity)}</td>
                        <td>
                          <span className="badge text-bg-info">
                            {disk.disk_type ||
                              disk.type ||
                              disk.mediaType ||
                              t('host.disksTable.unknown')}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getHealthColor(disk.health || disk.status)}`}>
                            {disk.health || disk.status || t('host.disksTable.unknown')}
                          </span>
                        </td>
                        <td>
                          {disk.temperature ? (
                            <span className={`badge ${getTemperatureTagClass(disk.temperature)}`}>
                              {disk.temperature}°C
                            </span>
                          ) : (
                            <span className="badge text-bg-info">
                              {t('host.disksTable.notAvailable')}
                            </span>
                          )}
                        </td>
                        <td>{getPoolDisplay(disk)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                <p>{t('host.disksTable.empty')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

DisksTable.propTypes = {
  storageDisks: PropTypes.array.isRequired,
  diskSort: PropTypes.array.isRequired,
  handleDiskSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  resetDiskSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default DisksTable;
