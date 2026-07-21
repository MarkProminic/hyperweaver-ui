import axios from 'axios';

/**
 * Org-access API (D15, aggregated mode only): agent and machine org assignment on the
 * Hyperweaver Server, plus the org option list for assignment pickers.
 */

const requestFailed = error => ({
  success: false,
  status: error.response?.status ?? null,
  message: error.response?.data?.message || error.message,
});

/**
 * List the org uuids that own a registered agent.
 * @param {number} serverId - Registry id (servers.id)
 * @returns {Promise<Object>} { success, orgs?: string[], status?, message? }
 */
export const getServerOrgs = async serverId => {
  try {
    const response = await axios.get(`/api/servers/${serverId}/orgs`);
    return response.data;
  } catch (error) {
    return requestFailed(error);
  }
};

/**
 * Replace an agent's owning-org list. Empty list reopens the agent to every
 * authenticated user of the Server.
 * @param {number} serverId - Registry id (servers.id)
 * @param {string[]} orgs - Org uuids
 * @returns {Promise<Object>} { success, orgs?, status?, message? }
 */
export const setServerOrgs = async (serverId, orgs) => {
  try {
    const response = await axios.put(`/api/servers/${serverId}/orgs`, { orgs });
    return response.data;
  } catch (error) {
    return requestFailed(error);
  }
};

/**
 * List the org uuids a machine belongs to.
 * @param {number} serverId - Registry id (servers.id)
 * @param {string} machineName - Agent-canonical machine name
 * @returns {Promise<Object>} { success, orgs?, status?, message? }
 */
export const getMachineOrgs = async (serverId, machineName) => {
  try {
    const response = await axios.get(
      `/api/servers/${serverId}/machines/${encodeURIComponent(machineName)}/orgs`
    );
    return response.data;
  } catch (error) {
    return requestFailed(error);
  }
};

/**
 * Replace a machine's org list.
 * @param {number} serverId - Registry id (servers.id)
 * @param {string} machineName - Agent-canonical machine name
 * @param {string[]} orgs - Org uuids
 * @returns {Promise<Object>} { success, orgs?, status?, message? }
 */
export const setMachineOrgs = async (serverId, machineName, orgs) => {
  try {
    const response = await axios.put(
      `/api/servers/${serverId}/machines/${encodeURIComponent(machineName)}/orgs`,
      { orgs }
    );
    return response.data;
  } catch (error) {
    return requestFailed(error);
  }
};

/**
 * Build the org option list for assignment pickers, merged from every source this user
 * can reach: the local organizations table (super-admin only; org_uuid per row) and the
 * user's own OIDC organizations claim via the userinfo proxy (federated logins). A 403
 * from either source just narrows the list — assignment stays possible via raw uuid.
 * @returns {Promise<Array<{uuid: string, name: string|null, roles: string[], primary: boolean}>>}
 */
export const getKnownOrgs = async () => {
  const byUuid = new Map();

  const [localResult, claimsResult] = await Promise.allSettled([
    axios.get('/api/organizations'),
    axios.get('/api/userinfo/claims'),
  ]);

  if (localResult.status === 'fulfilled' && localResult.value.data?.success) {
    for (const org of localResult.value.data.organizations || []) {
      if (org.org_uuid) {
        byUuid.set(org.org_uuid, {
          uuid: org.org_uuid,
          name: org.name || null,
          roles: [],
          primary: false,
        });
      }
    }
  }

  if (claimsResult.status === 'fulfilled') {
    for (const org of claimsResult.value.data?.organizations || []) {
      if (org?.uuid) {
        const existing = byUuid.get(org.uuid);
        byUuid.set(org.uuid, {
          uuid: org.uuid,
          name: org.name || existing?.name || null,
          roles: Array.isArray(org.roles) ? org.roles : [],
          primary: Boolean(org.primary),
        });
      }
    }
  }

  return [...byUuid.values()].sort((a, b) => (a.name || a.uuid).localeCompare(b.name || b.uuid));
};

/**
 * The subset of known orgs this user can stamp on machine creates or assign
 * self-service: orgs where the claim carries a manager role. Local admins ignore this
 * and use the full list.
 * @param {Array<{roles: string[]}>} orgs - getKnownOrgs result
 * @returns {Array} Manager-role subset
 */
export const managerOrgsOf = orgs =>
  orgs.filter(org => org.roles.includes('OWNER') || org.roles.includes('ADMIN'));
