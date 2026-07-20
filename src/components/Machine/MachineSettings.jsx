import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getMachineDefaults, getMachineOsTypes } from '../../api/machineAPI';
import {
  getBridgedInterfaces,
  getIsoArtifacts,
  modifyInfrastructure,
} from '../../api/provisioningAPI';
import { getZfsPools } from '../../api/zfsAPI';
import { useServers } from '../../contexts/ServerContext';
import { hasHypervisor } from '../../utils/capabilities';
import { pollUntil, pollTaskRow } from '../../utils/taskOperations';
import { PathInput, validationDetails } from '../common';

import { currentHardwareOf } from './CurrentHardware';
import FilesystemsEditor from './FilesystemsEditor';
import GeneralSettingsTab from './GeneralSettingsTab';
import {
  HARDWARE_SECTIONS,
  HardwareSectionForm,
  SerialPortsEditor,
  ParallelPortsEditor,
  diffHardwarePayload,
  buildPortsPayload,
  CpuTopologyInputs,
} from './HardwareEditor';
import {
  withAddressing,
  cdromEntry,
  filesystemEntries,
  flattenBridgedInterfaces,
  isoFilenames,
  zfsPoolOptions,
} from './machineHelpers';
import MachineSettingsStatus from './MachineSettingsStatus';
import NetworkAdaptersEditor from './NetworkAdaptersEditor';
import ResourceControlsEditor from './ResourceControlsEditor';
import StorageDevicesEditor from './StorageDevicesEditor';
import UsbPanel from './UsbPanel';
import ZvolManageModal from './ZvolManageModal';

/**
 * Machine Settings tab — the PUT modify contract, changed fields only.
 * Edits are cached until Apply; a running machine gets the choice of
 * stop/apply/start or apply-on-next-power-cycle. Tabs cover the full
 * vbox.<section>.<key> vocabulary plus per-NIC tuning and serial/
 * parallel ports. Fields prefill from the agent's `knob_current` (current
 * values in the PUT vocabulary; absence = unset or unknowable, those stay
 * blank) and only values that DIFFER from the seed ride the wire.
 */

// Dropdowns come ONLY from the agent's served knob_values (flat dotted
// keys) — the UI invents no vocabularies. freeText marks knobs whose agent
// contract allows values beyond any list (bootrom absolute paths,
// hostbridge vendor=N,device=N, vnc option strings, the bootorder device
// grammar), so those render a datalist input instead of a strict select.
const FIELDS = [
  { key: 'ram', label: 'Memory', placeholder: 'e.g. 4G' },
  { key: 'vcpus', label: 'vCPUs', placeholder: 'e.g. 4' },
  { key: 'bootrom', label: 'Boot ROM', freeText: true },
  { key: 'hostbridge', label: 'Host Bridge', freeText: true },
  { key: 'diskif', label: 'Disk Interface', hint: 'VirtualBox refuses this after create' },
  { key: 'netif', label: 'Network Interface' },
  { key: 'os_type', label: 'Guest OS Type' },
  {
    key: 'vnc',
    label: 'VNC Console',
    freeText: true,
    hint: 'on / off / wait, or an option string via Custom value… (e.g. on,w=1920,h=1080)',
  },
  { key: 'acpi', label: 'ACPI' },
  { key: 'xhci', label: 'xHCI USB' },
  {
    key: 'uefivars',
    label: 'UEFI Vars',
    // Agent-stated value set (zadm bool strings) — a select, not a text box.
    options: ['on', 'off'],
    hint: 'Persistent UEFI variable store (boot entries survive restarts)',
    bhyveOnly: true,
  },
  {
    key: 'rng',
    label: 'RNG (virtio-rnd)',
    options: ['on', 'off'],
    hint: 'Feeds the guest entropy from the host',
    bhyveOnly: true,
  },
  {
    key: 'bootorder',
    label: 'Boot Order (bhyve attr)',
    placeholder: 'cd, dc, or bootdisk,cdrom0,net0=pxe',
    hint: 'Compact cd/dc, or comma-separated devices: bootdisk, disk0, cdrom0, net0=pxe|http, path0, boot0, shell',
    freeText: true,
    bhyveOnly: true,
  },
  {
    key: 'bootnext',
    label: 'Boot Next (one boot only)',
    placeholder: 'e.g. cdrom0',
    hint: 'Same syntax as Boot Order — applies to the next boot only',
    freeText: true,
    bhyveOnly: true,
  },
];

const asFormString = value => {
  if (value === undefined || value === null) {
    return '';
  }
  // knob_current.bootorder arrives as a parsed token LIST — the PUT wire
  // stays the comma-joined string, so the form value is the join.
  if (Array.isArray(value)) {
    return value.join(',');
  }
  // zadm renders some knobs as objects (vnc {enabled, ...}) — the knob's
  // on/off lives in `enabled`; other objects have no form rendering.
  if (typeof value === 'object') {
    return value.enabled === undefined ? '' : String(value.enabled);
  }
  return String(value);
};

// Where a knob's config-document key differs from its PUT key, the seed
// needs the alias (zadm stores os_type as the `type` attr).
const CONFIG_KEY_ALIASES = { os_type: 'type' };

// knob_current beats the raw configuration document (zadm configs carry the
// zone keys directly; VirtualBox current values only exist in knob_current).
const prefillFrom = (configuration, knobCurrent) =>
  Object.fromEntries(
    FIELDS.map(field => {
      const value =
        knobCurrent?.[field.key] ??
        configuration?.[field.key] ??
        configuration?.[CONFIG_KEY_ALIASES[field.key]];
      return [field.key, asFormString(value)];
    })
  );

const seedHardwareValues = knobCurrent => {
  const seeded = {};
  HARDWARE_SECTIONS.forEach(section => {
    const current = knobCurrent?.vbox?.[section.id];
    if (!current) {
      return;
    }
    const values = {};
    section.fields.forEach(field => {
      if (current[field.key] !== undefined && current[field.key] !== null) {
        values[field.key] = String(current[field.key]);
      }
    });
    if (Object.keys(values).length > 0) {
      seeded[section.id] = values;
    }
  });
  return seeded;
};

const seedSerialRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-serial-${entry.port}`,
    port: asFormString(entry.port),
    io_base: asFormString(entry.io_base),
    irq: asFormString(entry.irq),
    mode: asFormString(entry.mode),
    type: asFormString(entry.type),
  }));

const seedParallelRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-parallel-${entry.port}`,
    port: asFormString(entry.port),
    io_base: asFormString(entry.io_base),
    irq: asFormString(entry.irq),
    device: asFormString(entry.device),
  }));

// The PUT vocabulary carries cable_connected as a boolean; the editor's
// select speaks on/off.
const cableFormValue = value => {
  if (value === true) {
    return 'on';
  }
  if (value === false) {
    return 'off';
  }
  return asFormString(value);
};

const seedNicRows = entries =>
  (Array.isArray(entries) ? entries : []).map(entry => ({
    key: `seed-nic-${entry.adapter}`,
    adapter: asFormString(entry.adapter),
    cable_connected: cableFormValue(entry.cable_connected),
    promisc: asFormString(entry.promisc),
    speed: asFormString(entry.speed),
    boot_prio: asFormString(entry.boot_prio),
    bandwidth_group: asFormString(entry.bandwidth_group),
    nic_type: asFormString(entry.nic_type),
    // The converged flag rides knob_current beside the provisional marker;
    // absent = the agent's ruled default stays in force.
    remove_on_completion:
      entry.remove_on_completion === undefined ? '' : String(entry.remove_on_completion),
  }));

// Credentials live in configuration.settings (the PUT family's documented
// storage) — the fallback covers agents whose knob_current predates the
// password countermand.
const seedCreds = (configuration, knobCurrent) => ({
  vagrant_user: asFormString(
    knobCurrent?.credentials?.vagrant_user ?? configuration?.settings?.vagrant_user
  ),
  vagrant_user_pass: asFormString(
    knobCurrent?.credentials?.vagrant_user_pass ?? configuration?.settings?.vagrant_user_pass
  ),
  vagrant_user_private_key_path: asFormString(
    knobCurrent?.credentials?.vagrant_user_private_key_path ??
      configuration?.settings?.vagrant_user_private_key_path
  ),
});

