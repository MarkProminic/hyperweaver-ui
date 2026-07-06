/**
 * Friendly labels for task operation values (sync item 11). The provisioning
 * pipeline minted operations whose raw names read poorly in the task tables;
 * anything unlisted renders as-is — the existing vocabulary (start/stop/…)
 * is already readable. Shared by Tasks.jsx and TaskDetailModal.jsx so both
 * agents' task rows label identically.
 */
const OPERATION_LABELS = {
  provisioner_import: 'Provisioner Import',
  machine_prepare: 'Prepare Working Directory',
  machine_plugin_check: 'Vagrant Plugin Check',
  machine_vagrant_up: 'Vagrant Up',
};

export const taskOperationLabel = operation => OPERATION_LABELS[operation] || operation;
