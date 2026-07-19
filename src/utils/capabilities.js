/**
 * Capability gating helpers (dual-mode plan §3.1).
 *
 * Every capability field on an agent's /status payload is an array of kebab-case
 * tokens, presence = supported. The payload rides on each registry row as
 * `capabilities` (Aggregated) and on the synthesized self-server (Direct), so
 * `server.capabilities` has the same shape in both modes.
 *
 * Rules:
 * - Panels/nav gate ONLY on feature/console tokens — never on hypervisor/platform/
 *   arch/agent names (those are data: labels, box-compat filtering).
 * - A server with NO capabilities yet (legacy agent, or the poll hasn't landed)
 *   renders EVERYTHING — current behavior, graceful for older agents.
 */

/**
 * Whether the agent behind `server` advertises a feature token.
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @param {string} token - Feature token, e.g. 'zfs', 'vnics', 'fault-management'
 * @returns {boolean} True if supported (or unknown/legacy — render-all rule)
 */
export const hasFeature = (server, token) => {
  const features = server?.capabilities?.features;
  if (!Array.isArray(features)) {
    return true; // legacy agent / capabilities not harvested yet → render everything
  }
  return features.includes(token);
};

/**
 * STRICT feature check — the token must be PRESENT; no render-all fallback.
 * For surfaces that fire agent requests which 404/noise on agents that never
 * serve them (e.g. host-launchers → GET /applications on zoneweaver).
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @param {string} token - Feature token
 * @returns {boolean} True only when the harvested capabilities name the token
 */
export const hasFeatureStrict = (server, token) =>
  Array.isArray(server?.capabilities?.features) && server.capabilities.features.includes(token);

/**
 * Whether the agent behind `server` supports a console protocol.
 * @param {Object} server - Server object
 * @param {string} token - Console token, e.g. 'vnc'
 * @returns {boolean} True if supported (or unknown/legacy)
 */
export const hasConsole = (server, token) => {
  const consoles = server?.capabilities?.console;
  if (!Array.isArray(consoles)) {
    return true;
  }
  return consoles.includes(token);
};

/**
 * Whether the agent behind `server` offers machine management — the `machines` feature
 * token, advertised by BOTH agents (sync-file AGREED, 2026-07-05). hasFeature's
 * render-all rule still covers agents with no features array at all.
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @returns {boolean} True if machine surfaces (page, tree expansion, counts) should render
 */
export const hasMachines = server => hasFeature(server, 'machines');

/**
 * Whether the agent behind `server` runs a given hypervisor ('bhyve' |
 * 'virtualbox'). ONLY for the deliberate platform-divergence gates Mark
 * ruled 2026-07-12 — always POSITIVE checks ('virtualbox' surfaces:
 * pause, modifyvm hardware/ports/vbox-passthrough, Secure Boot, USB,
 * unattended install, import/move, guest exec, display resize; 'bhyve'
 * surfaces: filesystems, bootorder/bootnext) — feature/console tokens
 * stay the rule for everything else.
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @param {string} name - Hypervisor name
 * @returns {boolean} True when the capability array names it
 */
export const hasHypervisor = (server, name) =>
  (server?.capabilities?.hypervisors ?? []).includes(name);

/**
 * The agent's host OS as /api/status advertises it (e.g. 'windows', 'darwin',
 * 'linux'); null when unknown. Data, not a gate — used only where an agent's
 * own wire documents per-OS behavior (e.g. the Go agent's address-create
 * rules).
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @returns {string|null}
 */
export const agentPlatform = server => server?.capabilities?.platform || null;

// The Manage page's sub-tab tokens — keep in sync with TABS in HostManage.jsx (the
// same parallel-list convention as Navbar's HOST_CONTROL_ROUTES ↔ ContextTabs'
// HOST_TABS). Used to hide the Manage navbar tab when an agent offers none of them.
const MANAGE_FEATURES = [
  'services',
  'vnics',
  'packages',
  'boot-environments',
  'zfs',
  'time-sync',
  'processes',
  'fault-management',
  'file-browser',
  'system-users',
  'provisioner-registry',
  'templates',
  'machines',
  'provisioning',
];

/**
 * Whether the agent behind `server` offers ANY Manage-page surface. Legacy agents
 * with no features array render everything (hasFeature's render-all rule).
 * @param {Object} server - Server object (registry row or Direct self-server)
 * @returns {boolean} True if the Manage navbar tab should render
 */
export const hasManageSurface = server => MANAGE_FEATURES.some(token => hasFeature(server, token));
