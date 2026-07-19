import { Helmet } from '@dr.pogodin/react-helmet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import ArcStats from './Host/ArcStats';
import DatasetsTable from './Host/DatasetsTable';
import DiskIOTable from './Host/DiskIOTable';
import DisksTable from './Host/DisksTable';
import ExpandedChartModal from './Host/ExpandedChartModal';
import PoolIOTable from './Host/PoolIOTable';
import PoolsTable from './Host/PoolsTable';
import StorageCharts from './Host/StorageCharts';
import StorageHeader from './Host/StorageHeader';
import StorageSummary from './Host/StorageSummary';
import { useHostStorageData } from './Host/useHostStorageData';

const HostStorage = () => {
  const { t } = useTranslation();
  const {
    storagePools,
    storageDatasets,
    storageDisks,
    diskIOStats,
    poolIOStats,
    arcStats,
    loading,
    error,
    selectedServer,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    resolution,
    setResolution,
    sectionsCollapsed,
    toggleSection,
    poolSort,
    handlePoolSort,
    datasetSort,
    handleDatasetSort,
    diskSort,
    handleDiskSort,
    diskIOSort,
    handleDiskIOSort,
    resetPoolSort,
    resetDatasetSort,
    resetDiskSort,
    resetDiskIOSort,
    getSortedPools,
    getSortedDatasets,
    getSortedDisks,
    getSortedDiskIOStats,
    getSortIcon,
    chartData,
    poolChartData,
    arcChartData,
    timeWindow,
    setTimeWindow,
    chartRefs,
    poolChartRefs,
    summaryChartRefs,
    expandedChart,
    expandedChartType,
    expandChart,
    closeExpandedChart,
    chartSortBy,
    setChartSortBy,
    getSortedChartEntries,
    seriesVisibility,
    setSeriesVisibility,
    user,
    getServers,
    loadStorageData,
  } = useHostStorageData();

  const serverList = useMemo(() => getServers(), [getServers]);

  if (!user) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('pages.hostStorage.titlePage')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="titlebar active card-header d-flex justify-content-between align-items-center mb-0 p-3">
              <div className="d-flex align-items-center gap-2">
                <strong>{t('pages.hostStorage.accessDenied')}</strong>
              </div>
            </div>
            <div className="card-body px-4">
              <div className="alert alert-danger">
                <p>{t('pages.hostStorage.loginRequired')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (serverList.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('pages.hostStorage.titlePage')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="titlebar active card-header d-flex justify-content-between align-items-center mb-0 p-3">
              <div className="d-flex align-items-center gap-2">
                <strong>{t('pages.hostStorage.heading')}</strong>
              </div>
            </div>
            <div className="card-body px-4">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">{t('pages.hostStorage.noServersHeading')}</h2>
                <p>{t('pages.hostStorage.noServersBody')}</p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />
                    {t('pages.hostStorage.addServer')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t('pages.hostStorage.titlePage')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <StorageHeader
            loading={loading}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            refreshInterval={refreshInterval}
            setRefreshInterval={setRefreshInterval}
            resolution={resolution}
            setResolution={setResolution}
            selectedServer={selectedServer}
            loadStorageData={loadStorageData}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
          />

          <div className="card-body px-4">
            {error && (
              <div className="alert alert-danger mb-4">
                <p>{error}</p>
              </div>
            )}

            <StorageSummary
              storagePools={storagePools}
              storageDatasets={storageDatasets}
              storageDisks={storageDisks}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <PoolsTable
              storagePools={getSortedPools()}
              poolSort={poolSort}
              handlePoolSort={handlePoolSort}
              getSortIcon={getSortIcon}
              resetPoolSort={resetPoolSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <DatasetsTable
              storageDatasets={getSortedDatasets()}
              datasetSort={datasetSort}
              handleDatasetSort={handleDatasetSort}
              getSortIcon={getSortIcon}
              resetDatasetSort={resetDatasetSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <DisksTable
              storageDisks={getSortedDisks()}
              diskSort={diskSort}
              handleDiskSort={handleDiskSort}
              getSortIcon={getSortIcon}
              resetDiskSort={resetDiskSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <DiskIOTable
              diskIOStats={getSortedDiskIOStats()}
              diskIOSort={diskIOSort}
              handleDiskIOSort={handleDiskIOSort}
              getSortIcon={getSortIcon}
              resetDiskIOSort={resetDiskIOSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <PoolIOTable
              poolIOStats={poolIOStats}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <ArcStats
              arcStats={arcStats}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <StorageCharts
              chartData={chartData}
              poolChartData={poolChartData}
              arcChartData={arcChartData}
              diskIOStats={diskIOStats}
              poolIOStats={poolIOStats}
              arcStats={arcStats}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
              loading={loading}
              chartSortBy={chartSortBy}
              setChartSortBy={setChartSortBy}
              getSortedChartEntries={getSortedChartEntries}
              expandChart={expandChart}
              summaryChartRefs={summaryChartRefs}
              chartRefs={chartRefs}
              poolChartRefs={poolChartRefs}
              seriesVisibility={seriesVisibility}
              setSeriesVisibility={setSeriesVisibility}
            />
          </div>
        </div>
      </div>

      <ExpandedChartModal
        chartId={expandedChart}
        type={expandedChartType}
        close={closeExpandedChart}
        chartData={chartData}
        poolChartData={poolChartData}
        arcChartData={arcChartData}
      />
    </div>
  );
};

export default HostStorage;
