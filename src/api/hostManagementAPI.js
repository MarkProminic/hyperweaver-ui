import { makeAgentRequest } from './serverUtils';

/**
 * Get host system status
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Host status information
 */
export const getHostStatus = async (hostname, port, protocol) => {
  console.log(`🔍 HOST: Getting host status from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'system/host/status');
};

/**
 * Restart host system
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} options - Restart options
 * @param {number} options.gracePeriod - Grace period in seconds (0-7200, default 60)
 * @param {string} options.message - Optional message for the restart
 * @returns {Promise<Object>} Restart task result
 */
export const restartHost = async (hostname, port, protocol, options = {}) => {
  console.log(`🔄 HOST: Restarting host ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'system/host/restart', 'POST', {
    grace_period: options.gracePeriod || 60,
    message: options.message || 'System restart via Hyperweaver UI',
    confirm: true,
  });
};

/**
 * Reboot host system (direct reboot)
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} options - Reboot options
 * @param {boolean} options.dumpCore - Force crash dump before reboot
 * @returns {Promise<Object>} Reboot task result
 */
export const rebootHost = async (hostname, port, protocol, options = {}) => {
  console.log(`🔄 HOST: Rebooting host ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'system/host/reboot', 'POST', {
    confirm: true,
    dump_core: options.dumpCore || false,
  });
};

/**
 * Shutdown host system
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} options - Shutdown options
 * @param {number} options.gracePeriod - Grace period in seconds (0-7200, default 60)
 * @param {string} options.message - Optional message for the shutdown
 * @returns {Promise<Object>} Shutdown task result
 */
export const shutdownHost = async (hostname, port, protocol, options = {}) => {
  console.log(`🛑 HOST: Shutting down host ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'system/host/shutdown', 'POST', {
    grace_period: options.gracePeriod || 60,
    message: options.message || 'System shutdown via Hyperweaver UI',
    confirm: true,
  });
};

/**
 * Get host reboot status
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Reboot status information
 */
export const getHostRebootStatus = async (hostname, port, protocol) => {
  console.log(`🔍 HOST: Getting reboot status from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'system/host/reboot-status');
};
