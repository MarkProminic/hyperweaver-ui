import PropTypes from 'prop-types';

import { formatBytes, getHealthColor, parseSize } from './StorageUtils';

const PoolsTable = ({
  storagePools,
  poolSort,
  handlePoolSort,
  getSortIcon,
  resetPoolSort,
  sectionsCollapsed,
  toggleSection,
}) => {
  const getUsageColor = percent => {
    if (percent > 80) {
      return 'text-bg-danger';
    }
    if (percent > 60) {
      return 'text-bg-warning';
    }
    return 'text-bg-success';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link fs-5 fw-bold mb-0 p-0"
              type="button"
              onClick={resetPoolSort}
              title="Click to reset sorting to default"
            >
              <i className="fas fa-database me-2" />
              <span>ZFS Storage Pools ({storagePools.length})</span>
              {poolSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link btn-sm"
              type="button"
              onClick={() => toggleSection('pools')}
              title={sectionsCollapsed.pools ? 'Expand section' : 'Collapse section'}
            >
              <i
                className={`fas ${sectionsCollapsed.pools ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.pools && (
          <>
            {storagePools.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover table-sm">
                  <thead>
                    <tr>
                      <th
                        className="cursor-pointer"
                        onClick={e => handlePoolSort('pool', e)}
                        title="Click to sort by pool name. Hold Ctrl/Cmd to add to existing sort."
                      >
                        Pool Name <i className={`fas ${getSortIcon(poolSort, 'pool')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handlePoolSort('health', e)}
                        title="Click to sort by health status. Hold Ctrl/Cmd to add to existing sort."
                      >
                        Health <i className={`fas ${getSortIcon(poolSort, 'health')}`} />
                      </th>
                      <th>Size</th>
                      <th>Used</th>
                      <th>Available</th>
                      <th>Usage %</th>
                      <th>Dedup Ratio</th>
                      <th>Fragmentation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storagePools.map(pool => {
                      // The agent serves *_bytes as STRINGS (Sequelize model transport) —
                      // coerce before adding or `+` concatenates into petabyte garbage
                      const allocBytes = parseSize(pool.alloc) || Number(pool.alloc_bytes) || 0;
                      const freeBytes = parseSize(pool.free) || Number(pool.free_bytes) || 0;
                      const totalBytes = allocBytes + freeBytes;
                      const usagePercent =
                        totalBytes > 0 ? ((allocBytes / totalBytes) * 100).toFixed(1) : 0;

                      return (
                        <tr key={pool.pool || pool.name}>
                          <td>
                            <strong>{pool.pool || pool.name}</strong>
                          </td>
                          <td>
                            <span className={`badge ${getHealthColor(pool.health || pool.status)}`}>
                              {pool.health || pool.status || 'Unknown'}
                            </span>
                          </td>
                          <td>{formatBytes(totalBytes)}</td>
                          <td>{formatBytes(allocBytes)}</td>
                          <td>{formatBytes(freeBytes)}</td>
                          <td>
                            <span className={`badge ${getUsageColor(usagePercent)}`}>
                              {usagePercent}%
                            </span>
                          </td>
                          <td>{pool.dedup || pool.dedupRatio || '1.00x'}</td>
                          <td>{pool.fragmentation || pool.frag || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                <p>No ZFS pool data available or monitoring endpoint not configured.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

PoolsTable.propTypes = {
  storagePools: PropTypes.array.isRequired,
  poolSort: PropTypes.array.isRequired,
  handlePoolSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  resetPoolSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.shape({
    pools: PropTypes.bool,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default PoolsTable;
