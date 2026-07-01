import { makeAgentRequest } from './serverUtils';

/**
 * Start a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name to start
 * @returns {Promise<Object>} Start result
 */
export const startZone = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/start`, 'POST');

/**
 * Stop a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name to stop
 * @param {boolean} force - Force stop the zone
 * @returns {Promise<Object>} Stop result
 */
export const stopZone = async (hostname, port, protocol, zoneName, force = false) => {
  const params = force ? { force: true } : null;
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `zones/${zoneName}/stop`,
    'POST',
    null,
    params
  );
};

/**
 * Restart a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name to restart
 * @returns {Promise<Object>} Restart result
 */
export const restartZone = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/restart`, 'POST');

/**
 * Delete a zone
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name to delete
 * @param {boolean} force - Force delete the zone
 * @returns {Promise<Object>} Delete result
 */
export const deleteZone = async (hostname, port, protocol, zoneName, force = false) => {
  const params = force ? { force: true } : null;
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `zones/${zoneName}`,
    'DELETE',
    null,
    params
  );
};

/**
 * Get detailed zone information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} Zone details
 */
export const getZoneDetails = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}`);

/**
 * Get all zones with optional filtering
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Zones list
 */
export const getAllZones = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(hostname, port, protocol, 'zones', 'GET', null, filters);

/**
 * Get zone configuration
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} zoneName - Zone name
 * @returns {Promise<Object>} Zone configuration
 */
export const getZoneConfig = async (hostname, port, protocol, zoneName) =>
  await makeAgentRequest(hostname, port, protocol, `zones/${zoneName}/config`);

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
