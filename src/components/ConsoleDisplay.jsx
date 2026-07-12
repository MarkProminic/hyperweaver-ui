import PropTypes from 'prop-types';
import React, { Suspense, lazy, useRef } from 'react';

import InactiveConsoleDisplay from './InactiveConsoleDisplay';
import SshConsoleDisplay from './SshConsoleDisplay';
import VncConsoleDisplay from './VncConsoleDisplay';
import ZloginConsoleDisplay from './ZloginConsoleDisplay';

// Lazy on purpose: the IronRDP client is a ~6MB WASM-carrying chunk — it
// downloads only when an RDP console actually opens, never with the page.
const RdpConsoleDisplay = lazy(() => import('./RdpConsoleDisplay'));

const rdpLoadingFallback = (
  <div className="hw-console-container d-flex align-items-center justify-content-center">
    <div className="text-center text-white-50">
      <i className="fas fa-spinner fa-pulse fa-2x" />
      <p className="mt-2 small">Loading the RDP client...</p>
    </div>
  </div>
);

const ConsoleDisplay = ({
  machineDetails,
  activeConsoleType,
  selectedMachine,
  currentServer,
  user,
  loading,
  loadingVnc,
  previewReadOnly,
  previewVncViewOnly,
  previewReconnectKey,
  vncReconnectKey,
  vncSettings,
  setActiveConsoleType,
  setLoading,
  setLoadingVnc,
  setError,
  setPreviewReadOnly,
  setPreviewVncViewOnly,
  setMachineDetails,
  startVncSession,
  startZloginSessionExplicitly,
  waitForVncSessionReady,
  forceZoneSessionCleanup,
  pasteTextToZone,
  handleVncConsole,
  handleZloginConsole,
  handleKillVncSession,
  handleVncQualityChange,
  handleVncCompressionChange,
  handleVncResizeChange,
  handleVncShowDotChange,
  handleVncClipboardPaste,
  setShowZloginConsole,
}) => {
  const previewVncRef = useRef(null);

  const hasVnc = machineDetails.active_vnc_session;
  const hasZlogin = machineDetails.zlogin_session && machineDetails.zlogin_session.id;
  // SSH is the third console type (same section, same pattern): a session
  // row from POST /machines/{name}/ssh/start lives in machineDetails.
  const hasSsh = machineDetails.ssh_session && machineDetails.ssh_session.id;
  // Browser RDP is the fourth (`rdp` console token): no agent-side session
  // row — the pane itself opens the RDCleanPath bridge WebSocket.
  const hasRdp = machineDetails.rdp_session;

  // Common props for all console components
  const commonProps = {
    machineDetails,
    selectedMachine,
    currentServer,
    user,
    loading,
    loadingVnc,
    previewReconnectKey,
    vncReconnectKey,
    vncSettings,
    setLoading,
    setLoadingVnc,
    setError,
    setMachineDetails,
    setActiveConsoleType,
    startVncSession,
    startZloginSessionExplicitly,
    waitForVncSessionReady,
    forceZoneSessionCleanup,
    pasteTextToZone,
    handleVncConsole,
    handleZloginConsole,
    handleKillVncSession,
    handleVncQualityChange,
    handleVncCompressionChange,
    handleVncResizeChange,
    handleVncShowDotChange,
    handleVncClipboardPaste,
    setShowZloginConsole,
  };

  if (hasRdp && (activeConsoleType === 'rdp' || (!hasVnc && !hasZlogin && !hasSsh))) {
    // Browser RDP selected → the IronRDP viewer, same header pattern.
    return (
      <Suspense fallback={rdpLoadingFallback}>
        <RdpConsoleDisplay
          {...commonProps}
          hasVnc={!!hasVnc}
          hasZlogin={!!hasZlogin}
          hasSsh={!!hasSsh}
        />
      </Suspense>
    );
  }
  if (hasSsh && (activeConsoleType === 'ssh' || (!hasVnc && !hasZlogin))) {
    // SSH selected → the inline shell, same header pattern as the others:
    // paste, switch-or-start buttons, launchers, stop.
    return (
      <SshConsoleDisplay
        {...commonProps}
        hasVnc={!!hasVnc}
        hasZlogin={!!hasZlogin}
        hasRdp={!!hasRdp}
      />
    );
  }
  if (hasZlogin && !hasVnc) {
    // Only zlogin active → Show zlogin
    return (
      <ZloginConsoleDisplay
        {...commonProps}
        previewReadOnly={previewReadOnly}
        setPreviewReadOnly={setPreviewReadOnly}
        hasVnc={false}
        hasSsh={!!hasSsh}
        hasRdp={!!hasRdp}
      />
    );
  } else if (hasVnc && !hasZlogin) {
    // Only VNC active → Show VNC
    return (
      <VncConsoleDisplay
        {...commonProps}
        previewVncViewOnly={previewVncViewOnly}
        setPreviewVncViewOnly={setPreviewVncViewOnly}
        vncRef={previewVncRef}
        hasZlogin={false}
        hasSsh={!!hasSsh}
        hasRdp={!!hasRdp}
      />
    );
  } else if (hasVnc && hasZlogin) {
    // Both active → Show based on activeConsoleType
    if (activeConsoleType === 'zlogin') {
      // Show zlogin (user switched to it)
      return (
        <ZloginConsoleDisplay
          {...commonProps}
          previewReadOnly={previewReadOnly}
          setPreviewReadOnly={setPreviewReadOnly}
          hasVnc
          hasSsh={!!hasSsh}
          hasRdp={!!hasRdp}
        />
      );
    }
    // Show VNC (default when both active)
    return (
      <VncConsoleDisplay
        {...commonProps}
        previewVncViewOnly={previewVncViewOnly}
        setPreviewVncViewOnly={setPreviewVncViewOnly}
        vncRef={previewVncRef}
        hasZlogin
        hasSsh={!!hasSsh}
        hasRdp={!!hasRdp}
      />
    );
  }
  // Neither active → Show start buttons
  return <InactiveConsoleDisplay {...commonProps} />;
};

