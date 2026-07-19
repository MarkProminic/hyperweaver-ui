import { makeAgentRequest } from './serverUtils';

// All machine lifecycle calls use the CANONICAL /machines/* paths (Agent API v1, O1).
// Both agents serve them; the Node agent's legacy /zones/* alias is NOT used here and
// can be removed from zoneweaver-agent without affecting this UI.

/**
 * Start a machine
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to start
 * @returns {Promise<Object>} Start result
 */
export const startMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/start`, 'POST');

/**
 * Stop a machine
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to stop
 * @param {boolean} force - Force stop the machine
 * @returns {Promise<Object>} Stop result
 */
export const stopMachine = async (hostname, port, protocol, machineName, force = false) => {
  const params = force ? { force: true } : null;
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/stop`,
    'POST',
    null,
    params
  );
};

/**
 * Restart a machine
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to restart
 * @returns {Promise<Object>} Restart result
 */
export const restartMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/restart`, 'POST');

/**
 * Suspend a machine (VirtualBox-backed agents; only valid while running)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to suspend
 * @returns {Promise<Object>} Suspend result
 */
export const suspendMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/suspend`, 'POST');

/**
 * Reset (hard reboot) a machine — only valid while running
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to reset
 * @returns {Promise<Object>} Reset result
 */
export const resetMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/reset`, 'POST');

/**
 * Inject a non-maskable interrupt into a running machine — a diagnostic that
 * forces a guest crash dump / breaks into the kernel debugger. Both agents
 * serve it (VBoxManage debugvm injectnmi / bhyve); gated by endpoint, no
 * capability token. The agent answers 400 unless the machine is running.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to interrupt
 * @returns {Promise<Object>} {success, machine_name, message}
 */
export const injectNmi = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/nmi`, 'POST');

/**
 * Pause a machine (freeze in RAM) — only valid while running
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to pause
 * @returns {Promise<Object>} Pause result
 */
export const pauseMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/pause`, 'POST');

/**
 * Resume a paused machine
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to resume
 * @returns {Promise<Object>} Resume result
 */
export const resumeMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/resume`, 'POST');

/**
 * Delete a machine. `cleanup_disks` is the CONVERGED key on both agents
 * (zoneweaver renamed cleanup_datasets → cleanup_disks, 2026-07-19). Sent
 * EXPLICITLY on every call because the agents' defaults disagree (Go true,
 * zoneweaver false). Only agent-created media die; user-attached media and
 * anything outside the machine's working directory always survive.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to delete
 * @param {boolean} force - Force delete (stops a running machine first)
 * @param {boolean} cleanupDisks - Delete agent-created media with the machine
 * @returns {Promise<Object>} Delete result
 */
export const deleteMachine = async (
  hostname,
  port,
  protocol,
  machineName,
  force = false,
  cleanupDisks = true
) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}`, 'DELETE', null, {
    force,
    cleanup_disks: cleanupDisks,
  });

/**
 * Get detailed machine information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Machine details
 */
export const getMachineDetails = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}`);

/**
 * Get all machines with optional filtering
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Machines list
 */
export const getAllMachines = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'machines', 'GET', null, filters);

/**
 * Get machine configuration
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Machine configuration
 */
export const getMachineConfig = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/config`);

/**
 * List a machine's snapshots (gate: `machine-snapshots` token)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {machine_name, snapshots: [{name, uuid, description, node, current}], total}
 */
export const getMachineSnapshots = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/snapshots`);

/**
 * Take a snapshot (queued task). `live: true` snapshots a running machine
 * without pausing it.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {name (required), description?, live?}
 * @returns {Promise<Object>} QueuedOperation result
 */
export const takeMachineSnapshot = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/snapshots`,
    'POST',
    body
  );

/**
 * Restore a snapshot (queued task) — the machine must be stopped.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} snapshotName - Snapshot to restore
 * @returns {Promise<Object>} QueuedOperation result
 */
export const restoreMachineSnapshot = async (hostname, port, protocol, machineName, snapshotName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/snapshots/${encodeURIComponent(snapshotName)}/restore`,
    'POST'
  );

/**
 * Delete a snapshot (queued task) — its state merges into child snapshots.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} snapshotName - Snapshot to delete
 * @returns {Promise<Object>} QueuedOperation result
 */
export const deleteMachineSnapshot = async (hostname, port, protocol, machineName, snapshotName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/snapshots/${encodeURIComponent(snapshotName)}`,
    'DELETE'
  );

/**
 * Rename a snapshot and/or edit its description (queued task,
 * snapshot_modify — sync 2026-07-17). Rename applies across every dataset
 * the snapshot spans; description "" CLEARS the stored description.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} snapshotName - Snapshot to modify
 * @param {Object} body - {new_name?, description?} (at least one; 400 with neither)
 * @returns {Promise<Object>} QueuedOperation result
 */
export const modifyMachineSnapshot = async (
  hostname,
  port,
  protocol,
  machineName,
  snapshotName,
  body
) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/snapshots/${encodeURIComponent(snapshotName)}`,
    'PUT',
    body
  );

