import { makeAgentRequest } from './serverUtils';

/**
 * Get all API keys for current server
 * @param {Object} currentServer - Current server object
 * @param {string} currentServer.hostname - Server hostname
 * @param {number} currentServer.port - Server port
 * @param {string} currentServer.protocol - Server protocol
 * @returns {Promise<Object>} API keys list
 */
export const getApiKeys = async currentServer => {
  if (!currentServer) {
    return { success: false, message: 'No server selected' };
  }
  return await makeAgentRequest(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    'api-keys?include_key=true',
    'GET'
  );
};

/**
 * Generate a new API key
 * @param {Object} currentServer - Current server object
 * @param {string} name - API key name
 * @param {string} description - API key description
 * @returns {Promise<Object>} Generated API key
 */
export const generateApiKey = async (currentServer, name, description) => {
  if (!currentServer) {
    return { success: false, message: 'No server selected' };
  }
  return await makeAgentRequest(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    'api-keys/generate',
    'POST',
    { name, description }
  );
};

/**
 * Bootstrap initial API key
 * @param {Object} currentServer - Current server object
 * @returns {Promise<Object>} Bootstrap API key result
 */
export const bootstrapApiKey = async currentServer => {
  if (!currentServer) {
    return { success: false, message: 'No server selected' };
  }
  return await makeAgentRequest(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    'api-keys/bootstrap',
    'POST',
    { name: 'Initial-Setup', description: 'Initial bootstrap API key' }
  );
};

/**
 * Delete an API key
 * @param {Object} currentServer - Current server object
 * @param {string} id - API key ID to delete
 * @returns {Promise<Object>} Delete result
 */
export const deleteApiKey = async (currentServer, id) => {
  if (!currentServer) {
    return { success: false, message: 'No server selected' };
  }
  return await makeAgentRequest(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    `api-keys/${id}`,
    'DELETE'
  );
};
