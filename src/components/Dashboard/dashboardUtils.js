/**
 * Pure utility functions for the Dashboard component.
 * No React dependencies — these are stateless helpers.
 */

const bytesToSize = bytes => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) {
    return '0 Byte';
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Math.round(bytes / 1024 ** i, 2)} ${sizes[i]}`;
};

const getServerHealthStatus = serverResult => {
  if (!serverResult.success) {
    return 'offline';
  }

  const { data } = serverResult;
  if (!data) {
    return 'offline';
  }

  const hasHighLoad = data.loadavg && data.loadavg[0] > 2;
  const hasLowFreeMemory = data.totalmem && data.freemem && data.freemem / data.totalmem < 0.1;

  if (hasHighLoad || hasLowFreeMemory) {
    return 'warning';
  }
  return 'healthy';
};

const getStatusColor = status => {
  switch (status) {
    case 'healthy':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'offline':
      return 'text-danger';
    default:
      return 'text-muted';
  }
};

const calculateInfrastructureSummary = serverResults => {
  const summary = {
    totalServers: serverResults.length,
    onlineServers: 0,
    offlineServers: 0,
    totalZones: 0,
    runningZones: 0,
    stoppedZones: 0,
    totalMemory: 0,
    usedMemory: 0,
    healthyServers: 0,
    totalIssues: 0,
    serversRequiringReboot: 0,
    recentActivity: [],
  };

  serverResults.forEach(result => {
    if (result.success && result.data) {
      summary.onlineServers++;

      const allZones = result.data.allzones || [];
      const runningZones = result.data.runningzones || [];

      summary.totalZones += allZones.length;
      summary.runningZones += runningZones.length;
      summary.stoppedZones += allZones.length - runningZones.length;

      if (result.data.totalmem && result.data.freemem) {
        summary.totalMemory += result.data.totalmem;
        summary.usedMemory += result.data.totalmem - result.data.freemem;
      }

      const hasHighLoad = result.data.loadavg && result.data.loadavg[0] > 2;
      const hasLowFreeMemory =
        result.data.totalmem &&
        result.data.freemem &&
        result.data.freemem / result.data.totalmem < 0.1;
      const requiresReboot = result.healthData?.reboot_required;
      const hasFaults = result.healthData?.faultStatus?.hasFaults;
      const faultCount = result.healthData?.faultStatus?.faultCount || 0;

      let issueCount = 0;
      if (hasHighLoad) {
        issueCount++;
      }
      if (hasLowFreeMemory) {
        issueCount++;
      }
      if (requiresReboot) {
        issueCount++;
        summary.serversRequiringReboot++;
      }
      if (hasFaults) {
        issueCount += faultCount;
      }

      if (issueCount > 0) {
        summary.totalIssues += issueCount;
      } else {
        summary.healthyServers++;
      }
    } else {
      summary.offlineServers++;
      summary.totalIssues++;
    }
  });

  return summary;
};

export { bytesToSize, calculateInfrastructureSummary, getServerHealthStatus, getStatusColor };
