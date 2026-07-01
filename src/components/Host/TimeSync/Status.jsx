import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../../contexts/ServerContext';
import NTPConfirmActionModal from '../NTPConfirmActionModal';

import TimeSyncActions from './Actions';
import TimeSyncPeerTable from './PeerTable';
import TimeSyncServiceInfo from './ServiceInfo';
import TimeSyncServiceManagement from './ServiceManagement';

const TimeSyncStatus = ({ server, onError }) => {
  const [statusInfo, setStatusInfo] = useState(null);
  const [availableSystems, setAvailableSystems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');

  const { makeAgentRequest } = useServers();

  const loadTimeSyncStatus = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/status',
        'GET'
      );

      if (result.success) {
        setStatusInfo(result.data);
      } else {
        onError(result.message || 'Failed to load time synchronization status');
      }
    } catch (err) {
      onError(`Error loading time synchronization status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError]);

  const loadAvailableSystems = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/available-systems',
        'GET'
      );

      if (result.success) {
        setAvailableSystems(result.data);
      } else {
        // Don't show error for available systems - it's not critical
        console.warn('Failed to load available systems:', result.message);
      }
    } catch (err) {
      console.warn('Error loading available systems:', err.message);
    }
  }, [server, makeAgentRequest]);

  // Load time sync status and available systems on component mount
  useEffect(() => {
    loadTimeSyncStatus();
    loadAvailableSystems();
  }, [loadTimeSyncStatus, loadAvailableSystems]);

  const handleForceSync = async () => {
    if (!server || !makeAgentRequest) {
      return { success: false };
    }

    try {
      setSyncing(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/sync',
        'POST',
        {
          created_by: 'api',
        }
      );

      if (result.success) {
        // Show success message and refresh status
        console.log('Time synchronization initiated');
        setTimeout(() => loadTimeSyncStatus(), 2000); // Refresh after 2 seconds
        return { success: true };
      }
      onError(result.message || 'Failed to initiate time synchronization');
      return { success: false };
    } catch (err) {
      onError(`Error initiating time synchronization: ${err.message}`);
      return { success: false };
    } finally {
      setSyncing(false);
    }
  };

  const handleServiceAction = action => {
    setActionType(action);
    setShowActionModal(true);
  };

  const handleServiceSwitch = async targetService => {
    if (!server || !makeAgentRequest) {
      return { success: false };
    }

    try {
      setSyncing(true); // Reuse syncing state for service operations
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/time-sync/switch',
        'POST',
        {
          target_system: targetService, // 'ntp', 'chrony', or 'ntpsec'
          preserve_servers: true,
          install_if_needed: true,
          created_by: 'api',
        }
      );

      if (result.success) {
        console.log(`Successfully initiated switch to ${targetService} service`);
        // Refresh both status and available systems after switch
        setTimeout(() => {
          loadTimeSyncStatus();
          loadAvailableSystems();
        }, 2000);
        return { success: true };
      }
      onError(result.message || `Failed to switch to ${targetService} service`);
      return { success: false };
    } catch (err) {
      onError(`Error switching to ${targetService} service: ${err.message}`);
      return { success: false };
    } finally {
      setSyncing(false);
    }
  };

  const handleServiceRestart = async () => {
    if (!server || !makeAgentRequest) {
      return { success: false };
    }

    console.log('Restart button clicked, statusInfo:', statusInfo);

    if (!statusInfo?.service_details?.fmri) {
      onError('Service FMRI not available. Cannot restart service.');
      return { success: false };
    }

    try {
      setSyncing(true);
      onError('');

      console.log('Restarting service with FMRI:', statusInfo.service_details.fmri);

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'services/action',
        'POST',
        {
          fmri: encodeURIComponent(statusInfo.service_details.fmri),
          action: 'restart',
          options: {},
        }
      );

      if (result.success) {
        console.log('Service restart initiated successfully');
        // Refresh status after restart - same pattern as ServiceManagement
        setTimeout(() => loadTimeSyncStatus(), 2000); // Reduced timeout to match ServiceManagement
        return { success: true };
      }
      onError(result.message || 'Failed to restart time synchronization service');
      return { success: false };
    } catch (err) {
      console.error('Error restarting service:', err);
      onError(`Error restarting time synchronization service: ${err.message}`);
      return { success: false };
    } finally {
      setSyncing(false);
    }
  };

  const getConfirmHandler = () => {
    switch (actionType) {
      case 'sync':
        return handleForceSync;
      case 'restart':
        return handleServiceRestart;
      case 'switch-ntp':
        return () => handleServiceSwitch('ntp');
      case 'switch-chrony':
        return () => handleServiceSwitch('chrony');
      case 'switch-ntpsec':
        return () => handleServiceSwitch('ntpsec');
      default:
        return () => Promise.resolve({ success: true });
    }
  };

  const handleSystemSwitch = systemKey => {
    setActionType(`switch-${systemKey}`);
    setShowActionModal(true);
  };

  if (loading && !statusInfo) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading time synchronization status...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Time Synchronization Status</h2>
        <p>
          Monitor time synchronization service and peer status on <strong>{server.hostname}</strong>
          .
        </p>
      </div>

      {/* Service Status Information */}
      {statusInfo && <TimeSyncServiceInfo statusInfo={statusInfo} />}

      {/* Peer Status Table */}
      {statusInfo && statusInfo.peers && statusInfo.peers.length > 0 && (
        <TimeSyncPeerTable peers={statusInfo.peers} loading={loading} />
      )}

      {/* Quick Actions */}
      <TimeSyncActions
        onAction={handleServiceAction}
        onRefresh={loadTimeSyncStatus}
        loading={loading}
        syncing={syncing}
        statusAvailable={statusInfo?.available}
      />

      {/* Service Management */}
      <TimeSyncServiceManagement
        availableSystems={availableSystems}
        loading={loading}
        syncing={syncing}
        onSwitch={handleSystemSwitch}
      />

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <NTPConfirmActionModal
          service={statusInfo}
          action={actionType}
          onClose={() => {
            setShowActionModal(false);
            setActionType('');
          }}
          onConfirm={getConfirmHandler()}
        />
      )}
    </div>
  );
};

TimeSyncStatus.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default TimeSyncStatus;
