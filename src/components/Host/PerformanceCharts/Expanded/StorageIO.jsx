import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../../Chart';
import Highcharts from '../../../Highcharts';

const ExpandedStorageIOChart = ({ chartData, storageSeriesVisibility }) => {
  const { t } = useTranslation();

  return (
    <Chart
      options={{
        chart: {
          type: 'spline',
          animation: Highcharts.svg,
          marginRight: 10,
          height: 'calc(90vh - 200px)',
          backgroundColor: '#1e2a3a',
          style: {
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          },
        },
        time: { useUTC: false },
        title: {
          text: t('hostCharts.expandedStorageIOChart.chartTitle'),
          style: { fontSize: '16px', fontWeight: 'bold', color: '#ffffff' },
        },
        xAxis: {
          type: 'datetime',
          tickPixelInterval: 150,
          labels: { style: { fontSize: '12px', color: '#b0bec5' } },
          lineColor: '#37474f',
          tickColor: '#37474f',
          gridLineColor: '#37474f',
        },
        yAxis: {
          title: {
            text: t('hostCharts.expandedStorageIOChart.bandwidthAxisLabel'),
            style: { fontSize: '14px', color: '#b0bec5' },
          },
          min: 0,
          labels: { style: { fontSize: '12px', color: '#b0bec5' } },
          lineColor: '#37474f',
          tickColor: '#37474f',
          gridLineColor: '#37474f',
        },
        legend: {
          enabled: true,
          itemStyle: { fontSize: '12px', color: '#ffffff' },
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
        },
        plotOptions: {
          spline: { marker: { enabled: false }, lineWidth: 2 },
        },
        series: Object.entries(chartData)
          .filter(([, data]) => data.totalData && data.totalData.length > 0)
          .flatMap(([poolName, data], poolIndex) => {
            const baseHue = (poolIndex * 360) / Object.keys(chartData).length;
            return [
              {
                name: `${poolName} Read`,
                data: data.readData || [],
                color: `hsl(${baseHue}, 70%, 75%)`,
                visible: storageSeriesVisibility.read,
                dashStyle: 'Solid',
                lineWidth: 2,
              },
              {
                name: `${poolName} Write`,
                data: data.writeData || [],
                color: `hsl(${baseHue}, 70%, 50%)`,
                visible: storageSeriesVisibility.write,
                dashStyle: 'Dash',
                lineWidth: 2,
              },
              {
                name: `${poolName} Total`,
                data: data.totalData || [],
                color: `hsl(${baseHue}, 70%, 35%)`,
                visible: storageSeriesVisibility.total,
                dashStyle: 'Solid',
                lineWidth: 3,
              },
            ];
          }),
        credits: { enabled: false },
        tooltip: {
          shared: true,
          valueSuffix: ' MB/s',
          backgroundColor: '#263238',
          borderColor: '#37474f',
          style: { color: '#ffffff', fontSize: '12px' },
        },
      }}
    />
  );
};

ExpandedStorageIOChart.propTypes = {
  chartData: PropTypes.object.isRequired,
  storageSeriesVisibility: PropTypes.shape({
    read: PropTypes.bool,
    write: PropTypes.bool,
    total: PropTypes.bool,
  }).isRequired,
};

export default ExpandedStorageIOChart;
