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
