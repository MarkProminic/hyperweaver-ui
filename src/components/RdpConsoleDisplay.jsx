import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

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
const RdpSettingsDropdown = ({ settings, onChange, onApply, applyDisabled }) => {
  const { t } = useTranslation();
  return (
    <Dropdown autoClose="outside" align="end">
      <Dropdown.Toggle variant="secondary" size="sm" title={t('console.rdpSettingsDropdown.title')}>
        <i className="fas fa-sliders" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3 hw-rdp-settings-menu">
        <label className="form-label small mb-1" htmlFor="rdp-color-depth">
          {t('console.rdpSettingsDropdown.colorQuality')}
        </label>
        <select
          id="rdp-color-depth"
          className="form-select form-select-sm mb-2"
          value={settings.colorDepth}
          onChange={event => onChange({ colorDepth: Number(event.target.value) })}
        >
          <option value={16}>{t('console.rdpSettingsDropdown.colorDepth16')}</option>
          <option value={32}>{t('console.rdpSettingsDropdown.colorDepth32')}</option>
          <option value={24}>{t('console.rdpSettingsDropdown.colorDepth24')}</option>
          <option value={15}>{t('console.rdpSettingsDropdown.colorDepth15')}</option>
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
            {t('console.rdpSettingsDropdown.lossyCompression')}
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
            {t('console.rdpSettingsDropdown.sound')}
          </label>
        </div>
        <div className="small text-muted mb-2">
          {t('console.rdpSettingsDropdown.applyAtNextConnect')}
        </div>
        <label className="form-label small mb-1" htmlFor="rdp-scale">
          {t('console.rdpSettingsDropdown.scale')}
        </label>
        <select
          id="rdp-scale"
          className="form-select form-select-sm mb-2"
          value={settings.scale}
          onChange={event => onChange({ scale: event.target.value })}
        >
          <option value="fit">{t('console.rdpSettingsDropdown.scaleFit')}</option>
          <option value="real">{t('console.rdpSettingsDropdown.scaleReal')}</option>
          <option value="full">{t('console.rdpSettingsDropdown.scaleFull')}</option>
        </select>
        <label className="form-label small mb-1" htmlFor="rdp-resize-mode">
          {t('console.rdpSettingsDropdown.resolution')}
        </label>
        <select
          id="rdp-resize-mode"
          className="form-select form-select-sm mb-2"
          value={settings.resizeMode}
          onChange={event => onChange({ resizeMode: event.target.value })}
        >
          <option value="follow-guest">
            {t('console.rdpSettingsDropdown.resolutionFollowGuest')}
          </option>
          <option value="fit-client">{t('console.rdpSettingsDropdown.resolutionFitClient')}</option>
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
            {t('console.rdpSettingsDropdown.clipboardSharing')}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary w-100"
          onClick={onApply}
          disabled={applyDisabled}
        >
          <i className="fas fa-redo me-2" />
          <span>{t('console.rdpSettingsDropdown.applyAndReconnect')}</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
};

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
  const { t } = useTranslation();
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
            {isGuest
              ? t('console.rdpConsoleDisplay.rdpLabel')
              : t('console.rdpConsoleDisplay.vrdpLabel')}{' '}
            — {selectedMachine}
          </h6>
          <p className="small text-white-50 mb-0">
            {isGuest
              ? t('console.rdpConsoleDisplay.guestDescription')
              : t('console.rdpConsoleDisplay.hypervisorDescription')}
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
                ? t('console.rdpConsoleDisplay.sendClipboard')
                : t('console.rdpConsoleDisplay.clipboardOff')
            }
          >
            <i className="fas fa-paste" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => uiRef.current?.ctrlAltDel()}
            disabled={phase !== 'connected'}
            title={t('console.rdpConsoleDisplay.sendCtrlAltDel')}
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
            title={t('console.rdpConsoleDisplay.openInNewTab')}
          >
            <i className="fas fa-expand" />
          </button>
          {vncAvailable &&
            (hasVnc ? (
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={() => setActiveConsoleType('vnc')}
                title={t('console.rdpConsoleDisplay.switchToVnc')}
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
                title={t('console.rdpConsoleDisplay.startVnc')}
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
                title={t('console.rdpConsoleDisplay.switchToZlogin')}
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
                title={t('console.rdpConsoleDisplay.startZlogin')}
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
                title={t('console.rdpConsoleDisplay.switchToSsh')}
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
                title={t('console.rdpConsoleDisplay.startSsh')}
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
                title={t('console.rdpConsoleDisplay.openNativeVrdp')}
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
                    ? t('console.rdpConsoleDisplay.openWorkingDirectory')
                    : t('console.rdpConsoleDisplay.directModeOnly')
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
                title={t('console.rdpConsoleDisplay.openSftpClient')}
              >
                <i className="fas fa-file-arrow-down" />
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleStop}
            title={t('console.rdpConsoleDisplay.closeConsole')}
          >
            <i className="fas fa-stop me-2" />
            <span>{t('console.rdpConsoleDisplay.stopRdp')}</span>
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
