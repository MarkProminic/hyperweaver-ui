import PropTypes from 'prop-types';
import { useState } from 'react';

import { PathInput } from '../common';

import {
  HARDWARE_SECTIONS,
  HardwareSectionForm,
  SerialPortsEditor,
  ParallelPortsEditor,
} from './HardwareEditor';
import NetworksEditor from './NetworksEditor';
import PickOrType from './PickOrType';
import DslConfigForm from './ProvisionerFieldDsl';
import { RolesEditor } from './ProvisionerFormFields';

// Machine-create wizard steps. State lives in the wizard — steps are pure
// render + callbacks. Every field maps to a key the create wire carries.

const SettingInput = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  list,
  min,
  max,
}) => (
  <div className="col-12 col-md-4">
    <label className="form-label" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className="form-control"
      type={type}
      placeholder={placeholder}
      list={list}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
    />
  </div>
);

SettingInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  list: PropTypes.string,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export const GeneralStep = ({
  name,
  setName,
  settings,
  setSetting,
  startAfterCreate,
  setStartAfterCreate,
  tagsInput,
  setTagsInput,
  notes,
  setNotes,
  advanced,
  loading,
}) => {
  // SHI's "Computed name (FQDN)" live preview — the derived-name rule
  // (server_id--hostname.domain under prefix naming) shown as you type;
  // the agent has the final word.
  const namingDomain = settings.machine_domain || settings.domain;
  const computedName = name.trim()
    ? name.trim()
    : `${settings.server_id ? `${settings.server_id}--` : ''}${settings.hostname || '…'}.${namingDomain || '…'}`;

  return (
    <div className="row g-3">
      <SettingInput
        id="machine-setting-hostname"
        label="Hostname"
        value={settings.hostname}
        onChange={e => setSetting('hostname', e.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-domain"
        label="Domain"
        value={settings.domain}
        onChange={e => setSetting('domain', e.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-server_id"
        label="Server ID"
        value={settings.server_id}
        onChange={e => setSetting('server_id', e.target.value)}
        disabled={loading}
      />
      <SettingInput
        id="machine-create-name"
        label="Name"
        placeholder="blank = derived from server_id/hostname/domain"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={loading}
      />
      {advanced && (
        <SettingInput
          id="machine-setting-machine_domain"
          label="Naming Domain (optional override)"
          value={settings.machine_domain}
          onChange={e => setSetting('machine_domain', e.target.value)}
          disabled={loading}
        />
      )}
      <SettingInput
        id="machine-create-tags"
        label="Tags (comma separated)"
        placeholder="e.g. dev, domino"
        value={tagsInput}
        onChange={e => setTagsInput(e.target.value)}
        disabled={loading}
      />
      {advanced && (
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-create-notes">
            Notes
          </label>
          <textarea
            id="machine-create-notes"
            className="form-control"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>
      )}
      {advanced && (
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-boot_priority">
            Boot Priority (orchestration)
          </label>
          <input
            id="machine-setting-boot_priority"
            className="form-control"
            type="number"
            min="1"
            max="100"
            placeholder="95 (default)"
            value={settings.boot_priority ?? ''}
            onChange={e => setSetting('boot_priority', e.target.value)}
            disabled={loading}
          />
          <span className="form-text text-muted">
            1–100 — higher boots first when host-level orchestration is enabled.
          </span>
        </div>
      )}
      <div className="col-12">
        <span className="form-text text-muted">
          Computed name: <code>{computedName}</code>
        </span>
      </div>
      <div className="col-12">
        <div className="form-check form-switch">
          <input
            id="machine-create-start-after"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={startAfterCreate}
            onChange={e => setStartAfterCreate(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="machine-create-start-after">
            Start (and provision) after create
          </label>
        </div>
      </div>
    </div>
  );
};

GeneralStep.propTypes = {
  name: PropTypes.string.isRequired,
  setName: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  startAfterCreate: PropTypes.bool.isRequired,
  setStartAfterCreate: PropTypes.func.isRequired,
  tagsInput: PropTypes.string.isRequired,
  setTagsInput: PropTypes.func.isRequired,
  notes: PropTypes.string.isRequired,
  setNotes: PropTypes.func.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

// The boot-media choice: box template, blank disk, existing image, and
// diskless are equally real. Drives which OS/Box and Disks fields render
// and what rides the spec.
export const BOOT_SOURCES = [
  { id: 'template', label: 'Box template', hint: 'clone a base box (the SHI/provisioned path)' },
  { id: 'scratch', label: 'Blank disk', hint: 'empty disk — install your own OS' },
  { id: 'existing', label: 'Existing disk image', hint: 'attach an image already on the host' },
  { id: 'none', label: 'No disk', hint: 'diskless stub — attach media later' },
];

export const BoxStep = ({
  settings,
  setSetting,
  templates,
  catalogNote,
  remoteBoxes,
  onBoxPicked,
  sourceNames,
  sourceFilter,
  onSourceFilterChange,
  boxPickCustom,
  setBoxPickCustom,
  bootSource,
  setBootSource,
  advanced,
  loading,
}) => {
  // ONE merged image list: every registry's catalog UNION the local
  // downloaded templates — a registry outage still lists what's on disk.
  // "Custom…" stays for hand-typed org/name.
  const boxOptions = (() => {
    const map = new Map();
    remoteBoxes.forEach(entry => {
      const key = `${entry.value}@${entry.source || ''}`;
      map.set(key, {
        key,
        value: entry.value,
        versions: [...entry.versions],
        architectures: [...entry.architectures],
        source: entry.source || '',
        sourceUrl: entry.sourceUrl || '',
        isDefaultSource: !!entry.isDefaultSource,
        local: false,
      });
    });
    templates.forEach(template => {
      const value = `${template.organization}/${template.box_name}`;
      // A local copy joins its registry's entry when one matches, else it
      // stands alone as a local-only image.
      const remoteKey = [...map.keys()].find(existing => existing.startsWith(`${value}@`));
      const key = remoteKey || `${value}@local`;
      const entry = map.get(key) || {
        key,
        value,
        versions: [],
        architectures: [],
        source: '',
        sourceUrl: '',
        isDefaultSource: true,
        local: false,
      };
      if (template.version && !entry.versions.includes(template.version)) {
        entry.versions.push(template.version);
      }
      if (template.architecture && !entry.architectures.includes(template.architecture)) {
        entry.architectures.push(template.architecture);
      }
      entry.local = true;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => a.value.localeCompare(b.value));
  })();
  // The Registry dropdown is where registry identity lives — image labels
  // never repeat it.
  const visibleOptions = sourceFilter
    ? boxOptions.filter(entry => entry.source === sourceFilter)
    : boxOptions;
  const catalogEntry = boxOptions.find(entry => entry.value === settings.box) || null;
  const showBoxSelect = !boxPickCustom;

  const handleBoxSelect = key => {
    if (key === '__custom__') {
      setBoxPickCustom(true);
      setSetting('box', '');
      onBoxPicked(null);
      return;
    }
    const entry = boxOptions.find(row => row.key === key);
    if (!entry) {
      return;
    }
    setSetting('box', entry.value);
    // Autofill the version/arch from the list — editable, never final.
    setSetting('box_version', entry.versions[0] || '');
    if (entry.architectures.length > 0) {
      setSetting('box_arch', entry.architectures[0]);
    }
    // Non-default registries ride the spec via box_url (the modal's hook).
    onBoxPicked(entry);
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <span className="form-label d-block">Boot media</span>
        {BOOT_SOURCES.map(source => (
          <div className="form-check" key={source.id}>
            <input
              id={`machine-boot-source-${source.id}`}
              className="form-check-input"
              type="radio"
              name="machine-boot-source"
              checked={bootSource === source.id}
              onChange={() => setBootSource(source.id)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor={`machine-boot-source-${source.id}`}>
              {source.label} <span className="text-muted small">— {source.hint}</span>
            </label>
          </div>
        ))}
      </div>
      {bootSource !== 'template' && (
        <p className="form-text text-muted mb-0">
          No box template rides this create — disk details live on the Disks step; ISOs can attach
          there too.
        </p>
      )}
      {bootSource === 'template' && (
        <>
          {catalogNote && (
            <div className="col-12">
              <p className="form-text text-warning mb-0">{catalogNote}</p>
            </div>
          )}
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-box-registry">
              Registry
            </label>
            <select
              id="machine-box-registry"
              className="form-select"
              value={sourceFilter}
              onChange={e => onSourceFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value="">All registries</option>
              {sourceNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="machine-setting-box">
              Image
            </label>
            {showBoxSelect ? (
              <select
                id="machine-setting-box"
                className="form-select"
                value={catalogEntry ? catalogEntry.key : ''}
                onChange={e => handleBoxSelect(e.target.value)}
                disabled={loading}
              >
                <option value="">
                  {visibleOptions.length > 0
                    ? 'Select an image…'
                    : '(no images found — use Custom)'}
                </option>
                {visibleOptions.map(entry => (
                  <option key={entry.key} value={entry.key}>
                    {entry.value}
                  </option>
                ))}
                <option value="__custom__">Custom (type org/name)…</option>
              </select>
            ) : (
              <input
                id="machine-setting-box"
                className="form-control"
                type="text"
                list={templates.length > 0 ? 'machine-box-options' : undefined}
                value={settings.box ?? ''}
                onChange={e => setSetting('box', e.target.value)}
                disabled={loading}
              />
            )}
            {boxPickCustom && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => setBoxPickCustom(false)}
              >
                back to the image list
              </button>
            )}
            {templates.length > 0 && (
              <datalist id="machine-box-options">
                {templates.map(template => (
                  <option
                    key={`${template.organization}/${template.box_name}/${template.version}/${template.architecture}`}
                    value={`${template.organization}/${template.box_name}`}
                  >
                    {`${template.version} (${template.architecture})`}
                  </option>
                ))}
              </datalist>
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="machine-setting-box_version">
              Box Version
            </label>
            {/* The catalog arrives pre-filtered to what this host can
                install — every listed version is downloadable. Custom picks
                keep the editable field. */}
            {showBoxSelect ? (
              <select
                id="machine-setting-box_version"
                className="form-select"
                value={settings.box_version ?? ''}
                onChange={e => setSetting('box_version', e.target.value)}
                disabled={loading || !catalogEntry}
              >
                <option value="">
                  {catalogEntry ? '(unpinned — resolves locally only)' : '(pick an image first)'}
                </option>
                {(catalogEntry?.versions || []).map(versionNumber => (
                  <option key={versionNumber} value={versionNumber}>
                    {versionNumber}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="machine-setting-box_version"
                className="form-control"
                type="text"
                placeholder="specific version for downloads"
                value={settings.box_version ?? ''}
                onChange={e => setSetting('box_version', e.target.value)}
                disabled={loading}
              />
            )}
          </div>
          {advanced && (
            <>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="machine-setting-box_arch">
                  Box Architecture
                </label>
                {catalogEntry && catalogEntry.architectures.length > 0 ? (
                  <select
                    id="machine-setting-box_arch"
                    className="form-select"
                    value={settings.box_arch ?? ''}
                    onChange={e => setSetting('box_arch', e.target.value)}
                    disabled={loading}
                  >
                    <option value="">(default)</option>
                    {catalogEntry.architectures.map(arch => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="machine-setting-box_arch"
                    className="form-control"
                    type="text"
                    placeholder="amd64"
                    value={settings.box_arch ?? ''}
                    onChange={e => setSetting('box_arch', e.target.value)}
                    disabled={loading}
                  />
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="machine-setting-box_url">
                  Box Registry URL (blank = configured default)
                </label>
                <input
                  id="machine-setting-box_url"
                  className="form-control"
                  type="text"
                  value={settings.box_url ?? ''}
                  onChange={e => setSetting('box_url', e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}
          <p className="form-text text-muted mb-0">
            A box missing from the local template registry chains a download before creation — pin a
            specific version for downloads (&quot;latest&quot; only resolves locally).
          </p>
        </>
      )}
    </div>
  );
};

BoxStep.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  templates: PropTypes.array.isRequired,
  catalogNote: PropTypes.string.isRequired,
  remoteBoxes: PropTypes.array.isRequired,
  onBoxPicked: PropTypes.func.isRequired,
  sourceNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  sourceFilter: PropTypes.string.isRequired,
  onSourceFilterChange: PropTypes.func.isRequired,
  boxPickCustom: PropTypes.bool.isRequired,
  setBoxPickCustom: PropTypes.func.isRequired,
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

// Memory stepper works in G units (SHI's Allocated Memory stepper); any
// other size string ("512M") passes through untouched — buttons just grey.
export const stepMemory = (value, delta) => {
  const match = /^(?<gigs>\d+)\s*G$/i.exec(String(value || '').trim());
  if (!match) {
    return null;
  }
  const current = Number(match.groups.gigs);
  if (delta < 0 && current <= 1) {
    return null;
  }
  return `${current + delta}G`;
};

export const ResourcesStep = ({ settings, setSetting, loading }) => {
  const vcpus = Number(settings.vcpus) || 0;
  const bumpMemory = delta => {
    const next = stepMemory(settings.memory, delta);
    if (next) {
      setSetting('memory', next);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-setting-vcpus">
          vCPUs
        </label>
        <div className="input-group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="Fewer vCPUs"
            onClick={() => setSetting('vcpus', Math.max(1, vcpus - 1))}
            disabled={loading || vcpus <= 1}
          >
            −
          </button>
          <input
            id="machine-setting-vcpus"
            className="form-control text-center"
            type="number"
            min="1"
            value={settings.vcpus ?? ''}
            onChange={e => setSetting('vcpus', e.target.value === '' ? '' : Number(e.target.value))}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="More vCPUs"
            onClick={() => setSetting('vcpus', Math.max(1, vcpus + 1))}
            disabled={loading}
          >
            +
          </button>
        </div>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-setting-memory">
          Memory
        </label>
        <div className="input-group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="Less memory"
            onClick={() => bumpMemory(-1)}
            disabled={loading || !stepMemory(settings.memory, -1)}
          >
            −
          </button>
          <input
            id="machine-setting-memory"
            className="form-control text-center"
            type="text"
            placeholder="e.g. 2G"
            value={settings.memory ?? ''}
            onChange={e => setSetting('memory', e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label="More memory"
            onClick={() => bumpMemory(1)}
            disabled={loading || !stepMemory(settings.memory, 1)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

ResourcesStep.propTypes = {
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

/**
 * Disks step — the stub-first create vocabulary (sync 2026-07-07):
 * disks{boot{path|size|sparse|volume_name}, additional_disks[{size|path}],
 * cdroms[{path}]}. Boot detail fields follow the OS/Box step's boot-media
 * choice; paths name files on the AGENT host.
 */
// VirtualBox boot-order device vocabulary (catalog §3): ordered, max 4 slots.
const BOOT_ORDER_DEVICES = ['disk', 'dvd', 'net', 'floppy', 'none'];

// Storage controller types (zones.diskif, CREATE-only — VirtualBox fixes the
// type once media attach; the agent defaults to sata when omitted).
const DISKIF_OPTIONS = ['ide', 'sata', 'scsi', 'sas', 'nvme', 'virtio'];

// Boot-order manager — drag to reorder, identical interaction on both
// hypervisors (parity ruling). VirtualBox: fixed pick-list, 4-slot cap.
// bhyve: free-typed device tokens (allowCustom) until the agent serves a
// device list; no slot cap.
export const BootOrderEditor = ({
  bootOrder,
  setBootOrder,
  deviceOptions = null,
  maxSlots = 4,
  allowCustom = false,
  loading,
}) => {
  const devices = deviceOptions || BOOT_ORDER_DEVICES;
  const [dragDevice, setDragDevice] = useState(null);
  const [customDevice, setCustomDevice] = useState('');

  const addCustom = () => {
    const device = customDevice.trim();
    if (!device || bootOrder.includes(device)) {
      return;
    }
    setBootOrder([...bootOrder, device]);
    setCustomDevice('');
  };

  const handleDragOverRow = device => {
    if (!dragDevice || dragDevice === device) {
      return;
    }
    const next = bootOrder.filter(entry => entry !== dragDevice);
    next.splice(next.indexOf(device), 0, dragDevice);
    setBootOrder(next);
  };

  return (
    <>
      <div className="d-flex flex-column gap-1 mb-2">
        {/* Devices are unique in the list (the add-select filters picked
            ones), so the device name itself is the key. */}
        {bootOrder.map((device, index) => (
          <div
            className={`d-flex align-items-center gap-2 border rounded px-2 py-1 ${dragDevice === device ? 'opacity-50 border-primary' : ''}`}
            style={{ cursor: 'grab', maxWidth: '320px' }}
            key={device}
            role="listitem"
            draggable={!loading}
            onDragStart={() => setDragDevice(device)}
            onDragEnd={() => setDragDevice(null)}
            onDragOver={e => {
              e.preventDefault();
              handleDragOverRow(device);
            }}
          >
            <i className="fas fa-grip-vertical text-muted" />
            <span className="badge text-bg-secondary">{index + 1}</span>
            <code>{device}</code>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger py-0 ms-auto"
              aria-label="Remove boot device"
              onClick={() => setBootOrder(bootOrder.filter(entry => entry !== device))}
              disabled={loading}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        ))}
      </div>
      {bootOrder.length < maxSlots && (
        <div className="d-flex flex-wrap gap-2">
          {devices.some(device => !bootOrder.includes(device)) && (
            <select
              className="form-select form-select-sm w-auto"
              aria-label="Add boot device"
              value=""
              onChange={e => e.target.value && setBootOrder([...bootOrder, e.target.value])}
              disabled={loading}
            >
              <option value="">Add device to boot order…</option>
              {devices
                .filter(device => !bootOrder.includes(device))
                .map(device => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
            </select>
          )}
          {allowCustom && (
            <div className="input-group input-group-sm w-auto">
              <input
                className="form-control"
                type="text"
                placeholder="device — e.g. bootdisk, cdrom0, net0=pxe"
                aria-label="Boot device token"
                value={customDevice}
                onChange={e => setCustomDevice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                title="Add this device to the boot order"
                onClick={addCustom}
                disabled={loading || !customDevice.trim()}
              >
                <i className="fas fa-plus" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

BootOrderEditor.propTypes = {
  bootOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  setBootOrder: PropTypes.func.isRequired,
  deviceOptions: PropTypes.arrayOf(PropTypes.string),
  maxSlots: PropTypes.number,
  allowCustom: PropTypes.bool,
  loading: PropTypes.bool,
};

// Boot-zvol ZFS placement (bhyve) — live pool/dataset pickers with the
// Custom… escape. Pool free space rides the label (the exact number the
// capacity gate checks against); datasets list RELATIVE to the effective
// pool — the agent joins <pool>/<dataset> itself.
const BootZfsPlacement = ({ disks, setDisks, zfsPools, zfsDatasets, showClone, loading }) => {
  // pools[].free = RAW BYTES as a string (zpool list -p — the canonical
  // shape per the converged A3 answer).
  const poolFree = free => `${(Number(free) / 1024 ** 3).toFixed(1)}G`;
  // Only REAL pools list (Mark's sanity ruling) — free space + any
  // non-ONLINE health state ride the label so a degraded pool is never a
  // blind pick.
  const poolOptions = zfsPools.map(pool => {
    const free = pool.free ? ` — ${poolFree(pool.free)} free` : '';
    const health = pool.health && pool.health !== 'ONLINE' ? ` · ${pool.health}` : '';
    return { value: pool.name, label: `${pool.name}${free}${health}` };
  });
  const bootPoolName = (disks.bootPool || '').trim() || 'rpool';
  const datasetOptions = zfsDatasets
    .filter(dataset => dataset.name.startsWith(`${bootPoolName}/`))
    .map(dataset => {
      const relative = dataset.name.slice(bootPoolName.length + 1);
      return { value: relative, label: relative };
    });
  return (
    <>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-pool">
          ZFS Pool
        </label>
        <PickOrType
          id="machine-disk-boot-pool"
          value={disks.bootPool}
          onChange={next => setDisks({ bootPool: next })}
          options={poolOptions}
          blankLabel="(default — rpool)"
          placeholder="pool name"
          disabled={loading}
        />
      </div>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-dataset">
          Parent Dataset
        </label>
        <PickOrType
          id="machine-disk-boot-dataset"
          value={disks.bootDataset}
          onChange={next => setDisks({ bootDataset: next })}
          options={datasetOptions}
          blankLabel="(default — zones)"
          placeholder="e.g. zones/companyA"
          disabled={loading}
        />
        <span className="form-text text-muted">
          The boot zvol lands at pool/dataset/&lt;zone&gt;/&lt;volume&gt;.
        </span>
      </div>
      {showClone && (
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-disk-clone-strategy">
            Clone Strategy
          </label>
          <select
            id="machine-disk-clone-strategy"
            className="form-select"
            value={disks.bootCloneStrategy}
            onChange={e => setDisks({ bootCloneStrategy: e.target.value })}
            disabled={loading}
          >
            <option value="">(default — clone)</option>
            <option value="clone">clone — thin ZFS clone of the template</option>
            <option value="copy">copy — full independent send/recv</option>
          </select>
        </div>
      )}
    </>
  );
};

BootZfsPlacement.propTypes = {
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  showClone: PropTypes.bool,
  loading: PropTypes.bool,
};

// The Boot Disk section — bootSource decides which typed-entry fields
// render (disk spec: only that type's keys are expressible).
const BootDiskSection = ({
  bootSource,
  setBootSource,
  disks,
  setDisks,
  currentServer,
  bhyve,
  vbox,
  volumeOptions,
  mediaOptions,
  zfsPools,
  zfsDatasets,
  advanced,
  loading,
}) => (
  <div className="row g-3 mb-3">
    {/* The TYPE selector — the same state as the OS/Box step's Boot media
        radios, surfaced HERE too (the disks screen must show its own
        discriminator; Mark's ask). */}
    <div className="col-12">
      <div className="btn-group" role="group" aria-label="Boot disk type">
        {BOOT_SOURCES.map(source => (
          <button
            type="button"
            key={source.id}
            className={`btn btn-sm ${bootSource === source.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            title={source.hint}
            onClick={() => setBootSource(source.id)}
            disabled={loading}
          >
            {source.label}
          </button>
        ))}
      </div>
    </div>
    {bootSource === 'none' && (
      <p className="form-text text-muted mb-0">
        Diskless — no boot medium rides this create. Attach disks later via Edit.
      </p>
    )}
    {bootSource === 'existing' && (
      <div className="col-12 col-md-8">
        <label className="form-label" htmlFor="machine-disk-boot-path">
          {bhyve ? 'Existing zvol (dataset path)' : 'Existing disk image path (on the agent host)'}
        </label>
        {bhyve && (
          <PickOrType
            id="machine-disk-boot-path"
            value={disks.bootPath}
            onChange={next => setDisks({ bootPath: next })}
            options={volumeOptions}
            blankLabel="Select a zvol…"
            placeholder="e.g. rpool/vms/old-server/root"
            disabled={loading}
          />
        )}
        {!bhyve && mediaOptions.length > 0 && (
          <PickOrType
            id="machine-disk-boot-path"
            value={disks.bootPath}
            onChange={next => setDisks({ bootPath: next })}
            options={mediaOptions}
            blankLabel="Select a registered disk image…"
            placeholder="path on the agent host"
            disabled={loading}
          />
        )}
        {!bhyve && mediaOptions.length === 0 && (
          <PathInput
            id="machine-disk-boot-path"
            value={disks.bootPath}
            onChange={next => setDisks({ bootPath: next })}
            server={currentServer}
            mode="file"
            pickTitle="Pick the disk image"
            disabled={loading}
          />
        )}
        <p className="form-text text-muted mb-0">
          Attached as-is — never created or deleted by the agent.
        </p>
      </div>
    )}
    {(bootSource === 'template' || bootSource === 'scratch') && (
      <>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-disk-boot-size">
            {bootSource === 'template' ? 'Disk size (blank = template size)' : 'Disk size'}
          </label>
          <input
            id="machine-disk-boot-size"
            className="form-control"
            type="text"
            placeholder="e.g. 32G"
            value={disks.bootSize}
            onChange={e => setDisks({ bootSize: e.target.value })}
            disabled={loading}
          />
        </div>
        {advanced && (
          <>
            <div className="col-6 col-md-4">
              <div className="form-check form-switch mt-4">
                <input
                  id="machine-disk-boot-sparse"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={disks.bootSparse}
                  onChange={e => setDisks({ bootSparse: e.target.checked })}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="machine-disk-boot-sparse">
                  Sparse
                </label>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label" htmlFor="machine-disk-boot-volume">
                Volume name
              </label>
              <input
                id="machine-disk-boot-volume"
                className="form-control"
                type="text"
                value={disks.bootVolumeName}
                onChange={e => setDisks({ bootVolumeName: e.target.value })}
                disabled={loading}
              />
            </div>
            {bhyve && (
              <BootZfsPlacement
                disks={disks}
                setDisks={setDisks}
                zfsPools={zfsPools}
                zfsDatasets={zfsDatasets}
                showClone={bootSource === 'template'}
                loading={loading}
              />
            )}
          </>
        )}
      </>
    )}
    {/* VBox FILE placement (frozen addendum): `directory` — where the
        CREATED disk file lands, blank/template only; absent = the machine
        folder. Must exist on the agent host — the agent never creates it. */}
    {vbox && advanced && (bootSource === 'template' || bootSource === 'scratch') && (
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="machine-disk-boot-directory">
          Directory (where the created disk file lands)
        </label>
        <input
          id="machine-disk-boot-directory"
          className="form-control font-monospace"
          list="machine-media-dirs"
          placeholder="(default — the machine folder)"
          value={disks.bootDirectory}
          onChange={e => setDisks({ bootDirectory: e.target.value })}
          disabled={loading}
        />
        <span className="form-text text-muted">
          Must be an absolute, existing folder on the agent host.
        </span>
      </div>
    )}
    {/* VBox attachment placement — controller/port ride EVERY entry (the
        frozen wire); blank = default controller / next free port. */}
    {vbox && advanced && bootSource !== 'none' && (
      <>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-disk-boot-controller">
            Controller
          </label>
          <input
            id="machine-disk-boot-controller"
            className="form-control"
            list="machine-controller-names"
            placeholder="(default controller)"
            value={disks.bootController}
            onChange={e => setDisks({ bootController: e.target.value })}
            disabled={loading}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label" htmlFor="machine-disk-boot-port">
            Port
          </label>
          <input
            id="machine-disk-boot-port"
            className="form-control"
            type="number"
            min="0"
            placeholder="(next free)"
            value={disks.bootPort}
            onChange={e => setDisks({ bootPort: e.target.value })}
            disabled={loading}
          />
        </div>
      </>
    )}
  </div>
);

BootDiskSection.propTypes = {
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  bhyve: PropTypes.bool,
  vbox: PropTypes.bool,
  volumeOptions: PropTypes.array.isRequired,
  mediaOptions: PropTypes.array.isRequired,
  zfsPools: PropTypes.array.isRequired,
  zfsDatasets: PropTypes.array.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

export const DisksStep = ({
  bootSource,
  setBootSource,
  disks,
  setDisks,
  bootOrder,
  setBootOrder,
  diskif,
  setDiskif,
  agentDefaults,
  isoOptions,
  currentServer,
  vbox,
  bhyve,
  zfsPools = [],
  zfsDatasets = [],
  zfsVolumes = [],
  vboxMedia = [],
  advanced,
  loading,
}) => {
  const diskifDefault = agentDefaults?.zones?.diskif || 'sata';
  const knobValues = agentDefaults?.knob_values || null;
  // Volume rows carry in_use_by (machine name | null) — an in-use zvol
  // stays pickable (the agent refuses; `force: true` is the override) but
  // the label says who holds it.
  const volumeOptions = zfsVolumes.map(volume => ({
    value: volume.name,
    label: volume.in_use_by ? `${volume.name} — in use by ${volume.in_use_by}` : volume.name,
  }));
  // GET /media rows (frozen wire): in_use_by is an ARRAY (VBox media can
  // multi-attach); size_bytes numeric.
  const mediaOptions = vboxMedia.map(medium => {
    const size = Number.isFinite(medium.size_bytes)
      ? ` — ${(medium.size_bytes / 1024 ** 3).toFixed(1)}G`
      : '';
    const holders =
      Array.isArray(medium.in_use_by) && medium.in_use_by.length > 0
        ? ` · in use by ${medium.in_use_by.join(', ')}`
        : '';
    return { value: medium.path, label: `${medium.path}${size}${holders}` };
  });
  // Known media directories (from registered-media paths, both separators —
  // the agent host may be Windows) — the `directory` datalist feed.
  const mediaDirs = [
    ...new Set(
      vboxMedia
        .map(medium => {
          const path = String(medium.path || '');
          const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
          return cut > 0 ? path.slice(0, cut) : '';
        })
        .filter(Boolean)
    ),
  ];
  const diskifOptions = knobValues?.['zones.diskif'] || DISKIF_OPTIONS;
  const controllerTypeOptions = knobValues?.['disks.controller_type'] || [
    ...DISKIF_OPTIONS,
    'usb',
    'floppy',
  ];
  const controllerNames = (disks.controllers || []).map(row => row.name.trim()).filter(Boolean);
  const isoList = isoOptions || [];
  const setController = (index, patch) =>
    setDisks({
      controllers: disks.controllers.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  const setAdditional = (index, patch) =>
    setDisks({
      additional: disks.additional.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  const setCdrom = (index, patch) =>
    setDisks({
      cdroms: disks.cdroms.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });

  return (
    <>
      <h6 className="fw-bold">Boot Disk</h6>
      <BootDiskSection
        bootSource={bootSource}
        setBootSource={setBootSource}
        disks={disks}
        setDisks={setDisks}
        currentServer={currentServer}
        bhyve={bhyve}
        vbox={vbox}
        volumeOptions={volumeOptions}
        mediaOptions={mediaOptions}
        zfsPools={zfsPools}
        zfsDatasets={zfsDatasets}
        advanced={advanced}
        loading={loading}
      />

      {bhyve && volumeOptions.length > 0 && (
        <datalist id="machine-zvol-options">
          {volumeOptions.map(option => (
            <option key={option.value} value={option.value} />
          ))}
        </datalist>
      )}
      {vbox && mediaDirs.length > 0 && (
        <datalist id="machine-media-dirs">
          {mediaDirs.map(dir => (
            <option key={dir} value={dir} />
          ))}
        </datalist>
      )}

      <h6 className="fw-bold">Additional Disks</h6>
      <div className="d-flex flex-column gap-2 mb-3">
        {disks.additional.map((row, index) => {
          const rowKey = `additional-disk-${index}`;
          return (
            <div className="row g-2 align-items-end" key={rowKey}>
              <div className="col-4 col-md-3">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-mode`}>
                  Source
                </label>
                <select
                  id={`${rowKey}-mode`}
                  className="form-select form-select-sm"
                  value={row.mode}
                  onChange={e => setAdditional(index, { mode: e.target.value })}
                  disabled={loading}
                >
                  <option value="new">New disk</option>
                  <option value="existing">Existing image</option>
                </select>
              </div>
              <div className="col-6 col-md-5">
                {row.mode === 'new' ? (
                  <>
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-size`}>
                      Size
                    </label>
                    <input
                      id={`${rowKey}-size`}
                      className="form-control form-control-sm"
                      type="text"
                      placeholder="e.g. 20G"
                      value={row.size}
                      onChange={e => setAdditional(index, { size: e.target.value })}
                      disabled={loading}
                    />
                  </>
                ) : (
                  <>
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-path`}>
                      {bhyve ? 'Existing zvol' : 'Existing disk image'}
                    </label>
                    {bhyve && (
                      <PickOrType
                        id={`${rowKey}-path`}
                        value={row.path}
                        onChange={next => setAdditional(index, { path: next })}
                        options={volumeOptions}
                        blankLabel="Select a zvol…"
                        placeholder="e.g. rpool/vols/data"
                        small
                        disabled={loading}
                      />
                    )}
                    {!bhyve && mediaOptions.length > 0 && (
                      <PickOrType
                        id={`${rowKey}-path`}
                        value={row.path}
                        onChange={next => setAdditional(index, { path: next })}
                        options={mediaOptions}
                        blankLabel="Select a registered disk image…"
                        placeholder="path on the agent host"
                        small
                        disabled={loading}
                      />
                    )}
                    {!bhyve && mediaOptions.length === 0 && (
                      <PathInput
                        id={`${rowKey}-path`}
                        className="form-control form-control-sm"
                        value={row.path}
                        onChange={next => setAdditional(index, { path: next })}
                        server={currentServer}
                        mode="file"
                        pickTitle="Pick the disk image"
                        disabled={loading}
                      />
                    )}
                  </>
                )}
              </div>
              {advanced && vbox && (
                <>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-controller`}>
                      Controller
                    </label>
                    <input
                      id={`${rowKey}-controller`}
                      className="form-control form-control-sm"
                      list="machine-controller-names"
                      placeholder="(default)"
                      value={row.controller ?? ''}
                      onChange={e => setAdditional(index, { controller: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-2 col-md-1">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-port`}>
                      Port
                    </label>
                    <input
                      id={`${rowKey}-port`}
                      className="form-control form-control-sm"
                      type="number"
                      min="0"
                      value={row.port ?? ''}
                      onChange={e => setAdditional(index, { port: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </>
              )}
              {advanced && vbox && row.mode === 'new' && (
                <div className="col-4 col-md-3">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-directory`}>
                    Directory
                  </label>
                  <input
                    id={`${rowKey}-directory`}
                    className="form-control form-control-sm font-monospace"
                    list="machine-media-dirs"
                    placeholder="(machine folder)"
                    value={row.directory ?? ''}
                    onChange={e => setAdditional(index, { directory: e.target.value })}
                    disabled={loading}
                  />
                </div>
              )}
              {advanced && bhyve && row.mode === 'new' && (
                <>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-volume`}>
                      Volume name
                    </label>
                    <input
                      id={`${rowKey}-volume`}
                      className="form-control form-control-sm"
                      type="text"
                      placeholder={`(default — disk${index})`}
                      value={row.volume_name ?? ''}
                      onChange={e => setAdditional(index, { volume_name: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-pool`}>
                      Pool
                    </label>
                    <input
                      id={`${rowKey}-pool`}
                      className="form-control form-control-sm"
                      type="text"
                      placeholder="(default — rpool)"
                      value={row.pool ?? ''}
                      onChange={e => setAdditional(index, { pool: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-dataset`}>
                      Dataset
                    </label>
                    <input
                      id={`${rowKey}-dataset`}
                      className="form-control form-control-sm"
                      type="text"
                      placeholder="(default — zones)"
                      value={row.dataset ?? ''}
                      onChange={e => setAdditional(index, { dataset: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-auto">
                    <div className="form-check form-switch mt-4">
                      <input
                        id={`${rowKey}-sparse`}
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={row.sparse !== false}
                        onChange={e => setAdditional(index, { sparse: e.target.checked })}
                        disabled={loading}
                      />
                      <label className="form-check-label small" htmlFor={`${rowKey}-sparse`}>
                        Sparse
                      </label>
                    </div>
                  </div>
                </>
              )}
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove disk"
                  onClick={() =>
                    setDisks({
                      additional: disks.additional
                        .slice(0, index)
                        .concat(disks.additional.slice(index + 1)),
                    })
                  }
                  disabled={loading}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          );
        })}
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              setDisks({
                additional: [
                  ...disks.additional,
                  {
                    mode: 'new',
                    size: '',
                    path: '',
                    volume_name: '',
                    pool: '',
                    dataset: '',
                    directory: '',
                    sparse: true,
                  },
                ],
              })
            }
            disabled={loading}
          >
            <i className="fas fa-plus me-2" />
            Add Disk
          </button>
        </div>
      </div>

      <h6 className="fw-bold">CD/DVD (ISO)</h6>
      <div className="d-flex flex-column gap-2">
        {disks.cdroms.map((row, index) => {
          const rowKey = `cdrom-${index}`;
          const useCached = (row.source || 'path') === 'iso' && isoList.length > 0;
          return (
            <div className="row g-2 align-items-end" key={rowKey}>
              {isoList.length > 0 && (
                <div className="col-4 col-md-2">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-source`}>
                    Source
                  </label>
                  <select
                    id={`${rowKey}-source`}
                    className="form-select form-select-sm"
                    value={row.source || 'path'}
                    onChange={e => setCdrom(index, { source: e.target.value })}
                    disabled={loading}
                  >
                    <option value="iso">Cached ISO</option>
                    <option value="path">Agent path</option>
                  </select>
                </div>
              )}
              {useCached ? (
                <div className="col-6 col-md-6">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-iso`}>
                    Cached ISO
                  </label>
                  <select
                    id={`${rowKey}-iso`}
                    className="form-select form-select-sm"
                    value={row.iso ?? ''}
                    onChange={e => setCdrom(index, { iso: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">Select…</option>
                    {isoList.map(filename => (
                      <option key={filename} value={filename}>
                        {filename}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-10 col-md-6">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-path`}>
                    ISO path (on the agent host)
                  </label>
                  <PathInput
                    id={`${rowKey}-path`}
                    className="form-control form-control-sm"
                    value={row.path}
                    onChange={next => setCdrom(index, { path: next })}
                    server={currentServer}
                    mode="file"
                    pickTitle="Pick the ISO"
                    disabled={loading}
                  />
                </div>
              )}
              {advanced && (
                <>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-controller`}>
                      Controller
                    </label>
                    <input
                      id={`${rowKey}-controller`}
                      className="form-control form-control-sm"
                      list="machine-controller-names"
                      placeholder="(default)"
                      value={row.controller ?? ''}
                      onChange={e =>
                        setDisks({
                          cdroms: disks.cdroms.map((entry, i) =>
                            i === index ? { ...entry, controller: e.target.value } : entry
                          ),
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className="col-2 col-md-1">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-port`}>
                      Port
                    </label>
                    <input
                      id={`${rowKey}-port`}
                      className="form-control form-control-sm"
                      type="number"
                      min="0"
                      value={row.port ?? ''}
                      onChange={e =>
                        setDisks({
                          cdroms: disks.cdroms.map((entry, i) =>
                            i === index ? { ...entry, port: e.target.value } : entry
                          ),
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                </>
              )}
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove ISO"
                  onClick={() =>
                    setDisks({
                      cdroms: disks.cdroms.slice(0, index).concat(disks.cdroms.slice(index + 1)),
                    })
                  }
                  disabled={loading}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          );
        })}
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              setDisks({
                cdroms: [
                  ...disks.cdroms,
                  { source: isoList.length > 0 ? 'iso' : 'path', path: '', iso: '' },
                ],
              })
            }
            disabled={loading}
          >
            <i className="fas fa-plus me-2" />
            Add ISO
          </button>
        </div>
      </div>

      {bhyve && (
        <>
          <h6 className="fw-bold mt-3">Filesystems (lofs mounts)</h6>
          <div className="d-flex flex-column gap-2">
            {(disks.filesystems || []).map((row, index) => {
              const setRow = patch =>
                setDisks({
                  filesystems: disks.filesystems.map((entry, i) =>
                    i === index ? { ...entry, ...patch } : entry
                  ),
                });
              return (
                <div className="row g-2 align-items-end" key={row.key}>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor={`create-fs-special-${row.key}`}
                    >
                      Host dir (special)
                    </label>
                    <input
                      id={`create-fs-special-${row.key}`}
                      className="form-control form-control-sm"
                      value={row.special}
                      onChange={e => setRow({ special: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1" htmlFor={`create-fs-dir-${row.key}`}>
                      Mount point (dir)
                    </label>
                    <input
                      id={`create-fs-dir-${row.key}`}
                      className="form-control form-control-sm"
                      value={row.dir}
                      onChange={e => setRow({ dir: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-4 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`create-fs-type-${row.key}`}>
                      Type
                    </label>
                    <input
                      id={`create-fs-type-${row.key}`}
                      className="form-control form-control-sm"
                      placeholder="lofs"
                      value={row.type}
                      onChange={e => setRow({ type: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor={`create-fs-options-${row.key}`}
                    >
                      Options
                    </label>
                    <input
                      id={`create-fs-options-${row.key}`}
                      className="form-control form-control-sm"
                      placeholder="e.g. ro"
                      value={row.options}
                      onChange={e => setRow({ options: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      aria-label="Remove mount"
                      onClick={() =>
                        setDisks({
                          filesystems: disks.filesystems.filter(entry => entry.key !== row.key),
                        })
                      }
                      disabled={loading}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  setDisks({
                    filesystems: [
                      ...(disks.filesystems || []),
                      { key: `fs-${Date.now()}`, special: '', dir: '', type: '', options: '' },
                    ],
                  })
                }
                disabled={loading}
              >
                <i className="fas fa-plus me-2" />
                Add Mount
              </button>
            </div>
          </div>
        </>
      )}

      <h6 className="fw-bold mt-3">Boot Order</h6>
      <p className="form-text text-muted mt-0">
        Blank = agent default. For an install-from-ISO flow, put <code>dvd</code> before{' '}
        <code>disk</code> and attach the ISO above.
      </p>
      <BootOrderEditor
        bootOrder={bootOrder}
        setBootOrder={setBootOrder}
        deviceOptions={knobValues?.boot_order || null}
        loading={loading}
      />

      {advanced && (
        <>
          <div className="row g-3 mt-1 mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-zones-diskif">
                Default Controller Type
              </label>
              <select
                id="machine-zones-diskif"
                className="form-select"
                value={diskif}
                onChange={e => setDiskif(e.target.value)}
                disabled={loading}
              >
                <option value="">{`(default — ${diskifDefault})`}</option>
                {diskifOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="form-text text-muted">
                The single-controller shape — create-only; VirtualBox fixes the type once media
                attach. For MULTIPLE controllers use the rows below instead.
              </span>
            </div>
          </div>

          {vbox && (
            <>
              <h6 className="fw-bold">Storage Controllers (device model)</h6>
              <p className="form-text text-muted mt-0">
                VirtualBox&apos;s real storage surface: controllers with ports you attach media to.
                Leave empty for the default single SATA controller. Media rows can address{' '}
                <code>controller/port</code> explicitly.
              </p>
              <div className="d-flex flex-column gap-2 mb-2">
                {(disks.controllers || []).map((row, index) => (
                  <div className="row g-2 align-items-end" key={`controller-${row.key}`}>
                    <div className="col-4 col-md-3">
                      <label
                        className="form-label small mb-1"
                        htmlFor={`controller-type-${row.key}`}
                      >
                        Type
                      </label>
                      <select
                        id={`controller-type-${row.key}`}
                        className="form-select form-select-sm"
                        value={row.type}
                        onChange={e => setController(index, { type: e.target.value })}
                        disabled={loading}
                      >
                        {controllerTypeOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4 col-md-3">
                      <label
                        className="form-label small mb-1"
                        htmlFor={`controller-name-${row.key}`}
                      >
                        Name (optional)
                      </label>
                      <input
                        id={`controller-name-${row.key}`}
                        className="form-control form-control-sm"
                        value={row.name}
                        onChange={e => setController(index, { name: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="col-2 col-md-2">
                      <label
                        className="form-label small mb-1"
                        htmlFor={`controller-ports-${row.key}`}
                      >
                        Ports
                      </label>
                      <input
                        id={`controller-ports-${row.key}`}
                        className="form-control form-control-sm"
                        type="number"
                        min="1"
                        placeholder="auto"
                        value={row.ports}
                        onChange={e => setController(index, { ports: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="col-auto">
                      <div className="form-check mt-3">
                        <input
                          id={`controller-bootable-${row.key}`}
                          className="form-check-input"
                          type="checkbox"
                          checked={row.bootable}
                          onChange={e => setController(index, { bootable: e.target.checked })}
                          disabled={loading}
                        />
                        <label
                          className="form-check-label small"
                          htmlFor={`controller-bootable-${row.key}`}
                        >
                          Bootable
                        </label>
                      </div>
                    </div>
                    <div className="col-auto">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        aria-label="Remove controller"
                        onClick={() =>
                          setDisks({
                            controllers: disks.controllers.filter(entry => entry.key !== row.key),
                          })
                        }
                        disabled={loading}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  setDisks({
                    controllers: [
                      ...(disks.controllers || []),
                      { key: Date.now(), name: '', type: 'sata', ports: '', bootable: false },
                    ],
                  })
                }
                disabled={loading}
              >
                <i className="fas fa-plus me-2" />
                Add Controller
              </button>
              {controllerNames.length > 0 && (
                <datalist id="machine-controller-names">
                  {controllerNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

DisksStep.propTypes = {
  bootSource: PropTypes.string.isRequired,
  setBootSource: PropTypes.func.isRequired,
  disks: PropTypes.object.isRequired,
  setDisks: PropTypes.func.isRequired,
  bootOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  setBootOrder: PropTypes.func.isRequired,
  diskif: PropTypes.string.isRequired,
  setDiskif: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  isoOptions: PropTypes.arrayOf(PropTypes.string),
  currentServer: PropTypes.object,
  vbox: PropTypes.bool,
  bhyve: PropTypes.bool,
  zfsPools: PropTypes.array,
  zfsDatasets: PropTypes.array,
  zfsVolumes: PropTypes.array,
  vboxMedia: PropTypes.array,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

// zones.* create vocabulary — the same names both agents declare,
// translated per hypervisor agent-side. Empty = agent default, never sent.
const SYSTEM_FIELDS = [
  { key: 'bootrom', label: 'Firmware / Boot ROM', options: ['efi', 'bios'] },
  { key: 'hostbridge', label: 'Host Bridge / Chipset', options: ['i440fx'], freeText: true },
  { key: 'vnc', label: 'VNC Console', options: ['on', 'off'] },
  { key: 'acpi', label: 'ACPI', options: ['on', 'off'] },
  { key: 'xhci', label: 'xHCI USB', options: ['on', 'off'] },
  { key: 'netif', label: 'NIC Hardware Type', options: ['virtio', 'e1000'] },
];

// The bhyve bootorder attr (zadm bhyveBootDev grammar, agent-confirmed):
// comma-separated device tokens — bootdisk, disk[N], cdrom[N],
// net[N][=pxe|http], path[N], boot[N], shell — or the compact `cd`|`dc`,
// which rides as a single token. The editor speaks arrays; the wire
// carries the comma-joined string.
export const splitBhyveBootOrder = value =>
  String(value || '')
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);

// Guest-OS-type picker fed by GET /machines/ostypes — grouped by family,
// value = the id settings.os_type takes. A value missing from the list
// stays selectable. Callers keep a plain text input when the feed is absent.
export const OsTypeSelect = ({ id, osTypes, value, onChange, blankLabel, disabled }) => {
  const families = [];
  const byFamily = new Map();
  osTypes.forEach(entry => {
    const family = entry.family_description || entry.family || 'Other';
    if (!byFamily.has(family)) {
      byFamily.set(family, []);
      families.push(family);
    }
    byFamily.get(family).push(entry);
  });
  const known = osTypes.some(entry => entry.id === value);
  return (
    <select id={id} className="form-select" value={value} onChange={onChange} disabled={disabled}>
      <option value="">{blankLabel}</option>
      {value && !known && <option value={value}>{value}</option>}
      {families.map(family => (
        <optgroup key={family} label={family}>
          {byFamily.get(family).map(entry => (
            <option key={entry.id} value={entry.id}>
              {entry.description || entry.id}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

OsTypeSelect.propTypes = {
  id: PropTypes.string.isRequired,
  osTypes: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

// System step — zones.* fields, settings.os_type, cloud-init, the full
// hardware.<section>.<key> knob surface (Advanced), and the raw `vbox`
// passthrough escape hatch.
export const SystemStep = ({
  zones,
  setZone,
  settings,
  setSetting,
  cloudInit,
  setCloudInit,
  vboxJson,
  setVboxJson,
  agentDefaults,
  osTypes,
  hardware,
  onHardwareChange,
  serialRows,
  setSerialRows,
  parallelRows,
  setParallelRows,
  vbox,
  bhyve,
  advanced,
  loading,
}) => {
  // The actual default per field, from GET /machines/defaults.
  const defaultLabel = key => {
    const value = agentDefaults?.zones?.[key] ?? agentDefaults?.settings?.[key];
    return value !== undefined && value !== null && value !== ''
      ? `(default — ${value})`
      : '(agent default)';
  };
  const knobValues = agentDefaults?.knob_values || null;
  // bhyve CPU topology — zones.cpu_configuration simple|complex +
  // zones.complex_cpu_conf [{sockets, cores, threads}] (ONE object in a
  // list — the agents' wire). Limits enforced agent-side (sockets ≤16,
  // cores ≤32, threads ≤2, product ≤32); the hint here is convenience.
  const cpuTopo = Array.isArray(zones.complex_cpu_conf) ? zones.complex_cpu_conf[0] || {} : {};
  const setCpuTopo = patch => setZone('complex_cpu_conf', [{ ...cpuTopo, ...patch }]);
  const topoProduct =
    (Number(cpuTopo.sockets) || 0) * (Number(cpuTopo.cores) || 0) * (Number(cpuTopo.threads) || 0);

  return (
    <>
      <h6 className="fw-bold">System</h6>
      <p className="form-text text-muted mt-0">
        Empty fields keep the default shown (they never ride the request) — the Confirm step shows
        exactly what is sent.
      </p>
      <div className="row g-3 mb-3">
        {SYSTEM_FIELDS.map(field => {
          // knob_values (flat dotted keys) presence means dropdown; the
          // hardcoded list is the fallback for agents without the map.
          const vocabulary = knobValues?.[`zones.${field.key}`] || null;
          const current = zones[field.key] ?? '';
          return (
            <div className="col-6 col-md-4" key={field.key}>
              <label className="form-label" htmlFor={`machine-zones-${field.key}`}>
                {field.label}
              </label>
              {field.freeText && !vocabulary ? (
                <>
                  <input
                    id={`machine-zones-${field.key}`}
                    className="form-control"
                    type="text"
                    list={`machine-zones-${field.key}-options`}
                    placeholder={defaultLabel(field.key)}
                    value={current}
                    onChange={e => setZone(field.key, e.target.value)}
                    disabled={loading}
                  />
                  <datalist id={`machine-zones-${field.key}-options`}>
                    {field.options.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </>
              ) : (
                <select
                  id={`machine-zones-${field.key}`}
                  className="form-select"
                  value={current}
                  onChange={e => setZone(field.key, e.target.value)}
                  disabled={loading}
                >
                  <option value="">{defaultLabel(field.key)}</option>
                  {current && !(vocabulary || field.options).includes(current) && (
                    <option value={current}>{current}</option>
                  )}
                  {(vocabulary || field.options).map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        <div className="col-6 col-md-4">
          <div className="form-check form-switch mt-4">
            <input
              id="machine-zones-guest_agent"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={zones.guest_agent === true}
              onChange={e => setZone('guest_agent', e.target.checked ? true : '')}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="machine-zones-guest_agent">
              QEMU Guest Agent
            </label>
          </div>
          <span className="form-text text-muted">
            Wires the guest-agent channel (live IPs, guest facts) — the guest runs qemu-ga.
          </span>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-setting-os_type">
            Guest OS Type
          </label>
          {osTypes ? (
            <OsTypeSelect
              id="machine-setting-os_type"
              osTypes={osTypes}
              value={settings.os_type ?? ''}
              onChange={e => setSetting('os_type', e.target.value)}
              blankLabel={defaultLabel('os_type')}
              disabled={loading}
            />
          ) : (
            <input
              id="machine-setting-os_type"
              className="form-control"
              type="text"
              placeholder={defaultLabel('os_type')}
              value={settings.os_type ?? ''}
              onChange={e => setSetting('os_type', e.target.value)}
              disabled={loading}
            />
          )}
        </div>
        {bhyve && (
          <>
            <div className="col-12">
              <span className="form-label d-block">
                Boot Order (blank ={' '}
                {agentDefaults?.zones?.bootorder
                  ? `default ${agentDefaults.zones.bootorder}`
                  : 'agent default'}
                )
              </span>
              <BootOrderEditor
                bootOrder={splitBhyveBootOrder(zones.bootorder)}
                setBootOrder={list => setZone('bootorder', list.join(','))}
                deviceOptions={[]}
                maxSlots={Infinity}
                allowCustom
                loading={loading}
              />
              <span className="form-text text-muted">
                Device tokens: bootdisk, disk0, cdrom0, net0=pxe|http, path0, boot0, shell — or the
                compact <code>cd</code>/<code>dc</code> as a single entry.
              </span>
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label" htmlFor="machine-zones-bootnext">
                Boot Next (one boot only)
              </label>
              <input
                id="machine-zones-bootnext"
                className="form-control"
                type="text"
                placeholder="e.g. cdrom0"
                title="Same syntax as Boot Order — applies to the next boot only"
                value={zones.bootnext ?? ''}
                onChange={e => setZone('bootnext', e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label" htmlFor="machine-zones-cpu-config">
                CPU Topology
              </label>
              <select
                id="machine-zones-cpu-config"
                className="form-select"
                value={zones.cpu_configuration ?? ''}
                onChange={e => {
                  const mode = e.target.value;
                  setZone('cpu_configuration', mode);
                  if (mode !== 'complex') {
                    setZone('complex_cpu_conf', '');
                  } else if (!Array.isArray(zones.complex_cpu_conf)) {
                    setZone('complex_cpu_conf', [
                      { sockets: 1, cores: Number(settings.vcpus) || 1, threads: 1 },
                    ]);
                  }
                }}
                disabled={loading}
              >
                <option value="">(default — simple: vcpus count)</option>
                <option value="simple">simple</option>
                <option value="complex">complex (sockets / cores / threads)</option>
              </select>
            </div>
            {zones.cpu_configuration === 'complex' && (
              <>
                {[
                  ['sockets', 16],
                  ['cores', 32],
                  ['threads', 2],
                ].map(([key, max]) => (
                  <div className="col-4 col-md-2" key={key}>
                    <label className="form-label" htmlFor={`machine-cpu-${key}`}>
                      {key[0].toUpperCase() + key.slice(1)}
                    </label>
                    <input
                      id={`machine-cpu-${key}`}
                      className="form-control"
                      type="number"
                      min="1"
                      max={max}
                      value={cpuTopo[key] ?? ''}
                      onChange={e =>
                        setCpuTopo({ [key]: e.target.value === '' ? '' : Number(e.target.value) })
                      }
                      disabled={loading}
                    />
                  </div>
                ))}
                <div className="col-12">
                  <span className={`form-text ${topoProduct > 32 ? 'text-danger' : 'text-muted'}`}>
                    sockets × cores × threads = {topoProduct || '…'} vCPUs — bhyve limits: sockets
                    ≤16, cores ≤32, threads ≤2, product ≤32. Over-limit values are refused by the
                    agent.
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <h6 className="fw-bold">Cloud-Init</h6>
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="machine-cloudinit-enabled"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={cloudInit.enabled}
              onChange={e => setCloudInit({ enabled: e.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="machine-cloudinit-enabled">
              Enable cloud-init
            </label>
          </div>
        </div>
        {cloudInit.enabled && (
          <>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-cloudinit-dns">
                DNS domain
              </label>
              <input
                id="machine-cloudinit-dns"
                className="form-control"
                type="text"
                value={cloudInit.dns_domain}
                onChange={e => setCloudInit({ dns_domain: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-cloudinit-password">
                Password
              </label>
              <input
                id="machine-cloudinit-password"
                className="form-control"
                type="text"
                value={cloudInit.password}
                onChange={e => setCloudInit({ password: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-cloudinit-resolvers">
                Resolvers (comma separated)
              </label>
              <input
                id="machine-cloudinit-resolvers"
                className="form-control"
                type="text"
                placeholder="1.1.1.1, 8.8.8.8"
                value={cloudInit.resolvers}
                onChange={e => setCloudInit({ resolvers: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="machine-cloudinit-sshkey">
                SSH public key
              </label>
              <textarea
                id="machine-cloudinit-sshkey"
                className="form-control font-monospace"
                rows={2}
                value={cloudInit.sshkey}
                onChange={e => setCloudInit({ sshkey: e.target.value })}
                disabled={loading}
              />
            </div>
          </>
        )}
      </div>

      {advanced && vbox && (
        <>
          <h6 className="fw-bold">Hardware</h6>
          <p className="form-text text-muted mt-0">
            The full hypervisor knob surface — blank = VirtualBox default. Values ride{' '}
            <code>hardware.&lt;section&gt;.&lt;key&gt;</code> unvalidated; a bad value fails the
            create with VirtualBox&apos;s own error.
          </p>
          {HARDWARE_SECTIONS.map(section => (
            <details className="mb-2" key={section.id}>
              <summary className="fw-semibold">{section.label}</summary>
              <div className="mt-2 mb-2">
                <HardwareSectionForm
                  section={section}
                  values={hardware[section.id] || {}}
                  onChange={onHardwareChange}
                  knobValues={knobValues}
                  blankLabel="(default)"
                  disabled={loading}
                />
              </div>
            </details>
          ))}
          <details className="mb-3">
            <summary className="fw-semibold">Serial / Parallel Ports</summary>
            <div className="mt-2">
              <SerialPortsEditor
                rows={serialRows}
                onRowsChange={setSerialRows}
                disabled={loading}
              />
              <div className="mt-2">
                <ParallelPortsEditor
                  rows={parallelRows}
                  onRowsChange={setParallelRows}
                  disabled={loading}
                />
              </div>
            </div>
          </details>

          <h6 className="fw-bold">Hypervisor Passthrough (VirtualBox)</h6>
          <label className="form-label" htmlFor="machine-vbox-json">
            <code>vbox</code> section, raw JSON — passed through verbatim, for exotics the sections
            above do not carry (teleporter, cpuid-set, tracing, guest-debug, pci-attach)
          </label>
          <textarea
            id="machine-vbox-json"
            className="form-control font-monospace"
            rows={4}
            placeholder='{"directives": {}}'
            value={vboxJson}
            onChange={e => setVboxJson(e.target.value)}
            disabled={loading}
          />
        </>
      )}
    </>
  );
};

SystemStep.propTypes = {
  zones: PropTypes.object.isRequired,
  setZone: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  cloudInit: PropTypes.object.isRequired,
  setCloudInit: PropTypes.func.isRequired,
  vboxJson: PropTypes.string.isRequired,
  setVboxJson: PropTypes.func.isRequired,
  agentDefaults: PropTypes.object,
  osTypes: PropTypes.array,
  hardware: PropTypes.object.isRequired,
  onHardwareChange: PropTypes.func.isRequired,
  serialRows: PropTypes.array.isRequired,
  setSerialRows: PropTypes.func.isRequired,
  parallelRows: PropTypes.array.isRequired,
  setParallelRows: PropTypes.func.isRequired,
  vbox: PropTypes.bool,
  bhyve: PropTypes.bool,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

export const NetworkStep = ({ networks, onNetworksChange, bridgeChoices, nicEnums, loading }) => (
  <NetworksEditor
    networks={networks}
    onNetworksChange={onNetworksChange}
    bridgeChoices={bridgeChoices}
    nicEnums={nicEnums}
    loading={loading}
  />
);

NetworkStep.propTypes = {
  networks: PropTypes.array.isRequired,
  onNetworksChange: PropTypes.func.isRequired,
  bridgeChoices: PropTypes.array.isRequired,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

export const ProvisioningStep = ({
  provisioners,
  familyName,
  onFamilyChange,
  family,
  versionKey,
  onVersionChange,
  version,
  versionPending,
  showSafeId,
  settings,
  setSetting,
  fieldConfig,
  answers,
  fieldErrors,
  onAnswerChange,
  inventory,
  roles,
  onRolesChange,
  artifacts,
  syncMethod,
  setSyncMethod,
  syncMethodOptions = null,
  safeIdPath,
  setSafeIdPath,
  advanced,
  loading,
}) => (
  <>
    <div className="row g-3 mb-3">
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-create-provisioner">
          Provisioner
        </label>
        <select
          id="machine-create-provisioner"
          className="form-select"
          value={familyName}
          onChange={e => onFamilyChange(e.target.value)}
          disabled={loading}
        >
          <option value="">None — no provisioning</option>
          {provisioners.map(collection => (
            <option key={collection.name} value={collection.name}>
              {collection.metadata?.label || collection.name}
              {collection.valid ? '' : ' (invalid)'}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-create-version">
          Version
        </label>
        <select
          id="machine-create-version"
          className="form-select"
          value={versionKey}
          onChange={e => onVersionChange(e.target.value)}
          disabled={loading || !family}
        >
          <option value="">Select…</option>
          {(family?.versions || []).map(v => (
            <option key={v.dir} value={v.version}>
              {v.version}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-setting-sync-method">
          Sync Method
        </label>
        <select
          id="machine-setting-sync-method"
          className="form-select"
          value={syncMethod}
          onChange={e => setSyncMethod(e.target.value)}
          disabled={loading}
        >
          {(syncMethodOptions || ['rsync', 'scp']).map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
    {version?.description && <p className="form-text text-muted">{version.description}</p>}

    {version && fieldConfig && (
      <div className="mb-3">
        <DslConfigForm
          config={fieldConfig}
          answers={answers}
          errors={fieldErrors}
          onChange={onAnswerChange}
          roles={roles}
          inventory={inventory}
          showAdvanced={advanced}
          idPrefix="prov-field"
          disabled={loading}
        />
      </div>
    )}

    {version && !fieldConfig && versionPending && (
      <p className="form-text text-muted">
        <i className="fas fa-spinner fa-spin me-2" />
        Loading the version&apos;s configuration…
      </p>
    )}

    {version && !fieldConfig && !versionPending && (
      <p className="form-text text-muted">
        This package&apos;s manifest predates the field DSL (no{' '}
        <code>metadata.configuration.groups/fields</code>) — it renders no configuration form.
        Values still ride the document&apos;s <code>vars</code>.
      </p>
    )}

    {(roles.length > 0 || (version && !versionPending)) && (
      <>
        <h6 className="fw-bold">Roles</h6>
        <div className="mb-3">
          <RolesEditor
            roles={roles}
            onRolesChange={onRolesChange}
            loading={loading}
            artifacts={artifacts}
          />
        </div>
      </>
    )}

    {/* Basic, not Advanced — SHI stars it on the main config page (Mark's
        screenshots): domino provisioners can't run without it. Rendered ONLY
        when the picked version's manifest declares id_files (the agents'
        working-copy staging keys) — package-declared need, never a standing
        field; the generic package ships no id files. */}
    {showSafeId && (
      <div className="row g-3">
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-setting-safe-id">
            Safe ID Path (file on the agent host)
          </label>
          <input
            id="machine-setting-safe-id"
            className="form-control"
            type="text"
            value={safeIdPath}
            onChange={e => setSafeIdPath(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
    )}

    {/* Package template values are DEFAULTS, never locks (Mark's ruling
        2026-07-17): the rendered settings become the machine's settings,
        so anything the template would write must be overridable here.
        Blank = the package default rides. */}
    {version && advanced && (
      <>
        <h6 className="fw-bold mt-3">Package Setting Overrides</h6>
        <p className="form-text text-muted mt-0">
          The {`package's`} template values are defaults — set a field to override it in the
          rendered document; blank keeps the package default.
        </p>
        <div className="row g-3">
          <SettingInput
            id="machine-setting-firmware_type"
            label="Firmware Type"
            placeholder="(package default)"
            value={settings.firmware_type}
            onChange={e => setSetting('firmware_type', e.target.value)}
            disabled={loading}
          />
          <SettingInput
            id="machine-setting-provider_type"
            label="Provider Type"
            placeholder="(package default)"
            value={settings.provider_type}
            onChange={e => setSetting('provider_type', e.target.value)}
            disabled={loading}
          />
          <SettingInput
            id="machine-setting-setup_wait"
            label="Setup Wait (seconds)"
            type="number"
            placeholder="(package default)"
            value={settings.setup_wait}
            onChange={e => setSetting('setup_wait', e.target.value)}
            disabled={loading}
          />
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-setting-show_console">
              Show Console
            </label>
            <select
              id="machine-setting-show_console"
              className="form-select"
              value={settings.show_console ?? ''}
              onChange={e => setSetting('show_console', e.target.value)}
              disabled={loading}
            >
              <option value="">(package default)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-setting-debug_build">
              Debug Build
            </label>
            <select
              id="machine-setting-debug_build"
              className="form-select"
              value={settings.debug_build ?? ''}
              onChange={e => setSetting('debug_build', e.target.value)}
              disabled={loading}
            >
              <option value="">(package default)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-setting-post_provision">
              Post-Provision Triggers
            </label>
            <select
              id="machine-setting-post_provision"
              className="form-select"
              value={settings.post_provision ?? ''}
              onChange={e => setSetting('post_provision', e.target.value)}
              disabled={loading}
            >
              <option value="">(package default)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <SettingInput
            id="machine-setting-consoleport"
            label="Console Port"
            type="number"
            min={1025}
            max={65535}
            placeholder="(package default)"
            value={settings.consoleport}
            onChange={e => setSetting('consoleport', e.target.value)}
            disabled={loading}
          />
          <SettingInput
            id="machine-setting-vagrant_user"
            label="Guest SSH User"
            placeholder="(package default)"
            value={settings.vagrant_user}
            onChange={e => setSetting('vagrant_user', e.target.value)}
            disabled={loading}
          />
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-setting-vagrant_user_pass">
              Guest SSH Password
            </label>
            <input
              id="machine-setting-vagrant_user_pass"
              className="form-control"
              type="password"
              autoComplete="new-password"
              placeholder="(package default)"
              value={settings.vagrant_user_pass ?? ''}
              onChange={e => setSetting('vagrant_user_pass', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-setting-vagrant_ssh_insert_key">
              Rotate SSH Key After Provision
            </label>
            <select
              id="machine-setting-vagrant_ssh_insert_key"
              className="form-select"
              value={settings.vagrant_ssh_insert_key ?? ''}
              onChange={e => setSetting('vagrant_ssh_insert_key', e.target.value)}
              disabled={loading}
            >
              <option value="">(package default)</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
            <span className="form-text text-muted">
              Swaps the shared bootstrap key for a per-machine key once provisioning completes.
            </span>
          </div>
        </div>
      </>
    )}
  </>
);

ProvisioningStep.propTypes = {
  provisioners: PropTypes.array.isRequired,
  familyName: PropTypes.string.isRequired,
  onFamilyChange: PropTypes.func.isRequired,
  family: PropTypes.object,
  versionKey: PropTypes.string.isRequired,
  onVersionChange: PropTypes.func.isRequired,
  version: PropTypes.object,
  versionPending: PropTypes.bool,
  showSafeId: PropTypes.bool,
  settings: PropTypes.object.isRequired,
  setSetting: PropTypes.func.isRequired,
  fieldConfig: PropTypes.object,
  answers: PropTypes.object.isRequired,
  fieldErrors: PropTypes.object,
  onAnswerChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  roles: PropTypes.array.isRequired,
  onRolesChange: PropTypes.func.isRequired,
  artifacts: PropTypes.array,
  syncMethod: PropTypes.string.isRequired,
  setSyncMethod: PropTypes.func.isRequired,
  syncMethodOptions: PropTypes.arrayOf(PropTypes.string),
  safeIdPath: PropTypes.string.isRequired,
  setSafeIdPath: PropTypes.func.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/** One-network summary line for the Confirm table. */
const networkSummary = network =>
  [
    network.type || 'net',
    network.bridge && `on ${network.bridge}`,
    network.dhcp4 ? 'dhcp' : network.address || 'unaddressed',
    network.mac && network.mac !== 'auto' && `mac ${network.mac}`,
  ]
    .filter(Boolean)
    .join(' · ');

/** Boot summary from the assembled spec — mirrors the storage phase's scenarios. */
const bootSummary = spec => {
  if (spec.settings?.box) {
    return `box template ${spec.settings.box}${spec.disks?.boot?.size ? ` → ${spec.disks.boot.size}` : ''}`;
  }
  if (spec.disks?.boot?.path) {
    return `existing image ${spec.disks.boot.path}`;
  }
  if (spec.disks?.boot?.size) {
    return `blank disk ${spec.disks.boot.size}`;
  }
  return 'diskless (no boot medium)';
};

export const ConfirmStep = ({ spec }) => {
  const rows = [
    ['Name', spec.name || '(derived from server_id / hostname / domain)'],
    [
      'Provisioner',
      spec.provisioner?.name
        ? `${spec.provisioner.name}/${spec.provisioner.version}`
        : '(none — no provisioning)',
    ],
    ['Boot', bootSummary(spec)],
    ...(spec.disks?.additional_disks?.length
      ? [
          [
            'Additional disks',
            spec.disks.additional_disks.map(disk => disk.size || disk.path).join(', '),
          ],
        ]
      : []),
    ...(spec.disks?.cdroms?.length
      ? [['CD/DVD', spec.disks.cdroms.map(cd => cd.iso || cd.path).join(', ')]]
      : []),
    ...(spec.zones
      ? [
          [
            'System',
            Object.entries(spec.zones)
              .map(([key, value]) => `${key}: ${value}`)
              .join(' · '),
          ],
        ]
      : []),
    ...(spec.tags?.length ? [['Tags', spec.tags.join(', ')]] : []),
    ...(spec.notes ? [['Notes', '(set)']] : []),
    ...(spec.hardware ? [['Hardware', Object.keys(spec.hardware).join(', ')]] : []),
    ...(spec.cloud_init ? [['Cloud-init', 'enabled']] : []),
    ...(spec.vbox ? [['VBox passthrough', '(set — see full body)']] : []),
    ...Object.entries(spec.settings || {}).map(([key, value]) => [key, String(value)]),
    ...(spec.networks || []).map((network, index) => [
      `network ${index + 1}`,
      networkSummary(network),
    ]),
    [
      'Roles enabled',
      (spec.roles || [])
        .filter(role => role?.enabled && role.name)
        .map(role => role.name)
        .join(', ') || '(none)',
    ],
    ['Sync method', spec.sync_method || 'rsync'],
    ['Start after create', spec.start_after_create ? 'yes' : 'no'],
  ];
  return (
    <>
      <p className="form-text text-muted">
        This is exactly what will be sent — use Back to change anything.
      </p>
      <div className="table-responsive">
        <table className="table table-striped table-sm small">
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key}>
                <td className="px-3 py-1">
                  <strong>{key}</strong>
                </td>
                <td className="px-3 py-1">
                  <code className="small">{value}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary className="small">Full request body</summary>
        <pre className="small mt-2">{JSON.stringify(spec, null, 2)}</pre>
      </details>
    </>
  );
};

ConfirmStep.propTypes = {
  spec: PropTypes.object.isRequired,
};
