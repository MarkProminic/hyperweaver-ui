import axios from 'axios';

/**
 * Mode-aware agent addressing (hyperweaver-dualmode-plan.md §4).
 *
 * Aggregated mode: every agent request rides the Hyperweaver Server's unified proxy
 * namespace `/api/agents/{id}/{path}` — {id} is the registry row id, resolved here from
 * the (hostname, port, protocol) triple the existing call sites already pass around.
 * Direct mode: the SPA is served BY the agent, so `{path}` goes straight to origin
 * root (`/{path}`) — the exact same path segment the proxy would have forwarded.
 *
 * ServerContext owns the state and pushes it here via configureAgentAddressing()
 * whenever the mode pins or the registry changes; keeping the call-site signature
 * (hostname, port, protocol, path, …) confines the dual-mode change to this module.
 */
const addressing = {
  mode: null, // 'direct' | 'aggregated' | null (unconfigured)
  resolveId: () => null,
};

/**
 * Configure how agent URLs are built. Called by ServerContext.
 * @param {Object} config - Addressing configuration
 * @param {string} config.mode - 'direct' or 'aggregated'
 * @param {Function} [config.resolveId] - (hostname, port, protocol) => registry id (aggregated only)
 */
export const configureAgentAddressing = ({ mode, resolveId }) => {
  addressing.mode = mode;
  addressing.resolveId = resolveId || (() => null);
};

/**
 * Base path prefix for a given agent — also used for WebSocket paths.
 * Direct: '' (origin root). Aggregated: `/api/agents/{id}`.
 * @param {Object} server - Server object ({ id } or { hostname, port, protocol })
 * @returns {string} Base path prefix (no trailing slash)
 */
export const getAgentBasePath = server => {
  if (addressing.mode === 'direct') {
    return '';
  }
  const id = server?.id ?? addressing.resolveId(server?.hostname, server?.port, server?.protocol);
  if (id === null || id === undefined) {
    throw new Error(
      `No registry id known for agent ${server?.hostname}:${server?.port} — is the servers list loaded?`
    );
  }
  return `/api/agents/${id}`;
};

/**
 * Build the request URL for an agent API path in the current mode.
 * @param {string} protocol - Agent protocol (used for id resolution in aggregated mode)
 * @param {string} hostname - Agent hostname
 * @param {number} port - Agent port
 * @param {string} path - Agent API path (root-relative, no leading slash)
 * @returns {string} URL to request
 */
const buildAgentUrl = (protocol, hostname, port, path) => {
  if (addressing.mode === 'direct') {
    return `/${path}`;
  }
  const id = addressing.resolveId(hostname, port, protocol);
  if (id === null || id === undefined) {
    throw new Error(
      `No registry id known for agent ${hostname}:${port} — is the servers list loaded?`
    );
  }
  return `/api/agents/${id}/${path}`;
};

/**
 * Helper to create Axios configuration for Agent requests
 * Reduces complexity of the main request function
 * @param {Object} config - Request configuration
 * @returns {Object} Axios request configuration
 */
export const createAxiosConfig = ({
  protocol,
  hostname,
  port,
  path,
  method,
  data,
  params,
  bypassCache,
  onUploadProgress,
  responseType,
}) => {
  const proxyUrl = buildAgentUrl(protocol, hostname, port, path);
  const config = {
    url: proxyUrl,
    method,
    headers: {
      ...(data instanceof FormData
        ? { 'Content-Type': false }
        : { 'Content-Type': 'application/json' }),
      ...((path.includes('/vnc/') || bypassCache) && {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      }),
    },
    ...(responseType !== 'json' && { responseType }),
    validateStatus: status =>
      (status >= 200 && status < 300) ||
      (status === 304 && !path.includes('/vnc/') && !bypassCache),
    ...(data instanceof FormData && { timeout: 1800000 }),
    ...(data instanceof FormData && onUploadProgress && { onUploadProgress }),
  };

  if (data) {
    config.data = data;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (Object.hasOwn(params, key)) {
        searchParams.append(key, params[key]);
      }
    }
    config.params = searchParams;
  }

  return config;
};

/**
 * Make a request to a Agent through the proxy
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} path - API path
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {Object} data - Request body data
 * @param {Object} params - URL parameters
 * @param {boolean} bypassCache - Force bypass cache for this request
 * @param {Function} onUploadProgress - Upload progress callback for FormData
 * @param {string} responseType - Response type ('json', 'blob', 'text', etc.)
 * @returns {Promise<Object>} Request result
 */
export const makeAgentRequest = async (...args) => {
  // Destructure arguments to maintain backward compatibility while satisfying max-params rule
  const [
    hostname,
    port,
    protocol,
    path,
    method = 'GET',
    data = null,
    params = null,
    bypassCache = false,
    onUploadProgress = null,
    responseType = 'json',
  ] = args;

  try {
    const config = createAxiosConfig({
      protocol,
      hostname,
      port,
      path,
      method,
      data,
      params,
      bypassCache,
      onUploadProgress,
      responseType,
    });

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Agent request error:', error);

    // Handle 304 responses for VNC endpoints - should not happen with backend no-cache headers
    if (error.response?.status === 304 && (path.includes('/vnc/') || bypassCache)) {
      console.warn('VNC endpoint returned 304 despite no-cache headers, forcing cache bypass...');

      // Add cache-busting parameter and retry once
      if (!bypassCache) {
        const bustingPath = path.includes('?')
          ? `${path}&_cb=${Date.now()}`
          : `${path}?_cb=${Date.now()}`;
        return await makeAgentRequest(
          hostname,
          port,
          protocol,
          bustingPath,
          method,
          data,
          params,
          true
        );
      }
    }

    const message = error.response?.data?.msg || error.response?.data?.message || 'Request failed';
    return {
      success: false,
      message,
      status: error.response?.status,
    };
  }
};
