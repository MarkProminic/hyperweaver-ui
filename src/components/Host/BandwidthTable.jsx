import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { calculateBandwidth, formatBandwidth, getBandwidthColor } from './NetworkingUtils';

const BandwidthTable = ({
  networkUsage,
  bandwidthSort,
  handleBandwidthSort,
  getSortIcon,
  resetBandwidthSort,
  sectionsCollapsed,
  toggleSection,
}) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link fs-5 fw-bold mb-0 p-0"
              onClick={resetBandwidthSort}
              title={t('host.bandwidthTable.resetSort')}
              type="button"
            >
              <i className="fas fa-chart-line me-2" />
              {t('host.bandwidthTable.title')}
              {bandwidthSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('bandwidth')}
              title={
                sectionsCollapsed.bandwidth
                  ? t('host.bandwidthTable.expand')
                  : t('host.bandwidthTable.collapse')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.bandwidth ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.bandwidth &&
          (networkUsage.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('link')}
                      title={t('host.bandwidthTable.sortByInterface')}
                    >
                      {t('host.bandwidthTable.interface')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'link')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('totalMbps')}
                      title={t('host.bandwidthTable.sortByTotal')}
                    >
                      {t('host.bandwidthTable.totalBandwidth')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'totalMbps')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('rxMbps')}
                      title={t('host.bandwidthTable.sortByRx')}
                    >
                      {t('host.bandwidthTable.rxRate')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'rxMbps')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('txMbps')}
                      title={t('host.bandwidthTable.sortByTx')}
                    >
                      {t('host.bandwidthTable.txRate')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'txMbps')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('time_delta_seconds')}
                      title={t('host.bandwidthTable.sortByInterval')}
                    >
                      {t('host.bandwidthTable.interval')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'time_delta_seconds')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('ipackets_delta')}
                      title={t('host.bandwidthTable.sortByRxPackets')}
                    >
                      {t('host.bandwidthTable.rxPackets')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'ipackets_delta')}`} />
                    </th>
                    <th
                      className="cursor-pointer"
                      onClick={() => handleBandwidthSort('opackets_delta')}
                      title={t('host.bandwidthTable.sortByTxPackets')}
                    >
                      {t('host.bandwidthTable.txPackets')}{' '}
                      <i className={`fas ${getSortIcon(bandwidthSort, 'opackets_delta')}`} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {networkUsage.map(usage => {
                    const bandwidth = calculateBandwidth(usage);
                    return (
                      <tr key={usage.link}>
                        <td>
                          <strong>{usage.link}</strong>
                        </td>
                        <td>
                          <span className={`badge ${getBandwidthColor(bandwidth.totalMbps)}`}>
                            {formatBandwidth(bandwidth.totalMbps)}
                          </span>
                        </td>
                        <td>
                          <span className="badge text-bg-info">
                            ↓ {formatBandwidth(bandwidth.rxMbps)}
                          </span>
                        </td>
                        <td>
                          <span className="badge text-bg-warning">
                            ↑ {formatBandwidth(bandwidth.txMbps)}
                          </span>
                        </td>
                        <td>
                          {usage.time_delta_seconds
                            ? `${usage.time_delta_seconds.toFixed(1)}s`
                            : t('host.bandwidthTable.notAvailable')}
                        </td>
                        <td>
                          <span className="text-info">
                            {usage.ipackets_delta
                              ? parseInt(usage.ipackets_delta).toLocaleString()
                              : '0'}
                          </span>
                        </td>
                        <td>
                          <span className="text-warning">
                            {usage.opackets_delta
                              ? parseInt(usage.opackets_delta).toLocaleString()
                              : '0'}
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
              <p>{t('host.bandwidthTable.noData')}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

BandwidthTable.propTypes = {
  networkUsage: PropTypes.array.isRequired,
  bandwidthSort: PropTypes.array.isRequired,
  handleBandwidthSort: PropTypes.func.isRequired,
  getSortIcon: PropTypes.func.isRequired,
  resetBandwidthSort: PropTypes.func.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default BandwidthTable;
