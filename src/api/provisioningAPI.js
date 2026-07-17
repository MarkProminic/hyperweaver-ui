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
 * metadata.configuration {groups, fields} (the field DSL) drive the
 * create forms.
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
 * The public provisioner catalog, relayed live by the agent (format_version 1
 * gate agent-side): {name, format_version, updated, provisioners: [{name,
 * repo, description, versions: [{version, artifacts[]}]}]}. Omit sourceName
 * for the agent's default catalog source.
 */
export const getCatalog = async (hostname, port, protocol, sourceName = null) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    'provisioning/catalog',
    'GET',
    null,
    sourceName ? { source: sourceName } : null
  );

/**
 * The agent's configured catalog sources (mirrors the template-sources
 * pattern) — {sources: [{name, url, …}]}.
 */
export const getCatalogSources = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/catalog/sources');

/**
 * Install a catalog version into the local registry (op
 * provisioner_catalog_install: fresh catalog fetch, sha256-verified download,
 * then the ordinary import path). body = {source_name?, name, version}.
 */
export const installFromCatalog = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/catalog/install', 'POST', body);

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
 * (provisioner {name, version}, settings, networks, roles, properties —
 * ONE flat DSL-answers map — sync_method?, safe_id_path?,
 * start_after_create?).
 */
export const createMachine = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'machines', 'POST', body);

/**
 * Store a machine's provisioner document verbatim (item 14 — PUT is no
 * longer spec-replace on either agent): body {provisioner: {…}} — a
 * Hosts.yml host entry (folders[], provisioning.ansible.playbooks, vars,
 * roles[], secrets…). Answers {success, machine_name, message}.
 */
export const updateProvisionerDocument = async (hostname, port, protocol, machineName, document) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}`, 'PUT', {
    provisioner: document,
  });

/**
 * Modify a machine's INFRASTRUCTURE (the base's PUT contract, verified in
 * ZoneModificationController: ram, vcpus, bootrom, hostbridge, diskif,
 * netif, os_type, vnc, acpi, xhci, autoboot, add/remove_nics, add/
 * remove_disks, add/remove_cdroms, cloud_init…). Queues a modify task —
 * the answer carries requires_restart (changes apply on next boot) and
 * optional resource_warnings. Callers gate on the `machine-modify` token.
 */
export const modifyInfrastructure = async (hostname, port, protocol, machineName, changes) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}`, 'PUT', changes);

/**
 * Clone a provisioner-managed machine. body = {name, settings: {hostname
 * required, domain?, server_id?}, overrides: {memory?, vcpus?},
 * start_after_create?}.
 */
export const cloneMachine = async (hostname, port, protocol, machineName, body) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/clone`, 'POST', body);

/**
 * Kick off the provisioning pipeline against the STORED document (item 14 —
 * zoneweaver's wire on both agents): → {success, parent_task_id, steps,
 * task_chain[]}.
 */
export const provisionMachine = async (hostname, port, protocol, machineName, options = null) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/provision`,
    'POST',
    options
  );

/**
 * Ad-hoc folder sync from the stored document → {parent_task_id,
 * folder_count}; 400 when no folders are configured. `syncback: true` reverses
 * it — pulls ONLY the folders flagged syncback (guest folder.to → host
 * folder.map); the plain call pushes host→guest for every folder.
 */
