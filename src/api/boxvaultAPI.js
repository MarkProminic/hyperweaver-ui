import axios from 'axios';

/**
 * BoxVault API via the Server's per-user proxy (/api/boxvault/*, D15). Every call rides
 * the LOGGED-IN USER's OIDC access token server-side. Status meanings surfaced to
 * callers: 503 = BoxVault integration unconfigured, 403 = federated (OIDC) login
 * required. URL org segments use BoxVault's immutable org SLUG, never the org uuid —
 * map Hyperweaver org → slug via external_org_id in BoxVault responses.
 */

const requestFailed = error => ({
  success: false,
  status: error.response?.status ?? null,
  message: error.response?.data?.message || error.message,
});

const get = async path => {
  try {
    const response = await axios.get(`/api/boxvault/${path}`);
    return { success: true, status: 200, data: response.data };
  } catch (error) {
    return requestFailed(error);
  }
};

/**
 * Public discovery listing (all public boxes across orgs).
 * @returns {Promise<Object>} { success, data?, status, message? }
 */
export const discoverBoxes = () => get('api/discover');

/**
 * An org's box list, org-private boxes included when the user's token grants them.
 * @param {string} orgSlug - BoxVault org slug
 * @returns {Promise<Object>} { success, data?, status, message? }
 */
export const listOrgBoxes = orgSlug => get(`api/organization/${encodeURIComponent(orgSlug)}/box`);

/**
 * One box's detail: versions → providers → architectures → files + checksums.
 * @param {string} orgSlug - BoxVault org slug
 * @param {string} boxName - Box name
 * @returns {Promise<Object>} { success, data?, status, message? }
 */
export const getBoxDetail = (orgSlug, boxName) =>
  get(`api/organization/${encodeURIComponent(orgSlug)}/box/${encodeURIComponent(boxName)}`);

/**
 * Mint a self-contained signed download URL (~1h) for one box file — the URL goes into
 * the machine-create document so the agent downloads without any credential.
 * @param {Object} ref - { orgSlug, boxName, version, provider, architecture }
 * @returns {Promise<Object>} { success, downloadUrl?, status, message? }
 */
export const getBoxDownloadLink = async ({ orgSlug, boxName, version, provider, architecture }) => {
  try {
    const response = await axios.post(
      `/api/boxvault/api/organization/${encodeURIComponent(orgSlug)}/box/${encodeURIComponent(boxName)}/version/${encodeURIComponent(version)}/provider/${encodeURIComponent(provider)}/architecture/${encodeURIComponent(architecture)}/file/get-download-link`,
      {}
    );
    return { success: true, status: 200, downloadUrl: response.data?.downloadUrl || null };
  } catch (error) {
    return requestFailed(error);
  }
};
