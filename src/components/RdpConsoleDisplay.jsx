import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';

import { useMode } from '../contexts/ModeContext';
import { hasConsole, hasFeature } from '../utils/capabilities';

import {
  startVncPreview,
  startZloginPreview,
  startSshPreview,
  launchRdp,
  launchDirectoryOrFtp,
} from './consoleActions';
import RdpConnectionPanel from './RdpConnectionPanel';
import RdpSessionHost from './RdpSessionHost';

/**
 * Browser-RDP console — the fourth console type beside VNC, zlogin and SSH,
 * living in the SAME console section with the same header pattern (an
 * active console never hides the section's other options). The session
 * itself (element hosting, connect flow, overlay) lives in RdpSessionHost,
 * shared with the standalone full-window tab — this component owns the header.
 */

/**
 * Console settings menu. Color depth and compression are SessionBuilder
 * extensions — they apply at the next connect; scale and clipboard act live.
 * VRDE guidance honored: no file-transfer toggle, unicode keyboard
 * untouched (VRDE accepts scancodes only).
 */
const RdpSettingsDropdown = ({ settings, onChange, onApply, applyDisabled }) => (
  <Dropdown autoClose="outside" align="end">
    <Dropdown.Toggle variant="secondary" size="sm" title="Console settings">
      <i className="fas fa-sliders" />
    </Dropdown.Toggle>
    <Dropdown.Menu className="p-3 hw-rdp-settings-menu">
      <label className="form-label small mb-1" htmlFor="rdp-color-depth">
        Color quality
      </label>
      <select
        id="rdp-color-depth"
        className="form-select form-select-sm mb-2"
        value={settings.colorDepth}
        onChange={event => onChange({ colorDepth: Number(event.target.value) })}
      >
        <option value={16}>16-bit — bandwidth saver (default)</option>
        <option value={32}>32-bit — true color</option>
        <option value={24}>24-bit</option>
        <option value={15}>15-bit — minimum</option>
      </select>
      <div className="form-check form-switch mb-1">
        <input
          className="form-check-input"
          type="checkbox"
          id="rdp-lossy"
          checked={settings.lossy}
          onChange={event => onChange({ lossy: event.target.checked })}
        />
        <label className="form-check-label small" htmlFor="rdp-lossy">
          Lossy compression (less bandwidth)
        </label>
      </div>
      <div className="form-check form-switch mb-1">
        <input
          className="form-check-input"
          type="checkbox"
          id="rdp-audio"
          checked={settings.audio}
          onChange={event => onChange({ audio: event.target.checked })}
        />
        <label className="form-check-label small" htmlFor="rdp-audio">
          Sound
        </label>
      </div>
      <div className="small text-muted mb-2">
        Color, compression, sound and resolution apply at the next connect.
      </div>
      <label className="form-label small mb-1" htmlFor="rdp-scale">
        Scale
      </label>
      <select
        id="rdp-scale"
        className="form-select form-select-sm mb-2"
        value={settings.scale}
        onChange={event => onChange({ scale: event.target.value })}
      >
        <option value="fit">Fit the pane (default)</option>
        <option value="real">1:1 pixels</option>
        <option value="full">Fill</option>
      </select>
      <label className="form-label small mb-1" htmlFor="rdp-resize-mode">
        Resolution
      </label>
      <select
        id="rdp-resize-mode"
        className="form-select form-select-sm mb-2"
        value={settings.resizeMode}
        onChange={event => onChange({ resizeMode: event.target.value })}
      >
        <option value="follow-guest">Follow the guest (default)</option>
        <option value="fit-client">Pin to the pane size</option>
      </select>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="rdp-clipboard"
          checked={settings.clipboard}
          onChange={event => onChange({ clipboard: event.target.checked })}
        />
        <label className="form-check-label small" htmlFor="rdp-clipboard">
          Clipboard sharing
        </label>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-primary w-100"
        onClick={onApply}
        disabled={applyDisabled}
      >
        <i className="fas fa-redo me-2" />
        <span>Apply &amp; reconnect</span>
      </button>
    </Dropdown.Menu>
  </Dropdown>
);

