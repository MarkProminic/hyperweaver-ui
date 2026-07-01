import PropTypes from 'prop-types';

import Chart from '../../../Chart';
import Highcharts from '../../../Highcharts';

const ExpandedNetworkChart = ({ networkChartData, networkSeriesVisibility }) => (
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
        text: 'Network Bandwidth Performance - Real Interfaces Only',
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
          text: 'Bandwidth (Mbps)',
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
      series: Object.entries(networkChartData)
        .filter(([, data]) => data.totalData && data.totalData.length > 0)
        .flatMap(([interfaceName, data], interfaceIndex) => {
          const baseHue = (interfaceIndex * 360) / Object.keys(networkChartData).length;
          return [
            {
              name: `${interfaceName} RX`,
              data: data.rxData || [],
              color: `hsl(${baseHue}, 70%, 75%)`,
              visible: networkSeriesVisibility.read,
              dashStyle: 'Solid',
              lineWidth: 2,
            },
            {
              name: `${interfaceName} TX`,
              data: data.txData || [],
              color: `hsl(${baseHue}, 70%, 50%)`,
              visible: networkSeriesVisibility.write,
              dashStyle: 'Dash',
              lineWidth: 2,
            },
            {
              name: `${interfaceName} Total`,
              data: data.totalData || [],
              color: `hsl(${baseHue}, 70%, 35%)`,
              visible: networkSeriesVisibility.total,
              dashStyle: 'Solid',
              lineWidth: 3,
            },
          ];
        }),
      credits: { enabled: false },
      tooltip: {
        shared: true,
        valueSuffix: ' Mbps',
        backgroundColor: '#263238',
        borderColor: '#37474f',
        style: { color: '#ffffff', fontSize: '12px' },
      },
    }}
  />
);

ExpandedNetworkChart.propTypes = {
  networkChartData: PropTypes.object.isRequired,
  networkSeriesVisibility: PropTypes.shape({
    read: PropTypes.bool,
    write: PropTypes.bool,
    total: PropTypes.bool,
  }).isRequired,
};

export default ExpandedNetworkChart;