/** Everything the form seeds from — kept verbatim as the diff base. */
const buildSeed = (configuration, knobCurrent) => ({
  values: prefillFrom(configuration, knobCurrent),
  // zadm configs carry autoboot directly; knob_current wins where served.
  autoboot: asFormString(knobCurrent?.autoboot ?? configuration?.autoboot),
  // null = the agent doesn't report the knob; the checkbox never renders.
  guestAgent: typeof knobCurrent?.guest_agent === 'boolean' ? knobCurrent.guest_agent : null,
  bootPriority: asFormString(knobCurrent?.boot_priority),
  // The noVNC web-port pin + bind address — custom zonecfg attrs, applied
  // synchronously (no task, no restart); absent key = unset (dynamic pool).
  consolePort: asFormString(knobCurrent?.consoleport),
  consoleHost: asFormString(knobCurrent?.consolehost),
  bootOrder: Array.isArray(knobCurrent?.boot_order) ? knobCurrent.boot_order : [],
  cpuTopology: knobCurrent?.cpu_topology ?? null,
  hardware: seedHardwareValues(knobCurrent),
  serialRows: seedSerialRows(knobCurrent?.vbox?.serial),
  parallelRows: seedParallelRows(knobCurrent?.vbox?.parallel),
  nicRows: seedNicRows(knobCurrent?.nics),
  creds: seedCreds(configuration, knobCurrent),
});

const rowsChanged = (rows, seededRows) => JSON.stringify(rows) !== JSON.stringify(seededRows);

const NIC_TUNING_KEYS = [
  'cable_connected',
  'promisc',
  'speed',
  'boot_prio',
  'bandwidth_group',
  'nic_type',
  'remove_on_completion',
];

/** A NIC's net-resource props → the wire's flat {name: value} object; blank
 *  values drop. null when nothing set (so the key never rides empty). */
