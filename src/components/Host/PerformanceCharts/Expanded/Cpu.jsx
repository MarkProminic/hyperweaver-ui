import PropTypes from 'prop-types';

import Chart from '../../../Chart';

const ExpandedCpuChart = ({ cpuChartData, cpuSeriesVisibility }) => (
  <Chart
    options={{
      chart: {
        type: 'spline',
        height: 'calc(90vh - 200px)',
        backgroundColor: '#1e2a3a',
      },
      title: {
        text: 'CPU Performance',
        style: { color: '#ffffff', fontSize: '16px' },
      },
      xAxis: {
        type: 'datetime',
        labels: { style: { color: '#b0bec5' } },
      },
      yAxis: [
        {
          title: { text: 'Usage %', style: { color: '#b0bec5' } },
          min: 0,
          max: 100,
        },
        {
          title: { text: 'Load', style: { color: '#b0bec5' } },
          opposite: true,
        },
      ],
      legend: { enabled: true, itemStyle: { color: '#ffffff' } },
      series: [
        {
          name: 'Overall Usage',
          data: cpuChartData.overall,
          yAxis: 0,
          color: '#7cb5ec',
          lineWidth: 3,
          visible: cpuSeriesVisibility.overall,
          marker: { enabled: false },
        },
        ...Object.entries(cpuChartData.cores).map(([core, data]) => ({
          name: core,
          data,
          yAxis: 0,
          lineWidth: 1,
          color: `rgba(124, 181, 236, 0.5)`,
          visible: cpuSeriesVisibility.cores,
          marker: { enabled: false },
        })),
        {
          name: 'Load 1m',
          data: cpuChartData.load['1min'],
          yAxis: 1,
          color: '#f7a35c',
          dashStyle: 'shortdot',
          visible: cpuSeriesVisibility.load,
          marker: { enabled: false },
        },
        {
          name: 'Load 5m',
          data: cpuChartData.load['5min'],
          yAxis: 1,
          color: '#90ed7d',
          dashStyle: 'shortdot',
          visible: cpuSeriesVisibility.load,
          marker: { enabled: false },
        },
        {
          name: 'Load 15m',
          data: cpuChartData.load['15min'],
          yAxis: 1,
          color: '#f15c80',
          dashStyle: 'shortdot',
          visible: cpuSeriesVisibility.load,
          marker: { enabled: false },
        },
      ],
      credits: { enabled: false },
      tooltip: { shared: true },
    }}
  />
);

ExpandedCpuChart.propTypes = {
  cpuChartData: PropTypes.shape({
    overall: PropTypes.array,
    cores: PropTypes.object,
    load: PropTypes.object,
  }).isRequired,
  cpuSeriesVisibility: PropTypes.shape({
    overall: PropTypes.bool,
    cores: PropTypes.bool,
    load: PropTypes.bool,
  }).isRequired,
};

export default ExpandedCpuChart;
