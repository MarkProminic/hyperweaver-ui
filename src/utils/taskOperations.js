import i18n from '../i18n';

/**
 * Friendly labels for task operation values (sync item 11). The provisioning
 * pipeline minted operations whose raw names read poorly in the task tables;
 * anything unlisted renders as-is — the existing vocabulary (start/stop/…)
 * is already readable. Shared by Tasks.jsx and TaskDetailModal.jsx so both
 * agents' task rows label identically.
 */
const OPERATION_LABEL_KEYS = {
  provisioner_import: 'tasks.operation.provisionerImport',
  machine_prepare: 'tasks.operation.machinePrepare',
  machine_create_orchestration: 'tasks.operation.machineCreateOrchestration',
  machine_create_storage: 'tasks.operation.machineCreateStorage',
  machine_create_config: 'tasks.operation.machineCreateConfig',
  machine_create_finalize: 'tasks.operation.machineCreateFinalize',
  template_download: 'tasks.operation.templateDownload',
  machine_provision_orchestration: 'tasks.operation.machineProvisionOrchestration',
  machine_wait_ssh: 'tasks.operation.machineWaitSsh',
  machine_sync_parent: 'tasks.operation.machineSyncParent',
  machine_sync: 'tasks.operation.machineSync',
  machine_provision_parent: 'tasks.operation.machineProvisionParent',
  machine_provision: 'tasks.operation.machineProvision',
  machine_modify: 'tasks.operation.machineModify',
  reset: 'tasks.operation.reset',
  pause: 'tasks.operation.pause',
  resume: 'tasks.operation.resume',
  snapshot_take: 'tasks.operation.snapshotTake',
  snapshot_restore: 'tasks.operation.snapshotRestore',
  snapshot_delete: 'tasks.operation.snapshotDelete',
  machine_clone_current: 'tasks.operation.machineCloneCurrent',
  template_delete: 'tasks.operation.templateDelete',
  template_export: 'tasks.operation.templateExport',
  template_upload: 'tasks.operation.templateUpload',
  template_move: 'tasks.operation.templateMove',
  zone_modify: 'tasks.operation.zoneModify',
  provisioning_network_setup: 'tasks.operation.provisioningNetworkSetup',
  provisioning_network_teardown: 'tasks.operation.provisioningNetworkTeardown',
  artifact_scan: 'tasks.operation.artifactScan',
  artifact_download: 'tasks.operation.artifactDownload',
  hcl_download: 'tasks.operation.hclDownload',
  agent_update: 'tasks.operation.agentUpdate',
};

export const taskOperationLabel = operation => {
  const key = OPERATION_LABEL_KEYS[operation];
  return key ? i18n.t(key) : operation;
};

export const TERMINAL_TASK_STATUSES = ['completed', 'completed_with_errors', 'failed', 'cancelled'];

const waitMs = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const pollUntil = async (check, attempts, intervalMs = 2000) => {
  const outcome = await check();
  if (outcome !== undefined) {
    return outcome;
  }
  if (attempts <= 1) {
    return null;
  }
  await waitMs(intervalMs);
  return pollUntil(check, attempts - 1, intervalMs);
};

export const pollTaskRow = (fetchRow, attempts, intervalMs = 2000) =>
  pollUntil(
    async () => {
      const row = await fetchRow();
      return row && TERMINAL_TASK_STATUSES.includes(row.status) ? row : undefined;
    },
    attempts,
    intervalMs
  );

/** Human-readable byte size — task transfer progress rendering. */
export const formatByteSize = bytes => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

/** progress_info — an OBJECT on the wire (canonical, converged A3 answer). */
export const taskProgressInfo = task => {
  const info = task?.progress_info;
  return info && typeof info === 'object' ? info : null;
};

// Registry-transfer byte progress (the converged task wire): progress_info
// {status: downloading|uploading, received_bytes, total_bytes|null}. Speed
// is CLIENT-derived from received_bytes deltas — deliberately not on the
// wire. Samples live per task and drop once it leaves the running state.
const transferSamples = new Map();

export const transferProgressLine = task => {
  const info = taskProgressInfo(task);
  if (!info || !Number.isFinite(info.received_bytes)) {
    transferSamples.delete(task?.id);
    return '';
  }
  const received = formatByteSize(info.received_bytes);
  const total = Number.isFinite(info.total_bytes) ? ` / ${formatByteSize(info.total_bytes)}` : '';
  let speed = '';
  if (task.status === 'running') {
    const now = Date.now();
    const prev = transferSamples.get(task.id);
    transferSamples.set(task.id, { bytes: info.received_bytes, at: now });
    if (prev && now > prev.at && info.received_bytes > prev.bytes) {
      speed = ` · ${formatByteSize(((info.received_bytes - prev.bytes) * 1000) / (now - prev.at))}/s`;
    }
  } else {
    transferSamples.delete(task.id);
  }
  return `${received}${total}${speed}`;
};
