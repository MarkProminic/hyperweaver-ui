import axios from 'axios';

export const getZoneStatus = (zones, zoneName) => {
  if (!zones || !zones.data) {
    return 'unknown';
  }

  if (zones.data.zoneDetails && zones.data.zoneDetails[zoneName]) {
    return zones.data.zoneDetails[zoneName].state || zones.data.zoneDetails[zoneName].status;
  }

  const runningZones = zones.data.runningzones || [];
  const allZones = zones.data.allzones || [];

  if (runningZones.includes(zoneName)) {
    return 'running';
  } else if (allZones.includes(zoneName)) {
    return 'installed';
  }

  return 'unknown';
};

export const getStatusDotColor = status => {
  switch (status?.toLowerCase()) {
    case 'running':
      return 'text-success';
    case 'ready':
      return 'text-info';
    case 'installed':
      return 'text-primary';
    case 'configured':
      return 'text-warning';
    case 'shutting_down':
    case 'shutting-down':
      return 'text-warning';
    case 'incomplete':
      return 'text-danger';
    case 'down':
    case 'stopped':
      return 'text-secondary';
    default:
      return 'text-muted';
  }
};

export const getActionVariant = action => {
  switch (action) {
    case 'start':
      return 'is-success';
    case 'restart':
      return 'is-warning';
    case 'shutdown':
    case 'kill':
    case 'destroy':
      return 'is-danger';
    default:
      return 'is-primary';
  }
};

export const getActionIcon = action => {
  switch (action) {
    case 'start':
      return 'fas fa-play';
    case 'restart':
      return 'fas fa-redo';
    case 'shutdown':
      return 'fas fa-stop';
    case 'kill':
      return 'fas fa-skull';
    case 'destroy':
      return 'fas fa-trash';
    default:
      return 'fas fa-cogs';
  }
};

export const isShareableRoute = pathname =>
  pathname === '/ui/hosts' ||
  pathname === '/ui/host-manage' ||
  pathname === '/ui/host-networking' ||
  pathname === '/ui/host-storage' ||
  pathname === '/ui/host-devices' ||
  pathname.startsWith('/ui/zone') ||
  pathname === '/ui/zones';

export const buildShareUrl = (origin, pathname, currentServer, currentZone) => {
  const baseUrl = `${origin}${pathname}`;
  const params = new URLSearchParams();

  if (currentServer) {
    params.set('host', currentServer.hostname);
  }

  if (currentZone) {
    params.set('zone', currentZone);
  }

  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
};

export const startHealthMonitoring = onMaxRetriesReached => {
  console.log('Starting health monitoring (waiting for server shutdown during grace period)...');

  let shutdownCheckCount = 0;
  const maxShutdownChecks = 30;

  const startRecoveryMonitoring = () => {
    console.log('Starting recovery monitoring with exponential backoff...');
    let retryCount = 0;
    const maxRetries = 15;

    const checkRecovery = async () => {
      const delay = Math.min(1000 * 2 ** retryCount, 60000);

      try {
        console.log(`Recovery check attempt ${retryCount + 1}/${maxRetries} (delay: ${delay}ms)`);
        const response = await axios.get('/api/health');

        if (response.data.success) {
          console.log('Server is back online, refreshing page...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
      } catch (recoveryError) {
        console.log(`Recovery check failed (attempt ${retryCount + 1}): ${recoveryError.message}`);
      }

      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`Retrying recovery check in ${delay}ms...`);
        setTimeout(checkRecovery, delay);
      } else {
        console.log('Maximum recovery attempts reached. Server may need manual intervention.');
        if (onMaxRetriesReached) {
          onMaxRetriesReached();
        }
      }
    };

    checkRecovery();
  };

  const waitForShutdown = async () => {
    try {
      console.log(`Shutdown detection check ${shutdownCheckCount + 1}/${maxShutdownChecks}`);
      const response = await axios.get('/api/health');

      if (response.data.success) {
        shutdownCheckCount++;
        if (shutdownCheckCount < maxShutdownChecks) {
          console.log('Server still running during grace period, checking again in 5s...');
          setTimeout(waitForShutdown, 5000);
        } else {
          console.log(
            "Server didn't shut down within expected timeframe, starting recovery monitoring anyway..."
          );
          startRecoveryMonitoring();
        }
      }
    } catch (shutdownError) {
      console.log(
        `Server is now unavailable (shutdown detected): ${shutdownError.message}, starting recovery monitoring...`
      );
      startRecoveryMonitoring();
    }
  };

  waitForShutdown();
};
