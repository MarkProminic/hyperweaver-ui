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
