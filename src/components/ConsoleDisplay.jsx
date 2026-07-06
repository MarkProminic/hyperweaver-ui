import PropTypes from 'prop-types';
import React, { useRef } from 'react';

import InactiveConsoleDisplay from './InactiveConsoleDisplay';
import VncConsoleDisplay from './VncConsoleDisplay';
import ZloginConsoleDisplay from './ZloginConsoleDisplay';

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

  console.log(`🔍 CONSOLE DISPLAY: Determining which console to show:`, {
    hasVnc,
    hasZlogin,
    activeConsoleType,
    zloginSessionId: machineDetails.zlogin_session?.id,
    vncSessionInfo: hasVnc ? 'present' : 'absent',
    vncSessionInfoExists: !!machineDetails.vnc_session_info,
    timestamp: Date.now(),
  });

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

  if (hasZlogin && !hasVnc) {
    // Only zlogin active → Show zlogin
    console.log(`🔍 CONSOLE DISPLAY: Showing zlogin console (only zlogin active)`);
    return (
      <ZloginConsoleDisplay
        {...commonProps}
        previewReadOnly={previewReadOnly}
        setPreviewReadOnly={setPreviewReadOnly}
        hasVnc={false}
      />
    );
  } else if (hasVnc && !hasZlogin) {
    // Only VNC active → Show VNC
    console.log(`🔍 CONSOLE DISPLAY: Showing VNC console (only VNC active)`);
    return (
      <VncConsoleDisplay
        {...commonProps}
        previewVncViewOnly={previewVncViewOnly}
        setPreviewVncViewOnly={setPreviewVncViewOnly}
        vncRef={previewVncRef}
        hasZlogin={false}
      />
    );
  } else if (hasVnc && hasZlogin) {
    // Both active → Show based on activeConsoleType
    console.log(
      `🔍 CONSOLE DISPLAY: Both sessions active, showing ${activeConsoleType === 'zlogin' ? 'zlogin' : 'VNC'}`
    );

    if (activeConsoleType === 'zlogin') {
      // Show zlogin (user switched to it)
      return (
        <ZloginConsoleDisplay
          {...commonProps}
          previewReadOnly={previewReadOnly}
          setPreviewReadOnly={setPreviewReadOnly}
          hasVnc
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
      />
    );
  }
  // Neither active → Show start buttons
  console.log(`🔍 CONSOLE DISPLAY: Showing inactive console (no sessions)`);
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
