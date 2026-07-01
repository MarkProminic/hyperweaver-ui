import PropTypes from 'prop-types';

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

const getPoolDisplay = disk => {
  if (disk.pool_assignment) {
    return <strong>{disk.pool_assignment}</strong>;
  }
  if (disk.pool) {
    return <strong>{disk.pool}</strong>;
  }
  return <span className="text-muted">{disk.is_available ? 'Available' : 'Unassigned'}</span>;
};

const DisksTable = ({
  storageDisks,
  diskSort,
  handleDiskSort,
  getSortIcon,
  resetDiskSort,
  sectionsCollapsed,
  toggleSection,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
            onClick={resetDiskSort}
            title="Click to reset sorting to default"
            type="button"
          >
            <i className="fas fa-hard-drive me-2" />
            <span>Physical Disks ({storageDisks.length})</span>
            {diskSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-link btn-sm"
            type="button"
            onClick={() => toggleSection('disks')}
            title={sectionsCollapsed.disks ? 'Expand section' : 'Collapse section'}
          >
            <i className={`fas ${sectionsCollapsed.disks ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
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
                      title="Click to sort by device name"
                    >
                      Device <i className={`fas ${getSortIcon(diskSort, 'device_name')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('model')}
                      title="Click to sort by model"
                    >
                      Model <i className={`fas ${getSortIcon(diskSort, 'model')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('serial_number')}
                      title="Click to sort by serial number"
                    >
                      Serial <i className={`fas ${getSortIcon(diskSort, 'serial_number')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('capacity_bytes')}
                      title="Click to sort by capacity"
                    >
                      Size <i className={`fas ${getSortIcon(diskSort, 'capacity_bytes')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('disk_type')}
                      title="Click to sort by disk type"
                    >
                      Type <i className={`fas ${getSortIcon(diskSort, 'disk_type')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('health')}
                      title="Click to sort by health status"
                    >
                      Health <i className={`fas ${getSortIcon(diskSort, 'health')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('temperature')}
                      title="Click to sort by temperature"
                    >
                      Temperature <i className={`fas ${getSortIcon(diskSort, 'temperature')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleDiskSort('pool_assignment')}
                      title="Click to sort by pool assignment"
                    >
                      Pool <i className={`fas ${getSortIcon(diskSort, 'pool_assignment')}`} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {storageDisks.map(disk => (
                    <tr key={getDiskKey(disk)}>
                      <td>
                        <strong>{disk.device_name || disk.device || disk.name}</strong>
                      </td>
                      <td>{disk.model || disk.product || 'N/A'}</td>
                      <td>
                        <code className="small">
                          {disk.serial_number || disk.serial || disk.serialNumber || 'N/A'}
                        </code>
                      </td>
                      <td>{formatBytes(disk.capacity_bytes || disk.size || disk.capacity)}</td>
                      <td>
                        <span className="badge text-bg-info">
                          {disk.disk_type || disk.type || disk.mediaType || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getHealthColor(disk.health || disk.status)}`}>
                          {disk.health || disk.status || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        {disk.temperature ? (
                          <span className={`badge ${getTemperatureTagClass(disk.temperature)}`}>
                            {disk.temperature}°C
                          </span>
                        ) : (
                          <span className="badge text-bg-info">N/A</span>
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
              <p>No physical disk data available or monitoring endpoint not configured.</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

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