RdpSettingsDropdown.propTypes = {
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
    clipboard: PropTypes.bool,
    scale: PropTypes.string,
    resizeMode: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  applyDisabled: PropTypes.bool,
};

const RdpConsoleDisplay = ({
  machineDetails,
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
  hasVnc,
  hasZlogin,
  hasSsh,
}) => {
  const uiRef = useRef(null);
  const { isDirect } = useMode();
  // console = the hypervisor's VRDE display (the VRDP button); guest = the
  // guest's own RDP server through the bridge's ?target=guest.
  const target = machineDetails.rdp_session?.target || 'console';
  const isGuest = target === 'guest';

  // Mirror of the host's phase for header-button gating.
  const [phase, setPhase] = useState('connecting');
  const [connectKey, setConnectKey] = useState(0);

  // Console settings — the host reads them at connect time; scale and
  // clipboard act live through uiRef.
  const [rdpSettings, setRdpSettings] = useState({
    colorDepth: 16,
    lossy: true,
    audio: true,
    clipboard: true,
    // The component scales against its parent (the pane) — fit is the
    // natural default. follow-guest tracks the guest's own resolution;
    // fit-client pins the session to the pane-sized request instead.
    scale: 'fit',
    resizeMode: 'follow-guest',
  });

  const vncAvailable = hasConsole(currentServer, 'vnc');
  const zloginAvailable = hasConsole(currentServer, 'zlogin');
  const sshAvailable = hasFeature(currentServer, 'ssh');
  const launchersAvailable = hasFeature(currentServer, 'host-launchers');

  const handleSettingsChange = patch => {
    setRdpSettings(prev => ({ ...prev, ...patch }));
    // Scale and clipboard act on the live session; the rest waits for the
    // next connect.
    if (patch.scale) {
      uiRef.current?.setScale(patch.scale);
    }
    if (patch.clipboard !== undefined) {
      uiRef.current?.setEnableClipboard(patch.clipboard);
    }
  };

  const handleReconnect = () => setConnectKey(key => key + 1);

  const handleStop = () => {
    setMachineDetails(prev => ({ ...prev, rdp_session: null }));
    setActiveConsoleType(hasVnc ? 'vnc' : 'zlogin');
  };

  return (
    <div className="hw-console-container hw-console-container-flex">
      <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center flex-shrink-0">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            {isGuest ? 'RDP' : 'VRDP'} — {selectedMachine}
          </h6>
          <p className="small text-white-50 mb-0">
            {isGuest
              ? "Browser RDP — the guest's own desktop"
              : 'Browser VRDP console (VRDE over the agent)'}
          </p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <RdpConnectionPanel
            uiRef={uiRef}
            connected={phase === 'connected'}
            currentServer={currentServer}
            machineName={selectedMachine}
            settings={rdpSettings}
            guestFacts={machineDetails.rdp_session}
          />
          <RdpSettingsDropdown
            settings={rdpSettings}
            onChange={handleSettingsChange}
            onApply={handleReconnect}
            applyDisabled={loading}
          />
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={async () => {
              try {
                await uiRef.current?.sendClipboardData();
              } catch (err) {
                console.error('RDP clipboard send:', err);
              }
            }}
            disabled={phase !== 'connected' || !rdpSettings.clipboard}
            title={
              rdpSettings.clipboard
                ? 'Send your clipboard to the guest'
                : 'Clipboard sharing is off (console settings)'
            }
          >
            <i className="fas fa-paste" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => uiRef.current?.ctrlAltDel()}
            disabled={phase !== 'connected'}
            title="Send Ctrl+Alt+Del to the guest"
          >
            <i className="fas fa-keyboard" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() =>
              window.open(
                `/ui/rdp/${encodeURIComponent(currentServer.id)}/${encodeURIComponent(selectedMachine)}${
                  isGuest ? '?target=guest' : ''
                }`,
                '_blank',
                'width=1280,height=800,scrollbars=no,resizable=yes'
              )
            }
            title="Open in a new full-window tab (its own RDP session)"
          >
            <i className="fas fa-expand" />
          </button>
          {vncAvailable &&
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
                onClick={() =>
                  startVncPreview({
                    currentServer,
                    selectedMachine,
                    setLoadingVnc,
                    setError,
                    setMachineDetails,
                    setActiveConsoleType,
                    startVncSession,
                    waitForVncSessionReady,
                  })
                }
                disabled={loadingVnc}
                title="Start VNC Console"
              >
                <i className={`fas ${loadingVnc ? 'fa-spinner fa-pulse' : 'fa-desktop'}`} />
              </button>
            ))}
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
                onClick={() =>
                  startZloginPreview({
                    currentServer,
                    selectedMachine,
                    setLoading,
                    setError,
                    setMachineDetails,
                    setActiveConsoleType,
                    startZloginSessionExplicitly,
                  })
                }
                disabled={loading}
                title="Start zlogin Console"
              >
                <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-terminal'}`} />
              </button>
            ))}
          {sshAvailable &&
            (hasSsh ? (
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => setActiveConsoleType('ssh')}
                title="Switch to SSH Console"
              >
                <i className="fas fa-terminal" />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() =>
                  startSshPreview({
                    currentServer,
                    selectedMachine,
                    setLoading,
                    setError,
                    setMachineDetails,
                    setActiveConsoleType,
                  })
                }
                disabled={loading}
                title="Start an SSH shell inside the guest"
              >
                <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-terminal'}`} />
              </button>
            ))}
          {launchersAvailable && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() =>
                  launchRdp({ currentServer, selectedMachine, isDirect, setLoading, setError })
                }
                disabled={loading}
                title="Open a native VRDP session (VRDE console or the guest’s own RDP)"
              >
                <i className="fas fa-display" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() =>
                  launchDirectoryOrFtp({
                    kind: 'directory',
                    currentServer,
                    selectedMachine,
                    isDirect,
                    setError,
                  })
                }
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
                onClick={() =>
                  launchDirectoryOrFtp({
                    kind: 'ftp',
                    currentServer,
                    selectedMachine,
                    isDirect,
                    setError,
                  })
                }
                title="Open your sftp client (WinSCP/FileZilla/Finder) at this machine"
              >
                <i className="fas fa-file-arrow-down" />
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleStop}
            title="Close the RDP console"
          >
            <i className="fas fa-stop me-2" />
            <span>Stop RDP</span>
          </button>
        </div>
      </div>
      <div className="hw-console-content">
        <RdpSessionHost
          currentServer={currentServer}
          machineName={selectedMachine}
          settings={rdpSettings}
          target={target}
          uiRef={uiRef}
          connectKey={connectKey}
          onPhase={setPhase}
          onReconnect={handleReconnect}
        />
      </div>
    </div>
  );
};

RdpConsoleDisplay.propTypes = {
  machineDetails: PropTypes.object.isRequired,
  selectedMachine: PropTypes.string,
  currentServer: PropTypes.object,
  loading: PropTypes.bool,
  loadingVnc: PropTypes.bool,
  setLoading: PropTypes.func.isRequired,
  setLoadingVnc: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  setActiveConsoleType: PropTypes.func.isRequired,
  startVncSession: PropTypes.func.isRequired,
  waitForVncSessionReady: PropTypes.func.isRequired,
  startZloginSessionExplicitly: PropTypes.func.isRequired,
  hasVnc: PropTypes.bool,
  hasZlogin: PropTypes.bool,
  hasSsh: PropTypes.bool,
};

export default React.memo(RdpConsoleDisplay);
