import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ArcCharts from './StorageCharts/ArcCharts';
import DeviceCharts from './StorageCharts/DeviceCharts';
import PoolCharts from './StorageCharts/PoolCharts';
import SummaryCharts from './StorageCharts/SummaryCharts';

const StorageCharts = ({
  chartData,
  poolChartData,
  arcChartData,
  diskIOStats,
  poolIOStats,
  arcStats,
  sectionsCollapsed,
  toggleSection,
  loading,
  chartSortBy,
  setChartSortBy,
  getSortedChartEntries,
  expandChart,
  summaryChartRefs,
  chartRefs,
  poolChartRefs,
  seriesVisibility,
  setSeriesVisibility,
}) => {
  const { t } = useTranslation();

  if (
    Object.keys(chartData).length === 0 &&
    Object.keys(poolChartData).length === 0 &&
    Object.keys(arcChartData).length === 0
  ) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fs-5 fw-bold mb-0">
              <span className="d-inline-flex align-items-center gap-1">
                <span className="me-1">
                  <i className="fas fa-chart-area" />
                </span>
                <span>{t('host.storageCharts.title')}</span>
              </span>
            </h4>
          </div>
          <div>
            <div className="d-flex gap-2">
              <div>
                <select
                  className="form-select form-select-sm"
                  value={chartSortBy}
                  onChange={e => setChartSortBy(e.target.value)}
                  disabled={loading}
                  title={t('host.storageCharts.sortTitle')}
                >
                  <option value="bandwidth">{t('host.storageCharts.sortByBandwidth')}</option>
                  <option value="name">{t('host.storageCharts.sortByName')}</option>
                  <option value="read">{t('host.storageCharts.sortByRead')}</option>
                  <option value="write">{t('host.storageCharts.sortByWrite')}</option>
                </select>
              </div>
              <div>
                <div className="btn-group">
                  <button
                    className={`btn btn-sm ${seriesVisibility.read ? 'btn-info' : 'btn-dark'}`}
                    onClick={() =>
                      setSeriesVisibility(prev => ({
                        ...prev,
                        read: !prev.read,
                      }))
                    }
                    title={t('host.storageCharts.toggleRead')}
                  >
                    <span className="me-1">
                      <i className={`fas ${seriesVisibility.read ? 'fa-eye' : 'fa-eye-slash'}`} />
                    </span>
                    <span>{t('host.storageCharts.read')}</span>
                  </button>
                  <button
                    className={`btn btn-sm ${seriesVisibility.write ? 'btn-warning' : 'btn-dark'}`}
                    onClick={() =>
                      setSeriesVisibility(prev => ({
                        ...prev,
                        write: !prev.write,
                      }))
                    }
                    title={t('host.storageCharts.toggleWrite')}
                  >
                    <span className="me-1">
                      <i className={`fas ${seriesVisibility.write ? 'fa-eye' : 'fa-eye-slash'}`} />
                    </span>
                    <span>{t('host.storageCharts.write')}</span>
                  </button>
                  <button
                    className={`btn btn-sm ${seriesVisibility.total ? 'btn-success' : 'btn-dark'}`}
                    onClick={() =>
                      setSeriesVisibility(prev => ({
                        ...prev,
                        total: !prev.total,
                      }))
                    }
                    title={t('host.storageCharts.toggleTotal')}
                  >
                    <span className="me-1">
                      <i className={`fas ${seriesVisibility.total ? 'fa-eye' : 'fa-eye-slash'}`} />
                    </span>
                    <span>{t('host.storageCharts.total')}</span>
                  </button>
                </div>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-link"
                  onClick={() => toggleSection('charts')}
                  title={
                    sectionsCollapsed.charts
                      ? t('host.storageCharts.expand')
                      : t('host.storageCharts.collapse')
                  }
                >
                  <span className="me-1">
                    <i
                      className={`fas ${sectionsCollapsed.charts ? 'fa-chevron-down' : 'fa-chevron-up'}`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {!sectionsCollapsed.charts && (
          <div>
            <SummaryCharts
              chartData={chartData}
              expandChart={expandChart}
              summaryChartRefs={summaryChartRefs}
            />

            <DeviceCharts
              diskIOStats={diskIOStats}
              getSortedChartEntries={getSortedChartEntries}
              expandChart={expandChart}
              chartRefs={chartRefs}
              seriesVisibility={seriesVisibility}
              chartSortBy={chartSortBy}
            />

            <PoolCharts
              poolChartData={poolChartData}
              poolIOStats={poolIOStats}
              expandChart={expandChart}
              poolChartRefs={poolChartRefs}
              seriesVisibility={seriesVisibility}
            />

            <ArcCharts arcChartData={arcChartData} arcStats={arcStats} expandChart={expandChart} />

            {diskIOStats.length === 0 && arcStats.length === 0 && (
              <div className="alert alert-info">
                <p>{t('host.storageCharts.noData')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const refPropType = PropTypes.shape({ current: PropTypes.object }).isRequired;

StorageCharts.propTypes = {
  chartData: PropTypes.object.isRequired,
  poolChartData: PropTypes.object.isRequired,
  arcChartData: PropTypes.object.isRequired,
  diskIOStats: PropTypes.array.isRequired,
  poolIOStats: PropTypes.array.isRequired,
  arcStats: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.shape({
    charts: PropTypes.bool,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  chartSortBy: PropTypes.string.isRequired,
  setChartSortBy: PropTypes.func.isRequired,
  getSortedChartEntries: PropTypes.func.isRequired,
  expandChart: PropTypes.func.isRequired,
  summaryChartRefs: refPropType,
  chartRefs: refPropType,
  poolChartRefs: refPropType,
  seriesVisibility: PropTypes.shape({
    read: PropTypes.bool.isRequired,
    write: PropTypes.bool.isRequired,
    total: PropTypes.bool.isRequired,
  }).isRequired,
  setSeriesVisibility: PropTypes.func.isRequired,
};

export default StorageCharts;
