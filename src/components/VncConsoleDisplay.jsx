import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import { useServers } from '../contexts/ServerContext';
import { hasConsole } from '../utils/capabilities';

import { startRdpPreview } from './consoleActions';
import VncActionsDropdown from './VncActionsDropdown';
import VncViewerReact from './VncViewerReact';

const VncConsoleDisplay = ({
  machineDetails,
  selectedMachine,
  currentServer,
  user,
  loading,
  loadingVnc,
  previewVncViewOnly,
  vncReconnectKey,
  vncSettings,
  vncRef,
  hasZlogin,
  hasRdp,
  setLoading,
  setError,
  setPreviewVncViewOnly,
  setMachineDetails,
  setActiveConsoleType,
  startZloginSessionExplicitly,
  handleVncConsole,
  handleKillVncSession,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
}) => {
  const { makeAgentRequest } = useServers();
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const rdpAvailable = hasConsole(currentServer, 'rdp');
  const zloginAvailable = hasConsole(currentServer, 'zlogin');

  // With no live console session, fetch a server-side framebuffer screenshot
  // for this zone and show it as the placeholder preview. The API captures it
  // straight from the bhyve socket, so it works without ever opening the
  // console (VirtualBox/UTM style). Falls back to the placeholder if the zone
  // isn't running or has no framebuffer.
  useEffect(() => {
    if (machineDetails.vnc_session_info || !currentServer || !selectedMachine) {
      setScreenshotUrl(null);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    const loadScreenshot = async () => {
      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `machines/${selectedMachine}/vnc/screenshot`,
        'GET',
        null,
        null,
        false,
        null,
        'blob'
      );
      if (cancelled) {
        return;
      }
      if (result.success && result.data instanceof Blob && result.data.size > 0) {
        objectUrl = URL.createObjectURL(result.data);
        setScreenshotUrl(objectUrl);
      } else {
        setScreenshotUrl(null);
      }
    };

    loadScreenshot();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [machineDetails.vnc_session_info, currentServer, selectedMachine, makeAgentRequest]);

  return (
    <div className="hw-console-container">
      {/* VNC Console Header */}
      <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">Active VNC Session</h6>
          {machineDetails.vnc_session_info && machineDetails.vnc_session_info.web_port && (
            <p className="small text-white-50 mb-0">
              Port: {machineDetails.vnc_session_info.web_port} | Started:{' '}
              {machineDetails.vnc_session_info.created_at
                ? new Date(machineDetails.vnc_session_info.created_at).toLocaleString()
                : 'Unknown'}
            </p>
          )}
        </div>
        <div className="d-flex gap-1 m-0">
          <VncActionsDropdown
            vncRef={vncRef}
            variant="button"
            onToggleReadOnly={() => setPreviewVncViewOnly(!previewVncViewOnly)}
            onScreenshot={() => {
              const vncContainer = document.querySelector('.vnc-viewer-react canvas');
              if (vncContainer) {
                vncContainer.toBlob(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vnc-screenshot-${selectedMachine}-${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                });
              }
            }}
            onNewTab={() => handleVncConsole(selectedMachine, true)}
            onKillSession={() => handleKillVncSession(selectedMachine)}
            isReadOnly={previewVncViewOnly}
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
          {!previewVncViewOnly && (
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (text && vncRef.current?.clipboardPaste) {
                      vncRef.current.clipboardPaste(text);
                    }
                  }
                } catch (error) {
                  console.error('📋 VNC PREVIEW PASTE: Error:', error);
                }
              }}
              title="Paste from Browser Clipboard"
            >
              <i className="fas fa-paste" />
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => handleVncConsole(selectedMachine)}
            disabled={loading || loadingVnc}
            title="Expand VNC Console"
          >
            <i className="fas fa-expand" />
          </button>
          {zloginAvailable &&
            (hasZlogin ? (
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={() => setActiveConsoleType('zlogin')}
                title="Switch to zlogin Console"
              >
                <i className="fas fa-terminal" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const result = await startZloginSessionExplicitly(
                      currentServer,
                      selectedMachine
                    );
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
                <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-terminal'}`} />
              </button>
            ))}
          {rdpAvailable &&
            (hasRdp ? (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => setActiveConsoleType('rdp')}
                title="Switch to RDP Console"
              >
                <i className="fab fa-windows" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() =>
                  startRdpPreview({
                    currentServer,
                    selectedMachine,
                    setLoading,
                    setError,
                    setMachineDetails,
                    setActiveConsoleType,
                  })
                }
                disabled={loading}
                title="Start the browser VRDP console (VRDE over the agent)"
              >
                <i className={loading ? 'fas fa-spinner fa-pulse' : 'fab fa-windows'} />
              </button>
            ))}
        </div>
      </div>

      {/* VNC Console Content */}
      <div className="hw-console-content">
        {(() => {
          if (machineDetails.vnc_session_info) {
            return (
              <VncViewerReact
                ref={vncRef}
                key={`vnc-preview-${selectedMachine}-${previewVncViewOnly}-${vncReconnectKey}`}
                server={currentServer}
                machineName={selectedMachine}
                viewOnly={previewVncViewOnly}
                autoConnect
                showControls={false}
                quality={vncSettings.quality}
                compression={vncSettings.compression}
                resize={vncSettings.resize}
                showDot={vncSettings.showDot}
                resizeSession={vncSettings.resize === 'remote'}
                className="hw-vnc-container"
              />
            );
          }
          if (screenshotUrl) {
            return (
              <img
                src={screenshotUrl}
                alt={`Console preview of ${selectedMachine}`}
                className="hw-console-screenshot"
              />
            );
          }
          return (
            <div className="hw-console-placeholder-hidden">
              <div className="text-center">
                <div className="has-margin-bottom-12px">
                  <img
                    src="/ui/images/startcloud.svg"
                    alt="Start Console"
                    className="hw-startup-icon"
                  />
                </div>
                <div className="fs-6 fw-medium">No Console Session</div>
                <div className="small mt-6 opacity-07">Click Console to start session</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

VncConsoleDisplay.propTypes = {
  machineDetails: PropTypes.shape({
    vnc_session_info: PropTypes.shape({
      web_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      created_at: PropTypes.string,
      proxy_url: PropTypes.string,
      console_url: PropTypes.string,
    }),
    configuration: PropTypes.shape({
      zonepath: PropTypes.string,
    }),
  }).isRequired,
  selectedMachine: PropTypes.string,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
  loading: PropTypes.bool,
  loadingVnc: PropTypes.bool,
  previewVncViewOnly: PropTypes.bool,
  vncReconnectKey: PropTypes.number,
  vncSettings: PropTypes.object,
  vncRef: PropTypes.object,
  hasZlogin: PropTypes.bool,
  hasRdp: PropTypes.bool,
  setLoading: PropTypes.func,
  setError: PropTypes.func,
  setPreviewVncViewOnly: PropTypes.func,
  setMachineDetails: PropTypes.func,
  setActiveConsoleType: PropTypes.func,
  startZloginSessionExplicitly: PropTypes.func,
  handleVncConsole: PropTypes.func,
  handleKillVncSession: PropTypes.func,
  handleVncQualityChange: PropTypes.func,
  handleVncCompressionChange: PropTypes.func,
  handleVncResizeChange: PropTypes.func,
  handleVncShowDotChange: PropTypes.func,
  handleVncClipboardPaste: PropTypes.func,
};

export default React.memo(VncConsoleDisplay);