/**
 * Read a machine's guest properties (guest additions data — live IPs under
 * /VirtualBox/GuestInfo/Net/N/V4/IP, cloud-init seeds under /Hyperweaver/CloudInit/*)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {properties: [{name, value, timestamp, flags}], total}
 */
export const getGuestProperties = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/guest-properties`);

/**
 * Open the machine's working directory in the AGENT HOST's file manager
 * (`host-launchers` token — Direct/desktop mode only; in Aggregated mode the
 * agent host is not the user's desktop)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Result
 */
export const openMachineDirectory = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/open-directory`,
    'POST'
  );

/**
 * Open the agent host's default sftp:// handler at the machine
 * (`host-launchers` token — Direct/desktop mode only)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Result
 */
export const openMachineFtp = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/open-ftp`, 'POST');

/**
 * SFTP connection info for the CLIENT-side handoff (remote/Aggregated mode:
 * window.open(sftp_url) launches the USER's own sftp handler). NOTE:
 * 127.0.0.1 NAT-forward targets only resolve on the agent host — the UI
 * should say so when the host is not localhost.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {sftp_url, host, port, username}
 */
export const getMachineFtpInfo = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/ftp`);

/**
 * Start an SSH terminal session against a running machine (`ssh` console
 * token). Answers the session row; the shell itself rides the WebSocket
 * /ssh/{sessionId}?ticket=… (raw text + {type:"resize"} frames).
 * Multi-homed guests: `ipIndex` picks among the answer's `ip_candidates[]`
 * (0-based, default 0 — guest-agent live addresses first, then the document
 * control IP); an out-of-range index answers 400 with the candidate list.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {number} [ipIndex] - Candidate address to target (0-based)
 * @returns {Promise<Object>} Session {id, machine_name, ssh_host, ssh_port, ssh_username, ip_candidates, ip_index, …}
 */
export const startMachineSshSession = async (hostname, port, protocol, machineName, ipIndex) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/ssh/start`,
    'POST',
    Number.isInteger(ipIndex) && ipIndex > 0 ? { ip_index: ipIndex } : null
  );

/**
 * Start a HOST terminal session (`host-terminal` token, ADMIN only). Same
 * wire as the machine SSH terminal; the shell rides /term/{sessionId}?ticket=….
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Session row
 */
export const startHostTermSession = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'term/start', 'POST');

/**
 * VNC console info (catalog §5) — {vrde_enabled, vrde_port, vnc_capable,
 * running, websocket_url}. The noVNC button enables only when all of
 * vrde_enabled ∧ running ∧ vnc_capable; this INFO RESPONSE is the branch
 * point between the Go agent's websockify path and zoneweaver's session
 * model (never the hypervisor).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} VNC info
 */
export const getMachineVncInfo = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/vnc`);

/**
 * Orchestration status (catalog §8) — {orchestration_enabled, controller, strategy}
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Orchestration status
 */
export const getOrchestrationStatus = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/orchestration/status');

/**
 * Enable orchestration — persists to config, applies at the next agent start.
 * The {confirm: true} guard is the wire contract (400 without it).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Result
 */
export const enableOrchestration = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/orchestration/enable', 'POST', {
    confirm: true,
  });

/**
 * Disable orchestration.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Result
 */
export const disableOrchestration = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/orchestration/disable', 'POST');

/**
 * Boot priorities — {machines: [{name, priority, state, has_custom_priority}],
 * total_machines, priority_groups}. Writes go via PUT /machines/{name}
 * {boot_priority} (DB-immediate).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Priorities
 */
export const getMachinePriorities = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/priorities');

/**
 * Dry-run orchestration plan — {execution_plan: [{priority_range, machines}],
 * total_machines, estimated_duration, strategy}. Nothing executes.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} [strategy] - Optional strategy override
 * @returns {Promise<Object>} Plan
 */
export const testOrchestration = async (hostname, port, protocol, strategy = null) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'machines/orchestration/test',
    'POST',
    strategy ? { strategy } : {}
  );

/**
 * The agent's create defaults (viewer) — {settings, zones, disks, notes}:
 * the agent's own fallbacks AND the hypervisor's pass-through defaults.
 * Feeds the wizard's "(default — X)" labels so untouched fields say what
 * they actually get.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Defaults document
 */
export const getMachineDefaults = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/defaults');

/**
 * VBoxManage's OS-type table — {ostypes: [{id, description, family,
 * family_description, architecture}], total}. `id` is what settings.os_type
 * takes. 503 = VirtualBox not installed; callers fall back to a text input.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} OS types
 */
