import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { useMode } from '../contexts/ModeContext';
import { hasConsole, hasFeature } from '../utils/capabilities';

import {
  startVncPreview,
  startZloginPreview,
  startSshPreview,
  startRdpPreview,
  launchRdp,
  launchDirectoryOrFtp,
} from './consoleActions';
import MachineScreenshot from './Machine/MachineScreenshot';

/**
 * The VRDP + guest-RDP start pair (Mark's split): VRDP = the hypervisor's
 * VRDE display (offered wherever the rdp token or launchers exist); RDP =
 * the guest's own desktop, offered only when the guest agent reported a
 * reachable IP. Right-click on either opens the native app path. Extracted
 * to keep the component's complexity down.
 */
const RdpStartButtons = ({
  rdpAvailable,
  launchersAvailable,
  guestRdpIp,
  machineRunning,
  loading,
  onStartVrdp,
  onStartGuestRdp,
  onNativeRdp,
}) => (
  <>
    {(rdpAvailable || launchersAvailable) && (
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={rdpAvailable ? onStartVrdp : onNativeRdp}
        onContextMenu={event => {
          // Right-click = the native path (agent host's RDP client /
          // the guest rdp_url) — one button, both implementations.
          event.preventDefault();
          if (launchersAvailable && machineRunning) {
            onNativeRdp();
          }
        }}
        disabled={loading || !machineRunning}
        title={
          machineRunning
            ? "VRDP console (the hypervisor's display) — click: in the browser; right-click: open in your RDP app"
            : 'The machine must be running'
        }
      >
        <i className="fas fa-display me-2" />
        <span>{loading ? 'Starting...' : 'VRDP'}</span>
      </button>
    )}
    {rdpAvailable && guestRdpIp && (
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={onStartGuestRdp}
        onContextMenu={event => {
          event.preventDefault();
          if (launchersAvailable) {
            onNativeRdp();
          }
        }}
        disabled={loading}
        title={`RDP to the guest's own desktop (${guestRdpIp}) — click: in the browser; right-click: open in your RDP app`}
      >
        <i className="fab fa-windows me-2" />
        <span>{loading ? 'Starting...' : 'RDP'}</span>
      </button>
    )}
  </>
);

RdpStartButtons.propTypes = {
  rdpAvailable: PropTypes.bool,
  launchersAvailable: PropTypes.bool,
  guestRdpIp: PropTypes.string,
  machineRunning: PropTypes.bool,
  loading: PropTypes.bool,
  onStartVrdp: PropTypes.func.isRequired,
  onStartGuestRdp: PropTypes.func.isRequired,
  onNativeRdp: PropTypes.func.isRequired,
};

