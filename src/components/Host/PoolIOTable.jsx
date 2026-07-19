import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const PoolIOTable = ({ poolIOStats, sectionsCollapsed, toggleSection }) => {
  const { t } = useTranslation();
  if (poolIOStats.length === 0) {
    return null;
  }

  const getPoolTypeClass = type => {
    switch (type) {
      case 'raidz2':
        return 'text-bg-success';
      case 'raidz1':
        return 'text-bg-info';
      case 'mirror':
        return 'text-bg-warning';
      default:
        return 'text-bg-dark';
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-database me-2" />
              <span>{t('host.poolIOTable.title', { count: poolIOStats.length })}</span>
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-link btn-sm"
              onClick={() => toggleSection('poolIO')}
              title={
                sectionsCollapsed.poolIO
                  ? t('host.poolIOTable.expandSection')
                  : t('host.poolIOTable.collapseSection')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.poolIO ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.poolIO && (
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm">
              <thead>
                <tr>
                  <th>{t('host.poolIOTable.pool')}</th>
                  <th>{t('host.poolIOTable.type')}</th>
                  <th>{t('host.poolIOTable.allocation')}</th>
                  <th>{t('host.poolIOTable.freeSpace')}</th>
                  <th>{t('host.poolIOTable.readOps')}</th>
                  <th>{t('host.poolIOTable.writeOps')}</th>
                  <th>{t('host.poolIOTable.readBandwidth')}</th>
                  <th>{t('host.poolIOTable.writeBandwidth')}</th>
                  <th>{t('host.poolIOTable.totalWait')}</th>
                  <th>{t('host.poolIOTable.diskWait')}</th>
                  <th>{t('host.poolIOTable.lastUpdated')}</th>
                </tr>
              </thead>
              <tbody>
                {poolIOStats.map(poolIO => {
                  const readBandwidthMB = (poolIO.read_bandwidth_bytes || 0) / (1024 * 1024);
                  const writeBandwidthMB = (poolIO.write_bandwidth_bytes || 0) / (1024 * 1024);

                  return (
                    <tr key={poolIO.pool}>
                      <td>
                        <strong>{poolIO.pool}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getPoolTypeClass(poolIO.pool_type)}`}>
                          {poolIO.pool_type}
                        </span>
                      </td>
                      <td>{poolIO.alloc}</td>
                      <td>{poolIO.free}</td>
                      <td>
                        <span className="badge text-bg-info">{poolIO.read_ops}</span>
                      </td>
                      <td>
                        <span className="badge text-bg-warning">{poolIO.write_ops}</span>
                      </td>
                      <td>
                        <span className="badge text-bg-info">
                          {readBandwidthMB >= 1
                            ? `${readBandwidthMB.toFixed(2)} MB/s`
                            : `${(readBandwidthMB * 1024).toFixed(0)} KB/s`}
                        </span>
                      </td>
                      <td>
                        <span className="badge text-bg-warning">
                          {writeBandwidthMB >= 1
                            ? `${writeBandwidthMB.toFixed(2)} MB/s`
                            : `${(writeBandwidthMB * 1024).toFixed(0)} KB/s`}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">
                          R: {poolIO.total_wait_read}, W: {poolIO.total_wait_write}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">
                          R: {poolIO.disk_wait_read}, W: {poolIO.disk_wait_write}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">
                          {new Date(poolIO.scan_timestamp).toLocaleTimeString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

PoolIOTable.propTypes = {
  poolIOStats: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default PoolIOTable;
