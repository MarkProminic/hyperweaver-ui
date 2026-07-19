import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../../Chart';

const ExpandedMemoryChart = ({ memoryChartData, memorySeriesVisibility }) => {
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
          text: t('hostCharts.expandedMemoryChart.chartTitle'),
          style: { color: '#ffffff', fontSize: '16px' },
        },
        xAxis: {
          type: 'datetime',
          labels: { style: { color: '#b0bec5' } },
        },
        yAxis: {
          title: {
            text: t('hostCharts.expandedMemoryChart.gbAxisLabel'),
            style: { color: '#b0bec5' },
          },
          min: 0,
        },
        legend: { enabled: true, itemStyle: { color: '#ffffff' } },
        series: [
          {
            name: t('hostCharts.expandedMemoryChart.usedSeriesName'),
            data: memoryChartData.used,
            color: '#f7a35c',
            visible: memorySeriesVisibility.used,
            marker: { enabled: false },
          },
          {
            name: t('hostCharts.expandedMemoryChart.freeSeriesName'),
            data: memoryChartData.free,
            color: '#90ed7d',
            visible: memorySeriesVisibility.free,
            marker: { enabled: false },
          },
          {
            name: t('hostCharts.expandedMemoryChart.cachedSeriesName'),
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
};

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
