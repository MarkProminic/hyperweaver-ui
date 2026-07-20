import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../Chart';

const CpuChart = ({ cpuChartData, cpuSeriesVisibility, setCpuSeriesVisibility, expandChart }) => {
  const { t } = useTranslation();

  return (
    <div className="col-4">
      <div className="card bg-dark">
        <header className="card-header bg-dark d-flex justify-content-between align-items-center">
          <p className="text-white fw-bold mb-0">
            <span className="d-inline-flex align-items-center gap-1">
              <span className="d-inline-flex align-items-center">
                <i className="fas fa-microchip" />
              </span>
              <span>{t('hostCharts.cpuChart.title')}</span>
            </span>
          </p>
          <div>
            <div className="d-flex gap-2">
              <div>
                <button
                  className={`btn btn-sm ${cpuSeriesVisibility.overall ? 'btn-info' : 'btn-dark'}`}
                  onClick={() =>
                    setCpuSeriesVisibility(prev => ({
                      ...prev,
                      overall: !prev.overall,
                    }))
                  }
                  title={t('hostCharts.cpuChart.toggleAvgTitle')}
                >
                  {t('hostCharts.cpuChart.avgLabel')}
                </button>
              </div>
              <div>
                <button
                  className={`btn btn-sm ${cpuSeriesVisibility.cores ? 'btn-info' : 'btn-dark'}`}
                  onClick={() =>
                    setCpuSeriesVisibility(prev => ({
                      ...prev,
                      cores: !prev.cores,
                    }))
                  }
                  title={t('hostCharts.cpuChart.toggleCoresTitle')}
                >
                  {t('hostCharts.cpuChart.coresLabel')}
                </button>
              </div>
              <div>
                <button
                  className={`btn btn-sm ${cpuSeriesVisibility.load ? 'btn-info' : 'btn-dark'}`}
                  onClick={() =>
                    setCpuSeriesVisibility(prev => ({
                      ...prev,
                      load: !prev.load,
                    }))
                  }
                  title={t('hostCharts.cpuChart.toggleLoadTitle')}
                >
                  {t('hostCharts.cpuChart.loadLabel')}
                </button>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => expandChart('cpu', 'cpu')}
                  title={t('hostCharts.cpuChart.expandButtonTitle')}
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
          {cpuChartData.overall.length > 0 ? (
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
                    text: t('hostCharts.cpuChart.chartTitle'),
                    style: { color: '#ffffff', fontSize: '12px' },
                  },
                  xAxis: {
                    type: 'datetime',
                    labels: { style: { color: '#b0bec5' } },
                  },
                  yAxis: [
                    {
                      title: {
                        text: t('hostCharts.cpuChart.usageAxisLabel'),
                        style: { color: '#b0bec5' },
                      },
                      min: 0,
                      max: 100,
                    },
                    {
                      title: {
                        text: t('hostCharts.cpuChart.loadAxisLabel'),
                        style: { color: '#b0bec5' },
                      },
                      opposite: true,
                    },
                  ],
                  legend: { enabled: false },
                  series: [
                    {
                      name: t('hostCharts.cpuChart.overallUsageSeriesName'),
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
                      name: t('hostCharts.cpuChart.load1mSeriesName'),
                      data: cpuChartData.load['1min'],
                      yAxis: 1,
                      color: '#f7a35c',
                      dashStyle: 'shortdot',
                      visible: cpuSeriesVisibility.load,
                      marker: { enabled: false },
                    },
                    {
                      name: t('hostCharts.cpuChart.load5mSeriesName'),
                      data: cpuChartData.load['5min'],
                      yAxis: 1,
                      color: '#90ed7d',
                      dashStyle: 'shortdot',
                      visible: cpuSeriesVisibility.load,
                      marker: { enabled: false },
                    },
                    {
                      name: t('hostCharts.cpuChart.load15mSeriesName'),
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
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-muted">{t('hostCharts.cpuChart.noDataMessage')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

CpuChart.propTypes = {
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
  setCpuSeriesVisibility: PropTypes.func.isRequired,
  expandChart: PropTypes.func.isRequired,
};

export default CpuChart;
