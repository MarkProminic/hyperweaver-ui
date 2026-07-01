import PropTypes from 'prop-types';

import ZloginActionsDropdown from '../ZloginActionsDropdown';
import ZoneShell from '../ZoneShell';

const ZloginModal = ({
  showZloginConsole,
  setShowZloginConsole,
  isZloginFullScreen,
  setIsZloginFullScreen,
  selectedZone,
  handleZloginConsole,
  handleZloginModalPaste,
  user,
  zoneDetails,
  setShowVncConsole,
  handleVncConsole,
  loadingVnc,
  setLoading,
  makeAgentRequest,
  currentServer,
  forceZoneSessionCleanup,
  refreshZloginSessionStatus,
  setError,
  modalReadOnly,
  setModalReadOnly,
}) => {
  if (!showZloginConsole) {
    return null;
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center has-z-index-modal">
      <div
        className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75"
        onClick={() => setShowZloginConsole(false)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setShowZloginConsole(false);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div
        className={
          isZloginFullScreen ? 'hw-modal-container-fullscreen' : 'hw-modal-container-normal'
        }
      >
        <header
          className={`d-flex align-items-center bg-dark text-white ${isZloginFullScreen ? 'hw-modal-header-fullscreen' : 'hw-modal-header-normal'}`}
        >
          <p
            className={`flex-grow-1 mb-0 ${isZloginFullScreen ? 'hw-modal-title-fullscreen' : 'hw-modal-title-normal'}`}
          >
            <i className="fas fa-terminal me-2" />
            <span>zlogin Console - {selectedZone}</span>
          </p>
          <div className="d-flex gap-1 m-0">
            <ZloginActionsDropdown
              variant="button"
              onToggleReadOnly={() => {
                console.log(
                  `🔧 ZLOGIN MODAL READ-ONLY: Toggling from ${modalReadOnly} to ${!modalReadOnly}`
                );
                setModalReadOnly(!modalReadOnly);
              }}
              onNewSession={() => {
                setShowZloginConsole(false);
                setTimeout(() => {
                  handleZloginConsole(selectedZone).then(result => {
                    if (!result.success) {
                      setError(result.message);
                    }
                  });
                }, 100);
              }}
              onKillSession={async () => {
                if (!currentServer || !selectedZone) {
                  return;
                }
                try {
                  setLoading(true);
                  const sessionsResult = await makeAgentRequest(
                    currentServer.hostname,
                    currentServer.port,
                    currentServer.protocol,
                    'zlogin/sessions'
                  );
                  if (sessionsResult.success && sessionsResult.data) {
                    const activeSessions = Array.isArray(sessionsResult.data)
                      ? sessionsResult.data
                      : sessionsResult.data.sessions || [];
                    const activeZoneSession = activeSessions.find(
                      session => session.zone_name === selectedZone && session.status === 'active'
                    );
                    if (activeZoneSession) {
                      const killResult = await makeAgentRequest(
                        currentServer.hostname,
                        currentServer.port,
                        currentServer.protocol,
                        `zlogin/sessions/${activeZoneSession.id}/stop`,
                        'DELETE'
                      );
                      if (killResult.success) {
                        await forceZoneSessionCleanup(currentServer, selectedZone);
                        await refreshZloginSessionStatus(selectedZone);
                      } else {
                        setError(`Failed to kill zlogin session: ${killResult.message}`);
                      }
                    }
                  } else {
                    setError('Failed to get active sessions');
                  }
                } catch (error) {
                  console.error('ZLOGIN MODAL: Error killing session:', error);
                  setError('Error killing zlogin session');
                } finally {
                  setLoading(false);
                }
              }}
              onScreenshot={() => {
                const terminalElement = document.querySelector('.xterm-screen');
                if (terminalElement) {
                  const text = terminalElement.textContent || terminalElement.innerText;
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zlogin-output-${selectedZone}-${Date.now()}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
              }}
              isReadOnly={modalReadOnly}
              isAdmin={
                user?.role === 'admin' ||
                user?.role === 'super-admin' ||
                user?.role === 'organization-admin'
              }
            />
            {!modalReadOnly && (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={handleZloginModalPaste}
                title="Paste from Browser Clipboard"
              >
                <i className="fas fa-paste" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={async () => {
                if (zoneDetails.active_vnc_session) {
                  setShowZloginConsole(false);
                  setShowVncConsole(true);
                } else {
                  setShowZloginConsole(false);
                  const errorMsg = await handleVncConsole(selectedZone);
                  if (errorMsg) {
                    setError(errorMsg);
                  }
                }
              }}
              disabled={loadingVnc}
              title={zoneDetails.active_vnc_session ? 'Switch to VNC Console' : 'Start VNC Console'}
            >
              <i className={`fas ${loadingVnc ? 'fa-spinner fa-pulse' : 'fa-desktop'} me-2`} />
              <span>{loadingVnc ? 'Starting...' : 'VNC'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={() => setIsZloginFullScreen(!isZloginFullScreen)}
              title={isZloginFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              <i className={`fas ${isZloginFullScreen ? 'fa-compress' : 'fa-expand'} me-2`} />
              <span>{isZloginFullScreen ? 'Exit' : 'Full'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => setShowZloginConsole(false)}
              title="Close Console"
            >
              <i className="fas fa-times me-2" />
              <span>Exit</span>
            </button>
          </div>
        </header>
        <section className="p-0 hw-modal-body">
          <ZoneShell
            key={`zlogin-modal-${selectedZone}-${modalReadOnly ? 'ro' : 'rw'}`}
            zoneName={selectedZone}
            readOnly={modalReadOnly}
            context="modal"
          />
        </section>
      </div>
    </div>
  );
};

ZloginModal.propTypes = {
  showZloginConsole: PropTypes.bool.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
  isZloginFullScreen: PropTypes.bool.isRequired,
  setIsZloginFullScreen: PropTypes.func.isRequired,
  selectedZone: PropTypes.string,
  handleZloginConsole: PropTypes.func.isRequired,
  handleZloginModalPaste: PropTypes.func.isRequired,
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
  zoneDetails: PropTypes.shape({
    active_vnc_session: PropTypes.bool,
  }),
  setShowVncConsole: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  setLoading: PropTypes.func.isRequired,
  makeAgentRequest: PropTypes.func.isRequired,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
  forceZoneSessionCleanup: PropTypes.func.isRequired,
  refreshZloginSessionStatus: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  modalReadOnly: PropTypes.bool.isRequired,
  setModalReadOnly: PropTypes.func.isRequired,
};

export default ZloginModal;
