import { makeAgentRequest } from './serverUtils';

/**
 * Get host PCI devices
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (category, ppt_enabled, driver_attached, available, limit)
 * @returns {Promise<Object>} Host devices data
 */
export const getHostDevices = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 DEVICES: Getting host devices from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'host/devices', 'GET', null, filters);
};

/**
 * Get available devices for passthrough
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (category, ppt_only)
 * @returns {Promise<Object>} Available devices data
 */
export const getAvailableDevices = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 DEVICES: Getting available devices from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'host/devices/available',
    'GET',
    null,
    filters
  );
};

/**
 * Get device categories summary
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Device categories data
 */
export const getDeviceCategories = async (hostname, port, protocol) => {
  console.log(`🔍 DEVICES: Getting device categories from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'host/devices/categories');
};

/**
 * Get PPT status overview
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} PPT status data
 */
export const getPPTStatus = async (hostname, port, protocol) => {
  console.log(`🔍 DEVICES: Getting PPT status from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'host/ppt-status');
};

/**
 * Trigger manual device discovery
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Device discovery result
 */
export const refreshDeviceDiscovery = async (hostname, port, protocol) => {
  console.log(`🔄 DEVICES: Refreshing device discovery on ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'host/devices/refresh', 'POST');
};

/**
 * Get specific device details
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} deviceId - Device ID or PCI address
 * @returns {Promise<Object>} Device details
 */
export const getDeviceDetails = async (hostname, port, protocol, deviceId) => {
  console.log(`🔍 DEVICES: Getting device details for ${deviceId} from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, `host/devices/${deviceId}`);
};
