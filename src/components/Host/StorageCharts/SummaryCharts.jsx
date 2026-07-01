import PropTypes from 'prop-types';

import Chart from '../../Chart';

import { createChartOptions } from './chartDefaults';

const buildSummarySeries = (chartData, dataKey) =>
  Object.entries(chartData)
    .filter(([, data]) => data[dataKey].length > 0)
    .map(([deviceName, data], index) => ({
      name: deviceName,
      data: data[dataKey],
      color: `hsl(${(index * 360) / Object.keys(chartData).length}, 70%, 60%)`,
      visible: true,
    }));

const SummaryChart = ({
  chartId,
  title,
  chartData,
  dataKey,
  hoverColor,
  expandChart,
  summaryChartRefs,
}) => (
  <div className="col-4">
    <div className="is-chart-container position-relative">
      <button
        className="btn btn-sm btn-light is-chart-expand-button"
        onClick={() => expandChart(chartId, chartId)}
        title="Expand chart to full size"
      >
        <span className="me-1">
          <i className="fas fa-expand" />
        </span>
      </button>
      <Chart
        ref={ref => {
          if (ref) {
            summaryChartRefs.current[chartId] = ref;
          }
        }}
        options={createChartOptions({
          title,
          series: buildSummarySeries(chartData, dataKey),
          legendConfig: {
            enabled: true,
            itemStyle: { fontSize: '9px', color: '#ffffff' },
            itemHoverStyle: { color: hoverColor },
            maxHeight: 80,
          },
        })}
      />
    </div>
  </div>
);

SummaryChart.propTypes = {
  chartId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  chartData: PropTypes.object.isRequired,
  dataKey: PropTypes.string.isRequired,
  hoverColor: PropTypes.string.isRequired,
  expandChart: PropTypes.func.isRequired,
  summaryChartRefs: PropTypes.shape({ current: PropTypes.object }).isRequired,
};

const SummaryCharts = ({ chartData, expandChart, summaryChartRefs }) => (
  <div className="mb-5">
    <h5 className="fs-6 fw-bold mb-3">
      <span className="d-inline-flex align-items-center gap-1">
        <span className="me-1">
          <i className="fas fa-layer-group" />
        </span>
        <span>All Devices Summary</span>
      </span>
    </h5>
    <div className="row">
      <SummaryChart
        chartId="summary-read"
        title="Read Bandwidth (All Devices)"
        chartData={chartData}
        dataKey="readData"
        hoverColor="#64b5f6"
        expandChart={expandChart}
        summaryChartRefs={summaryChartRefs}
      />
      <SummaryChart
        chartId="summary-write"
        title="Write Bandwidth (All Devices)"
        chartData={chartData}
        dataKey="writeData"
        hoverColor="#ff9800"
        expandChart={expandChart}
        summaryChartRefs={summaryChartRefs}
      />
      <SummaryChart
        chartId="summary-total"
        title="Total Bandwidth (Combined)"
        chartData={chartData}
        dataKey="totalData"
        hoverColor="#4caf50"
        expandChart={expandChart}
        summaryChartRefs={summaryChartRefs}
      />
    </div>
  </div>
);

SummaryCharts.propTypes = {
  chartData: PropTypes.object.isRequired,
  expandChart: PropTypes.func.isRequired,
  summaryChartRefs: PropTypes.shape({ current: PropTypes.object }).isRequired,
};

export default SummaryCharts;