export const getMachineOsTypes = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/ostypes');

/**
 * RDP targets — {machine_name, targets: [{type: "console"|"guest", host,
 * port, rdp_url, description}]}. Machine must be running; zero targets = 400.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} RDP info
 */
export const getMachineRdpInfo = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/rdp`);

/**
 * Launch the AGENT HOST's RDP client at the machine (`host-launchers`,
 * Direct/desktop mode). target: console | guest; omitted = agent default.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} [target] - console | guest
 * @returns {Promise<Object>} Result
 */
export const openMachineRdp = async (hostname, port, protocol, machineName, target = null) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/open-rdp`,
    'POST',
    target ? { target } : {}
  );

/**
 * Guest-agent readiness probe (`guest-agent` feature token): QGA guest-ping
 * over the machine's COM2 UART. 400 = machine not running; 502 = channel
 * silent (no UART wired or qemu-ga not running in the guest).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {success, machine_name, message}
 */
export const pingGuestAgent = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/guest/ping`);

/**
 * Guest OS identity through the guest agent (QGA guest-get-osinfo, raw):
 * {osinfo: {name, pretty-name, kernel-release, version, machine, ...}}.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {machine_name, osinfo}
 */
export const getGuestAgentOsInfo = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/guest/osinfo`);

/**
 * Live guest interfaces through the guest agent (QGA
 * guest-network-get-interfaces, raw): {interfaces: [{name,
 * "hardware-address", "ip-addresses": [{"ip-address", "ip-address-type",
 * prefix}]}]} — real addresses with no Guest Additions.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} {machine_name, interfaces}
 */
export const getGuestAgentNetwork = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/guest/network`);

/**
 * Clean in-guest shutdown/reboot/halt via the guest agent (QGA
 * guest-shutdown) — silence after delivery is the normal success.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} mode - powerdown | reboot | halt
 * @returns {Promise<Object>} Result
 */
export const shutdownGuest = async (hostname, port, protocol, machineName, mode) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/guest/shutdown`,
    'POST',
    {
      mode,
    }
  );

/**
 * Run a command in the guest via the guest agent (QGA guest-exec; no guest
 * credentials — the channel authorizes). wait:true (default) answers the
 * finished status; on timeout it answers {exited: false} and the caller
 * keeps polling getGuestExecStatus. stdout/stderr arrive already decoded.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {path, args?, wait?, timeout_seconds?}
 * @returns {Promise<Object>} {success, machine_name, pid, exited, exitcode?, signal?, stdout?, stderr?}
 */
export const runGuestExec = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/guest/exec`,
    'POST',
    body
  );

/**
 * Poll a guest-agent exec started with wait:false (or one that outlived its
 * wait window) — same decoded status shape as runGuestExec.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {number} pid - Guest process id from runGuestExec
 * @returns {Promise<Object>} {success, machine_name, pid, exited, exitcode?, signal?, stdout?, stderr?}
 */
export const getGuestExecStatus = async (hostname, port, protocol, machineName, pid) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/guest/exec/${pid}`);

/**
 * Set a machine's free-text notes (DB-immediate, no task; null clears).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string|null} notes - New notes text
 * @returns {Promise<Object>} {success, machine_name, notes}
 */
export const setMachineNotes = async (hostname, port, protocol, machineName, notes) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/notes`, 'PUT', {
    notes,
  });

/**
 * Set a machine's tags (DB-immediate, no task; null/empty clears).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string[]|null} tags - New tag list
 * @returns {Promise<Object>} {success, machine_name, tags}
 */
export const setMachineTags = async (hostname, port, protocol, machineName, tags) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/tags`, 'PUT', {
    tags,
  });

/**
 * Retrofit the guest-agent channel onto an existing machine — wires the
 * virtio-console/COM2 device; takes effect on the NEXT BOOT (zoneweaver
 * answers synchronously with requires_restart, the Go agent may accrue a
 * pending power-cycle change).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Result
 */
export const setupGuestAgent = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/guest-agent/setup`,
    'POST'
  );

/**
 * Configure EFI Secure Boot on a powered-off machine (Go, endpoint-gated).
 * BIOS machines answer VirtualBox's own error.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {enabled, enroll_default_keys?, init_var_store?}
 * @returns {Promise<Object>} Result
 */
export const setSecureBoot = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/nvram/secureboot`,
    'POST',
    body
  );

/**
 * Host USB devices (Go, endpoint-gated) — feeds the attach picker and the
 * filter builder.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Host USB device list
 */
export const getHostUsbDevices = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'system/usb');

/**
 * Attach a host USB device to a RUNNING machine (live).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} device - Host device identifier from GET /system/usb
 * @returns {Promise<Object>} Result
 */
