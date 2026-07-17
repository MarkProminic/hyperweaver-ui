/**
 * Friendly labels for task operation values (sync item 11). The provisioning
 * pipeline minted operations whose raw names read poorly in the task tables;
 * anything unlisted renders as-is — the existing vocabulary (start/stop/…)
 * is already readable. Shared by Tasks.jsx and TaskDetailModal.jsx so both
 * agents' task rows label identically.
 */
const OPERATION_LABELS = {
  provisioner_import: 'Provisioner Import',
  machine_prepare: 'Render + Materialize Working Directory',
  machine_create_orchestration: 'Machine Creation',
  machine_create_storage: 'Create Storage',
  machine_create_config: 'Configure VM',
  machine_create_finalize: 'Finalize Machine',
  template_download: 'Template Download',
  machine_provision_orchestration: 'Provisioning Pipeline',
  machine_wait_ssh: 'Wait for SSH',
  machine_sync_parent: 'Sync Folders',
  machine_sync: 'Sync Folder',
  machine_provision_parent: 'Run Playbooks',
  machine_provision: 'Run Playbook',
  machine_modify: 'Modify Machine',
  reset: 'Reset',
  pause: 'Pause',
  resume: 'Resume',
  snapshot_take: 'Take Snapshot',
  snapshot_restore: 'Restore Snapshot',
  snapshot_delete: 'Delete Snapshot',
  machine_clone_current: 'Clone Current State',
  template_delete: 'Template Delete',
  template_export: 'Template Export',
  template_upload: 'Template Publish',
  template_move: 'Template Move',
  zone_modify: 'Modify Zone',
  provisioning_network_setup: 'Provisioning Network Setup',
  provisioning_network_teardown: 'Provisioning Network Teardown',
  artifact_scan: 'File Cache Scan',
  artifact_download: 'File Download',
  hcl_download: 'HCL Portal Download',
  agent_update: 'Agent Update',
};

export const taskOperationLabel = operation => OPERATION_LABELS[operation] || operation;

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
