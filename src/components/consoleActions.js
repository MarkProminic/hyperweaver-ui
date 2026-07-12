import {
  getMachineVncInfo,
  getMachineRdpInfo,
  openMachineRdp,
  openMachineDirectory,
  openMachineFtp,
  getMachineFtpInfo,
  startMachineSshSession,
} from '../api/machineAPI';

/**
 * The console section's shared start/launch actions — one implementation
 * for every header that offers them (InactiveConsoleDisplay's start row,
 * the SSH console's switch-or-start buttons), so an active console never
 * strands the user without the other options.
 */

/**
 * Start the VNC preview. WIRE BRANCH (never hypervisor): GET
 * /machines/{name}/vnc answering the VRDE info shape means the direct
 * websockify model — VirtualBox's VRDE IS the display, there is no session
 * to start. Anything else falls through to the session-model start
 * (zoneweaver).
 */
export const startVncPreview = async ({
  currentServer,
  selectedMachine,
  setLoadingVnc,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startVncSession,
  waitForVncSessionReady,
}) => {
  try {
    setLoadingVnc(true);
    const info = await getMachineVncInfo(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      selectedMachine
    );
    if (info.success && info.data && 'vrde_enabled' in info.data) {
      if (!info.data.running) {
        setError('The machine must be running for the VNC console.');
        return;
      }
      if (!info.data.vrde_enabled) {
        setError(
          'The remote display (VRDE) is off for this machine — turn VNC "on" via Edit Machine, then start it again.'
        );
        return;
      }
      if (info.data.vnc_capable === false) {
        setError(
          "The host's VirtualBox has no usable VNC extension pack — install VBoxVNC on the host and restart the agent."
        );
        return;
      }
      // Direct model: mark the session active — the viewer connects to
      // /machines/{name}/vnc/websockify itself (the same URL it always uses).
      setMachineDetails(prev => ({
        ...prev,
        active_vnc_session: true,
        vnc_session_info: info.data,
      }));
      setActiveConsoleType('vnc');
      return;
    }
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
};

/** Start the zlogin preview (zoneweaver's PTY session). */
export const startZloginPreview = async ({
  currentServer,
  selectedMachine,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  startZloginSessionExplicitly,
}) => {
  if (!currentServer || !selectedMachine) {
    return;
  }
  try {
    setLoading(true);
    const result = await startZloginSessionExplicitly(currentServer, selectedMachine);
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
};

/**
 * Start the SSH console (`ssh` console token): POST /machines/{name}/ssh/start
 * answers the session row; the shell rides /ssh/{id}?ticket=.
 */
export const startSshPreview = async ({
  currentServer,
  selectedMachine,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
}) => {
  try {
    setLoading(true);
    const result = await startMachineSshSession(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      selectedMachine
    );
    if (result.success && result.data?.id) {
      setMachineDetails(prev => ({ ...prev, ssh_session: result.data }));
      setActiveConsoleType('ssh');
    } else {
      const hint = /vagrant_user/iu.test(result.message || '')
        ? ' — set the SSH user under Edit Machine → Credentials.'
        : '';
      setError(`SSH session failed: ${result.message}${hint}`);
    }
  } catch (error) {
    console.error('Error starting SSH:', error);
    setError('Error starting SSH console');
  } finally {
    setLoading(false);
  }
};

/**
 * Start the browser-RDP console (`rdp` console token — the IronRDP client
 * over the agent's RDCleanPath bridge). Two targets, one pane: `console`
 * (the hypervisor's VRDE display — the VRDP button) preflights GET
 * /machines/{name}/vnc for the running check + the showvminfo display facts
 * (the bridge self-heals VRDE TLS itself). `guest` (the guest's own RDP
 * server — the RDP button) needs none of that: the bridge resolves the
 * guest IP server-side and answers with the honest reason when none exists.
 */
export const startRdpPreview = async ({
  currentServer,
  selectedMachine,
  setLoading,
  setError,
  setMachineDetails,
  setActiveConsoleType,
  target = 'console',
}) => {
  try {
    setLoading(true);
    if (target === 'guest') {
      setMachineDetails(prev => ({ ...prev, rdp_session: { target: 'guest' } }));
      setActiveConsoleType('rdp');
      return;
    }
    const info = await getMachineVncInfo(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      selectedMachine
    );
    const facts = {};
    if (info.success && info.data && 'vrde_enabled' in info.data) {
      if (!info.data.running) {
        setError('The machine must be running for the RDP console.');
        return;
      }
      if (info.data.video_mode) {
        facts.video_mode = info.data.video_mode;
      }
      if (typeof info.data.additions_run_level === 'number') {
        facts.additions_run_level = info.data.additions_run_level;
      }
    }
    setMachineDetails(prev => ({
      ...prev,
      rdp_session: { target: 'console', ...facts },
    }));
    setActiveConsoleType('rdp');
  } catch (error) {
    console.error('Error starting RDP:', error);
    setError('Error starting RDP console');
  } finally {
    setLoading(false);
  }
};

/**
 * RDP: console target = VRDE on the agent host (127.0.0.1 — Direct only);
 * guest target = the Windows guest's own RDP at a reachable IP. Direct
 * mode launches the agent host's client; remote hands the browser the
 * guest rdp_url. Zero targets answers 400 with the honest reason.
 */
export const launchRdp = async ({
  currentServer,
  selectedMachine,
  isDirect,
  setLoading,
  setError,
}) => {
  setLoading(true);
  try {
    const info = await getMachineRdpInfo(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      selectedMachine
    );
    if (!info.success) {
      setError(`RDP unavailable: ${info.message}`);
      return;
    }
    if (isDirect) {
      const result = await openMachineRdp(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        selectedMachine
      );
      if (!result.success) {
        setError(`RDP launch failed: ${result.message}`);
      }
      return;
    }
    const guest = (info.data?.targets || []).find(target => target.type === 'guest');
    if (guest?.rdp_url) {
      window.open(guest.rdp_url);
    } else {
      setError(
        'Only the VRDE console target exists (127.0.0.1 on the agent host) — it is only reachable from that host.'
      );
    }
  } finally {
    setLoading(false);
  }
};

/** Open the machine's working directory or an sftp:// handler at it. */
export const launchDirectoryOrFtp = async ({
  kind,
  currentServer,
  selectedMachine,
  isDirect,
  setError,
}) => {
  if (isDirect) {
    // Direct/desktop mode: the agent host IS the user's desktop.
    const call = kind === 'directory' ? openMachineDirectory : openMachineFtp;
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      selectedMachine
    );
    if (!result.success) {
      setError(`Open failed: ${result.message}`);
    }
    return;
  }
  // Remote: hand the user's own sftp:// handler the URL — but a NAT
  // 127.0.0.1 forward only resolves on the agent host, so say so.
  const result = await getMachineFtpInfo(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    selectedMachine
  );
  if (result.success && result.data?.sftp_url) {
    if (result.data.host === '127.0.0.1' || result.data.host === 'localhost') {
      setError(
        `This machine's SFTP endpoint (${result.data.sftp_url}) is a NAT forward on the agent host — it is only reachable from that host.`
      );
    } else {
      window.open(result.data.sftp_url);
    }
  } else {
    setError(`FTP info failed: ${result.message}`);
  }
};
