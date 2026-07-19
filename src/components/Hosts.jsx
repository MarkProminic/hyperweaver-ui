import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../contexts/ServerContext.jsx';
import { hasFeature, hasMachines } from '../utils/capabilities';

import HostHeader from './Host/HostHeader.jsx';
import MachineManager from './Host/MachineManager.jsx';
import MonitoringDatabase from './Host/MonitoringDatabase.jsx';
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

/**
 * Host Overview Dashboard Component
 *
 * Displays comprehensive overview for the currently selected host from navbar context.
 * No server selection sidebar - uses global currentServer from ServerContext.
 */
const Hosts = () => {
  const { t } = useTranslation();
  const { currentServer, servers, startMachine, stopMachine, restartMachine } = useServers();

  const {
    serverStats,
    cpuUsagePct,
    monitoringHealth,
    monitoringStatus,
    networkInterfaces,
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

  // Latest ARC size in bytes for the Resource Utilization memory bar — last
  // point of the ARC chart series (GB, refreshed every poll cycle). Null (no
  // ZFS / no ARC data) hides the bar segment entirely.
  const arcSizeBytes = arcChartData?.sizeData?.length
    ? arcChartData.sizeData[arcChartData.sizeData.length - 1][1] * 1024 ** 3
    : null;

  // Machine management functions
  const handleMachineAction = async (action, machineName = null) => {
    if (!currentServer) {
      return;
    }

    try {
      let machinesToProcess;
      if (machineName) {
        machinesToProcess = [machineName];
      } else if (action === 'startAll') {
        machinesToProcess =
          serverStats.allmachines?.filter(
            machine => !serverStats.runningmachines?.includes(machine)
          ) || [];
      } else if (action === 'stopAll') {
        machinesToProcess = serverStats.runningmachines || [];
      } else {
        machinesToProcess = [];
      }

      const machineActionPromises = machinesToProcess.map(machine => {
        switch (action) {
          case 'start':
          case 'startAll':
            return startMachine(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              machine
            );
          case 'stop':
          case 'stopAll':
            return stopMachine(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              machine
            );
          case 'restart':
            return restartMachine(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              machine
            );
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(machineActionPromises);

      // Refresh data after action
      setTimeout(() => loadHostData(currentServer), 2000);
    } catch (err) {
      console.error(`Error performing machine action ${action}:`, err);
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
                <strong>{t('tasks.hosts.hostOverview')}</strong>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">{t('tasks.hosts.noServers')}</h2>
                <p>{t('tasks.hosts.noServersMessage')}</p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />
                    {t('tasks.hosts.addServer')}
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
                <strong>{t('tasks.hosts.hostOverview')}</strong>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-warning">
                <h2 className="fs-4 fw-bold">{t('tasks.hosts.noHostSelected')}</h2>
                <p>{t('tasks.hosts.noHostSelectedMessage')}</p>
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
              cpuUsagePct={cpuUsagePct}
              monitoringStatus={monitoringStatus}
              monitoringHealth={monitoringHealth}
              taskStats={taskStats}
              swapSummaryData={swapSummaryData}
              arcSizeBytes={arcSizeBytes}
              currentServer={currentServer}
              loading={loading}
            />

            {/* Capability-gated (hasMachines) — hidden until the agent offers machine management */}
            {hasMachines(currentServer) && (
              <MachineManager
                serverStats={serverStats}
                currentServer={currentServer}
                handleMachineAction={handleMachineAction}
                loading={loading}
              />
            )}

            {/* Monitoring-fed panels (sync OPEN ITEM 4b): the summary cards and the
                performance charts all render /monitoring/* data — hidden on agents
                that don't advertise the `monitoring` token (their fetches are
                skipped by the loaders for the same reason). */}
            {hasFeature(currentServer, 'monitoring') && (
              <>
                <NetworkStorageSummary
                  networkInterfaces={networkInterfaces}
                  storageSummary={storageSummary}
                  showZfsStorage={hasFeature(currentServer, 'zfs')}
                  loading={loading}
                />

                {/* Performance Monitoring Charts Section */}
                <div className="card mb-5">
                  <div className="card-body">
                    <h5 className="h5 mb-4 d-flex align-items-center gap-2">
                      <i className="fas fa-chart-area" />
                      <span>{t('tasks.hosts.performanceMonitoring')}</span>
                    </h5>

                    <div className="row g-3">
                      {/* Pool I/O and ARC are ZFS-shaped data — hidden where the
                          agent doesn't advertise `zfs` (Mark, 2026-07-07). When an
                          agent ships generic disk-I/O monitoring, that gets its own
                          chart against that wire, not this pool one. */}
                      {hasFeature(currentServer, 'zfs') && (
                        <StorageIOChart
                          chartData={chartData}
                          storageSeriesVisibility={storageSeriesVisibility}
                          setStorageSeriesVisibility={setStorageSeriesVisibility}
                          expandChart={expandChart}
                          loading={loading}
                        />
                      )}

                      {hasFeature(currentServer, 'zfs') && (
                        <ZfsArcChart
                          arcChartData={arcChartData}
                          expandChart={expandChart}
                          loading={loading}
                        />
                      )}

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

                {/* Self-hides on realtime-only agents (empty store = no database). */}
                <MonitoringDatabase currentServer={currentServer} />
              </>
            )}

            {/* Token-gated per Mark's go (sync OPEN ITEM 1) — render-gating also
                stops the widget's own fetches on agents without provisioning. */}
            {hasFeature(currentServer, 'provisioning') && (
              <ProvisioningStatus currentServer={currentServer} />
            )}
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
