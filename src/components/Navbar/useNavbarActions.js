import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useServers } from '../../contexts/ServerContext';
import { useHostSystemManagement } from '../../hooks/useHostSystemManagement';

import { isShareableRoute, buildShareUrl, startHealthMonitoring } from './navbarUtils';

export const useNavbarActions = () => {
  const [isModal, setModalState] = useState(true);
  const [zones, setZones] = useState(null);
  const [currentMode, setCurrentMode] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [hostActionOptions, setHostActionOptions] = useState({
    restartType: 'standard',
    powerType: 'shutdown',
    gracePeriod: 60,
    message: '',
    bootEnvironment: '',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    servers: allServers,
    currentServer,
    selectServer,
    currentZone,
    selectZone,
    clearZone,
    makeAgentRequest,
    startZone,
    stopZone,
    restartZone,
    deleteZone,
    restartHost,
    shutdownHost,
  } = useServers();

  const { hostFastReboot, hostPoweroff, hostHalt } = useHostSystemManagement();

  const handleModalClick = () => {
    setModalState(!isModal);
  };

  const handleZoneAction = async action => {
    if (!currentServer || !currentZone) {
      return;
    }

    try {
      setLoading(true);
      let result;

      switch (action) {
        case 'start':
          result = await startZone(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            currentZone
          );
          break;
        case 'shutdown':
          result = await stopZone(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            currentZone
          );
          break;
        case 'restart':
          result = await restartZone(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            currentZone
          );
          break;
        case 'kill':
          result = await stopZone(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            currentZone,
            true
          );
          break;
        case 'destroy':
          result = await deleteZone(
            currentServer.hostname,
            currentServer.port,
            currentServer.protocol,
            currentZone
          );
          break;
        default:
          console.warn('Unknown action:', action);
          return;
      }

      if (result.success) {
        console.log(`Zone ${action} initiated successfully`);
        setTimeout(() => {
          if (currentServer) {
            makeAgentRequest(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              'stats'
            )
              .then(res => {
                if (res.success) {
                  setZones({ data: res.data });
                }
              })
              .catch(zoneRefreshError =>
                console.error('Error refreshing zones:', zoneRefreshError)
              );
          }
        }, 2000);
      } else {
        console.error(`Failed to ${action} zone:`, result.message);
      }
    } catch (zoneActionError) {
      console.error(`Error during zone ${action}:`, zoneActionError);
    } finally {
      setLoading(false);
      handleModalClick();
    }
  };

  const handleHostAction = async action => {
    if (!currentServer) {
      return;
    }

    try {
      setLoading(true);
      let result;

      const options = {
        gracePeriod: hostActionOptions.gracePeriod,
        message: hostActionOptions.message || `Host ${action} initiated via Hyperweaver UI`,
      };

      switch (action) {
        case 'restart':
          if (hostActionOptions.restartType === 'fast') {
            result = await hostFastReboot(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              {
                bootEnvironment: hostActionOptions.bootEnvironment,
              }
            );
          } else {
            result = await restartHost(
              currentServer.hostname,
              currentServer.port,
              currentServer.protocol,
              options
            );
          }
          break;
        case 'shutdown':
          switch (hostActionOptions.powerType) {
            case 'poweroff':
              result = await hostPoweroff(
                currentServer.hostname,
                currentServer.port,
                currentServer.protocol,
                options
              );
              break;
            case 'halt':
              result = await hostHalt(
                currentServer.hostname,
                currentServer.port,
                currentServer.protocol
              );
              break;
            default:
              result = await shutdownHost(
                currentServer.hostname,
                currentServer.port,
                currentServer.protocol,
                options
              );
              break;
          }
          break;
        default:
          console.warn('Unknown host action:', action);
          return;
      }

      if (result.success) {
        console.log(`Host ${action} initiated successfully`);
        console.log('Task ID:', result.data?.task_id || result.data?.id);

        if (action === 'restart') {
          setTimeout(() => {
            startHealthMonitoring(() => setRecoveryFailed(true));
          }, 3000);
        }
      } else {
        console.error(`Failed to ${action} host:`, result.message);
      }
    } catch (hostActionError) {
      console.error(`Error during host ${action}:`, hostActionError);
    } finally {
      setLoading(false);
      handleModalClick();
    }
  };

  const handleShareCurrentPage = async () => {
    if (!isShareableRoute(location.pathname)) {
      console.warn('Share not available on this page');
      return;
    }

    const shareUrl = buildShareUrl(
      window.location.origin,
      location.pathname,
      currentServer,
      currentZone
    );

    try {
      await navigator.clipboard.writeText(shareUrl);
      console.log('Share URL copied to clipboard:', shareUrl);
    } catch (clipboardError) {
      console.error('Failed to copy URL to clipboard:', clipboardError);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Share URL copied to clipboard (fallback):', shareUrl);
      } catch (fallbackError) {
        console.error('Failed to copy URL using fallback method:', fallbackError);
      }
    }
  };

  useEffect(() => {
    if (!currentServer && allServers && allServers.length > 0) {
      selectServer(allServers[0]);
    }
  }, [allServers, currentServer, selectServer]);

  useEffect(() => {
    if (currentServer && user) {
      makeAgentRequest(currentServer.hostname, currentServer.port, currentServer.protocol, 'stats')
        .then(res => {
          if (res.success) {
            setZones({ data: res.data });
          } else {
            console.error('Error fetching zones:', res.message);
          }
        })
        .catch(fetchError => {
          console.error('Error fetching zones:', fetchError);
        });
    }
  }, [currentServer, user, makeAgentRequest]);

  return {
    isModal,
    zones,
    currentMode,
    setCurrentMode,
    currentAction,
    setCurrentAction,
    loading,
    hostActionOptions,
    setHostActionOptions,
    recoveryFailed,
    setRecoveryFailed,
    handleModalClick,
    handleZoneAction,
    handleHostAction,
    handleShareCurrentPage,
    navigate,
    location,
    user,
    allServers,
    currentServer,
    currentZone,
    selectServer,
    selectZone,
    clearZone,
  };
};
