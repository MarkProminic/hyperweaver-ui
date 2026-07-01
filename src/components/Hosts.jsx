import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';

import { useServers } from '../contexts/ServerContext.jsx';

import HostHeader from './Host/HostHeader.jsx';
import NetworkStorageSummary from './Host/NetworkStorageSummary.jsx';
import ZfsArcChart from './Host/PerformanceCharts/Arc.jsx';
import CpuChart from './Host/PerformanceCharts/Cpu.jsx';
import ExpandedChartModal from './Host/PerformanceCharts/Expanded/Modal.jsx';
import MemoryChart from './Host/PerformanceCharts/Memory.jsx';
import NetworkChart from './Host/PerformanceCharts/Network.jsx';
import StorageIOChart from './Host/PerformanceCharts/StorageIO.jsx';
import ProvisioningStatus from './Host/ProvisioningStatus.jsx';
import SystemInfo from './Host/SystemInfo.jsx';
import { useHostData } from './Host/useHostData.js';
import ZoneManager from './Host/ZoneManager.jsx';

/**
 * Host Overview Dashboard Component
 *
 * Displays comprehensive overview for the currently selected host from navbar context.
 * No server selection sidebar - uses global currentServer from ServerContext.
 */
const Hosts = () => {
  const { currentServer, servers, startZone, stopZone, restartZone } = useServers();

  const {
    serverStats,
    monitoringHealth,
    monitoringStatus,
    storageSummary,
    taskStats,
    swapSummaryData, // Add swapSummaryData here
    loading,
    error,
    refreshInterval,
    setRefreshInterval,
    autoRefresh,
    setAutoRefresh,
    chartData,
    arcChartData,
    networkChartData,
    cpuChartData,
    memoryChartData,
    timeWindow,
    setTimeWindow,
    resolution,
    setResolution,
    loadHostData,
    refreshAllData,
  } = useHostData(currentServer);

  const [expandedChart, setExpandedChart] = useState(null);
  const [expandedChartType, setExpandedChartType] = useState(null);

  // Series visibility controls for each chart
  const [storageSeriesVisibility, setStorageSeriesVisibility] = useState({
    read: true,
    write: true,
    total: true,
  });

  const [networkSeriesVisibility, setNetworkSeriesVisibility] = useState({
    read: true, // Corresponds to RX
    write: true, // Corresponds to TX
    total: true,
  });

  const [cpuSeriesVisibility, setCpuSeriesVisibility] = useState({
    overall: true,
    cores: true, // A master toggle for all cores
    load: false, // Load average hidden by default
  });

  const [memorySeriesVisibility, setMemorySeriesVisibility] = useState({
    used: true,
    free: true,
    cached: true,
  });

  // Expand chart function (like HostNetworking.jsx)
  const expandChart = (chartId, chartType) => {
    setExpandedChart(chartId);
    setExpandedChartType(chartType);
  };

  // Close expanded chart modal
  const closeExpandedChart = () => {
    setExpandedChart(null);
    setExpandedChartType(null);
  };

  // Zone management functions
  const handleZoneAction = async (action, zoneName = null) => {
    if (!currentServer) {
      return;
    }

    try {
      let zonesToProcess;
      if (zoneName) {
        zonesToProcess = [zoneName];
      } else if (action === 'startAll') {
        zonesToProcess =
          serverStats.allzones?.filter(zone => !serverStats.runningzones?.includes(zone)) || [];
      } else if (action === 'stopAll') {
        zonesToProcess = serverStats.runningzones || [];
      } else {
        zonesToProcess = [];
      }

      const zoneActionPromises = zonesToProcess.map(zone => {
        switch (action) {
          case 'start':
          case 'startAll':
            return startZone(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              zone
            );
          case 'stop':
          case 'stopAll':
            return stopZone(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              zone
            );
          case 'restart':
            return restartZone(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              zone
            );
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(zoneActionPromises);

      // Refresh data after action
      setTimeout(() => loadHostData(currentServer), 2000);
    } catch (err) {
      console.error(`Error performing zone action ${action}:`, err);
    }
  };

  // No servers available
  if (!servers || servers.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Host Overview - Hyperweaver</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>Host Overview</strong>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">No Servers</h2>
                <p>
                  You haven&apos;t added any Servers yet. Add a server to start managing hosts and
                  zones.
                </p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />
                    Add Server
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No current server selected
  if (!currentServer) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Host Overview - Hyperweaver</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>Host Overview</strong>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-warning">
                <h2 className="fs-4 fw-bold">No Host Selected</h2>
                <p>
                  Please select a host from the dropdown in the navigation bar to view its overview.
                </p>
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
        <title>Host Overview - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <HostHeader
            currentServer={currentServer}
            loading={loading}
            refreshInterval={refreshInterval}
            setRefreshInterval={setRefreshInterval}
            refreshAllData={refreshAllData}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            resolution={resolution}
            setResolution={setResolution}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
          />

          <div className="card-body">
            {error && (
              <div className="alert alert-danger">
                <p>{error}</p>
              </div>
            )}

            {/* Host Overview - Progressive Loading (like networking page) */}
            <SystemInfo
              serverStats={serverStats}
              monitoringStatus={monitoringStatus}
              monitoringHealth={monitoringHealth}
              taskStats={taskStats}
              swapSummaryData={swapSummaryData}
              loading={loading}
            />

            <ZoneManager
              serverStats={serverStats}
              currentServer={currentServer}
              handleZoneAction={handleZoneAction}
              loading={loading}
            />

            <NetworkStorageSummary
              serverStats={serverStats}
              storageSummary={storageSummary}
              loading={loading}
            />

            {/* Performance Monitoring Charts Section */}
            <div className="card mb-5">
              <div className="card-body">
                <h5 className="h5 mb-4 d-flex align-items-center gap-2">
                  <i className="fas fa-chart-area" />
                  <span>Performance Monitoring</span>
                </h5>

                <div className="row g-3">
                  <StorageIOChart
                    chartData={chartData}
                    storageSeriesVisibility={storageSeriesVisibility}
                    setStorageSeriesVisibility={setStorageSeriesVisibility}
                    expandChart={expandChart}
                    loading={loading}
                  />

                  <ZfsArcChart
                    arcChartData={arcChartData}
                    expandChart={expandChart}
                    loading={loading}
                  />

                  <NetworkChart
                    networkChartData={networkChartData}
                    networkSeriesVisibility={networkSeriesVisibility}
                    setNetworkSeriesVisibility={setNetworkSeriesVisibility}
                    expandChart={expandChart}
                    loading={loading}
                  />

                  <CpuChart
                    cpuChartData={cpuChartData}
                    cpuSeriesVisibility={cpuSeriesVisibility}
                    setCpuSeriesVisibility={setCpuSeriesVisibility}
                    expandChart={expandChart}
                    loading={loading}
                  />

                  <MemoryChart
                    memoryChartData={memoryChartData}
                    memorySeriesVisibility={memorySeriesVisibility}
                    expandChart={expandChart}
                    loading={loading}
                  />
                </div>
              </div>
            </div>

            <ProvisioningStatus currentServer={currentServer} />
          </div>
        </div>
      </div>

      <ExpandedChartModal
        expandedChart={expandedChart}
        closeExpandedChart={closeExpandedChart}
        expandedChartType={expandedChartType}
        currentServer={currentServer}
        storageSeriesVisibility={storageSeriesVisibility}
        setStorageSeriesVisibility={setStorageSeriesVisibility}
        networkSeriesVisibility={networkSeriesVisibility}
        setNetworkSeriesVisibility={setNetworkSeriesVisibility}
        cpuSeriesVisibility={cpuSeriesVisibility}
        setCpuSeriesVisibility={setCpuSeriesVisibility}
        memorySeriesVisibility={memorySeriesVisibility}
        setMemorySeriesVisibility={setMemorySeriesVisibility}
        chartData={chartData}
        arcChartData={arcChartData}
        networkChartData={networkChartData}
        cpuChartData={cpuChartData}
        memoryChartData={memoryChartData}
      />
    </div>
  );
};

export default Hosts;
