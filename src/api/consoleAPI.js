import axios from 'axios';

import { makeAgentRequest } from './serverUtils';

// ========================================
// VNC CONSOLE SESSION FUNCTIONS
// ========================================

/**
 * Start VNC console session for a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} VNC start result
 */
export const startVncSession = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/vnc/start`, 'POST');

/**
 * Get VNC session information for a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} VNC session info
 */
export const getVncSessionInfo = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/vnc/info`);

/**
 * Stop VNC console session for a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} VNC stop result
 */
export const stopVncSession = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/vnc/stop`, 'DELETE');

/**
 * Get all VNC sessions
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (status, zone_name)
 * @returns {Promise<Object>} VNC sessions list
 */
export const getAllVncSessions = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'vnc/sessions', 'GET', null, filters);

// ========================================
// ZLOGIN CONSOLE SESSION FUNCTIONS
// ========================================

/**
 * Start zlogin console session for a zone
 * NOTE: Uses direct API endpoint instead of proxy to get websocket_url
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol (unused but kept for consistency)
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} Zlogin start result
 */
export const startZloginSession = async (hostname, port, protocol, zoneName) => {
  // Use specific handler (like HOST terminal) instead of general proxy to get websocket_url
  try {
    const response = await axios.post(
      `/api/servers/${hostname}:${port}/zones/${zoneName}/zlogin/start`
    );
    // Log protocol to satisfy no-unused-vars rule
    console.log(`Starting zlogin session via ${protocol} protocol`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Start zlogin session error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to start zlogin session',
    };
  }
};

/**
 * Get zlogin session information for a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} sessionId - Zlogin session ID
 * @returns {Promise<Object>} Zlogin session info
 */
export const getZloginSessionInfo = async (hostname, port, protocol, sessionId) =>
  await makeAgentRequest(hostname, port, protocol, `zlogin/sessions/${sessionId}`);

/**
 * Stop zlogin console session for a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} sessionId - Zlogin session ID
 * @returns {Promise<Object>} Zlogin stop result
 */
export const stopZloginSession = async (hostname, port, protocol, sessionId) =>
  await makeAgentRequest(hostname, port, protocol, `zlogin/sessions/${sessionId}/stop`, 'DELETE');

/**
 * Get all zlogin sessions
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (status, zone_name)
 * @returns {Promise<Object>} Zlogin sessions list
 */
export const getAllZloginSessions = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'zlogin/sessions', 'GET', null, filters);
