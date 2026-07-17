import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';
import { useXTerm } from 'react-xtermjs';

import { getAgentBasePath, fetchWsTicket, makeAgentRequest } from '../api/serverUtils';
import { useMode } from '../contexts/ModeContext';
import { hasConsole, hasFeature } from '../utils/capabilities';
import { buildWsUrl } from '../utils/websocket';

import {
  startVncPreview,
  startZloginPreview,
  startRdpPreview,
  startSshPreview,
  launchRdp,
  launchDirectoryOrFtp,
} from './consoleActions';

/**
 * SSH console preview — the third console type beside VNC and zlogin,
 * living in the SAME console section with the same header pattern (Mark's
 * ruling: extend the existing console, never replace it): paste button,
 * switch-or-START buttons for the other consoles, the VRDP/directory/FTP
 * launchers where the agent advertises them, stop. An active SSH shell
 * never hides the section's other options. Session comes from POST
 * /machines/{name}/ssh/start (the start button); this component attaches
 * xterm.js to /ssh/{sessionId}?ticket= (raw text + JSON resize — the same
 * wire both agents speak).
 */
const SshConsoleDisplay = ({
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
  hasRdp,
}) => {
  const { instance, ref } = useXTerm();
  const wsRef = useRef(null);
  const { isDirect } = useMode();
  const session = machineDetails.ssh_session;

  // The section's other options gate on the agent's tokens, never on what
  // happens to be running.
  const vncAvailable = hasConsole(currentServer, 'vnc');
  const zloginAvailable = hasConsole(currentServer, 'zlogin');
  const rdpAvailable = hasConsole(currentServer, 'rdp');
  const launchersAvailable = hasFeature(currentServer, 'host-launchers');

  useEffect(() => {
    if (!instance || !currentServer || !session?.id) {
      return undefined;
    }
    let cancelled = false;
    let attachAddon = null;
    const fitAddon = new FitAddon();
    instance.loadAddon(fitAddon);
    instance.open(ref.current);
    fitAddon.fit();
    const settleTimer = setTimeout(() => fitAddon.fit(), 250);

    const sendResize = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN && instance.cols && instance.rows) {
        wsRef.current.send(
          JSON.stringify({ type: 'resize', cols: instance.cols, rows: instance.rows })
        );
      }
    };
    const resizeListener = instance.onResize(sendResize);
    const handleWindowResize = () => fitAddon.fit();
    window.addEventListener('resize', handleWindowResize);

    const basePath = getAgentBasePath(currentServer);
    fetchWsTicket(currentServer).then(ticket => {
      if (cancelled || basePath === null) {
        return;
      }
      const ws = new WebSocket(buildWsUrl(`${basePath}/ssh/${session.id}`, ticket));
      wsRef.current = ws;
      ws.onopen = () => {
        attachAddon = new AttachAddon(ws);
        instance.loadAddon(attachAddon);
        fitAddon.fit();
        sendResize();
        instance.focus();
      };
      ws.onclose = () => {
        instance.writeln('\r\n[connection closed]');
      };
    });

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      resizeListener.dispose();
      window.removeEventListener('resize', handleWindowResize);
      if (attachAddon) {
        attachAddon.dispose();
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [instance, ref, currentServer, session?.id]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText && instance) {
        const text = await navigator.clipboard.readText();
        if (text) {
          // xterm's paste feeds onData — the attach addon sends it down the ws.
          instance.paste(text);
          instance.focus();
        }
      }
    } catch (pasteErr) {
      console.error('📋 SSH PREVIEW PASTE: Error:', pasteErr);
    }
  };

  const handleStop = async () => {
    if (session?.id) {
      await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `ssh/sessions/${session.id}/stop`,
        'DELETE'
      );
    }
    setMachineDetails(prev => ({ ...prev, ssh_session: null }));
    setActiveConsoleType(hasVnc ? 'vnc' : 'zlogin');
  };

  // Multi-homed guests: the session row carries every candidate address
  // (guest-agent live IPs first, then the document control IP) plus the one
  // this session targeted. A dead shell = wrong pick — cycle to the next.
  const ipCandidates = Array.isArray(session?.ip_candidates) ? session.ip_candidates : [];
  const ipIndex = Number.isInteger(session?.ip_index) ? session.ip_index : 0;
  const nextIndex = ipCandidates.length > 1 ? (ipIndex + 1) % ipCandidates.length : null;

  const handleNextAddress = async () => {
    if (session?.id) {
      await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        `ssh/sessions/${session.id}/stop`,
        'DELETE'
      );
    }
    setMachineDetails(prev => ({ ...prev, ssh_session: null }));
    await startSshPreview({
      currentServer,
      selectedMachine,
      setLoading,
      setError,
      setMachineDetails,
      setActiveConsoleType,
      ipIndex: nextIndex,
    });
  };

  return (
    <div className="hw-console-container hw-console-container-flex">
      <div className="bg-dark text-white p-3 d-flex justify-content-between align-items-center flex-shrink-0">
        <div>
          <h6 className="fs-6 fw-bold text-white mb-1">
            SSH — {session?.ssh_username ? `${session.ssh_username}@` : ''}
            {selectedMachine}
          </h6>
          <p className="small text-white-50 mb-0">
            Interactive shell inside the guest
            {session?.ssh_host && (
              <>
                {' — '}
                <code className="text-white-50">{session.ssh_host}</code>
                {ipCandidates.length > 1 && ` (address ${ipIndex + 1}/${ipCandidates.length})`}
              </>
            )}
          </p>
        </div>
        <div className="d-flex gap-1 m-0 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={handlePaste}
            title="Paste from Browser Clipboard"
          >
            <i className="fas fa-paste" />
          </button>
          {nextIndex !== null && (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={handleNextAddress}
              disabled={loading}
              title={`Dead shell? Reconnect to the guest's next address: ${ipCandidates[nextIndex]}`}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-shuffle'}`} />
            </button>
          )}
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
            title="Stop the SSH session"
          >
            <i className="fas fa-stop me-2" />
            <span>Stop SSH</span>
          </button>
        </div>
      </div>
      {/* Same fill pattern as the zlogin console: the content flexes to
          whatever the header leaves; the terminal fills it. */}
      <div className="hw-console-content">
        <div ref={ref} className="hw-zone-shell-terminal" style={{ backgroundColor: '#000' }} />
      </div>
    </div>
  );
};

SshConsoleDisplay.propTypes = {
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
  hasRdp: PropTypes.bool,
};

export default React.memo(SshConsoleDisplay);
