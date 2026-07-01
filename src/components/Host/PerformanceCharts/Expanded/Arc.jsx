import PropTypes from 'prop-types';

import Chart from '../../../Chart';
import Highcharts from '../../../Highcharts';

const ExpandedArcChart = ({ arcChartData }) => (
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
        text: 'ZFS ARC Performance Details',
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
      yAxis: [
        {
          title: {
            text: 'Size (GB)',
            style: { fontSize: '14px', color: '#b0bec5' },
          },
          min: 0,
          labels: { style: { fontSize: '12px', color: '#b0bec5' } },
          lineColor: '#37474f',
          tickColor: '#37474f',
          gridLineColor: '#37474f',
        },
        {
          title: {
            text: 'Hit Rate (%)',
            style: { fontSize: '14px', color: '#b0bec5' },
          },
          min: 0,
          max: 100,
          opposite: true,
          labels: { style: { fontSize: '12px', color: '#b0bec5' } },
          lineColor: '#37474f',
          tickColor: '#37474f',
          gridLineColor: 'transparent',
        },
      ],
      legend: {
        enabled: true,
        itemStyle: { fontSize: '12px', color: '#ffffff' },
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
      },
      plotOptions: {
        spline: { marker: { enabled: false }, lineWidth: 3 },
      },
      series: [
        {
          name: 'ARC Size',
          data: arcChartData.sizeData || [],
          color: '#3498db',
          yAxis: 0,
          lineWidth: 3,
        },
        {
          name: 'ARC Target',
          data: arcChartData.targetData || [],
          color: '#e74c3c',
          yAxis: 0,
          dashStyle: 'Dash',
          lineWidth: 3,
        },
        {
          name: 'Hit Rate',
          data: arcChartData.hitRateData || [],
          color: '#2ecc71',
          yAxis: 1,
          lineWidth: 4,
        },
      ],
      credits: { enabled: false },
      tooltip: {
        shared: true,
        backgroundColor: '#263238',
        borderColor: '#37474f',
        style: { color: '#ffffff', fontSize: '12px' },
        formatter() {
          let tooltipText = `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}</b><br/>`;
          this.points.forEach(point => {
            if (point.series.name === 'Hit Rate') {
              tooltipText += `${point.series.name}: <b>${point.y.toFixed(1)}%</b><br/>`;
            } else {
              tooltipText += `${point.series.name}: <b>${point.y.toFixed(2)} GB</b><br/>`;
            }
          });
          return tooltipText;
        },
      },
    }}
  />
);

ExpandedArcChart.propTypes = {
  arcChartData: PropTypes.shape({
    sizeData: PropTypes.array,
    targetData: PropTypes.array,
    hitRateData: PropTypes.array,
  }).isRequired,
};

export default ExpandedArcChart;
