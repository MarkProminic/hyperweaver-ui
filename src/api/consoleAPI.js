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
 * Start zlogin console session for a zone.
 * Stops any existing session for the zone first (the dedup the old Server-side
 * special handler performed); the caller derives the WS path from the session id.
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} Zlogin start result ({ success, data: session })
 */
export const startZloginSession = async (hostname, port, protocol, zoneName) => {
  const sessionsResult = await makeAgentRequest(hostname, port, protocol, 'zlogin/sessions');
  if (sessionsResult.success && Array.isArray(sessionsResult.data)) {
    const existing = sessionsResult.data.find(session => session.zone_name === zoneName);
    if (existing) {
      await makeAgentRequest(
        hostname,
        port,
        protocol,
        `zlogin/sessions/${existing.id}/stop`,
        'DELETE'
      );
    }
  }

  const result = await makeAgentRequest(
    hostname,
    port,
    protocol,
    `zones/${zoneName}/zlogin/start`,
    'POST'
  );
  if (!result.success) {
    return result;
  }
  // Normalize: some agent responses nest the session object
  return { success: true, data: result.data?.session || result.data };
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
