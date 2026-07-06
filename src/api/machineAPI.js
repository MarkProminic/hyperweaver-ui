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
 * Delete a machine
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} machineName - Machine name to delete
 * @param {boolean} force - Force delete (stops a running machine first)
 * @returns {Promise<Object>} Delete result
 */
export const deleteMachine = async (hostname, port, protocol, machineName, force = false) => {
  const params = force ? { force: true } : null;
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}`,
    'DELETE',
    null,
    params
  );
};

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
