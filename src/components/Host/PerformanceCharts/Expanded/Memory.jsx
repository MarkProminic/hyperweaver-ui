import PropTypes from 'prop-types';

import Chart from '../../../Chart';

const ExpandedMemoryChart = ({ memoryChartData, memorySeriesVisibility }) => (
  <Chart
    options={{
      chart: {
        type: 'spline',
        height: 'calc(90vh - 200px)',
        backgroundColor: '#1e2a3a',
      },
      title: {
        text: 'Memory Usage',
        style: { color: '#ffffff', fontSize: '16px' },
      },
      xAxis: {
        type: 'datetime',
        labels: { style: { color: '#b0bec5' } },
      },
      yAxis: {
        title: { text: 'GB', style: { color: '#b0bec5' } },
        min: 0,
      },
      legend: { enabled: true, itemStyle: { color: '#ffffff' } },
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
);

ExpandedMemoryChart.propTypes = {
  memoryChartData: PropTypes.shape({
    used: PropTypes.array,
    free: PropTypes.array,
    cached: PropTypes.array,
  }).isRequired,
  memorySeriesVisibility: PropTypes.shape({
    used: PropTypes.bool,
    free: PropTypes.bool,
    cached: PropTypes.bool,
  }).isRequired,
};

export default ExpandedMemoryChart;
