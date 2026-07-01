import PropTypes from 'prop-types';

import { calculateBandwidth, formatBandwidth, getBandwidthColor } from './NetworkingUtils';

const BandwidthTable = ({
  networkUsage,
  bandwidthSort,
  handleBandwidthSort,
  getSortIcon,
  resetBandwidthSort,
  sectionsCollapsed,
  toggleSection,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-link fs-5 fw-bold mb-0 p-0"
            onClick={resetBandwidthSort}
            title="Click to reset sorting to default"
            type="button"
          >
            <i className="fas fa-chart-line me-2" />
            Real-Time Network Bandwidth
            {bandwidthSort.length > 1 && <i className="fas fa-sort-amount-down text-info ms-2" />}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => toggleSection('bandwidth')}
            title={sectionsCollapsed.bandwidth ? 'Expand section' : 'Collapse section'}
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
                    title="Click to sort by interface name"
                  >
                    Interface <i className={`fas ${getSortIcon(bandwidthSort, 'link')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('totalMbps')}
                    title="Click to sort by total bandwidth"
                  >
                    Total Bandwidth{' '}
                    <i className={`fas ${getSortIcon(bandwidthSort, 'totalMbps')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('rxMbps')}
                    title="Click to sort by RX rate"
                  >
                    RX Rate <i className={`fas ${getSortIcon(bandwidthSort, 'rxMbps')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('txMbps')}
                    title="Click to sort by TX rate"
                  >
                    TX Rate <i className={`fas ${getSortIcon(bandwidthSort, 'txMbps')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('time_delta_seconds')}
                    title="Click to sort by measurement interval"
                  >
                    Interval{' '}
                    <i className={`fas ${getSortIcon(bandwidthSort, 'time_delta_seconds')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('ipackets_delta')}
                    title="Click to sort by RX packet count"
                  >
                    RX Packets{' '}
                    <i className={`fas ${getSortIcon(bandwidthSort, 'ipackets_delta')}`} />
                  </th>
                  <th
                    className="cursor-pointer"
                    onClick={() => handleBandwidthSort('opackets_delta')}
                    title="Click to sort by TX packet count"
                  >
                    TX Packets{' '}
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
                          : 'N/A'}
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
            <p>
              No real-time bandwidth data available. The backend may still be collecting delta
              measurements.
            </p>
          </div>
        ))}
    </div>
  </div>
);

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