const InactiveConsoleDisplay = ({
  selectedMachine,
  currentServer,
  machineDetails,
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
}) => {
  const { isDirect } = useMode();
  // Bumping the key remounts the screenshot — a fresh capture on demand.
  const [screenshotKey, setScreenshotKey] = useState(0);
  const machineRunning =
    (machineDetails?.machine_info?.status || machineDetails?.status || '').toLowerCase() ===
    'running';
  const screenshotAvailable = hasFeature(currentServer, 'machine-screenshot') && machineRunning;
  // Each start button renders only where the agent advertises the console token.
  const vncAvailable = hasConsole(currentServer, 'vnc');
  const zloginAvailable = hasConsole(currentServer, 'zlogin');
  const sshAvailable = hasFeature(currentServer, 'ssh');
  const rdpAvailable = hasConsole(currentServer, 'rdp');
  const launchersAvailable = hasFeature(currentServer, 'host-launchers');

  const guestIps = machineDetails?.configuration?.guest_info?.ips;
  const guestRdpIp = Array.isArray(guestIps) && guestIps.length > 0 ? guestIps[0] : null;

  const handleStartVnc = () =>
    startVncPreview({
      currentServer,
      selectedMachine,
      setLoadingVnc,
      setError,
      setMachineDetails,
      setActiveConsoleType,
      startVncSession,
      waitForVncSessionReady,
    });

  const handleStartZlogin = () =>
    startZloginPreview({
      currentServer,
      selectedMachine,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
      startZloginSessionExplicitly,
    });

  const handleStartSsh = () =>
    startSshPreview({
      currentServer,
      selectedMachine,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
    });

  const handleStartRdp = () =>
    startRdpPreview({
      currentServer,
      selectedMachine,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
    });

  const handleStartGuestRdp = () =>
    startRdpPreview({
      currentServer,
      selectedMachine,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
      target: 'guest',
    });

  const handleRdp = () =>
    launchRdp({ currentServer, selectedMachine, isDirect, setLoading, setError });

  const handleLauncher = kind =>
    launchDirectoryOrFtp({ kind, currentServer, selectedMachine, isDirect, setError });

  return (
    <div className="hw-console-container-hidden">
      {/* Inactive Console Header */}
      <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">Console Management</h6>
          <p className="small text-white-50 mb-0">No active sessions • Click to start</p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          {vncAvailable && (
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={handleStartVnc}
              disabled={loading || loadingVnc || !machineRunning}
              title={machineRunning ? 'Start VNC Console' : 'The machine must be running'}
            >
              <i className="fas fa-desktop me-2" />
              <span>{loadingVnc ? 'Starting...' : 'VNC'}</span>
            </button>
          )}
          {zloginAvailable && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleStartZlogin}
              disabled={loading}
              title="Start zlogin Console"
            >
              <i className="fas fa-terminal me-2" />
              <span>{loading ? 'Starting...' : 'zlogin'}</span>
            </button>
          )}
          {sshAvailable && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleStartSsh}
              disabled={loading || !machineRunning}
              title={
                machineRunning
                  ? 'Start an SSH shell inside the guest'
                  : 'The machine must be running'
              }
            >
              <i className="fas fa-terminal me-2" />
              <span>{loading ? 'Starting...' : 'SSH'}</span>
            </button>
          )}
          <RdpStartButtons
            rdpAvailable={rdpAvailable}
            launchersAvailable={launchersAvailable}
            guestRdpIp={guestRdpIp}
            machineRunning={machineRunning}
            loading={loading}
            onStartVrdp={handleStartRdp}
            onStartGuestRdp={handleStartGuestRdp}
            onNativeRdp={handleRdp}
          />
          {screenshotAvailable && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setScreenshotKey(key => key + 1)}
              title="Refresh the screenshot"
            >
              <i className="fas fa-sync-alt" />
            </button>
          )}
          {launchersAvailable && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleLauncher('directory')}
                disabled={!isDirect}
                title={
                  isDirect
                    ? "Open the machine's working directory in the host's file manager"
                    : 'Available in Direct (desktop) mode only'
                }
              >
                <i className="fas fa-folder-open" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleLauncher('ftp')}
                title="Open your sftp client (WinSCP/FileZilla/Finder) at this machine"
              >
                <i className="fas fa-file-arrow-down" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Console Content - Inactive State: live screenshot when the agent
          offers one and the machine runs; the placeholder otherwise. */}
      <div className="hw-inactive-console-content">
        {screenshotAvailable ? (
          <div className="text-center h-100 w-100 d-flex flex-column align-items-center justify-content-center">
            <MachineScreenshot
              key={screenshotKey}
              currentServer={currentServer}
              machineName={selectedMachine}
              isRunning
              frameless
            />
            <div className="small text-white-50 mt-1">
              Live screenshot — start a console above to interact
            </div>
          </div>
        ) : (
          <div className="hw-text-placeholder text-center">
            <div className="has-margin-bottom-12px">
              <img
                src="/ui/images/startcloud.svg"
                alt="Start Console"
                className="hw-startup-icon"
              />
            </div>
            <div className="fs-6 fw-medium mb-2">
              <strong>No Active Console Session</strong>
            </div>
            <div className="small">Click the buttons above to start a console session</div>
          </div>
        )}
      </div>
    </div>
  );
};

InactiveConsoleDisplay.propTypes = {
  selectedMachine: PropTypes.string,
  currentServer: PropTypes.object,
  machineDetails: PropTypes.object,
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