ConsoleDisplay.propTypes = {
  machineDetails: PropTypes.object.isRequired,
  activeConsoleType: PropTypes.string,
  selectedMachine: PropTypes.string,
  currentServer: PropTypes.object,
  user: PropTypes.object,
  loading: PropTypes.bool,
  loadingVnc: PropTypes.bool,
  previewReadOnly: PropTypes.bool,
  previewVncViewOnly: PropTypes.bool,
  previewReconnectKey: PropTypes.number,
  vncReconnectKey: PropTypes.number,
  vncSettings: PropTypes.object,
  setActiveConsoleType: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
  setLoadingVnc: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setPreviewReadOnly: PropTypes.func.isRequired,
  setPreviewVncViewOnly: PropTypes.func.isRequired,
  setMachineDetails: PropTypes.func.isRequired,
  startVncSession: PropTypes.func.isRequired,
  startZloginSessionExplicitly: PropTypes.func.isRequired,
  waitForVncSessionReady: PropTypes.func.isRequired,
  forceZoneSessionCleanup: PropTypes.func.isRequired,
  pasteTextToZone: PropTypes.func.isRequired,
  handleVncConsole: PropTypes.func.isRequired,
  handleZloginConsole: PropTypes.func.isRequired,
  handleKillVncSession: PropTypes.func.isRequired,
  handleVncQualityChange: PropTypes.func.isRequired,
  handleVncCompressionChange: PropTypes.func.isRequired,
  handleVncResizeChange: PropTypes.func.isRequired,
  handleVncShowDotChange: PropTypes.func.isRequired,
  handleVncClipboardPaste: PropTypes.func.isRequired,
  setShowZloginConsole: PropTypes.func.isRequired,
};

export default React.memo(ConsoleDisplay);