export const syncMachine = async (hostname, port, protocol, machineName, syncback = false) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/sync`,
    'POST',
    syncback ? { syncback: true } : null
  );

/**
 * Ad-hoc playbook run from the stored document — run directives honored:
 * 200 no-op {playbooks_skipped} when everything is skipped, else
 * {parent_task_id, playbook_count, playbooks_skipped}.
 */
export const runProvisioners = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `machines/${machineName}/run-provisioners`,
    'POST'
  );

/**
 * Provisioning pipeline status — {provisioning_configured,
 * provisioning_status: provisioned|not_started, last_provisioned_at,
 * recent_tasks[]}.
 */
export const getProvisionStatus = async (hostname, port, protocol, machineName) =>
  await makeAgentRequest(hostname, port, protocol, `machines/${machineName}/provision/status`);

/**
 * Next free server_id — prefills the wizard's field (REQUIRED, never
 * auto-assigned, under machines.prefix_machine_names).
 */
export const getNextServerId = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'machines/ids/next');

/**
 * Local template registry — {templates:[{organization, box_name, version,
 * architecture, provider, size, checksum, downloaded_at, …}], total}. Feeds
 * the wizard's box picker and the Templates view.
 */
export const getTemplates = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'templates');

/**
 * Pull a box into the local template registry (202 task). body =
 * {source_name?, organization, box_name, version, architecture?}.
 */
export const pullTemplate = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'templates/pull', 'POST', body);

/**
 * Delete a local template (202 task, template_delete) — removes the disk
 * image + registry row; machines already built from it are unaffected.
 */
export const deleteTemplate = async (hostname, port, protocol, templateId) =>
  await makeAgentRequest(hostname, port, protocol, `templates/${templateId}`, 'DELETE');

/**
 * Export a STOPPED machine into a local .box (202 task, template_export).
 * body = {machine_name, filename?} — result path + sha256 land in the task
 * output (stream it).
 */
export const exportTemplate = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'templates/export', 'POST', body);

/**
 * Publish a machine (or an already-exported box file) to a registry (202
 * task, template_upload). body = {machine_name | box_path, source_name,
 * organization, box_name, version, description?, architecture?} —
 * credentials come from the SOURCE config, never the request.
 */
export const publishTemplate = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'templates/publish', 'POST', body);

/**
 * Move a template to a new storage ROOT (202 task, template_move) — the
 * org/box/version layout is recreated beneath target_path.
 */
export const moveTemplate = async (hostname, port, protocol, templateId, targetPath) =>
  await makeAgentRequest(hostname, port, protocol, `templates/${templateId}/move`, 'POST', {
    target_path: targetPath,
  });

/**
 * Configured template sources — {sources:[{name, type, url, organization,
 * verify_ssl, default?}]} (source-verified: TemplateSourceController
 * listSources; `default` rides only where the agent's config carries it —
 * callers fall back to the first source).
 */
export const getTemplateSources = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'templates/sources');

/**
 * The remote catalog of a source — BoxVault's /api/discover, filtered
 * agent-side to what the host can consume (every listed version is
 * installable). Feeds the wizard's box dropdown and the pull pickers.
 */
export const getRemoteTemplates = async (hostname, port, protocol, sourceName) =>
  await makeAgentRequest(
    hostname,
    port,
    protocol,
    `templates/remote/${encodeURIComponent(sourceName)}`
  );

/**
 * Artifact storage locations — typed roots (iso|image|installer|fixpack|
 * hotfix). Built-ins (source "builtin") can only be disabled, never deleted.
 */
export const getArtifactStoragePaths = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/storage/paths');

export const createArtifactStoragePath = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/storage/paths', 'POST', body);

export const updateArtifactStoragePath = async (hostname, port, protocol, id, body) =>
  await makeAgentRequest(hostname, port, protocol, `artifacts/storage/paths/${id}`, 'PUT', body);

/**
 * Delete a config-source location (202 task). body = {recursive,
 * remove_db_records, force}.
 */
export const deleteArtifactStoragePath = async (hostname, port, protocol, id, body) =>
  await makeAgentRequest(hostname, port, protocol, `artifacts/storage/paths/${id}`, 'DELETE', body);

/**
 * The artifact registry (`artifacts` token; 503 when disabled). filters =
 * {type?, storage_path_id?, role?, search?, limit?, offset?, sort_by?,
 * sort_order?} → {artifacts[], pagination{total, limit, offset, has_more}}.
 */
export const getArtifacts = async (hostname, port, protocol, filters = null) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts', 'GET', null, filters);

/** Cached ISOs — feeds the cdrom pickers ({iso: filename} on the wire). */
export const getIsoArtifacts = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/iso');

export const getImageArtifacts = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/image');

export const getArtifactStats = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/stats');

/** Move an artifact to another location of the SAME type (202 task). */
export const moveArtifact = async (hostname, port, protocol, id, destinationId) =>
  await makeAgentRequest(hostname, port, protocol, `artifacts/${id}/move`, 'POST', {
    destination_storage_location_id: destinationId,
  });

export const copyArtifact = async (hostname, port, protocol, id, destinationId) =>
  await makeAgentRequest(hostname, port, protocol, `artifacts/${id}/copy`, 'POST', {
    destination_storage_location_id: destinationId,
  });

/**
 * Queue a scan (202 task). body = {type?, storage_path_id?,
 * verify_checksums?, remove_orphaned?}.
 */
export const scanArtifacts = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/scan', 'POST', body);

/**
 * Queue a URL download (202 task). body = {url, storage_path_id, filename?,
 * checksum? (sha256 only), overwrite_existing?, role?}.
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
 * Two-step upload, step 1: body = {filename, size, storage_path_id,
 * checksum?, role?, overwrite_existing?} → {task_id, upload_url, expires_at}.
 */
export const prepareArtifactUpload = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/upload/prepare', 'POST', body);

/** Step 2: the bytes, multipart part `file` → 202 (executor hashes + registers). */
export const uploadArtifactFile = async (
  hostname,
  port,
  protocol,
  taskId,
  file,
  onUploadProgress = null
) => {
  const form = new FormData();
  form.append('file', file);
  return await makeAgentRequest(
    hostname,
    port,
    protocol,
    `artifacts/upload/${taskId}`,
    'POST',
    form,
    null,
    false,
    onUploadProgress
  );
};

/**
 * Register (copy or move) an agent-host file (201). body = {path,
 * storage_path_id? | type, role?, filename?, move?}.
 */
export const registerArtifact = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/register', 'POST', body);

/**
 * Batch delete (202 task). body = {artifact_ids[] (numbers), delete_files?,
 * force?}.
 */
export const deleteArtifacts = async (hostname, port, protocol, body) =>
  await makeAgentRequest(hostname, port, protocol, 'artifacts/files', 'DELETE', body);

/**
 * Host NICs usable as VirtualBox bridges — feeds the wizard's bridge picker.
 * The entry shape is implementation-flavored; callers flatten defensively.
 */
export const getBridgedInterfaces = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/bridged-interfaces');

/**
 * The dedicated provisioning-network machinery (dormant-but-available per
 * Mark's ruling — rides the `provisioning` token, no gate of its own).
 * Status answers the base's component-map shape {enabled, ready, components,
 * config}; disabled = bare {enabled: false, message}.
 */
export const getProvisioningNetworkStatus = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/network/status');

/** Set up the provisioning network → 202 task (provisioning_network_setup). */
export const setupProvisioningNetwork = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/network/setup', 'POST');

/** Tear it down → 202 task (provisioning_network_teardown). */
export const teardownProvisioningNetwork = async (hostname, port, protocol) =>
  await makeAgentRequest(hostname, port, protocol, 'provisioning/network/teardown', 'DELETE');

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
