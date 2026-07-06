import axios from 'axios';

export const getMachineStatus = (stats, machineName) => {
  if (!stats || !stats.data) {
    return 'unknown';
  }

  const runningMachines = stats.data.runningmachines || [];
  const allMachines = stats.data.allmachines || [];

  if (runningMachines.includes(machineName)) {
    return 'running';
  } else if (allMachines.includes(machineName)) {
    return 'installed';
  }

  return 'unknown';
};

// Status vocabulary is hypervisor-flavored VALUES on one shared shape: bhyve reports
// running/installed/ready/...; VirtualBox reports configured/running/stopped/suspended/
// paused/aborted/starting/stopping/unknown.
export const getStatusDotColor = status => {
  switch (status?.toLowerCase()) {
    case 'running':
      return 'text-success';
    case 'ready':
    case 'starting':
    case 'stopping':
      return 'text-info';
    case 'installed':
      return 'text-primary';
    case 'configured':
    case 'suspended':
    case 'paused':
      return 'text-warning';
    case 'shutting_down':
    case 'shutting-down':
      return 'text-warning';
    case 'incomplete':
    case 'aborted':
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
    case 'suspend':
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
    case 'suspend':
      return 'fas fa-pause';
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
  pathname === '/ui/machines';

export const buildShareUrl = (origin, pathname, currentServer, currentMachine) => {
  const baseUrl = `${origin}${pathname}`;
  const params = new URLSearchParams();

  if (currentServer) {
    params.set('host', currentServer.hostname);
  }

  if (currentMachine) {
    params.set('machine', currentMachine);
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
