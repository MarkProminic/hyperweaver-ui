import { makeAgentRequest } from './serverUtils';

// Provisioning-surface calls (Agent API v1 — sync items 10/11). One shared
// contract, BOTH agents: every call here is addressed by capability token
// (`provisioning` for the registry/secrets, `machine-create` for
// create/clone), never by hypervisor or agent identity. Hypervisor
// divergences ride in the DATA (provisioner metadata, settings vocabulary,
// task orchestration shape), not in these paths. Responses are handled
// tolerantly: `task_id` is optional (synchronous registry inserts and
// task-queued answers both occur, per implementation), and messages pass
// through verbatim.

/**
 * List every provisioner family with its versions (newest first).
 */
export const getProvisioners = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/provisioners');

/**
 * One provisioner version's full manifest — metadata.roles +
 * metadata.configuration.basicFields/advancedFields drive the create forms.
 */
export const getProvisionerVersion = async (hostname, port, protocol, name, version) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `provisioning/provisioners/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`
  );

/**
 * Queue a provisioner import. body = {source_type: folder|archive|git,
 * path?, url?, branch?, token_name?} — paths name locations on the AGENT
 * host; token_name names a git_api_keys secret for private repositories.
 */
export const importProvisioner = async (hostname, port, protocol, body) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'provisioning/provisioners/import',
    'POST',
    body
  );

/**
 * Delete a whole provisioner family — answers 409 with {error, machines[]}
 * while any machine's spec references it.
 */
export const deleteProvisioner = async (hostname, port, protocol, name) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `provisioning/provisioners/${encodeURIComponent(name)}`,
    'DELETE'
  );

/**
 * Delete one provisioner version — same 409-in-use contract as the family.
 */
export const deleteProvisionerVersion = async (hostname, port, protocol, name, version) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `provisioning/provisioners/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
    'DELETE'
  );

/**
 * The global secrets document (admin-only; six SHI categories, plain values
 * by design — Mark's ruling).
 */
export const getSecrets = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'secrets');

/**
 * Replace the submitted secrets categories (top-level shallow merge — the
 * same PUT shape the settings surface uses).
 */
export const updateSecrets = async (hostname, port, protocol, categories) =>
  await makeAgentRequest(hostname, port, protocol, 'secrets', 'PUT', categories);

/**
 * Create a machine from a provisioner spec. body = {name} + the spec
 * (provisioner {name, version}, settings, networks, roles, properties,
 * advanced_properties, sync_method?, safe_id_path?, start_after_create?).
 */
export const createMachine = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'machines', 'POST', body);

/**
 * Replace a provisioner-managed machine's spec — the response carries
 * requires_restart: changes materialize on the next start.
 */
export const modifyMachine = async (hostname, port, protocol, machineName, spec) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}`, 'PUT', spec);

/**
 * Clone a provisioner-managed machine. body = {name, settings: {hostname
 * required, domain?, server_id?}, overrides: {memory?, vcpus?},
 * start_after_create?}.
 */
export const cloneMachine = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/clone`, 'POST', body);

/**
 * Queue a provision run (re-render + provision) on a provisioner-managed
 * machine.
 */
export const provisionMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/provision`, 'POST');

/**
 * Queue a file sync on a provisioner-managed machine.
 */
export const syncMachine = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/sync`, 'POST');

/**
 * The installer file cache (sync item 12, the `artifacts` token). filters =
 * {role?, kind?, exists?} — rows carry {id, role, kind, filename, path,
 * sha256, expected_sha256, size, version, exists, verified_at, source_url}.
 */
export const getArtifacts = async (hostname, port, protocol, filters = null) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts', 'GET', null, filters);

/**
 * Queue a cache scan. body = {verify_checksums} (false = existence/size
 * refresh only).
 */
export const scanArtifacts = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/scan', 'POST', body);

/**
 * Queue a URL download into the cache. body = {url, role, kind, filename?,
 * expected_sha256?, resource_name?} — resource_name names a
 * custom_resource_url secret for HTTP-Basic-guarded mirrors.
 */
export const downloadArtifact = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/download', 'POST', body);

/**
 * Queue an HCL portal download. body = {key_name, filename, role, kind} —
 * key_name names an hcl_download_portal_api_keys secret; the filename must
 * match the HCL catalog name EXACTLY (its sha256 is authoritative).
 */
export const hclDownloadArtifact = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/hcl-download', 'POST', body);

/**
 * Upload a file into the cache. The multipart field ORDER is contractual:
 * role/kind (and optional filename) must precede the file part — the agent
 * ingests the stream single-pass.
 */
export const uploadArtifact = async (
  hostname,
  port,
  protocol,
  { role, kind, filename, file },
  onUploadProgress = null
) => {
  const form = new FormData();
  form.append('role', role);
  form.append('kind', kind);
  if (filename) {
    form.append('filename', filename);
  }
  form.append('file', file);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    'artifacts/upload',
    'POST',
    form,
    null,
    false,
    onUploadProgress
  );
};

/**
 * Register (copy or move) an agent-host file into the cache. body = {path,
 * role, kind, filename?, move?}.
 */
export const registerArtifact = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/register', 'POST', body);

/**
 * Delete a cache row (deleteFile also removes the cached file).
 */
export const deleteArtifact = async (hostname, port, protocol, id, deleteFile = false) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `artifacts/${id}`,
    'DELETE',
    null,
    deleteFile ? { delete_file: true } : null
  );

/**
 * Host NICs usable as VirtualBox bridges — feeds the wizard's bridge picker.
 * The entry shape is implementation-flavored; callers flatten defensively.
 */
export const getBridgedInterfaces = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/bridged-interfaces');

/**
 * Update check — {current_version, latest_version, update_available, …}.
 * Agents without the surface answer 4xx; callers treat that as "no button".
 */
export const checkAgentUpdate = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'app/updates/check');

/**
 * Queue the self-update (admin): download + SHA256SUMS-verify + launch the
 * installer, then the agent exits.
 */
export const applyAgentUpdate = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'app/updates/apply', 'POST');
