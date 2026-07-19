import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../Chart';
import Highcharts from '../../Highcharts';

const ZfsArcChart = ({ arcChartData, expandChart }) => {
  const { t } = useTranslation();

  return (
    <div className="col-4">
      <div className="card bg-dark">
        <header className="card-header bg-dark d-flex justify-content-between align-items-center">
          <p className="text-white fw-bold mb-0">
            <span className="d-inline-flex align-items-center gap-1">
              <span className="d-inline-flex align-items-center">
                <i className="fas fa-memory" />
              </span>
              <span>{t('hostCharts.arcChart.title')}</span>
            </span>
          </p>
          <div>
            <div className="d-flex gap-2">
              <div>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => expandChart('arc', 'arc')}
                  title={t('hostCharts.arcChart.expandButtonTitle')}
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
          {arcChartData &&
          (arcChartData.sizeData.length > 0 ||
            arcChartData.targetData.length > 0 ||
            arcChartData.hitRateData.length > 0) ? (
            <div>
              <Chart
                options={{
                  chart: {
                    type: 'spline',
                    animation: Highcharts.svg,
                    marginRight: 10,
                    height: 200,
                    backgroundColor: '#1e2a3a',
                    style: {
                      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                    },
                  },
                  time: {
                    useUTC: false,
                  },
                  title: {
                    text: t('hostCharts.arcChart.chartTitle'),
                    style: {
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                    },
                  },
                  xAxis: {
                    type: 'datetime',
                    tickPixelInterval: 150,
                    labels: {
                      style: {
                        fontSize: '9px',
                        color: '#b0bec5',
                      },
                    },
                    lineColor: '#37474f',
                    tickColor: '#37474f',
                    gridLineColor: '#37474f',
                  },
                  yAxis: [
                    {
                      title: {
                        text: t('hostCharts.arcChart.sizeAxisLabel'),
                        style: {
                          fontSize: '10px',
                          color: '#b0bec5',
                        },
                      },
                      min: 0,
                      labels: {
                        style: {
                          fontSize: '9px',
                          color: '#b0bec5',
                        },
                      },
                      lineColor: '#37474f',
                      tickColor: '#37474f',
                      gridLineColor: '#37474f',
                    },
                    {
                      title: {
                        text: t('hostCharts.arcChart.hitRateAxisLabel'),
                        style: {
                          fontSize: '10px',
                          color: '#b0bec5',
                        },
                      },
                      min: 0,
                      max: 100,
                      opposite: true,
                      labels: {
                        style: {
                          fontSize: '9px',
                          color: '#b0bec5',
                        },
                      },
                      lineColor: '#37474f',
                      tickColor: '#37474f',
                      gridLineColor: 'transparent',
                    },
                  ],
                  legend: {
                    enabled: true,
                    itemStyle: {
                      fontSize: '8px',
                      color: '#ffffff',
                    },
                    maxHeight: 40,
                  },
                  plotOptions: {
                    spline: {
                      marker: {
                        enabled: false,
                      },
                      lineWidth: 2,
                    },
                  },
                  series: [
                    {
                      name: t('hostCharts.arcChart.arcSizeSeriesName'),
                      data: arcChartData.sizeData || [],
                      color: '#3498db',
                      yAxis: 0,
                      lineWidth: 2,
                    },
                    {
                      name: t('hostCharts.arcChart.arcTargetSeriesName'),
                      data: arcChartData.targetData || [],
                      color: '#e74c3c',
                      yAxis: 0,
                      dashStyle: 'Dash',
                      lineWidth: 2,
                    },
                    {
                      name: t('hostCharts.arcChart.hitRateSeriesName'),
                      data: arcChartData.hitRateData || [],
                      color: '#2ecc71',
                      yAxis: 1,
                      lineWidth: 3,
                    },
                  ],
                  credits: {
                    enabled: false,
                  },
                  tooltip: {
                    shared: true,
                    backgroundColor: '#263238',
                    borderColor: '#37474f',
                    style: {
                      color: '#ffffff',
                      fontSize: '10px',
                    },
                    formatter() {
                      let tooltipText = `<b>${Highcharts.dateFormat(
                        '%Y-%m-%d %H:%M:%S',
                        this.x
                      )}</b><br/>`;
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
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-muted">{t('hostCharts.arcChart.noDataMessage')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ZfsArcChart.propTypes = {
  arcChartData: PropTypes.shape({
    sizeData: PropTypes.array,
    targetData: PropTypes.array,
    hitRateData: PropTypes.array,
  }).isRequired,
  expandChart: PropTypes.func.isRequired,
};

export default ZfsArcChart;
