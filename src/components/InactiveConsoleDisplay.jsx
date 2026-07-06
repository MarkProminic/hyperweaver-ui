import PropTypes from 'prop-types';
import React from 'react';

const InactiveConsoleDisplay = ({
  selectedMachine,
  currentServer,
  loading,
  loadingVnc,
  setLoading,
  setLoadingVnc,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startVncSession,
  waitForVncSessionReady,
  startZloginSessionExplicitly,
}) => (
  <div className="hw-console-container-hidden">
    {/* Inactive Console Header */}
    <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
      <div>
        <h6 className="fs-6 fw-bold text-white mb-1">Console Management</h6>
        <p className="small text-white-50 mb-0">No active sessions • Click to start</p>
      </div>
      <div className="d-flex gap-1 m-0">
        <button
          type="button"
          className="btn btn-sm btn-info"
          onClick={async () => {
            console.log(`🚀 START VNC: Starting VNC for preview in ${selectedMachine}`);
            try {
              setLoadingVnc(true);
              const result = await startVncSession(
                currentServer.hostname,
                currentServer.port,
                currentServer.protocol,
                selectedMachine
              );

              if (result.success) {
                const readinessResult = await waitForVncSessionReady(selectedMachine);
                if (readinessResult.ready) {
                  setMachineDetails(prev => ({
                    ...prev,
                    active_vnc_session: true,
                    vnc_session_info: {
                      ...result.data,
                      ...readinessResult.sessionInfo,
                    },
                  }));
                  setActiveConsoleType('vnc');
                }
              }
            } catch (error) {
              console.error('Error starting VNC:', error);
              setError('Error starting VNC console');
            } finally {
              setLoadingVnc(false);
            }
          }}
          disabled={loading || loadingVnc}
          title="Start VNC Console"
        >
          <i className="fas fa-desktop me-2" />
          <span>{loadingVnc ? 'Starting...' : 'Start VNC'}</span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={async () => {
            if (!currentServer || !selectedMachine) {
              return;
            }
            console.log(`🚀 START ZLOGIN: Starting zlogin for preview in ${selectedMachine}`);
            try {
              setLoading(true);
              const result = await startZloginSessionExplicitly(currentServer, selectedMachine);
              if (result) {
                setMachineDetails(prev => ({
                  ...prev,
                  zlogin_session: result,
                  active_zlogin_session: true,
                }));
                setActiveConsoleType('zlogin');
              }
            } catch (error) {
              console.error('Error starting zlogin:', error);
              setError('Error starting zlogin console');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          title="Start zlogin Console"
        >
          <i className="fas fa-terminal me-2" />
          <span>{loading ? 'Starting...' : 'Start zlogin'}</span>
        </button>
      </div>
    </div>

    {/* Console Content - Inactive State */}
    <div className="hw-inactive-console-content">
      <div className="hw-text-placeholder text-center">
        <div className="has-margin-bottom-12px">
          <img src="/ui/images/startcloud.svg" alt="Start Console" className="hw-startup-icon" />
        </div>
        <div className="fs-6 fw-medium mb-2">
          <strong>No Active Console Session</strong>
        </div>
        <div className="small">Click the buttons above to start VNC or zlogin console</div>
      </div>
    </div>
  </div>
);

InactiveConsoleDisplay.propTypes = {
  selectedMachine: PropTypes.string,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
  loading: PropTypes.bool,
  loadingVnc: PropTypes.bool,
  setLoading: PropTypes.func,
  setLoadingVnc: PropTypes.func,
  setError: PropTypes.func,
  setMachineDetails: PropTypes.func,
  setActiveConsoleType: PropTypes.func,
  startVncSession: PropTypes.func,
  waitForVncSessionReady: PropTypes.func,
  startZloginSessionExplicitly: PropTypes.func,
};

export default React.memo(InactiveConsoleDisplay);