const cleanNicProps = props => {
  const cleaned = Object.fromEntries(
    Object.entries(props || {})
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

/** One tuning key's form value on the wire — on/off → boolean, numbers numeric. */
const nicTuningValue = (key, value) => {
  if (key === 'cable_connected') {
    return value === 'on';
  }
  if (key === 'remove_on_completion') {
    return value === 'true';
  }
  if (key === 'speed' || key === 'boot_prio') {
    return Number(value);
  }
  return String(value).trim();
};

/** add/remove device families of the PUT body, from the Devices tab state. */
const buildDeviceChanges = state => {
  const changes = {};
  const nics = state.addNics
    .map(row => {
      const entry = {};
      if (row.bridge.trim()) {
        entry.global_nic = row.bridge.trim();
      }
      if (row.mac.trim()) {
        // The wire key is mac_addr (the base's add_nics vocabulary).
        entry.mac_addr = row.mac.trim();
      }
      // Zone NIC keys (agent-confirmed) — physical auto-names when omitted;
      // a bare physical link name attaches a dedicated HW nic.
      if (row.physical?.trim()) {
        entry.physical = row.physical.trim();
      }
      if (row.vlan_id !== undefined && row.vlan_id !== '') {
        entry.vlan_id = Number(row.vlan_id);
      }
      if (row.allowed_address?.trim()) {
        entry.allowed_address = row.allowed_address.trim();
      }
      if (row.address?.trim()) {
        entry.address = row.address.trim();
      }
      if (row.defrouter?.trim()) {
        entry.defrouter = row.defrouter.trim();
      }
      const addProps = cleanNicProps(row.props);
      if (addProps) {
        entry.props = addProps;
      }
      // Tuning keys ride INLINE on add_nics — the agent applies them on the
      // free slot it assigns.
      NIC_TUNING_KEYS.forEach(key => {
        const value = row[key] ?? '';
        if (value !== '') {
          entry[key] = nicTuningValue(key, value);
        }
      });
      return entry;
    })
    .filter(entry => Object.keys(entry).length > 0);
  if (nics.length > 0) {
    changes.add_nics = nics;
  }
  const disks = state.addDisks
    .map(row => {
      const base =
        row.mode === 'existing'
          ? row.path.trim() && { type: 'image', path: row.path.trim() }
          : row.size.trim() && { type: 'blank', size: row.size.trim() };
      return base && withAddressing(base, row);
    })
    .filter(Boolean);
  if (disks.length > 0) {
    changes.add_disks = disks;
  }
  const cdroms = state.addCdroms
    .map(row => {
      const base = cdromEntry(row);
      return base && withAddressing(base, row);
    })
    .filter(Boolean);
  if (cdroms.length > 0) {
    changes.add_cdroms = cdroms;
  }
  const controllers = state.addControllers
    .filter(row => row.type)
    .map(row => ({
      ...(row.name.trim() && { name: row.name.trim() }),
      type: row.type,
    }));
  if (controllers.length > 0) {
    changes.add_controllers = controllers;
  }
  if (state.removeControllerNames.length > 0) {
    changes.remove_controllers = state.removeControllerNames;
  }
  // Removals come from row-marking on the Current Hardware panel only —
  // device addresses, never typed port lists.
  const removals = kind =>
    state.removeAttachments
      .filter(entry => entry.kind === kind)
      .map(entry => ({
        controller: entry.controller,
        port: entry.port,
        device: entry.device,
      }));
  const removeDiskEntries = removals('disk');
  if (removeDiskEntries.length > 0) {
    changes.remove_disks = removeDiskEntries;
  }
  const removeCdromEntries = removals('cdrom');
  if (removeCdromEntries.length > 0) {
    changes.remove_cdroms = removeCdromEntries;
  }
  if (state.removeNicAdapters.length > 0) {
    changes.remove_nics = state.removeNicAdapters;
  }
  return changes;
};

/**
 * Per-adapter CHANGED-only `nics` entries: a key rides when it is non-blank
 * and differs from the seeded current value; adapters marked for removal
 * never tune; entries that end up adapter-only are dropped (the agent
 * rejects tuning entries with no tunable keys).
 */
const changedNicEntries = (rows, seededRows, removedAdapters) =>
  rows
    .filter(row => row.adapter !== '' && !removedAdapters.includes(Number(row.adapter)))
    .map(row => {
      const seeded = seededRows.find(entry => entry.adapter === row.adapter) || {};
      const entry = { adapter: Number(row.adapter) };
      NIC_TUNING_KEYS.forEach(key => {
        const value = row[key] ?? '';
        if (value === '' || value === (seeded[key] ?? '')) {
          return;
        }
        entry[key] = nicTuningValue(key, value);
      });
      return entry;
    })
    .filter(entry => Object.keys(entry).length > 1);

/**
 * vbox.* + nics families of the PUT body — CHANGED vs the seed only.
 * Port row families (serial/parallel) ride whole when any row differs;
 * re-applying identical port-addressed values is idempotent on the wire.
 * NIC tuning diffs per adapter.
 */
const buildHardwareChanges = state => {
  const changes = {};
  const hardware = diffHardwarePayload(state.hardware, state.seed.hardware) || {};
  if (rowsChanged(state.serialRows, state.seed.serialRows)) {
    const serial = buildPortsPayload(state.serialRows);
    if (serial.length > 0) {
      hardware.serial = serial;
    }
  }
  if (rowsChanged(state.parallelRows, state.seed.parallelRows)) {
    const parallel = buildPortsPayload(state.parallelRows);
    if (parallel.length > 0) {
      hardware.parallel = parallel;
    }
  }
  if (Object.keys(hardware).length > 0) {
    changes.vbox = hardware;
  }
  const nics = changedNicEntries(state.nicRows, state.seed.nicRows, state.removeNicAdapters);
  if (nics.length > 0) {
    changes.nics = nics;
  }
  return changes;
};

/** One in-place zone NIC update entry — physical selects, provided keys set,
 *  omitted keys keep their value. null when nothing but the selector rides. */
const zoneNicUpdateEntry = (physical, patch) => {
  const entry = { physical };
  if (patch.global_nic?.trim()) {
    entry.global_nic = patch.global_nic.trim();
  }
  if (patch.vlan_id !== undefined && patch.vlan_id !== '') {
    entry.vlan_id = Number(patch.vlan_id);
  }
  if (patch.mac_addr?.trim()) {
    entry.mac_addr = patch.mac_addr.trim();
  }
  if (patch.allowed_address?.trim()) {
    entry.allowed_address = patch.allowed_address.trim();
  }
  if (patch.address?.trim()) {
    entry.address = patch.address.trim();
  }
  if (patch.defrouter?.trim()) {
    entry.defrouter = patch.defrouter.trim();
  }
  const props = cleanNicProps(patch.props);
  if (props) {
    entry.props = props;
  }
  // The converged remove-on-completion flag — boolean on the wire; the
  // agent maps the NIC to its document entry (pairing rule) and updates it.
  if (patch.remove_on_completion === 'true' || patch.remove_on_completion === 'false') {
    entry.remove_on_completion = patch.remove_on_completion === 'true';
  }
  return Object.keys(entry).length > 1 ? entry : null;
};

const zoneDiskAddEntry = row => {
  if (row.mode === 'existing') {
    return row.existing_dataset.trim() && { type: 'image', path: row.existing_dataset.trim() };
  }
  return {
    type: 'blank',
    sparse: row.sparse === true,
    ...(row.size.trim() && { size: row.size.trim() }),
    ...(row.volume_name.trim() && { volume_name: row.volume_name.trim() }),
    ...(row.pool.trim() && { pool: row.pool.trim() }),
    ...(row.dataset.trim() && { dataset: row.dataset.trim() }),
  };
};

/**
 * The zone device/config families of the PUT body — zvol-shaped disk adds,
 * grow-only resizes, attr-name/vnic removals, in-place NIC updates (incl.
 * net props), and the cloud_init object. All accrue on a running zone.
 */
const buildZoneChanges = state => {
  const changes = {};
  const diskAdds = state.addZoneDisks.map(zoneDiskAddEntry).filter(Boolean);
  if (diskAdds.length > 0) {
    changes.add_disks = diskAdds;
  }
  if (state.removeZoneDisks.length > 0) {
    changes.remove_disks = state.removeZoneDisks;
  }
  if (state.removeZoneCdroms.length > 0) {
    changes.remove_cdroms = state.removeZoneCdroms;
  }
  if (state.removeZoneNics.length > 0) {
    changes.remove_nics = state.removeZoneNics;
  }
  const nicUpdates = Object.entries(state.zoneNicEdits)
    .filter(([physical]) => !state.removeZoneNics.includes(physical))
    .map(([physical, patch]) => zoneNicUpdateEntry(physical, patch))
    .filter(Boolean);
  if (nicUpdates.length > 0) {
    changes.update_nics = nicUpdates;
  }
  const cloudInitEntry = Object.fromEntries(
    Object.entries(state.cloudInit)
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  if (Object.keys(cloudInitEntry).length > 0) {
    changes.cloud_init = cloudInitEntry;
  }
  return changes;
};

const SECTION_TABS = HARDWARE_SECTIONS.filter(section => section.id !== 'autostart');

// The vbox.<section>.<key> knob surface, serial/parallel ports, and the
// raw passthrough are the VirtualBox modifyvm vocabulary — dead on
// bhyve (nothing seeds them, nothing consumes them), so those tabs hide there.
const TABS = [
  { id: 'general', label: 'General' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'storage', label: 'Storage' },
  ...SECTION_TABS.map(section => ({ id: section.id, label: section.label, vboxOnly: true })),
  { id: 'ports', label: 'Ports', vboxOnly: true },
  { id: 'nics', label: 'NICs' },
  { id: 'usb', label: 'USB', vboxOnly: true },
  { id: 'filesystems', label: 'Filesystems', bhyveOnly: true },
  { id: 'resources', label: 'Resources', bhyveOnly: true },
  { id: 'advanced', label: 'Advanced', vboxOnly: true },
];

// The live zadm view carries current mounts as `fs[]` (with `dir` defaulted
// to `special` at add time when it was omitted) — authoritative for display
// and for the remove_filesystems `dir` identifier; fall back to the
// document-store `filesystems[]` on agents that don't surface the zadm view.
const filesystemsOf = configuration => {
  if (Array.isArray(configuration?.fs)) {
    return configuration.fs;
  }
  return Array.isArray(configuration?.filesystems) ? configuration.filesystems : [];
};

// The SSH credentials family on PUT — DB-immediate merge into
// configuration.settings; a SENT empty string DELETES that key.
const CRED_FIELDS = [
  { key: 'vagrant_user', label: 'SSH user' },
  { key: 'vagrant_user_pass', label: 'SSH password', isSecret: true },
  { key: 'vagrant_user_private_key_path', label: 'Private key path (agent host)', isPath: true },
];

// Keys the agent applies DB-immediately — alone they need no task, no
// restart, and are valid while running.
const IMMEDIATE_KEYS = [
  'boot_priority',
  'consoleport',
  'consolehost',
  'vagrant_user',
  'vagrant_user_pass',
  'vagrant_user_private_key_path',
];

const knobValuesOf = defaults => defaults?.knob_values || null;
const sectionForTab = tab => SECTION_TABS.find(section => section.id === tab) || null;

const seededUtmArgs = (knobCurrent, configuration) =>
  (Array.isArray(knobCurrent?.utm?.qemu_args)
    ? knobCurrent.utm.qemu_args
    : configuration?.utm?.qemu_args || []
  ).join('\n');

/** The changed-only `utm` section (notes, qemu_args[]) — null when untouched. */
const buildUtmSection = ({ knobCurrent, configuration, utmNotes, utmQemuArgs }) => {
  const seededNotes = asFormString(knobCurrent?.utm?.notes ?? configuration?.utm?.notes);
  const utmSection = {};
  if (utmNotes !== seededNotes) {
    utmSection.notes = utmNotes;
  }
  if (utmQemuArgs !== seededUtmArgs(knobCurrent, configuration)) {
    utmSection.qemu_args = utmQemuArgs
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
  return Object.keys(utmSection).length > 0 ? utmSection : null;
};

// DB-immediate keys alone need no task and no restart — skip the
// stop/apply/start choice even while running. A nics/update_nics set that
// ONLY flips remove-on-completion is DB-immediate too (both agents' stated
// semantics).
const flagOnlyEntries = list =>
  Array.isArray(list) &&
  list.every(entry =>
    Object.keys(entry).every(key => ['physical', 'adapter', 'remove_on_completion'].includes(key))
  );

const immediateOnlyChanges = changes =>
  Object.keys(changes).every(
    key =>
      IMMEDIATE_KEYS.includes(key) ||
      ((key === 'update_nics' || key === 'nics') && flagOnlyEntries(changes[key]))
  );

// Apply-outcome message pieces. Agent messages end with their own period —
// never double it.
const warningsSuffix = (data, t) => {
  const list = Array.isArray(data.resource_warnings) ? data.resource_warnings : [];
  if (list.length === 0) {
    return '';
  }
  return t('machineEdit.machineSettings.warningsSuffix', {
    list: list.map(warning => warning?.message || String(warning)).join('; '),
  });
};

const messageBase = (data, machineName, t) =>
  (data.message || t('machineEdit.machineSettings.changesAppliedTo', { machineName })).replace(
    /\.+$/u,
    ''
  );

// Running machine: the agent ACCRUES infrastructure changes instead of
// applying (pending_changes) — they ride the next power cycle.
const pendingNotice = (data, base, t) => {
  const count = Object.keys(data.pending_changes || {}).length;
  return {
    text: t('machineEdit.machineSettings.pendingNoticeText', { base, count }),
    warning: true,
  };
};

/** The agent's accrued power-cycle set: badge, values, cancel, apply-now. */
const PendingChangesPanel = ({ pendingChanges, isRunning, loading, onApplyNow, onCancel }) => {
  const { t } = useTranslation();
  const keys = Object.keys(pendingChanges || {});
  if (keys.length === 0) {
    return null;
  }
  return (
    <div className="alert alert-warning py-2">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>
          <i className="fas fa-hourglass-half me-2" />
          <strong>{keys.length}</strong>{' '}
          {t('machineEdit.machineSettings.pendingChangeGroups', {
            count: keys.length,
            list: keys.join(', '),
          })}
        </span>
        <div className="d-flex gap-2">
          {!isRunning && (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={onApplyNow}
              disabled={loading}
              title={t('machineEdit.machineSettings.applyPendingNowTitle')}
            >
              {t('machineEdit.machineSettings.applyNow')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onCancel}
            disabled={loading}
            title={t('machineEdit.machineSettings.discardPendingTitle')}
          >
            {t('machineEdit.machineSettings.cancelPending')}
          </button>
        </div>
      </div>
      <details className="mt-1">
        <summary className="small">{t('machineEdit.machineSettings.showPendingValues')}</summary>
        <pre className="small mb-0">{JSON.stringify(pendingChanges, null, 2)}</pre>
      </details>
    </div>
  );
};

PendingChangesPanel.propTypes = {
  pendingChanges: PropTypes.object,
  isRunning: PropTypes.bool,
  loading: PropTypes.bool,
  onApplyNow: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// The zone's REAL devices as bhyve boot tokens (short names: bootdisk,
// disk0, cdrom0, net0) — feeds the boot-order editor's slots/picker so
// it behaves like the VirtualBox one instead of a bare typed input.
const zoneBootDevicesOf = currentHardware =>
  currentHardware.zone
    ? [
        ...currentHardware.zone.disks.map(disk => disk.name),
        ...currentHardware.zone.cdroms.map(cdrom => cdrom.name),
        ...currentHardware.zone.nics.map(nic => nic.name),
      ]
    : [];

/** Settings → Resources tab body — kept mounted (d-none) so staged edits
 *  survive tab switches; exists only for bhyve zones, never utm machines. */
const ResourcesSection = ({
  show,
  active,
  machineName,
  nonce,
  knobCurrent,
  onChanges,
  disabled,
}) => {
  if (!show) {
    return null;
  }
  return (
    <div className={active ? '' : 'd-none'}>
      <ResourceControlsEditor
        key={`${machineName}-${nonce}`}
        knobCurrent={knobCurrent}
        onChanges={onChanges}
        disabled={disabled}
      />
    </div>
  );
};

ResourcesSection.propTypes = {
  show: PropTypes.bool,
  active: PropTypes.bool,
  machineName: PropTypes.string,
  nonce: PropTypes.number,
  knobCurrent: PropTypes.object,
  onChanges: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// The tab strip: utm machines take a fixed reduced set + the UTM tab; every
// other machine takes the vbox/bhyve-gated full set.
const visibleTabs = (isUtm, currentServer) => {
  if (isUtm) {
    return [
      ...TABS.filter(entry => ['general', 'credentials', 'nics'].includes(entry.id)),
      { id: 'utm', label: 'UTM' },
    ];
  }
  return TABS.filter(entry => {
    if (entry.vboxOnly) {
      return hasHypervisor(currentServer, 'virtualbox');
    }
    if (entry.bhyveOnly) {
      return hasHypervisor(currentServer, 'bhyve');
    }
    return true;
  });
};

// The General tab's field list: utm takes ram/vcpus only; bhyve-only knobs
// gate on the hypervisor. Labels/hints resolve at the call site.
const editableFields = (isUtm, currentServer, t) =>
  FIELDS.filter(field => {
    if (isUtm) {
      return field.key === 'ram' || field.key === 'vcpus';
    }
    return !field.bhyveOnly || hasHypervisor(currentServer, 'bhyve');
  }).map(field => ({
    ...field,
    label: t(`machineEdit.machineSettings.field.${field.key}`),
    ...(field.hint && { hint: t(`machineEdit.machineSettings.fieldHint.${field.key}`) }),
  }));

/** bhyve CPU-topology block under the General tab — self-gates on tab+bhyve. */
const CpuTopologySection = ({
  tab,
  currentServer,
  seed,
  cpuMode,
  setCpuMode,
  cpuTopo,
  setCpuTopo,
  formDisabled,
}) => {
  const { t } = useTranslation();
  if (tab !== 'general' || !hasHypervisor(currentServer, 'bhyve')) {
    return null;
  }
  const currentTopo = seed.cpuTopology;
  const currentTopoLabel = () => {
    if (currentTopo) {
      return t('machineEdit.machineSettings.cpuTopoComplex', {
        sockets: currentTopo.sockets,
        cores: currentTopo.cores,
        threads: currentTopo.threads,
      });
    }
    return seed.values.vcpus
      ? t('machineEdit.machineSettings.cpuTopoSimpleWithVcpus', { vcpus: seed.values.vcpus })
      : t('machineEdit.machineSettings.cpuTopoSimple');
  };
  return (
    <div className="mt-3">
      <h6 className="fw-bold">{t('machineEdit.machineSettings.cpuTopology')}</h6>
      <p className="form-text text-muted mt-0 mb-2">
        {t('machineEdit.machineSettings.cpuTopoCurrentPrefix')} {currentTopoLabel()}
        {t('machineEdit.machineSettings.cpuTopoApplyNote')}
      </p>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-cpu-mode">
            {t('machineEdit.machineSettings.mode')}
          </label>
          <select
            id="machine-cpu-mode"
            className="form-select"
            value={cpuMode}
            onChange={e => {
              const mode = e.target.value;
              setCpuMode(mode);
              if (mode === 'complex' && !cpuTopo.sockets) {
                setCpuTopo(
                  currentTopo || {
                    sockets: 1,
                    cores: Number(seed.values.vcpus) || 1,
                    threads: 1,
                  }
                );
              }
            }}
            disabled={formDisabled}
          >
            <option value="">{t('machineEdit.machineSettings.unchanged')}</option>
            <option value="simple">{t('machineEdit.machineSettings.simpleVcpus')}</option>
            <option value="complex">{t('machineEdit.machineSettings.complexTopo')}</option>
          </select>
        </div>
        {cpuMode === 'complex' && (
          <CpuTopologyInputs
            idPrefix="machine-cpu-topo"
            topo={cpuTopo}
            onField={(key, next) => setCpuTopo(prev => ({ ...prev, [key]: next }))}
            disabled={formDisabled}
          />
        )}
      </div>
    </div>
  );
};

CpuTopologySection.propTypes = {
  tab: PropTypes.string.isRequired,
  currentServer: PropTypes.object,
  seed: PropTypes.object.isRequired,
  cpuMode: PropTypes.string.isRequired,
  setCpuMode: PropTypes.func.isRequired,
  cpuTopo: PropTypes.object.isRequired,
  setCpuTopo: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const MachineSettings = ({
  currentServer,
  machineName,
  hypervisor,
  configuration,
  knobCurrent,
  pendingChanges,
  rawDetails,
  isRunning,
  onDone,
}) => {
  const { t } = useTranslation();
  const { makeAgentRequest, startMachine, stopMachine } = useServers();
  const [tab, setTab] = useState('general');
  const [values, setValues] = useState({});
  const [initial, setInitial] = useState({});
  const [autoboot, setAutoboot] = useState(''); // '' = unchanged
  const [guestAgent, setGuestAgent] = useState(null); // null = knob absent
  const [bootOrder, setBootOrder] = useState([]); // [] = unchanged
  const [bootPriority, setBootPriority] = useState(''); // '' = unchanged (DB-immediate)
  const [consolePort, setConsolePort] = useState(''); // '' = unchanged; 'dynamic' clears the pin
  const [consoleHost, setConsoleHost] = useState(''); // '' = unchanged
  // bhyve CPU topology — PUT top-level cpu_configuration + complex_cpu_conf
  // [{sockets, cores, threads}]. '' = unchanged; the current complex value
  // seeds from the zonecfg vcpus echo.
  const [cpuMode, setCpuMode] = useState('');
  const [cpuTopo, setCpuTopo] = useState({ sockets: '', cores: '', threads: '' });
  const [vboxJson, setVboxJson] = useState(''); // raw passthrough, '' = unchanged
  const [addNics, setAddNics] = useState([]);
  const [addDisks, setAddDisks] = useState([]);
  const [addCdroms, setAddCdroms] = useState([]);
  const [addControllers, setAddControllers] = useState([]);
  // Removals are ROW MARKS on the Current Hardware panel — no typed lists.
  const [removeAttachments, setRemoveAttachments] = useState([]);
  const [removeControllerNames, setRemoveControllerNames] = useState([]);
  const [removeNicAdapters, setRemoveNicAdapters] = useState([]);
  // vbox.<section>.<key> values — blank means unchanged, never sent.
  const [hardware, setHardware] = useState({});
  const [serialRows, setSerialRows] = useState([]);
  const [parallelRows, setParallelRows] = useState([]);
  const [nicRows, setNicRows] = useState([]);
  // Credentials: only TOUCHED fields ride the PUT — a touched-then-blank
  // field deletes that credential on the wire.
  const [creds, setCreds] = useState({});
  const [credsTouched, setCredsTouched] = useState([]);
  const [addFilesystems, setAddFilesystems] = useState([]);
  const [removeFilesystems, setRemoveFilesystems] = useState([]);
  // The zonecfg resource-control fragment (Resources tab) — null = untouched;
  // the editor owns its own state and reports the changed-only PUT fragment.
  const [resourceChanges, setResourceChanges] = useState(null);
  const [resourceNonce, setResourceNonce] = useState(0);
  // Zone device families (agent-confirmed wire): removals ride ATTR NAMES
  // (disk0/cdrom0) / the net resource's PHYSICAL vnic name; zone disk adds
  // are the zvol shape (create_new… | existing_dataset).
  const [addZoneDisks, setAddZoneDisks] = useState([]);
  const [removeZoneDisks, setRemoveZoneDisks] = useState([]);
  // The zone disk whose management modal is open (null = closed). The modal
  // sends its own resize_disks PUT — applied IMMEDIATELY by the agent (never
  // accrued); the answer's resized_disks[] says per-disk whether the guest
  // sees it live (virtio/NVMe) or after a power cycle (ahci/ide).
  const [manageDisk, setManageDisk] = useState(null);
  const [removeZoneCdroms, setRemoveZoneCdroms] = useState([]);
  const [removeZoneNics, setRemoveZoneNics] = useState([]);
  // In-place zone NIC edits (agent's update_nics): {physical: {key: value}}
  // — only non-empty keys ride; clearing a property is detach + re-add.
  const [zoneNicEdits, setZoneNicEdits] = useState({});
  // Cloud-init rides the `cloud_init` OBJECT wire {enabled, dns_domain,
  // password, resolvers, sshkey} — only touched keys ride; '' = unchanged.
  const [cloudInit, setCloudInit] = useState({});
  // The seeded current values — the diff base every submit compares against.
  const [seed, setSeed] = useState(() => buildSeed(undefined, undefined));
  const [revealPass, setRevealPass] = useState(false);
  const [agentDefaults, setAgentDefaults] = useState(null);
  const [phase, setPhase] = useState('form'); // form | choice | working
  // The staged PUT body awaiting the running-machine choice — distinct from
  // the `pendingChanges` prop (the agent's accrued power-cycle set).
  const [stagedChanges, setStagedChanges] = useState(null);
  const [step, setStep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState([]);
  const [osTypes, setOsTypes] = useState(null); // null = keep the text input
  const [isoOptions, setIsoOptions] = useState([]); // cached-ISO filenames
  const [pools, setPools] = useState([]); // full pool rows (carry .free for the resize bar)
  // The host's live VNIC records (dladm layer) — zone NIC rows merge them
  // with the zonecfg net resource so "unset in zonecfg" still shows the
  // real MAC/link/VLAN the VNIC runs with.
  const [hostVnics, setHostVnics] = useState([]);
  // Bridge/uplink suggestions for NIC fields (the create wizard's feed).
  const [bridgeOptions, setBridgeOptions] = useState([]);

  const formDisabled = loading || phase !== 'form';

  // utm machines take the modify SUBSET only: ram/vcpus, the DB-immediate
  // keys, add/remove NICs, and the `utm` section (notes, qemu_args[]). All
  // disk/cdrom/controller changes 400, and the vbox knob surface does not
  // exist — those tabs hide on utm MACHINES (a machine-level branch; the
  // host-level vboxOnly gates still hold for VirtualBox machines beside them).
  const isUtm = hypervisor === 'utm';
  const [utmNotes, setUtmNotes] = useState('');
  const [utmQemuArgs, setUtmQemuArgs] = useState('');

  // Details never poll mid-edit — configuration/knob_current only change on
  // machine switch or the post-apply reload, so re-seeding never wipes edits.
  const resetForm = useCallback(() => {
    const seeded = buildSeed(configuration, knobCurrent);
    setSeed(seeded);
    setValues(seeded.values);
    setInitial(seeded.values);
    setAutoboot(seeded.autoboot);
    setGuestAgent(seeded.guestAgent);
    setBootOrder([...seeded.bootOrder]);
    setBootPriority(seeded.bootPriority);
    setConsolePort(seeded.consolePort);
    setConsoleHost(seeded.consoleHost);
    setCpuMode('');
    setCpuTopo(seeded.cpuTopology || { sockets: '', cores: '', threads: '' });
    setVboxJson('');
    setAddNics([]);
    setAddDisks([]);
    setAddCdroms([]);
    setAddControllers([]);
    setRemoveAttachments([]);
    setRemoveControllerNames([]);
    setRemoveNicAdapters([]);
    setHardware(seeded.hardware);
    setSerialRows(seeded.serialRows);
    setParallelRows(seeded.parallelRows);
    setNicRows(seeded.nicRows);
    setCreds(seeded.creds);
    setCredsTouched([]);
    setAddFilesystems([]);
    setRemoveFilesystems([]);
    setResourceChanges(null);
    setResourceNonce(nonce => nonce + 1);
    setAddZoneDisks([]);
    setRemoveZoneDisks([]);
    setRemoveZoneCdroms([]);
    setRemoveZoneNics([]);
    setZoneNicEdits({});
    setCloudInit({});
    setUtmNotes(asFormString(knobCurrent?.utm?.notes ?? configuration?.utm?.notes));
    setUtmQemuArgs(seededUtmArgs(knobCurrent, configuration));
    setRevealPass(false);
    setPhase('form');
    setStagedChanges(null);
    setStep('');
    setError('');
    setErrorDetails([]);
  }, [configuration, knobCurrent]);

  useEffect(() => {
    setTab('general');
    resetForm();
  }, [machineName, resetForm]);

  useEffect(() => {
    if (!currentServer) {
      return;
    }
    getMachineOsTypes(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const list = result.success ? result.data?.ostypes : null;
        setOsTypes(Array.isArray(list) && list.length > 0 ? list : null);
      }
    );
    getIsoArtifacts(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setIsoOptions(isoFilenames(result));
      }
    );
    // knob_values feeds the enum dropdowns; agents without it fall back to
    // the hardcoded vocabularies.
    getMachineDefaults(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setAgentDefaults(result.success ? result.data : null);
      }
    );
    getBridgedInterfaces(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setBridgeOptions(
          result.success ? flattenBridgedInterfaces(result.data).map(entry => entry.name) : []
        );
      }
    );
    // The zone zvol-add pool picker + the live VNIC layer for NIC rows.
    if (hasHypervisor(currentServer, 'bhyve')) {
      getZfsPools(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        result => {
          setPools(result.success && Array.isArray(result.data?.pools) ? result.data.pools : []);
        }
      );
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'network/vnics'
      ).then(result => {
        setHostVnics(result.success && Array.isArray(result.data?.vnics) ? result.data.vnics : []);
      });
    } else {
      setPools([]);
      setHostVnics([]);
    }
  }, [currentServer, makeAgentRequest]);

  const waitForStopped = async () => {
    const outcome = await pollUntil(async () => {
      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'stats'
      );
      return result.success &&
        Array.isArray(result.data?.runningmachines) &&
        !result.data.runningmachines.includes(machineName)
        ? true
        : undefined;
    }, 60);
    return outcome === true;
  };

  const waitForTask = (taskId, attempts) =>
    pollTaskRow(async () => {
      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'tasks',
        'GET',
        null,
        { limit: 50 }
      );
      return result.success ? (result.data?.tasks || []).find(task => task.id === taskId) : null;
    }, attempts);

  const stopBeforeApply = async () => {
    setStep(t('machineEdit.machineSettings.stoppingMachine', { machineName }));
    const stopResult = await stopMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    if (!stopResult.success) {
      throw new Error(
        t('machineEdit.machineSettings.stopFailedError', { message: stopResult.message })
      );
    }
    const stopped = await waitForStopped();
    if (!stopped) {
      throw new Error(t('machineEdit.machineSettings.stopTimeoutError', { machineName }));
    }
  };

  const reportApplyOutcome = ({ data, task, warnings, base, queuedWhileRunning, immediate }) => {
    if (queuedWhileRunning) {
      onDone({
        text: `${t('machineEdit.machineSettings.changesAcceptedQueued', { machineName })}${warnings}`,
        warning: true,
      });
      return;
    }
    if (immediate) {
      onDone({
        text: `${base}.${warnings}`,
        warning: warnings !== '',
      });
      return;
    }
    // A COMPLETED task means the change already applied (the machine was
    // off, the task ran immediately) — the agent's queued-task wording
    // ("must be powered off…") would be stale. requires_restart still
    // beats flow-based wording for the take-effect note.
    const applied =
      task?.status === 'completed'
        ? t('machineEdit.machineSettings.changesAppliedTo', { machineName })
        : base;
    const restartNote =
      data.requires_restart === false ? '' : t('machineEdit.machineSettings.takeEffectOnStart');
    onDone({
      text: `${applied}${restartNote}.${warnings}`,
      warning: warnings !== '',
    });
  };

  const applyChanges = async (
    changes,
    { restart = false, queuedWhileRunning = false, immediate = false } = {}
  ) => {
    setPhase('working');
    setLoading(true);
    setError('');
    try {
      if (restart) {
        await stopBeforeApply();
      }

      setStep(t('machineEdit.machineSettings.applyingChanges'));
      const result = await modifyInfrastructure(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        changes
      );
      if (!result.success) {
        setErrorDetails(validationDetails(result));
        throw new Error(
          validationDetails(result).length > 0
            ? t('machineEdit.machineSettings.insufficientResources')
            : result.message
        );
      }
      setErrorDetails([]);
      const data = result.data || {};

      let task = null;
      if (data.task_id) {
        setStep(t('machineEdit.machineSettings.waitingForModificationTask'));
        task = await waitForTask(data.task_id, queuedWhileRunning ? 10 : 30);
        if (task?.status === 'failed') {
          throw new Error(
            task.error_message || t('machineEdit.machineSettings.modificationTaskFailed')
          );
        }
      }

      const warnings = warningsSuffix(data, t);
      const base = messageBase(data, machineName, t);

      if (data.status === 'pending_power_cycle') {
        onDone(pendingNotice(data, base, t));
        resetForm();
        return;
      }

      if (restart) {
        setStep(t('machineEdit.machineSettings.startingMachine', { machineName }));
        const startResult = await startMachine(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          machineName
        );
        if (!startResult.success) {
          throw new Error(
            t('machineEdit.machineSettings.startFailedError', { message: startResult.message })
          );
        }
        onDone({
          text: `${t('machineEdit.machineSettings.changesAppliedStarting', { machineName })}${warnings}`,
          warning: warnings !== '',
        });
      } else {
        reportApplyOutcome({ data, task, warnings, base, queuedWhileRunning, immediate });
      }
      resetForm();
    } catch (err) {
      setError(err.message);
      setPhase(isRunning ? 'choice' : 'form');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  // Only CHANGED scalar knobs ride the request; the utm section joins the
  // same changed-only rule.
  const buildScalarChanges = () => {
    const changes = {};
    const diffableFields = isUtm
      ? FIELDS.filter(field => field.key === 'ram' || field.key === 'vcpus')
      : FIELDS;
    diffableFields.forEach(({ key }) => {
      if (values[key] !== initial[key] && values[key] !== '') {
        changes[key] = values[key];
      }
    });
    if (isUtm) {
      const utmSection = buildUtmSection({ knobCurrent, configuration, utmNotes, utmQemuArgs });
      if (utmSection) {
        changes.utm = utmSection;
      }
    }
    if (autoboot !== '' && autoboot !== seed.autoboot) {
      changes.autoboot = autoboot === 'true';
    }
    if (seed.guestAgent !== null && guestAgent !== seed.guestAgent) {
      changes.guest_agent = guestAgent;
    }
    if (bootOrder.length > 0 && JSON.stringify(bootOrder) !== JSON.stringify(seed.bootOrder)) {
      changes.boot_order = bootOrder;
    }
    if (bootPriority !== '' && bootPriority !== seed.bootPriority) {
      changes.boot_priority = Number(bootPriority);
    }
    // consoleport pins the noVNC web port (typing "dynamic" clears the pin
    // back to the agent's pool); consolehost sets the bind address.
    if (consolePort !== '' && consolePort !== seed.consolePort) {
      changes.consoleport =
        consolePort.trim().toLowerCase() === 'dynamic' ? null : Number(consolePort);
    }
    if (consoleHost !== '' && consoleHost !== seed.consoleHost) {
      changes.consolehost = consoleHost.trim();
    }
    // Touched credentials ride verbatim — '' deletes the key on the wire.
    credsTouched.forEach(key => {
      changes[key] = creds[key] ?? '';
    });
    return changes;
  };

  // bhyve CPU topology — '' = unchanged; complex needs all three fields.
  // Returns the blocking error text, '' when fine.
  const applyCpuChanges = changes => {
    if (cpuMode === 'complex') {
      if (!cpuTopo.sockets || !cpuTopo.cores || !cpuTopo.threads) {
        return t('machineEdit.machineSettings.complexCpuTopologyRequired');
      }
      changes.cpu_configuration = 'complex';
      changes.complex_cpu_conf = [
        {
          sockets: Number(cpuTopo.sockets),
          cores: Number(cpuTopo.cores),
          threads: Number(cpuTopo.threads),
        },
      ];
    } else if (cpuMode === 'simple') {
      changes.cpu_configuration = 'simple';
    }
    return '';
  };

  const applyFilesystemChanges = changes => {
    const filesystemAdds = filesystemEntries(addFilesystems);
    if (filesystemAdds.length > 0) {
      changes.add_filesystems = filesystemAdds;
    }
    if (removeFilesystems.length > 0) {
      changes.remove_filesystems = removeFilesystems;
    }
  };

  const handleSubmit = () => {
    if (phase !== 'form') {
      return;
    }
    const changes = buildScalarChanges();
    let vboxPassthrough = null;
    if (vboxJson.trim()) {
      try {
        vboxPassthrough = JSON.parse(vboxJson);
      } catch {
        setError(t('machineEdit.machineSettings.vboxJsonInvalid'));
        return;
      }
    }
    const cpuError = applyCpuChanges(changes);
    if (cpuError) {
      setError(cpuError);
      return;
    }
    applyFilesystemChanges(changes);
    Object.assign(
      changes,
      buildZoneChanges({
        addZoneDisks,
        removeZoneDisks,
        removeZoneCdroms,
        removeZoneNics,
        zoneNicEdits,
        cloudInit,
      }),
      buildDeviceChanges({
        addNics,
        addDisks,
        addCdroms,
        addControllers,
        removeAttachments,
        removeControllerNames,
        removeNicAdapters,
      }),
      buildHardwareChanges({ hardware, serialRows, parallelRows, nicRows, removeNicAdapters, seed })
    );
    // The raw passthrough merges into the SAME `vbox` section as the knob
    // diff (one per-hypervisor key); passthrough wins on collision.
    if (vboxPassthrough) {
      changes.vbox = { ...(changes.vbox || {}), ...vboxPassthrough };
    }
    if (!isUtm && hasHypervisor(currentServer, 'bhyve') && resourceChanges) {
      Object.assign(changes, resourceChanges);
    }
    if (Object.keys(changes).length === 0) {
      setError(t('machineEdit.machineSettings.nothingChanged'));
      return;
    }
    setError('');
    setErrorDetails([]);
    if (isRunning && !immediateOnlyChanges(changes)) {
      setStagedChanges(changes);
      setPhase('choice');
      return;
    }
    applyChanges(changes, { immediate: immediateOnlyChanges(changes) });
  };

  const setHardwareValue = (sectionId, key, value) =>
    setHardware(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [key]: value },
    }));

  const setCred = (key, value) => {
    setCreds(prev => ({ ...prev, [key]: value }));
    setCredsTouched(prev => (prev.includes(key) ? prev : [...prev, key]));
  };

  // Accrued (pending-power-cycle) changes — cancel clears the whole set;
  // apply-now runs them immediately on a POWERED-OFF machine.
  const cancelPending = async () => {
    setLoading(true);
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `machines/${machineName}/pending-changes`,
      'DELETE'
    );
    setLoading(false);
    if (result.success) {
      onDone({
        text: t('machineEdit.machineSettings.pendingChangesCleared', { machineName }),
        warning: false,
      });
    } else {
      setError(result.message);
    }
  };
  const applyPendingNow = async () => {
    setLoading(true);
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `machines/${machineName}/pending-changes/apply`,
      'POST'
    );
    if (!result.success) {
      setLoading(false);
      setError(result.message);
      return;
    }
    const data = result.data || {};
    if (data.task_id) {
      const task = await waitForTask(data.task_id, 30);
      if (task?.status === 'failed') {
        setLoading(false);
        setError(task.error_message || t('machineEdit.machineSettings.applyPendingFailed'));
        return;
      }
    }
    setLoading(false);
    onDone({
      text: `${(
        data.message || t('machineEdit.machineSettings.pendingChangesApplied', { machineName })
      ).replace(/\.+$/u, '')}.`,
      warning: false,
    });
  };

  const knobValues = knobValuesOf(agentDefaults);
  const currentFilesystems = filesystemsOf(configuration);
  const activeSection = sectionForTab(tab);
  const autostartSection = HARDWARE_SECTIONS.find(section => section.id === 'autostart');
  const currentHardware = currentHardwareOf({ configuration, knob_current: knobCurrent });
  const zoneBootDevices = zoneBootDevicesOf(currentHardware);

  const marked = entry =>
    removeAttachments.some(
      item =>
        item.controller === entry.controller &&
        item.port === entry.port &&
        item.device === entry.device
    );
  const toggleAttachment = entry =>
    setRemoveAttachments(prev =>
      marked(entry)
        ? prev.filter(
            item =>
              !(
                item.controller === entry.controller &&
                item.port === entry.port &&
                item.device === entry.device
              )
          )
        : [
            ...prev,
            {
              controller: entry.controller,
              port: entry.port,
              device: entry.device,
              kind: entry.kind,
            },
          ]
    );
  const controllerMarked = name => removeControllerNames.includes(name);
  const toggleControllerRemoval = name =>
    setRemoveControllerNames(prev =>
      prev.includes(name) ? prev.filter(entry => entry !== name) : [...prev, name]
    );
  const nicMarked = adapter => removeNicAdapters.includes(adapter);
  const toggleNicRemoval = adapter =>
    setRemoveNicAdapters(prev =>
      prev.includes(adapter) ? prev.filter(entry => entry !== adapter) : [...prev, adapter]
    );
  const toggleName = setList => name =>
    setList(prev => (prev.includes(name) ? prev.filter(entry => entry !== name) : [...prev, name]));

  return (
    <div>
      <MachineSettingsStatus
        error={error}
        onDismissError={() => {
          setError('');
          setErrorDetails([]);
        }}
        errorDetails={errorDetails}
        phase={phase}
        step={step}
        machineName={machineName}
        onRestart={() => applyChanges(stagedChanges, { restart: true })}
        onQueue={() => applyChanges(stagedChanges, { queuedWhileRunning: true })}
        onBack={() => setPhase('form')}
      />

      <PendingChangesPanel
        pendingChanges={pendingChanges}
        isRunning={isRunning}
        loading={loading}
        onApplyNow={applyPendingNow}
        onCancel={cancelPending}
      />

      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {visibleTabs(isUtm, currentServer).map(entry => (
          <li key={entry.id} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-2 ${tab === entry.id ? 'active' : ''}`}
              onClick={() => setTab(entry.id)}
              disabled={formDisabled}
            >
              {t(`machineEdit.machineSettings.tab.${entry.id}`)}
            </button>
          </li>
        ))}
      </ul>

      <p className="form-text text-muted">{t('machineEdit.machineSettings.fieldsHint')}</p>

      {tab === 'general' && (
        <GeneralSettingsTab
          fields={editableFields(isUtm, currentServer, t)}
          knobValues={knobValues}
          defaultsDoc={agentDefaults}
          osTypes={osTypes}
          values={values}
          setValues={setValues}
          autoboot={autoboot}
          setAutoboot={setAutoboot}
          seed={seed}
          guestAgent={guestAgent}
          setGuestAgent={setGuestAgent}
          bootPriority={bootPriority}
          setBootPriority={setBootPriority}
          consolePort={consolePort}
          setConsolePort={setConsolePort}
          consoleHost={consoleHost}
          setConsoleHost={setConsoleHost}
          bootOrder={bootOrder}
          setBootOrder={setBootOrder}
          cloudInit={cloudInit}
          setCloudInit={setCloudInit}
          cloudInitCurrent={configuration?.['cloud-init']}
          bhyveBootDevices={zoneBootDevices}
          currentServer={currentServer}
          machineName={machineName}
          isRunning={isRunning}
          isUtm={isUtm}
          formDisabled={formDisabled}
        />
      )}

      <CpuTopologySection
        tab={tab}
        currentServer={currentServer}
        seed={seed}
        cpuMode={cpuMode}
        setCpuMode={setCpuMode}
        cpuTopo={cpuTopo}
        setCpuTopo={setCpuTopo}
        formDisabled={formDisabled}
      />

      {tab === 'credentials' && (
        <div className="row g-3">
          <p className="form-text text-muted mt-0 mb-0">
            {t('machineEdit.machineSettings.credentialsHint')}
          </p>
          {CRED_FIELDS.map(field => {
            let control;
            if (field.isPath) {
              control = (
                <PathInput
                  id={`machine-cred-${field.key}`}
                  value={creds[field.key] ?? ''}
                  onChange={next => setCred(field.key, next)}
                  server={currentServer}
                  mode="file"
                  pickTitle={t('machineEdit.machineSettings.pickPrivateKeyFile')}
                  placeholder={t('machineEdit.machineSettings.unchangedPlaceholder')}
                  disabled={formDisabled}
                />
              );
            } else if (field.isSecret) {
              control = (
                <div className="input-group">
                  <input
                    id={`machine-cred-${field.key}`}
                    className="form-control"
                    type={revealPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('machineEdit.machineSettings.unchangedPlaceholder')}
                    value={creds[field.key] ?? ''}
                    onChange={e => setCred(field.key, e.target.value)}
                    disabled={formDisabled}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setRevealPass(reveal => !reveal)}
                    title={
                      revealPass
                        ? t('machineEdit.machineSettings.hidePassword')
                        : t('machineEdit.machineSettings.showPassword')
                    }
                    disabled={formDisabled}
                  >
                    <i className={`fas ${revealPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              );
            } else {
              control = (
                <input
                  id={`machine-cred-${field.key}`}
                  className="form-control"
                  type="text"
                  placeholder={t('machineEdit.machineSettings.unchangedPlaceholder')}
                  value={creds[field.key] ?? ''}
                  onChange={e => setCred(field.key, e.target.value)}
                  disabled={formDisabled}
                />
              );
            }
            return (
              <div className="col-12 col-md-4" key={field.key}>
                <label className="form-label" htmlFor={`machine-cred-${field.key}`}>
                  {t(`machineEdit.machineSettings.credField.${field.key}`)}
                </label>
                {control}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'storage' && (
        <StorageDevicesEditor
          currentHardware={currentHardware}
          addDisks={addDisks}
          onAddDisksChange={setAddDisks}
          addCdroms={addCdroms}
          onAddCdromsChange={setAddCdroms}
          addControllers={addControllers}
          onAddControllersChange={setAddControllers}
          marked={marked}
          onToggleAttachment={toggleAttachment}
          controllerMarked={controllerMarked}
          onToggleController={toggleControllerRemoval}
          addZoneDisks={addZoneDisks}
          onAddZoneDisksChange={setAddZoneDisks}
          poolChoices={zfsPoolOptions(pools)}
          zoneName={machineName}
          zoneDiskRemovals={removeZoneDisks}
          onToggleZoneDisk={toggleName(setRemoveZoneDisks)}
          onManageZoneDisk={setManageDisk}
          zoneCdromRemovals={removeZoneCdroms}
          onToggleZoneCdrom={toggleName(setRemoveZoneCdroms)}
          isoOptions={isoOptions}
          controllerTypes={knobValues?.['disks.controller_type'] || null}
          currentServer={currentServer}
          formDisabled={formDisabled}
        />
      )}

      {activeSection && (
        <>
          <HardwareSectionForm
            section={activeSection}
            values={hardware[activeSection.id] || {}}
            onChange={setHardwareValue}
            knobValues={knobValues}
            disabled={formDisabled}
          />
          {activeSection.id === 'platform' && (
            <>
              <h6 className="fw-bold mt-3">{t('machineEdit.hardwareSections.autostart')}</h6>
              <HardwareSectionForm
                section={autostartSection}
                values={hardware.autostart || {}}
                onChange={setHardwareValue}
                knobValues={knobValues}
                disabled={formDisabled}
              />
            </>
          )}
        </>
      )}

      {tab === 'ports' && (
        <>
          <h6 className="fw-bold">{t('machineEdit.machineSettings.serialPorts')}</h6>
          <SerialPortsEditor
            rows={serialRows}
            onRowsChange={setSerialRows}
            disabled={formDisabled}
          />
          <h6 className="fw-bold mt-3">{t('machineEdit.machineSettings.parallelPorts')}</h6>
          <ParallelPortsEditor
            rows={parallelRows}
            onRowsChange={setParallelRows}
            disabled={formDisabled}
          />
        </>
      )}

      {tab === 'nics' && (
        <NetworkAdaptersEditor
          nics={currentHardware.nics}
          nicRows={nicRows}
          onNicRowsChange={setNicRows}
          addNics={addNics}
          onAddNicsChange={setAddNics}
          nicMarked={nicMarked}
          onToggleNic={toggleNicRemoval}
          nicEnums={knobValues}
          zoneNics={currentHardware.zone?.nics || null}
          zoneNicCurrent={Array.isArray(knobCurrent?.nics) ? knobCurrent.nics : []}
          nicPropsByNetif={agentDefaults?.nic_props_by_netif || null}
          knobDefaults={agentDefaults?.knob_defaults || {}}
          machineNetif={values.netif || ''}
          currentServer={currentServer}
          hostVnics={hostVnics}
          bridgeOptions={bridgeOptions}
          zoneNicRemovals={removeZoneNics}
          onToggleZoneNic={toggleName(setRemoveZoneNics)}
          zoneNicEdits={zoneNicEdits}
          onZoneNicEdit={(physical, key, value) =>
            setZoneNicEdits(prev => ({
              ...prev,
              [physical]: { ...(prev[physical] || {}), [key]: value },
            }))
          }
          onZoneNicPropEdit={(physical, propKey, value) =>
            setZoneNicEdits(prev => ({
              ...prev,
              [physical]: {
                ...(prev[physical] || {}),
                props: { ...((prev[physical] || {}).props || {}), [propKey]: value },
              },
            }))
          }
          utmMode={isUtm}
          formDisabled={formDisabled}
        />
      )}

      {tab === 'usb' && (
        <UsbPanel
          currentServer={currentServer}
          machineName={machineName}
          isRunning={isRunning}
          disabled={formDisabled}
        />
      )}

      {tab === 'filesystems' && (
        <FilesystemsEditor
          currentFilesystems={currentFilesystems}
          addFilesystems={addFilesystems}
          onAddChange={setAddFilesystems}
          removeFilesystems={removeFilesystems}
          onRemoveChange={setRemoveFilesystems}
          disabled={formDisabled}
        />
      )}

      <ResourcesSection
        show={!isUtm && hasHypervisor(currentServer, 'bhyve')}
        active={tab === 'resources'}
        machineName={machineName}
        nonce={resourceNonce}
        knobCurrent={knobCurrent}
        onChanges={setResourceChanges}
        disabled={formDisabled}
      />

      {tab === 'utm' && (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="machine-edit-utm-notes">
              {t('machineEdit.machineSettings.utmNotes')}
            </label>
            <textarea
              id="machine-edit-utm-notes"
              className="form-control"
              rows={3}
              value={utmNotes}
              onChange={e => setUtmNotes(e.target.value)}
              disabled={formDisabled}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="machine-edit-utm-qemu-args">
              {t('machineEdit.machineSettings.utmQemuArgs')}
            </label>
            <textarea
              id="machine-edit-utm-qemu-args"
              className="form-control font-monospace"
              rows={3}
              spellCheck={false}
              value={utmQemuArgs}
              onChange={e => setUtmQemuArgs(e.target.value)}
              disabled={formDisabled}
            />
            <span className="form-text text-muted small">
              {t('machineEdit.machineSettings.utmQemuArgsHint')}
            </span>
          </div>
        </div>
      )}

      {tab === 'advanced' && (
        <>
          <label className="form-label" htmlFor="machine-edit-vbox-json">
            {t('machineEdit.machineSettings.hypervisorPassthroughPrefix')} <code>vbox</code>
            {t('machineEdit.machineSettings.hypervisorPassthroughMiddle')}{' '}
            <code>{'{"directives": [{"directive": "--vram", "value": "64"}]}'}</code>
            {t('machineEdit.machineSettings.hypervisorPassthroughTail')}
          </label>
          <textarea
            id="machine-edit-vbox-json"
            className="form-control font-monospace"
            rows={3}
            value={vboxJson}
            onChange={e => setVboxJson(e.target.value)}
            disabled={formDisabled}
          />
        </>
      )}

      <ZvolManageModal
        isOpen={manageDisk !== null}
        onClose={() => setManageDisk(null)}
        currentServer={currentServer}
        machineName={machineName}
        disk={manageDisk}
        isRunning={isRunning}
        pools={pools}
        onResized={() =>
          onDone({
            text: t('machineEdit.machineSettings.diskResized', { machineName }),
            warning: false,
          })
        }
      />

      <div className="d-flex gap-2 mt-3 border-top pt-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={formDisabled}
        >
          <i className="fas fa-check me-2" />
          {t('machineEdit.machineSettings.apply')}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={resetForm}
          disabled={formDisabled}
        >
          {t('machineEdit.machineSettings.reset')}
        </button>
      </div>

      {rawDetails && (
        <details className="mt-3">
          <summary className="fs-6 fw-bold">
            {t('machineEdit.machineSettings.rawDataDebug')}
          </summary>
          <div className="card">
            <div className="card-body">
              <pre className="small">{JSON.stringify(rawDetails, null, 2)}</pre>
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

MachineSettings.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  hypervisor: PropTypes.string,
  configuration: PropTypes.object,
  knobCurrent: PropTypes.object,
  pendingChanges: PropTypes.object,
  rawDetails: PropTypes.object,
  isRunning: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default MachineSettings;
