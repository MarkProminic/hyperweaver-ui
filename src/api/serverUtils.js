import axios from 'axios';

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
  const proxyUrl = `/api/zapi/${protocol}/${hostname}/${port}/${path}`;
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
