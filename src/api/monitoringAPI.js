import { makeAgentRequest } from './serverUtils';

// ========================================
// HOST MONITORING FUNCTIONS
// ========================================

/**
 * Get monitoring service status
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Monitoring service status
 */
export const getMonitoringStatus = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/status');

/**
 * Get monitoring service health check
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Monitoring health information
 */
export const getMonitoringHealth = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/health');

/**
 * Trigger immediate data collection
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} type - Collection type (all, network, storage)
 * @returns {Promise<Object>} Collection result
 */
export const triggerMonitoringCollection = async (hostname, port, protocol, type = 'all') =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/collect', 'POST', {
    type,
  });

/**
 * Get host information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {string} host - Specific host to query (optional)
 * @returns {Promise<Object>} Host information
 */
export const getMonitoringHost = async (hostname, port, protocol, host = null) => {
  const params = host ? { host } : null;
  return await makeAgentRequest(hostname, port, protocol, 'monitoring/host', 'GET', null, params);
};

/**
 * Get monitoring summary
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @returns {Promise<Object>} Monitoring summary
 */
export const getMonitoringSummary = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'monitoring/summary');

// ========================================
// NETWORK MONITORING FUNCTIONS
// ========================================

/**
 * Get network interface information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, offset, host, state)
 * @returns {Promise<Object>} Network interface data
 */
export const getNetworkInterfaces = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/network/interfaces',
    'GET',
    null,
    filters
  );

/**
 * Get network usage accounting data
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since, link)
 * @returns {Promise<Object>} Network usage data
 */
export const getNetworkUsage = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/network/usage',
    'GET',
    null,
    filters
  );

/**
 * Get IP address assignments
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, offset, interface, ip_version, state)
 * @returns {Promise<Object>} IP address data
 */
export const getNetworkIPAddresses = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/network/ipaddresses',
    'GET',
    null,
    filters
  );

/**
 * Get routing table information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, offset, interface, ip_version, is_default, destination)
 * @returns {Promise<Object>} Routing table data
 */
export const getNetworkRoutes = async (hostname, port, protocol, filters = {}) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/network/routes',
    'GET',
    null,
    filters
  );

// ========================================
// STORAGE MONITORING FUNCTIONS
// ========================================

/**
 * Get ZFS pool information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, pool, health)
 * @returns {Promise<Object>} ZFS pool data
 */
export const getStoragePools = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage pools from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/pools',
    'GET',
    null,
    filters
  );
};

/**
 * Get ZFS dataset information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, offset, pool, type, name)
 * @returns {Promise<Object>} ZFS dataset data
 */
export const getStorageDatasets = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage datasets from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/datasets',
    'GET',
    null,
    filters
  );
};

/**
 * Get physical disk information
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, offset, pool, available, type)
 * @returns {Promise<Object>} Physical disk data
 */
export const getStorageDisks = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage disks from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/disks',
    'GET',
    null,
    filters
  );
};

/**
 * Get ZFS pool I/O performance statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since, pool, pool_type)
 * @returns {Promise<Object>} Pool I/O performance data
 */
export const getStoragePoolIO = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage pool I/O from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/pool-io',
    'GET',
    null,
    filters
  );
};

/**
 * Get disk I/O performance statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since, device_name)
 * @returns {Promise<Object>} Disk I/O performance data
 */
export const getStorageDiskIO = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage disk I/O from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/disk-io',
    'GET',
    null,
    filters
  );
};

/**
 * Get ZFS ARC statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since)
 * @returns {Promise<Object>} ZFS ARC statistics data
 */
export const getStorageARC = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 STORAGE: Getting storage ARC statistics from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/storage/arc',
    'GET',
    null,
    filters
  );
};

// ========================================
// SYSTEM MONITORING FUNCTIONS
// ========================================

/**
 * Get system CPU statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since, include_cores)
 * @returns {Promise<Object>} System CPU data
 */
export const getSystemCPU = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 SYSTEM: Getting CPU statistics from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/system/cpu',
    'GET',
    null,
    filters
  );
};

/**
 * Get per-core CPU statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since)
 * @returns {Promise<Object>} Per-core CPU data
 */
export const getSystemCPUCores = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 SYSTEM: Getting per-core CPU statistics from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/system/cpu/cores',
    'GET',
    null,
    filters
  );
};

/**
 * Get system memory statistics
 * @param {string} hostname - Server hostname
 * @param {number} port - Server port
 * @param {string} protocol - Server protocol
 * @param {Object} filters - Filter options (limit, since)
 * @returns {Promise<Object>} System memory data
 */
export const getSystemMemory = async (hostname, port, protocol, filters = {}) => {
  console.log(`🔍 SYSTEM: Getting memory statistics from ${hostname}:${port}`);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'monitoring/system/memory',
    'GET',
    null,
    filters
  );
};
