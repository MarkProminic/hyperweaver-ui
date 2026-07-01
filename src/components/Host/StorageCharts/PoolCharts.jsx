import PropTypes from 'prop-types';

import Chart from '../../Chart';
import Highcharts from '../../Highcharts';

import { createChartOptions } from './chartDefaults';

const PoolCharts = ({
  poolChartData,
  poolIOStats,
  expandChart,
  poolChartRefs,
  seriesVisibility,
}) => {
  const poolEntries = Object.entries(poolChartData).filter(([, data]) => data.totalData.length > 0);

  if (poolIOStats.length === 0 || poolEntries.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <h5 className="fs-6 fw-bold mb-3">
        <span className="d-inline-flex align-items-center gap-1">
          <span className="me-1">
            <i className="fas fa-database" />
          </span>
          <span>ZFS Pool I/O Performance Charts</span>
        </span>
      </h5>
      <div className="row">
        {poolEntries.map(([poolName, poolData]) => {
          const poolIO = poolIOStats.find(pool => pool.pool === poolName);
          if (!poolIO || !poolData) {
            return null;
          }

          return (
            <div key={poolName} className="col-6">
              <div className="is-chart-container position-relative">
                <button
                  className="btn btn-sm btn-link is-chart-expand-button"
                  onClick={() => expandChart(poolName, 'pool')}
                  title="Expand chart to full size"
                >
                  <span className="me-1 text-white">
                    <i className="fas fa-expand" />
                  </span>
                </button>
                <Chart
                  key={`pool-chart-${poolName}`}
                  ref={ref => {
                    if (ref) {
                      poolChartRefs.current[poolName] = ref;
                    }
                  }}
                  options={createChartOptions({
                    title: `${poolName} (${poolIO.pool_type})`,
                    animation: Highcharts.svg,
                    series: [
                      {
                        name: 'Read',
                        data: poolData.readData || [],
                        color: '#64b5f6',
                        fillOpacity: 0.3,
                        visible: seriesVisibility.read,
                      },
                      {
                        name: 'Write',
                        data: poolData.writeData || [],
                        color: '#ff9800',
                        fillOpacity: 0.3,
                        visible: seriesVisibility.write,
                      },
                      {
                        name: 'Total',
                        data: poolData.totalData || [],
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

      {poolEntries.length > 0 && (
        <div className="text-center mt-3">
          <p className="small text-muted">
            Showing {poolEntries.length} ZFS pools with I/O activity.
          </p>
        </div>
      )}
    </div>
  );
};

PoolCharts.propTypes = {
  poolChartData: PropTypes.object.isRequired,
  poolIOStats: PropTypes.array.isRequired,
  expandChart: PropTypes.func.isRequired,
  poolChartRefs: PropTypes.shape({ current: PropTypes.object }).isRequired,
  seriesVisibility: PropTypes.shape({
    read: PropTypes.bool.isRequired,
    write: PropTypes.bool.isRequired,
    total: PropTypes.bool.isRequired,
  }).isRequired,
};

export default PoolCharts;
