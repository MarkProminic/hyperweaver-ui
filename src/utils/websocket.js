/**
 * Build a same-origin WebSocket URL, deriving the scheme from the page protocol.
 *
 * An https: page may only open wss:; an http: page uses ws:. Hardcoding either
 * one breaks the other, so we mirror window.location. Because the page and its
 * WebSocket are always the same origin (host taken from window.location.host),
 * this is correct in both Direct mode (an agent serves the page + WS) and
 * Aggregated mode (the Server serves the page + proxies the WS).
 *
 * @param {string} path - Absolute path (and optional query), built client-side as
 *   `${getAgentBasePath(server)}/{suffix}` (see serverUtils) — e.g. Direct:
 *   "/zlogin/abc123"; Aggregated: "/api/agents/7/zones/z/vnc/websockify".
 * @returns {string} Full WebSocket URL, e.g. "wss://host:port/zlogin/abc123".
 */
export const buildWsUrl = path => {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${path}`;
};
