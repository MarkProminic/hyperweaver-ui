import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../Chart';
import Highcharts from '../../Highcharts';

import { createChartOptions } from './chartDefaults';

const DeviceCharts = ({
  diskIOStats,
  getSortedChartEntries,
  expandChart,
  chartRefs,
  seriesVisibility,
  chartSortBy,
}) => {
  const { t } = useTranslation();
  const sortedEntries = getSortedChartEntries();

  if (diskIOStats.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <h5 className="fs-6 fw-bold mb-3">
        <span className="d-inline-flex align-items-center gap-1">
          <span className="me-1">
            <i className="fas fa-chart-line" />
          </span>
          <span>{t('hostCharts.deviceCharts.sectionTitle')}</span>
        </span>
      </h5>
      <div className="row">
        {sortedEntries.map(([deviceName, deviceData]) => {
          const matchedIO = diskIOStats.find(stat => stat.device_name === deviceName);
          if (!matchedIO || !deviceData) {
            return null;
          }

          return (
            <div key={deviceName} className="col-6">
              <div className="is-chart-container position-relative">
                <button
                  className="btn btn-sm btn-link is-chart-expand-button"
                  onClick={() => expandChart(deviceName, 'individual')}
                  title={t('hostCharts.deviceCharts.expandButtonTitle')}
                >
                  <span className="me-1 text-white">
                    <i className="fas fa-expand" />
                  </span>
                </button>
                <Chart
                  key={`chart-${deviceName}`}
                  ref={ref => {
                    if (ref) {
                      chartRefs.current[deviceName] = ref;
                    }
                  }}
                  options={createChartOptions({
                    title: deviceName,
                    animation: Highcharts.svg,
                    series: [
                      {
                        name: 'Read',
                        data: deviceData.readData || [],
                        color: '#64b5f6',
                        fillOpacity: 0.3,
                        visible: seriesVisibility.read,
                      },
                      {
                        name: 'Write',
                        data: deviceData.writeData || [],
                        color: '#ff9800',
                        fillOpacity: 0.3,
                        visible: seriesVisibility.write,
                      },
                      {
                        name: 'Total',
                        data: deviceData.totalData || [],
                        color: '#4caf50',
                        fillOpacity: 0.2,
                        lineWidth: 3,
                        visible: seriesVisibility.total,
                      },
                    ],
                  })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortedEntries.length > 0 && (
        <div className="text-center mt-3">
          <p className="small text-muted">
            Showing all {sortedEntries.length} devices with I/O activity. Sorted by: {chartSortBy}.
          </p>
        </div>
      )}
    </div>
  );
};

DeviceCharts.propTypes = {
  diskIOStats: PropTypes.array.isRequired,
  getSortedChartEntries: PropTypes.func.isRequired,
  expandChart: PropTypes.func.isRequired,
  chartRefs: PropTypes.shape({ current: PropTypes.object }).isRequired,
  seriesVisibility: PropTypes.shape({
    read: PropTypes.bool.isRequired,
    write: PropTypes.bool.isRequired,
    total: PropTypes.bool.isRequired,
  }).isRequired,
  chartSortBy: PropTypes.string.isRequired,
};

export default DeviceCharts;
