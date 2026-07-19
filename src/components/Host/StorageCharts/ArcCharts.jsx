import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import Chart from '../../Chart';

import { createChartOptions } from './chartDefaults';

const ArcCharts = ({ arcChartData, arcStats, expandChart }) => {
  const { t } = useTranslation();
  if (arcStats.length === 0 || !arcChartData.arcSize) {
    return null;
  }

  return (
    <div className="mb-4">
      <h5 className="fs-6 fw-bold mb-3">
        <span className="d-inline-flex align-items-center gap-1">
          <span className="me-1">
            <i className="fas fa-memory" />
          </span>
          <span>{t('hostCharts.arcCharts.sectionTitle')}</span>
        </span>
      </h5>

      <div className="row">
        {/* Memory Allocation Chart */}
        <div className="col-4">
          <div className="is-chart-container position-relative">
            <button
              className="btn btn-sm btn-link is-chart-expand-button"
              onClick={() => expandChart('arc-memory', 'arc-memory')}
              title={t('hostCharts.arcCharts.expandButtonTitle')}
            >
              <span className="me-1 text-white">
                <i className="fas fa-expand" />
              </span>
            </button>
            <Chart
              options={createChartOptions({
                title: t('hostCharts.arcCharts.memoryAllocationTitle'),
                yAxisTitle: t('hostCharts.arcCharts.memoryGbAxisLabel'),
                tooltipSuffix: ' GB',
                series: [
                  {
                    name: t('hostCharts.arcCharts.arcSizeSeriesName'),
                    data: arcChartData.arcSize || [],
                    color: '#64b5f6',
                    lineWidth: 3,
                  },
                  {
                    name: t('hostCharts.arcCharts.targetSizeSeriesName'),
                    data: arcChartData.arcTargetSize || [],
                    color: '#9c27b0',
                    lineWidth: 2,
                    dashStyle: 'Dash',
                  },
                  {
                    name: t('hostCharts.arcCharts.mruSizeSeriesName'),
                    data: arcChartData.mruSize || [],
                    color: '#4caf50',
                    lineWidth: 2,
                  },
                  {
                    name: t('hostCharts.arcCharts.mfuSizeSeriesName'),
                    data: arcChartData.mfuSize || [],
                    color: '#ff9800',
                    lineWidth: 2,
                  },
                ],
              })}
            />
          </div>
        </div>

        {/* Performance Efficiency Chart */}
        <div className="col-4">
          <div className="is-chart-container position-relative">
            <button
              className="btn btn-sm btn-link is-chart-expand-button"
              onClick={() => expandChart('arc-efficiency', 'arc-efficiency')}
              title={t('hostCharts.arcCharts.expandButtonTitle')}
            >
              <span className="me-1 text-white">
                <i className="fas fa-expand" />
              </span>
            </button>
            <Chart
              options={createChartOptions({
                title: t('hostCharts.arcCharts.cacheEfficiencyTitle'),
                yAxisTitle: t('hostCharts.arcCharts.efficiencyAxisLabel'),
                yAxisMax: 100,
                tooltipSuffix: '%',
                series: [
                  {
                    name: t('hostCharts.arcCharts.hitRatioSeriesName'),
                    data: arcChartData.hitRatio || [],
                    color: '#2ecc71',
                    lineWidth: 3,
                  },
                  {
                    name: t('hostCharts.arcCharts.demandEfficiencySeriesName'),
                    data: arcChartData.dataDemandEfficiency || [],
                    color: '#e74c3c',
                    lineWidth: 2,
                  },
                  {
                    name: t('hostCharts.arcCharts.prefetchEfficiencySeriesName'),
                    data: arcChartData.dataPrefetchEfficiency || [],
                    color: '#f39c12',
                    lineWidth: 2,
                  },
                ],
              })}
            />
          </div>
        </div>

        {/* Compression Chart */}
        <div className="col-4">
          <div className="is-chart-container position-relative">
            <button
              className="btn btn-sm btn-link is-chart-expand-button"
              onClick={() => expandChart('arc-compression', 'arc-compression')}
              title={t('hostCharts.arcCharts.expandButtonTitle')}
            >
              <span className="me-1 text-white">
                <i className="fas fa-expand" />
              </span>
            </button>
            <Chart
              options={createChartOptions({
                title: t('hostCharts.arcCharts.compressionEffectivenessTitle'),
                yAxisTitle: t('hostCharts.arcCharts.compressionRatioAxisLabel'),
                yAxisMin: 1,
                tooltipSuffix: 'x',
                series: [
                  {
                    name: t('hostCharts.arcCharts.compressionRatioSeriesName'),
                    data: arcChartData.compressionRatio || [],
                    color: '#8e44ad',
                    lineWidth: 3,
                  },
                ],
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ArcCharts.propTypes = {
  arcChartData: PropTypes.object.isRequired,
  arcStats: PropTypes.array.isRequired,
  expandChart: PropTypes.func.isRequired,
};

export default ArcCharts;
