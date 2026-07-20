import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../../Chart';

const ExpandedCpuChart = ({ cpuChartData, cpuSeriesVisibility }) => {
  const { t } = useTranslation();

  return (
    <Chart
      options={{
        chart: {
          type: 'spline',
          height: 'calc(90vh - 200px)',
          backgroundColor: '#1e2a3a',
        },
        title: {
          text: t('hostCharts.expandedCpuChart.chartTitle'),
          style: { color: '#ffffff', fontSize: '16px' },
        },
        xAxis: {
          type: 'datetime',
          labels: { style: { color: '#b0bec5' } },
        },
        yAxis: [
          {
            title: {
              text: t('hostCharts.expandedCpuChart.usageAxisLabel'),
              style: { color: '#b0bec5' },
            },
            min: 0,
            max: 100,
          },
          {
            title: {
              text: t('hostCharts.expandedCpuChart.loadAxisLabel'),
              style: { color: '#b0bec5' },
            },
            opposite: true,
          },
        ],
        legend: { enabled: true, itemStyle: { color: '#ffffff' } },
        series: [
          {
            name: t('hostCharts.expandedCpuChart.overallUsageSeriesName'),
            data: cpuChartData.overall,
            yAxis: 0,
            color: '#7cb5ec',
            lineWidth: 3,
            visible: cpuSeriesVisibility.overall,
            marker: { enabled: false },
          },
          ...(cpuChartData.ioDelay && cpuChartData.ioDelay.length > 0
            ? [
                {
                  name: t('hostCharts.cpuChart.ioDelaySeriesName'),
                  data: cpuChartData.ioDelay,
                  yAxis: 0,
                  color: '#e4d354',
                  lineWidth: 2,
                  dashStyle: 'shortdash',
                  visible: cpuSeriesVisibility.overall,
                  marker: { enabled: false },
                },
              ]
            : []),
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
            name: t('hostCharts.expandedCpuChart.load1mSeriesName'),
            data: cpuChartData.load['1min'],
            yAxis: 1,
            color: '#f7a35c',
            dashStyle: 'shortdot',
            visible: cpuSeriesVisibility.load,
            marker: { enabled: false },
          },
          {
            name: t('hostCharts.expandedCpuChart.load5mSeriesName'),
            data: cpuChartData.load['5min'],
            yAxis: 1,
            color: '#90ed7d',
            dashStyle: 'shortdot',
            visible: cpuSeriesVisibility.load,
            marker: { enabled: false },
          },
          {
            name: t('hostCharts.expandedCpuChart.load15mSeriesName'),
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
};

ExpandedCpuChart.propTypes = {
  cpuChartData: PropTypes.shape({
    overall: PropTypes.array,
    ioDelay: PropTypes.array,
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
