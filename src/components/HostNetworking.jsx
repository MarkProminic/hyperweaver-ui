import { Helmet } from '@dr.pogodin/react-helmet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import BandwidthCharts from './Host/BandwidthCharts';
import BandwidthTable from './Host/BandwidthTable';
import ExpandedChartModal from './Host/ExpandedChartModal';
import InterfacesTable from './Host/InterfacesTable';
import IpAddressTable from './Host/IpAddressTable';
import NetworkingHeader from './Host/NetworkingHeader';
import NetworkSummary from './Host/NetworkSummary';
import BandwidthLegend from './Host/NetworkTopology/BandwidthLegend';
import NetworkTopologyViewer from './Host/NetworkTopology/NetworkTopologyViewer';
import RoutingTable from './Host/RoutingTable';
import { useHostNetworkingData } from './Host/useHostNetworkingData';

const HostNetworking = () => {
  const { t } = useTranslation();
  console.log('🐛 DEBUG: HostNetworking component starting render');

  // ALWAYS call hooks first, before any conditional logic or early returns
  console.log('🐛 DEBUG: About to call useHostNetworkingData hook');
  const {
    networkInterfaces,
    networkUsage,
    ipAddresses,
    routes,
    // Topology data
    aggregates,
    etherstubs,
    vnics,
    zones,
    loading,
    error,
    selectedServer,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    sectionsCollapsed,
    toggleSection,
    chartData,
    timeWindow,
    setTimeWindow,
    resolution,
    setResolution,
    chartRefs,
    summaryChartRefs,
    interfaceSort,
    handleInterfaceSort,
    bandwidthSort,
    handleBandwidthSort,
    resetInterfaceSort,
    resetBandwidthSort,
    getSortedInterfaces,
    getSortedBandwidthUsage,
    getSortIcon,
    expandedChart,
    expandedChartType,
    expandChart,
    closeExpandedChart,
    chartSortBy,
    setChartSortBy,
    getSortedChartEntries,
    user,
    getServers,
    loadNetworkData,
  } = useHostNetworkingData();
  console.log(
    '🐛 DEBUG: Hook data destructured successfully, user:',
    !!user,
    'getServers type:',
    typeof getServers
  );

  // Use useMemo to prevent getServers() calls on every render
  const serverList = useMemo(() => getServers(), [getServers]);

  // Network monitoring is accessible to all authenticated users
  // No permission check needed - removed the user access restriction

  if (serverList.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('pages.hostNetworking.titlePage')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="titlebar card-header active d-flex justify-content-between align-items-center mb-0 p-3">
              <div className="d-flex align-items-center gap-2">
                <strong>{t('pages.hostNetworking.heading')}</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">{t('pages.hostNetworking.noServersHeading')}</h2>
                <p>{t('pages.hostNetworking.noServersBody')}</p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />
                    <span>{t('pages.hostNetworking.addServer')}</span>
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
        <title>{t('pages.hostNetworking.titlePage')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <NetworkingHeader
            loading={loading}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            refreshInterval={refreshInterval}
            setRefreshInterval={setRefreshInterval}
            resolution={resolution}
            setResolution={setResolution}
            selectedServer={selectedServer}
            loadNetworkData={loadNetworkData}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
          />

          <div className="px-4">
            {error && (
              <div className="alert alert-danger mb-4">
                <p>{error}</p>
              </div>
            )}

            <NetworkSummary
              networkInterfaces={networkInterfaces}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            {/* Network Topology Visualization */}
            <div className="card mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <h2 className="fs-5 fw-bold mb-0">
                    <i className="fas fa-project-diagram me-2" />
                    <span>{t('pages.hostNetworking.topologyHeading')}</span>
                  </h2>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${sectionsCollapsed.topology ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleSection('topology')}
                  >
                    <i
                      className={`fas fa-chevron-${sectionsCollapsed.topology ? 'down' : 'up'} me-2`}
                    />
                    <span>
                      {sectionsCollapsed.topology
                        ? t('pages.hostNetworking.show')
                        : t('pages.hostNetworking.hide')}
                    </span>
                  </button>
                </div>
              </div>

              {!sectionsCollapsed.topology && (
                <div className="has-min-height-600">
                  <NetworkTopologyViewer
                    networkData={{
                      networkInterfaces: networkInterfaces || [],
                      networkUsage: networkUsage || [],
                      ipAddresses: ipAddresses || [],
                      aggregates: aggregates || [],
                      etherstubs: etherstubs || [],
                      vnics: vnics || [],
                      zones: zones || [],
                    }}
                    server={selectedServer}
                    onNodeClick={node => {
                      console.log('Network node clicked:', node);
                      // TODO: Add node details modal or action
                    }}
                    onEdgeClick={edge => {
                      console.log('Network edge clicked:', edge);
                      // TODO: Add edge details modal or action
                    }}
                  />
                </div>
              )}
            </div>

            {/* Network Topology Legend */}
            {!sectionsCollapsed.topology && (
              <div className="card mb-4">
                <div>
                  <BandwidthLegend horizontal />
                </div>
              </div>
            )}

            <IpAddressTable
              ipAddresses={ipAddresses}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <RoutingTable
              routes={routes}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <InterfacesTable
              networkInterfaces={getSortedInterfaces()}
              interfaceSort={interfaceSort}
              handleInterfaceSort={handleInterfaceSort}
              getSortIcon={getSortIcon}
              resetInterfaceSort={resetInterfaceSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <BandwidthTable
              networkUsage={getSortedBandwidthUsage()}
              bandwidthSort={bandwidthSort}
              handleBandwidthSort={handleBandwidthSort}
              getSortIcon={getSortIcon}
              resetBandwidthSort={resetBandwidthSort}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <BandwidthCharts
              chartData={chartData}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
              timeWindow={timeWindow}
              setTimeWindow={setTimeWindow}
              loading={loading}
              chartSortBy={chartSortBy}
              setChartSortBy={setChartSortBy}
              getSortedChartEntries={getSortedChartEntries}
              expandChart={expandChart}
              summaryChartRefs={summaryChartRefs}
              chartRefs={chartRefs}
            />
          </div>
        </div>
      </div>

      <ExpandedChartModal
        chartId={expandedChart}
        type={expandedChartType}
        close={closeExpandedChart}
        chartData={chartData}
      />
    </div>
  );
};

export default HostNetworking;
