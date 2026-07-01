import PropTypes from 'prop-types';

import Chart from '../../Chart';

const MemoryChart = ({ memoryChartData, memorySeriesVisibility, expandChart }) => (
  <div className="col-4">
    <div className="card bg-dark">
      <header className="card-header bg-dark d-flex justify-content-between align-items-center">
        <p className="text-white fw-bold mb-0">
          <span className="d-inline-flex align-items-center gap-1">
            <span className="d-inline-flex align-items-center">
              <i className="fas fa-memory" />
            </span>
            <span>Memory Usage</span>
          </span>
        </p>
        <div>
          <div className="d-flex gap-2">
            <div>
              <button
                className="btn btn-sm btn-light"
                onClick={() => expandChart('memory', 'memory')}
                title="Expand chart to full size"
              >
                <span className="d-inline-flex align-items-center">
                  <i className="fas fa-expand" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="card-body p-2">
        {memoryChartData.used.length > 0 ? (
          <div>
            <Chart
              options={{
                chart: {
                  type: 'spline',
                  height: 200,
                  backgroundColor: '#1e2a3a',
                },
                time: {
                  useUTC: false,
                },
                title: {
                  text: 'Memory Usage',
                  style: { color: '#ffffff', fontSize: '12px' },
                },
                xAxis: {
                  type: 'datetime',
                  labels: { style: { color: '#b0bec5' } },
                },
                yAxis: {
                  title: { text: 'GB', style: { color: '#b0bec5' } },
                  min: 0,
                },
                legend: {
                  enabled: true,
                  itemStyle: { color: '#ffffff', fontSize: '10px' },
                },
                series: [
                  {
                    name: 'Used',
                    data: memoryChartData.used,
                    color: '#f7a35c',
                    visible: memorySeriesVisibility.used,
                    marker: { enabled: false },
                  },
                  {
                    name: 'Free',
                    data: memoryChartData.free,
                    color: '#90ed7d',
                    visible: memorySeriesVisibility.free,
                    marker: { enabled: false },
                  },
                  {
                    name: 'Cached',
                    data: memoryChartData.cached,
                    color: '#7cb5ec',
                    visible: memorySeriesVisibility.cached,
                    marker: { enabled: false },
                  },
                ],
                credits: { enabled: false },
                tooltip: { shared: true, valueSuffix: ' GB' },
              }}
            />
          </div>
        ) : (
          <div className="text-center p-4">
            <p className="text-muted">No memory data available</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

MemoryChart.propTypes = {
  memoryChartData: PropTypes.shape({
    used: PropTypes.array.isRequired,
    free: PropTypes.array.isRequired,
    cached: PropTypes.array.isRequired,
  }).isRequired,
  memorySeriesVisibility: PropTypes.shape({
    used: PropTypes.bool,
    free: PropTypes.bool,
    cached: PropTypes.bool,
  }).isRequired,
  expandChart: PropTypes.func.isRequired,
};

export default MemoryChart;
