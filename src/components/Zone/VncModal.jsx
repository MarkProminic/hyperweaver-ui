import PropTypes from 'prop-types';

import VncActionsDropdown from '../VncActionsDropdown';
import VncViewerReact from '../VncViewerReact';

const VncModal = ({
  showVncConsole,
  closeVncConsole,
  isVncFullScreen,
  openVncFullScreen,
  vncLoadError,
  openDirectVncFallback,
  setVncLoadError,
  currentServer,
  selectedZone,
  vncReconnectKey,
  modalVncRef,
  modalVncViewOnly,
  setModalVncViewOnly,
  handleVncModalPaste,
  handleVncConsole,
  handleKillVncSession,
  user,
  zoneDetails,
  setShowZloginConsole,
  handleZloginConsole,
  loading,
  loadingVnc,
  vncSettings,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
}) => {
  if (!showVncConsole) {
    return null;
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center has-z-index-modal">
      <div
        className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75"
        onClick={closeVncConsole}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            closeVncConsole();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div
        className={isVncFullScreen ? 'hw-modal-container-fullscreen' : 'hw-modal-container-normal'}
      >
        <header
          className={`d-flex align-items-center bg-dark text-white ${isVncFullScreen ? 'hw-modal-header-fullscreen' : 'hw-modal-header-normal'}`}
        >
          <p
            className={`flex-grow-1 mb-0 ${isVncFullScreen ? 'hw-modal-title-fullscreen' : 'hw-modal-title-normal'}`}
          >
            <i className="fas fa-terminal me-2" />
            <span>Console - {selectedZone}</span>
          </p>
          <div className="d-flex gap-1 m-0">
            <VncActionsDropdown
              vncRef={modalVncRef}
              variant="button"
              onToggleReadOnly={() => {
                // FIXED: Actually toggle modal VNC view-only mode
                console.log(
                  `🔧 VNC MODAL READ-ONLY: Toggling from ${modalVncViewOnly} to ${!modalVncViewOnly}`
                );
                setModalVncViewOnly(!modalVncViewOnly);
              }}
              onScreenshot={() => {
                const vncContainer = document.querySelector('.vnc-viewer-react canvas');
                if (vncContainer) {
                  vncContainer.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `vnc-screenshot-${selectedZone}-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  });
                }
              }}
              onNewTab={() => handleVncConsole(selectedZone, true)}
              onKillSession={() => handleKillVncSession(selectedZone)}
              isReadOnly={modalVncViewOnly}
              isAdmin={
                user?.role === 'admin' ||
                user?.role === 'super-admin' ||
                user?.role === 'organization-admin'
              }
              quality={vncSettings.quality}
              compression={vncSettings.compression}
              resize={vncSettings.resize}
              showDot={vncSettings.showDot}
              onQualityChange={handleVncQualityChange}
              onCompressionChange={handleVncCompressionChange}
              onResizeChange={handleVncResizeChange}
              onShowDotChange={handleVncShowDotChange}
              onClipboardPaste={handleVncClipboardPaste}
            />
            {!modalVncViewOnly && (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={handleVncModalPaste}
                title="Paste from Browser Clipboard"
              >
                <i className="fas fa-paste" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={async () => {
                if (zoneDetails.zlogin_session) {
                  closeVncConsole();
                  setTimeout(() => setShowZloginConsole(true), 100);
                } else {
                  closeVncConsole();
                  const result = await handleZloginConsole(selectedZone);
                  if (!result.success) {
                    // Handle error appropriately
                  }
                }
              }}
              disabled={loading}
              title={
                zoneDetails.zlogin_session ? 'Switch to zlogin Console' : 'Start zlogin Console'
              }
            >
              <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-terminal'} me-2`} />
              <span>{loading ? 'Starting...' : 'zlogin'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={openVncFullScreen}
              title={isVncFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              <i className={`fas ${isVncFullScreen ? 'fa-compress' : 'fa-expand'} me-2`} />
              <span>{isVncFullScreen ? 'Exit' : 'Full'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={closeVncConsole}
              title="Close Console"
            >
              <i className="fas fa-times me-2" />
              <span>Exit</span>
            </button>
          </div>
        </header>
        <section className="p-0 hw-modal-body">
          {(() => {
            if (vncLoadError) {
              return (
                <div className="text-center p-5 hw-error-container">
                  <div className="mb-3">
                    <i className="fas fa-exclamation-triangle fa-3x text-warning" />
                  </div>
                  <h4 className="fs-4 fw-bold">VNC Console Loading Error</h4>
                  <p className="mb-4">
                    The VNC console failed to load in embedded mode. This could be due to proxy
                    issues or browser compatibility.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={openDirectVncFallback}
                    >
                      <i className="fas fa-external-link-alt me-2" />
                      <span>Open Direct VNC Console</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setVncLoadError(false)}
                    >
                      <i className="fas fa-redo me-2" />
                      <span>Retry Embedded</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (currentServer && selectedZone) {
              return (
                <VncViewerReact
                  ref={modalVncRef}
                  key={`vnc-modal-${selectedZone}-${modalVncViewOnly}-${vncReconnectKey}`}
                  server={currentServer}
                  zoneName={selectedZone}
                  viewOnly={modalVncViewOnly}
                  autoConnect
                  showControls={false}
                  quality={vncSettings.quality}
                  compression={vncSettings.compression}
                  resize={vncSettings.resize}
                  showDot={vncSettings.showDot}
                  resizeSession={vncSettings.resize === 'remote'}
                  onConnect={() => console.log('✅ VNC MODAL: Connected to VNC server')}
                  onDisconnect={reason => console.log('❌ VNC MODAL: Disconnected:', reason)}
                  onClipboard={event => {
                    console.log('📋 VNC MODAL: Clipboard received from server:', event);
                  }}
                  className="hw-vnc-container"
                />
              );
            }

            if (loadingVnc) {
              return (
                <div className="text-center p-5 hw-loading-container">
                  <div>
                    <i className="fas fa-spinner fa-pulse fa-3x hw-loading-spinner" />
                  </div>
                  <p className="mt-3">Starting VNC console...</p>
                </div>
              );
            }

            return null;
          })()}
        </section>
      </div>
    </div>
  );
};

VncModal.propTypes = {
  showVncConsole: PropTypes.bool.isRequired,
  closeVncConsole: PropTypes.func.isRequired,
  isVncFullScreen: PropTypes.bool.isRequired,
  openVncFullScreen: PropTypes.func.isRequired,
  vncLoadError: PropTypes.bool.isRequired,
  openDirectVncFallback: PropTypes.func.isRequired,
  setVncLoadError: PropTypes.func.isRequired,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
  selectedZone: PropTypes.string,
  vncReconnectKey: PropTypes.number.isRequired,
  modalVncRef: PropTypes.object,
  modalVncViewOnly: PropTypes.bool.isRequired,
  setModalVncViewOnly: PropTypes.func.isRequired,
  handleVncModalPaste: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  handleKillVncSession: PropTypes.func.isRequired,
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
  zoneDetails: PropTypes.shape({
    zlogin_session: PropTypes.object,
  }),
  setShowZloginConsole: PropTypes.func.isRequired,
  handleZloginConsole: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  vncSettings: PropTypes.shape({
    quality: PropTypes.number,
    compression: PropTypes.number,
    resize: PropTypes.string,
    showDot: PropTypes.bool,
  }).isRequired,
  handleVncQualityChange: PropTypes.func.isRequired,
  handleVncCompressionChange: PropTypes.func.isRequired,
  handleVncResizeChange: PropTypes.func.isRequired,
  handleVncShowDotChange: PropTypes.func.isRequired,
  handleVncClipboardPaste: PropTypes.func.isRequired,
};

export default VncModal;
