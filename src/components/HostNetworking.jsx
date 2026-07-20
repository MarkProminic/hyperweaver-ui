import { Helmet } from '@dr.pogodin/react-helmet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../contexts/ServerContext';
import { hasFeatureStrict } from '../utils/capabilities';

import BandwidthCharts from './Host/BandwidthCharts';
import BandwidthTable from './Host/BandwidthTable';
import ExpandedChartModal from './Host/ExpandedChartModal';
import InterfacesTable from './Host/InterfacesTable';
import IpAddressTable from './Host/IpAddressTable';
import NetworkingHeader from './Host/NetworkingHeader';
import NetworkSpacesPanel from './Host/NetworkSpaces/NetworkSpacesPanel';
import NetworkSummary from './Host/NetworkSummary';
import TopologyPanel from './Host/NetworkTopology/TopologyPanel';
import RoutingTable from './Host/RoutingTable';
import { useHostNetworkingData } from './Host/useHostNetworkingData';

const HostNetworking = () => {
  const { t } = useTranslation();
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
    getServers,
    loadNetworkData,
  } = useHostNetworkingData();

  // Use useMemo to prevent getServers() calls on every render
  const serverList = useMemo(() => getServers(), [getServers]);

  // The page's structure rows carry no networkSpaces/machine detail — on a
  // spaces-speaking (VirtualBox) host the topology feed fetches its own
  // structure instead of consuming this preload.
  const { currentServer } = useServers();
  const spacesHost = hasFeatureStrict(currentServer, 'network-spaces');

  const preloadedTopology = useMemo(
    () => ({
      networkInterfaces: networkInterfaces || [],
      networkUsage: networkUsage || [],
      ipAddresses: ipAddresses || [],
      routes: routes || [],
      aggregates: aggregates || [],
      etherstubs: etherstubs || [],
      vnics: vnics || [],
      zones: zones || [],
    }),
    [networkInterfaces, networkUsage, ipAddresses, routes, aggregates, etherstubs, vnics, zones]
  );

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
                <TopologyPanel
                  preloaded={spacesHost ? null : preloadedTopology}
                  reloadPreloaded={loadNetworkData}
                />
              )}
            </div>

            {spacesHost && currentServer && (
              <NetworkSpacesPanel server={currentServer} onChanged={loadNetworkData} />
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

            <div id="hw-network-charts" />
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
