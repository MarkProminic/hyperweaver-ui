import PropTypes from 'prop-types';
import React from 'react';

import { hasConsole } from '../utils/capabilities';

import ZloginActionsDropdown from './ZloginActionsDropdown';
import ZoneShell from './ZoneShell';

const ZloginConsoleDisplay = ({
  machineDetails,
  selectedMachine,
  currentServer,
  user,
  loading,
  loadingVnc,
  previewReadOnly,
  previewReconnectKey,
  hasVnc,
  setLoading,
  setLoadingVnc,
  setError,
  setPreviewReadOnly,
  setMachineDetails,
  setActiveConsoleType,
  setShowZloginConsole,
  startVncSession,
  waitForVncSessionReady,
  forceZoneSessionCleanup,
  pasteTextToZone,
  handleZloginConsole,
}) => (
  <div className="hw-console-container">
    {/* zlogin Console Header */}
    <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
      <div>
        <h6 className="fs-6 fw-bold text-white mb-1">Active zlogin Session</h6>
        {machineDetails.zlogin_session && (
          <p className="small text-white-50 mb-0">
            Session ID: {machineDetails.zlogin_session.id?.substring(0, 8) || 'Unknown'} | Started:{' '}
            {machineDetails.zlogin_session.created_at
              ? new Date(machineDetails.zlogin_session.created_at).toLocaleString()
              : 'Unknown'}
          </p>
        )}
      </div>
      <div className="d-flex gap-1 m-0">
        <ZloginActionsDropdown
          variant="button"
          onToggleReadOnly={() => setPreviewReadOnly(!previewReadOnly)}
          onNewSession={() => handleZloginConsole(selectedMachine)}
          onKillSession={async () => {
            if (!currentServer || !selectedMachine) {
              return;
            }
            try {
              setLoading(true);
              await forceZoneSessionCleanup(currentServer, selectedMachine);
              setMachineDetails(prev => ({
                ...prev,
                zlogin_session: null,
                active_zlogin_session: false,
              }));
            } catch (error) {
              console.error('Error killing zlogin session:', error);
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
              a.download = `zlogin-output-${selectedMachine}-${Date.now()}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }}
          isReadOnly={previewReadOnly}
          isAdmin={
            user?.role === 'admin' ||
            user?.role === 'super-admin' ||
            user?.role === 'organization-admin'
          }
        />
        {!previewReadOnly && (
          <button
            type="button"
            className="btn btn-sm btn-info has-box-shadow"
            onClick={async () => {
              try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                  const text = await navigator.clipboard.readText();
                  if (text && currentServer && selectedMachine) {
                    await pasteTextToZone(currentServer, selectedMachine, text);
                  }
                }
              } catch (error) {
                console.error('📋 ZLOGIN PREVIEW PASTE: Error:', error);
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
          onClick={() => {
            if (machineDetails.zlogin_session) {
              setShowZloginConsole(true);
            } else {
              handleZloginConsole(selectedMachine);
            }
          }}
          disabled={loading}
          title="Expand zlogin Console"
        >
          <i className="fas fa-expand" />
        </button>
        {hasConsole(currentServer, 'vnc') &&
          (hasVnc ? (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => setActiveConsoleType('vnc')}
              title="Switch to VNC Console"
            >
              <i className="fas fa-desktop" />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={async () => {
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
              disabled={loadingVnc}
              title="Start VNC Console"
            >
              <i className={`fas ${loadingVnc ? 'fa-spinner fa-pulse' : 'fa-desktop'}`} />
            </button>
          ))}
      </div>
    </div>

    {/* zlogin Console Content */}
    <div className="hw-console-content">
      <ZoneShell
        key={`preview-zlogin-${selectedMachine}-${previewReconnectKey}-${previewReadOnly ? 'ro' : 'rw'}`}
        zoneName={selectedMachine}
        readOnly={previewReadOnly}
        context="preview"
        className="hw-console-zone-shell"
      />

      <div className="hw-console-status-overlay">
        <i
          className={`fas fa-circle hw-console-status-icon has-margin-right-3px ${
            machineDetails.zlogin_session ? 'hw-status-icon-active' : 'hw-status-icon-inactive'
          }`}
        />
        {machineDetails.zlogin_session ? 'Live' : 'Offline'}
      </div>
    </div>
  </div>
);

ZloginConsoleDisplay.propTypes = {
  machineDetails: PropTypes.shape({
    zlogin_session: PropTypes.shape({
      id: PropTypes.string,
      created_at: PropTypes.string,
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
  previewReadOnly: PropTypes.bool,
  previewReconnectKey: PropTypes.number,
  hasVnc: PropTypes.bool,
  setLoading: PropTypes.func,
  setLoadingVnc: PropTypes.func,
  setError: PropTypes.func,
  setPreviewReadOnly: PropTypes.func,
  setMachineDetails: PropTypes.func,
  setActiveConsoleType: PropTypes.func,
  setShowZloginConsole: PropTypes.func,
  startVncSession: PropTypes.func,
  waitForVncSessionReady: PropTypes.func,
  forceZoneSessionCleanup: PropTypes.func,
  pasteTextToZone: PropTypes.func,
  handleZloginConsole: PropTypes.func,
};

export default React.memo(ZloginConsoleDisplay);
