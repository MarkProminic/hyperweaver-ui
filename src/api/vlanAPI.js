import { makeAgentRequest } from './serverUtils';

/**
 * Get VLAN information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (vid, over, limit, live)
 * @returns {Promise<Object>} VLAN data
 */
export const getVlans = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 VLANS: Getting VLANs from ${hostname}:${port}`);
  return await makeAgentRequest(hostname, port, protocol, 'network/vlans', 'GET', null, filters);
};

/**
 * Get specific VLAN details
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} vlanName - VLAN link name
 * @param {Object} options - Options (live)
 * @returns {Promise<Object>} VLAN details
 */
export const getVlanDetails = async (hostname, port, protocol, vlanName, options = {}) => {
  console.log(`🔍 VLANS: Getting VLAN details for ${vlanName} from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `network/vlans/${encodeURIComponent(vlanName)}`,
    'GET',
    null,
    options
  );
};

/**
 * Create a new VLAN
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} vlanData - VLAN configuration
 * @returns {Promise<Object>} Create result
 */
export const createVlan = async (hostname, port, protocol, vlanData) => {
  console.log(`🔄 VLANS: Creating VLAN on ${hostname}:${port}`, vlanData);
  return await makeAgentRequest(hostname, port, protocol, 'network/vlans', 'POST', vlanData);
};

/**
 * Delete a VLAN
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} vlanName - VLAN link name to delete
 * @param {Object} options - Delete options (temporary)
 * @returns {Promise<Object>} Delete result
 */
export const deleteVlan = async (hostname, port, protocol, vlanName, options = {}) => {
  console.log(`🗑️ VLANS: Deleting VLAN ${vlanName} from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `network/vlans/${encodeURIComponent(vlanName)}`,
    'DELETE',
    null,
    options
  );
};
