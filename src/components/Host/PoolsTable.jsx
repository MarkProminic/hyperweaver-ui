import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
              title={t('host.poolsTable.resetSortTitle')}
            >
              <i className="fas fa-database me-2" />
              <span>
                {t('host.poolsTable.zfsStoragePoolsCount', { count: storagePools.length })}
              </span>
              {poolSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link btn-sm"
              type="button"
              onClick={() => toggleSection('pools')}
              title={
                sectionsCollapsed.pools
                  ? t('host.poolsTable.expandSection')
                  : t('host.poolsTable.collapseSection')
              }
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
                        title={t('host.poolsTable.sortByPoolNameTitle')}
                      >
                        {t('host.poolsTable.thPoolName')}{' '}
                        <i className={`fas ${getSortIcon(poolSort, 'pool')}`} />
                      </th>
                      <th
                        className="cursor-pointer"
                        onClick={e => handlePoolSort('health', e)}
                        title={t('host.poolsTable.sortByHealthTitle')}
                      >
                        {t('host.poolsTable.thHealth')}{' '}
                        <i className={`fas ${getSortIcon(poolSort, 'health')}`} />
                      </th>
                      <th>{t('host.poolsTable.thSize')}</th>
                      <th>{t('host.poolsTable.thUsed')}</th>
                      <th>{t('host.poolsTable.thAvailable')}</th>
                      <th>{t('host.poolsTable.thUsagePercent')}</th>
                      <th>{t('host.poolsTable.thDedupRatio')}</th>
                      <th>{t('host.poolsTable.thFragmentation')}</th>
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
                              {pool.health || pool.status || t('host.poolsTable.unknown')}
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
                <p>{t('host.poolsTable.noPoolData')}</p>
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