export const attachUsbDevice = async (hostname, port, protocol, machineName, device) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/usb/attach`, 'POST', {
    device,
  });

/**
 * Detach a USB device from a RUNNING machine (live).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} device - Device identifier
 * @returns {Promise<Object>} Result
 */
export const detachUsbDevice = async (hostname, port, protocol, machineName, device) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/usb/detach`, 'POST', {
    device,
  });

/**
 * A machine's persistent USB capture filters — empty match fields match
 * anything.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @returns {Promise<Object>} Filters list
 */
export const getUsbFilters = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/usb/filters`);

/**
 * Add a persistent USB capture filter.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - Filter match fields
 * @returns {Promise<Object>} Result
 */
export const addUsbFilter = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/usb/filters`,
    'POST',
    body
  );

/**
 * Delete a USB capture filter by its index.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {number} index - Filter index
 * @returns {Promise<Object>} Result
 */
export const deleteUsbFilter = async (hostname, port, protocol, machineName, index) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/usb/filters/${index}`,
    'DELETE'
  );

/**
 * Import a machine from an .ova/.ovf on the agent host (202 machine_import
 * task; the row lands via discovery).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} body - {path, name?}
 * @returns {Promise<Object>} QueuedOperation result
 */
export const importMachine = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/import', 'POST', body);

/**
 * Move a POWERED-OFF machine to a new path on the agent host (202
 * machine_move task).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} targetPath - Destination directory on the agent host
 * @returns {Promise<Object>} QueuedOperation result
 */
export const moveMachine = async (hostname, port, protocol, machineName, targetPath) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/move`, 'POST', {
    target_path: targetPath,
  });

/**
 * Send a live display-resize hint to a running machine (Guest Additions
 * honor it).
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {width, height, depth?, display?}
 * @returns {Promise<Object>} Result
 */
export const setMachineDisplay = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/display`, 'POST', body);

/**
 * Run a command in the guest via Guest Additions (password auth only;
 * blank credentials fall back to the stored vagrant_user family) —
 * {exit_code, stdout, stderr}.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {path, args?, username?, password?, timeout_seconds?}
 * @returns {Promise<Object>} Execution result
 */
export const runGuestControl = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/guestcontrol/run`,
    'POST',
    body
  );

/**
 * Probe an ISO on the agent host with VirtualBox's unattended detector —
 * {os_typeid, version, supported, ...}. The wizard precheck before an
 * unattended install; `iso` is an agent-host path.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} iso - ISO path on the agent host
 * @returns {Promise<Object>} Detection result
 */
export const detectUnattendedIso = async (hostname, port, protocol, iso) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/unattended/detect', 'GET', null, {
    iso,
  });

/**
 * Start an unattended OS install on a powered-off machine — VirtualBox preps
 * the answer file and boots headless into the installer. 202 queues a
 * machine_unattended_install task.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {Object} body - {path|iso, user, password, hostname?, locale?, time_zone?, image_index?, install_additions?, product_key?, start?}
 * @returns {Promise<Object>} QueuedOperation result
 */
export const startUnattendedInstall = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/unattended`,
    'POST',
    body
  );

/**
 * Get one task by id (used to open the task-detail stream after queueing an operation)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} taskId - Task id
 * @returns {Promise<Object>} Task row
 */
export const getTask = async (hostname, port, protocol, taskId) =>
  await makeAgentRequest(hostname, port, protocol, `tasks/${taskId}`);

/**
 * Get task queue statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Task stats
 */
export const getTaskStats = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'tasks/stats');

/**
 * Get list of tasks with optional filtering
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Tasks list
 */
export const getTasks = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'tasks', 'GET', null, filters);

/**
 * Cancel a pending or running task — DELETE /tasks/{taskId}. Running cancels
 * kill the executor's children and land in `cancelled` with output preserved;
 * cancelling a parent cascades to its whole chain. Terminal states answer
 * 400 {error, current_status}.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} taskId - Task id
 * @returns {Promise<Object>} {success, task_id, message}
 */
export const cancelTask = async (hostname, port, protocol, taskId) =>
  await makeAgentRequest(hostname, port, protocol, `tasks/${taskId}`, 'DELETE');

/**
 * The agent host's configured external applications (`host-launchers`,
 * Direct/desktop contract) — {applications: [{name, path, args, exists}],
 * total}. `exists` = the executable is present on the agent host.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Applications list
 */
export const getApplications = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'applications');

/**
 * Launch a configured application on the AGENT host with the machine's live
 * connection details resolved into its args ({host}/{port}/{user}/{password}/
 * {machine}). 400 on missing executable / machine not running / no transport.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name
 * @param {string} appName - Configured application name
 * @returns {Promise<Object>} Launch result
 */
export const launchMachineApplication = async (hostname, port, protocol, machineName, appName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/applications/${encodeURIComponent(appName)}/launch`,
    'POST'
  );
