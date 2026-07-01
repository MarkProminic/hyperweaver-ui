import PropTypes from 'prop-types';

const formatBandwidth = mbps => {
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`;
  }
  if (mbps > 0) {
    return `${(mbps * 1024).toFixed(0)} KB/s`;
  }
  return '0 B/s';
};

const getTotalIOClass = totalMBps => {
  if (totalMBps > 50) {
    return 'text-bg-danger';
  }
  if (totalMBps > 10) {
    return 'text-bg-warning';
  }
  if (totalMBps > 0) {
    return 'text-bg-success';
  }
  return 'text-bg-secondary';
};

const DiskIOTable = ({
  diskIOStats,
  diskIOSort,
  resetDiskIOSort,
  sectionsCollapsed,
  toggleSection,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="fs-5 fw-bold mb-0 cursor-pointer btn btn-link p-0"
            onClick={resetDiskIOSort}
            title="Click to reset sorting to default"
            type="button"
          >
            <i className="fas fa-chart-bar me-2" />
            <span>Real-Time Disk I/O Statistics ({diskIOStats.length})</span>
            {diskIOSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-link btn-sm"
            type="button"
            onClick={() => toggleSection('diskIO')}
            title={sectionsCollapsed.diskIO ? 'Expand section' : 'Collapse section'}
          >
            <i
              className={`fas ${sectionsCollapsed.diskIO ? 'fa-chevron-down' : 'fa-chevron-up'}`}
            />
          </button>
        </div>
      </div>
      {!sectionsCollapsed.diskIO && (
        <>
          {diskIOStats.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover table-sm">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Pool</th>
                    <th>Read Ops</th>
                    <th>Write Ops</th>
                    <th>Read Bandwidth</th>
                    <th>Write Bandwidth</th>
                    <th>Total I/O</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {diskIOStats.map(io => {
                    const readMBps = (io.read_bandwidth_bytes || 0) / (1024 * 1024);
                    const writeMBps = (io.write_bandwidth_bytes || 0) / (1024 * 1024);
                    const totalMBps = readMBps + writeMBps;

                    return (
                      <tr key={`diskio-${io.device_name}-${io.scan_timestamp}`}>
                        <td>
                          <strong>{io.device_name}</strong>
                        </td>
                        <td>
                          <span className="badge text-bg-primary">{io.pool}</span>
                        </td>
                        <td>{io.read_ops}</td>
                        <td>{io.write_ops}</td>
                        <td>
                          <span className="badge text-bg-info">{formatBandwidth(readMBps)}</span>
                        </td>
                        <td>
                          <span className="badge text-bg-warning">
                            {formatBandwidth(writeMBps)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getTotalIOClass(totalMBps)}`}>
                            {formatBandwidth(totalMBps)}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {new Date(io.scan_timestamp).toLocaleTimeString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p>No disk I/O statistics available. The backend may still be collecting data.</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

DiskIOTable.propTypes = {
  diskIOStats: PropTypes.array.isRequired,
  diskIOSort: PropTypes.array.isRequired,
  resetDiskIOSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default DiskIOTable;
