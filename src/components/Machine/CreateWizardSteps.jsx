import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PathInput } from '../common';
import { humanSize } from '../Host/zfsUtils';

import {
  HARDWARE_SECTIONS,
  HardwareSectionForm,
  SerialPortsEditor,
  ParallelPortsEditor,
  VocabularySelect,
  CpuTopologyInputs,
} from './HardwareEditor';
import { agentDefaultLabel, zfsPoolOptions, zfsDatasetOptions } from './machineHelpers';
import {
  CdromSourceFields,
  ControllerPortFields,
  DiskSourceFields,
  RemoveRowButton,
} from './MediaRowFields';
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
  orgChoices = [],
  orgUuid = '',
  setOrgUuid = null,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const [overrideName, setOverrideName] = useState(!!name.trim());
  const derivedName = `${settings.server_id ? `${settings.server_id}--` : ''}${settings.hostname || '…'}.${settings.domain || '…'}`;
  const computedName = name.trim() ? name.trim() : derivedName;

  return (
    <div className="row g-3">
      <SettingInput
        id="machine-setting-server_id"
        label={t('machineEdit.createWizardSteps.serverId')}
        value={settings.server_id}
        onChange={e => setSetting('server_id', e.target.value)}
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-hostname"
        label={t('machineEdit.createWizardSteps.hostname')}
        value={settings.hostname}
        onChange={e => setSetting('hostname', e.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-setting-domain"
        label={t('machineEdit.createWizardSteps.domain')}
        value={settings.domain}
        onChange={e => setSetting('domain', e.target.value)}
        required
        disabled={loading}
      />
      <SettingInput
        id="machine-create-tags"
        label={t('machineEdit.createWizardSteps.tags')}
        placeholder="e.g. dev, domino"
        value={tagsInput}
        onChange={e => setTagsInput(e.target.value)}
        disabled={loading}
      />
      {setOrgUuid && orgChoices.length > 0 && (
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-org">
            {t('machineEdit.createWizardSteps.owningOrg')}
          </label>
          <select
            id="machine-setting-org"
            className="form-select"
            value={orgUuid}
            onChange={e => setOrgUuid(e.target.value)}
            disabled={loading}
          >
            <option value="">{t('machineEdit.createWizardSteps.primaryOrgDefault')}</option>
            {orgChoices.map(org => (
              <option key={org.uuid} value={org.uuid}>
                {org.name || org.uuid}
              </option>
            ))}
          </select>
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.owningOrgHint')}
          </span>
        </div>
      )}
      {advanced && (
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-create-notes">
            {t('machineEdit.createWizardSteps.notes')}
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
            {t('machineEdit.createWizardSteps.bootPriority')}
          </label>
          <input
            id="machine-setting-boot_priority"
            className="form-control"
            type="number"
            min="1"
            max="100"
            placeholder="95"
            value={settings.boot_priority ?? ''}
            onChange={e => setSetting('boot_priority', e.target.value)}
            disabled={loading}
          />
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.bootPriorityHint')}
          </span>
        </div>
      )}
      <div className="col-12">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="form-text text-muted mt-0">
            {t('machineEdit.createWizardSteps.computedName')} <code>{computedName}</code>
          </span>
          <div className="form-check form-switch mb-0">
            <input
              id="machine-create-name-override"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={overrideName}
              onChange={e => {
                setOverrideName(e.target.checked);
                setName(e.target.checked ? derivedName : '');
              }}
              disabled={loading}
            />
            <label className="form-check-label small" htmlFor="machine-create-name-override">
              {t('machineEdit.createWizardSteps.overrideName')}
            </label>
          </div>
        </div>
        {overrideName && (
          <div className="col-12 col-md-6 mt-2">
            <input
              id="machine-create-name"
              className="form-control"
              type="text"
              aria-label={t('machineEdit.createWizardSteps.machineNameAria')}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
            />
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.overrideNameHint')}
            </span>
          </div>
        )}
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
            {t('machineEdit.createWizardSteps.startAfterCreate')}
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
  orgChoices: PropTypes.array,
  orgUuid: PropTypes.string,
  setOrgUuid: PropTypes.func,
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
  onBrowseBoxVault = null,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
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
        <span className="form-label d-block">{t('machineEdit.createWizardSteps.bootMedia')}</span>
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
              {t(`machineEdit.createWizardSteps.bootSource.${source.id}.label`)}{' '}
              <span className="text-muted small">
                — {t(`machineEdit.createWizardSteps.bootSource.${source.id}.hint`)}
              </span>
            </label>
          </div>
        ))}
      </div>
      {bootSource !== 'template' && (
        <p className="form-text text-muted mb-0">
          {t('machineEdit.createWizardSteps.noBoxTemplateHint')}
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
              {t('machineEdit.createWizardSteps.registry')}
            </label>
            <select
              id="machine-box-registry"
              className="form-select"
              value={sourceFilter}
              onChange={e => onSourceFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value="">{t('machineEdit.createWizardSteps.allRegistries')}</option>
              {sourceNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="machine-setting-box">
              {t('machineEdit.createWizardSteps.image')}
            </label>
            {showBoxSelect ? (
              <VocabularySelect
                id="machine-setting-box"
                value={catalogEntry ? catalogEntry.key : ''}
                entries={visibleOptions.map(entry => ({ value: entry.key, label: entry.value }))}
                blankLabel={
                  visibleOptions.length > 0
                    ? t('machineEdit.createWizardSteps.selectAnImage')
                    : t('machineEdit.createWizardSteps.noImagesFound')
                }
                onChange={key => handleBoxSelect(key)}
                onCustom={() => {
                  setBoxPickCustom(true);
                  setSetting('box', '');
                  onBoxPicked(null);
                }}
                customLabel={t('machineEdit.createWizardSteps.customOrgName')}
                disabled={loading}
              />
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
                {t('machineEdit.createWizardSteps.backToImageList')}
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
              {t('machineEdit.createWizardSteps.boxVersion')}
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
                  {catalogEntry
                    ? t('machineEdit.createWizardSteps.unpinnedResolvesLocally')
                    : t('machineEdit.createWizardSteps.pickAnImageFirst')}
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
                placeholder={t('machineEdit.createWizardSteps.specificVersionPlaceholder')}
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
                  {t('machineEdit.createWizardSteps.boxArchitecture')}
                </label>
                {catalogEntry && catalogEntry.architectures.length > 0 ? (
                  <select
                    id="machine-setting-box_arch"
                    className="form-select"
                    value={settings.box_arch ?? ''}
                    onChange={e => setSetting('box_arch', e.target.value)}
                    disabled={loading}
                  >
                    <option value="">{t('machineEdit.common.na')}</option>
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
                  {t('machineEdit.createWizardSteps.boxRegistryUrl')}
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
          {onBrowseBoxVault && (
            <div className="col-12">
              <button
                type="button"
                className="btn btn-sm btn-outline-info"
                onClick={onBrowseBoxVault}
                disabled={loading}
              >
                <i className="fas fa-box-open me-2" />
                {t('machineEdit.createWizardSteps.browseBoxVault')}
              </button>
              <span className="form-text text-muted ms-2">
                {t('machineEdit.createWizardSteps.browseBoxVaultHint')}
              </span>
            </div>
          )}
          <p className="form-text text-muted mb-0">
            {t('machineEdit.createWizardSteps.boxDownloadHint')}
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
  onBrowseBoxVault: PropTypes.func,
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
  const { t } = useTranslation();
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
          {t('machineEdit.createWizardSteps.vcpus')}
        </label>
        <div className="input-group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label={t('machineEdit.createWizardSteps.fewerVcpus')}
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
            aria-label={t('machineEdit.createWizardSteps.moreVcpus')}
            onClick={() => setSetting('vcpus', Math.max(1, vcpus + 1))}
            disabled={loading}
          >
            +
          </button>
        </div>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-setting-memory">
          {t('machineEdit.createWizardSteps.memory')}
        </label>
        <div className="input-group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            aria-label={t('machineEdit.createWizardSteps.lessMemory')}
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
            aria-label={t('machineEdit.createWizardSteps.moreMemory')}
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
  const { t } = useTranslation();
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
              aria-label={t('machineEdit.createWizardSteps.removeBootDevice')}
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
              aria-label={t('machineEdit.createWizardSteps.addBootDevice')}
              value=""
              onChange={e => e.target.value && setBootOrder([...bootOrder, e.target.value])}
              disabled={loading}
            >
              <option value="">{t('machineEdit.createWizardSteps.addDeviceToBootOrder')}</option>
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
                aria-label={t('machineEdit.createWizardSteps.bootDeviceToken')}
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
                title={t('machineEdit.createWizardSteps.addThisDeviceTitle')}
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

// Clone-strategy vocabulary (converged wire, both agents): the LEGAL SET is
// pool-aware on bhyve — target pool holds the template → clone|copy, else
// copy|localize — and a fixed clone|copy on VirtualBox. copy is legal
// everywhere and pre-selected; the agent refuses illegal picks itself.
const CloneStrategySelect = ({ value, strategies, onChange, disabled }) => {
  const { t } = useTranslation();
  const current = strategies.includes(value) ? value : 'copy';
  return (
    <div className="col-6 col-md-4">
      <label className="form-label" htmlFor="machine-disk-clone-strategy">
        {t('machineEdit.createWizardSteps.cloneStrategy')}
      </label>
      <select
        id="machine-disk-clone-strategy"
        className="form-select"
        value={current}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        {strategies.map(strategy => (
          <option key={strategy} value={strategy}>
            {t(`machineEdit.createWizardSteps.cloneStrategyLabel.${strategy}`)}
          </option>
        ))}
      </select>
      <span className="form-text text-muted">
        {t(`machineEdit.createWizardSteps.cloneStrategyHint.${current}`)}
      </span>
    </div>
  );
};

CloneStrategySelect.propTypes = {
  value: PropTypes.string.isRequired,
  strategies: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Boot-zvol ZFS placement (bhyve) — live pool/dataset pickers with the
// Custom… escape. availablePools = where the selected template already
// lives (its row's available_pools, or the landing pool for a
// not-yet-downloaded box); a pool outside it flips the strategy set.
const BootZfsPlacement = ({
  disks,
  setDisks,
  zfsPools,
  zfsDatasets,
  showClone,
  availablePools,
  defaultPool,
  loading,
}) => {
  const { t } = useTranslation();
  const fallbackPool = defaultPool || 'rpool';
  const poolOptions = zfsPoolOptions(zfsPools);
  const datasetOptions = zfsDatasetOptions(
    zfsDatasets,
    (disks.bootPool || '').trim() || fallbackPool
  );
  const strategiesFor = pool =>
    availablePools && !availablePools.includes(pool) ? ['copy', 'localize'] : ['clone', 'copy'];
  const strategies = strategiesFor((disks.bootPool || '').trim() || fallbackPool);
  const handlePoolChange = next => {
    const patch = { bootPool: next };
    if (!strategiesFor((next || '').trim() || fallbackPool).includes(disks.bootCloneStrategy)) {
      patch.bootCloneStrategy = 'copy';
    }
    setDisks(patch);
  };
  return (
    <>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-pool">
          {t('machineEdit.createWizardSteps.zfsPool')}
        </label>
        <PickOrType
          id="machine-disk-boot-pool"
          value={disks.bootPool}
          onChange={handlePoolChange}
          options={poolOptions}
          blankLabel={fallbackPool}
          placeholder={t('machineEdit.createWizardSteps.poolNamePlaceholder')}
          disabled={loading}
        />
      </div>
      <div className="col-6 col-md-4">
        <label className="form-label" htmlFor="machine-disk-boot-dataset">
          {t('machineEdit.createWizardSteps.parentDataset')}
        </label>
        <PickOrType
          id="machine-disk-boot-dataset"
          value={disks.bootDataset}
          onChange={next => setDisks({ bootDataset: next })}
          options={datasetOptions}
          blankLabel="zones"
          placeholder="e.g. zones/companyA"
          disabled={loading}
        />
        <span className="form-text text-muted">
          {t('machineEdit.createWizardSteps.bootZvolLandsHint')}
        </span>
      </div>
      {showClone && (
        <CloneStrategySelect
          value={disks.bootCloneStrategy}
          strategies={strategies}
          onChange={next => setDisks({ bootCloneStrategy: next })}
          disabled={loading}
        />
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
  availablePools: PropTypes.arrayOf(PropTypes.string),
  defaultPool: PropTypes.string,
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
  availablePools,
  defaultPool,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-3">
      {/* The TYPE selector — the same state as the OS/Box step's Boot media
        radios, surfaced HERE too (the disks screen must show its own
        discriminator; Mark's ask). */}
      <div className="col-12">
        <div
          className="btn-group"
          role="group"
          aria-label={t('machineEdit.createWizardSteps.bootDiskType')}
        >
          {BOOT_SOURCES.map(source => (
            <button
              type="button"
              key={source.id}
              className={`btn btn-sm ${bootSource === source.id ? 'btn-primary' : 'btn-outline-secondary'}`}
              title={t(`machineEdit.createWizardSteps.bootSource.${source.id}.hint`)}
              onClick={() => setBootSource(source.id)}
              disabled={loading}
            >
              {t(`machineEdit.createWizardSteps.bootSource.${source.id}.label`)}
            </button>
          ))}
        </div>
      </div>
      {bootSource === 'none' && (
        <p className="form-text text-muted mb-0">
          {t('machineEdit.createWizardSteps.disklessHint')}
        </p>
      )}
      {bootSource === 'existing' && (
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-disk-boot-path">
            {bhyve
              ? t('machineEdit.createWizardSteps.existingZvolDatasetPath')
              : t('machineEdit.createWizardSteps.existingDiskImagePath')}
          </label>
          {bhyve && (
            <PickOrType
              id="machine-disk-boot-path"
              value={disks.bootPath}
              onChange={next => setDisks({ bootPath: next })}
              options={volumeOptions}
              blankLabel={t('machineEdit.createWizardSteps.selectAZvol')}
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
              blankLabel={t('machineEdit.createWizardSteps.selectRegisteredDiskImage')}
              placeholder={t('machineEdit.createWizardSteps.pathOnAgentHost')}
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
              pickTitle={t('machineEdit.createWizardSteps.pickDiskImage')}
              disabled={loading}
            />
          )}
          <p className="form-text text-muted mb-0">
            {t('machineEdit.createWizardSteps.attachedAsIsHint')}
          </p>
        </div>
      )}
      {(bootSource === 'template' || bootSource === 'scratch') && (
        <>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-disk-boot-size">
              {bootSource === 'template'
                ? t('machineEdit.createWizardSteps.diskSizeBlankTemplate')
                : t('machineEdit.createWizardSteps.diskSize')}
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
                    {t('machineEdit.createWizardSteps.sparse')}
                  </label>
                </div>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="machine-disk-boot-volume">
                  {t('machineEdit.createWizardSteps.volumeName')}
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
                  availablePools={availablePools}
                  defaultPool={defaultPool}
                  loading={loading}
                />
              )}
              {vbox && bootSource === 'template' && (
                <CloneStrategySelect
                  value={disks.bootCloneStrategy}
                  strategies={['clone', 'copy']}
                  onChange={next => setDisks({ bootCloneStrategy: next })}
                  disabled={loading}
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
            {t('machineEdit.createWizardSteps.directoryWhereCreatedDiskLands')}
          </label>
          <PathInput
            id="machine-disk-boot-directory"
            className="form-control font-monospace"
            value={disks.bootDirectory}
            onChange={next => setDisks({ bootDirectory: next })}
            server={currentServer}
            mode="directory"
            pickTitle={t('machineEdit.createWizardSteps.pickFolderForCreatedDisk')}
            placeholder={t('machineEdit.createWizardSteps.machineFolderPlaceholder')}
            list="machine-media-dirs"
            disabled={loading}
          />
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.browsePickOrTypeHint')}
          </span>
        </div>
      )}
      {/* VBox attachment placement — controller/port ride EVERY entry (the
        frozen wire); blank = default controller / next free port. */}
      {vbox && advanced && bootSource !== 'none' && (
        <>
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="machine-disk-boot-controller">
              {t('machineEdit.controllerPortFields.controller')}
            </label>
            <input
              id="machine-disk-boot-controller"
              className="form-control"
              list="machine-controller-names"
              placeholder={t('machineEdit.common.na')}
              value={disks.bootController}
              onChange={e => setDisks({ bootController: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="machine-disk-boot-port">
              {t('machineEdit.controllerPortFields.port')}
            </label>
            <input
              id="machine-disk-boot-port"
              className="form-control"
              type="number"
              min="0"
              placeholder={t('machineEdit.createWizardSteps.nextFreePlaceholder')}
              value={disks.bootPort}
              onChange={e => setDisks({ bootPort: e.target.value })}
              disabled={loading}
            />
          </div>
        </>
      )}
    </div>
  );
};

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
  availablePools: PropTypes.arrayOf(PropTypes.string),
  defaultPool: PropTypes.string,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

// Volume rows carry in_use_by (machine name | null) — an in-use zvol
// stays pickable (the agent refuses; `force: true` is the override) but
// the label says who holds it.
const buildVolumeOptions = (zfsVolumes, t) =>
  zfsVolumes.map(volume => ({
    value: volume.name,
    label: volume.in_use_by
      ? t('machineEdit.createWizardSteps.inUseByLabel', {
          name: volume.name,
          user: volume.in_use_by,
        })
      : volume.name,
  }));

// GET /media rows (frozen wire): in_use_by is an ARRAY (VBox media can
// multi-attach); size_bytes numeric.
const buildMediaOptions = (vboxMedia, t) =>
  vboxMedia.map(medium => {
    const size = Number.isFinite(medium.size_bytes) ? ` — ${humanSize(medium.size_bytes)}` : '';
    const holders =
      Array.isArray(medium.in_use_by) && medium.in_use_by.length > 0
        ? t('machineEdit.createWizardSteps.inUseByListSuffix', {
            list: medium.in_use_by.join(', '),
          })
        : '';
    return { value: medium.path, label: `${medium.path}${size}${holders}` };
  });

// Known media directories (from registered-media paths, both separators —
// the agent host may be Windows) — the `directory` datalist feed.
const buildMediaDirs = vboxMedia => [
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

const existingDiskPickerFor = (bhyve, volumeOptions, mediaOptions, t) => {
  if (bhyve) {
    return {
      options: volumeOptions,
      blankLabel: t('machineEdit.createWizardSteps.selectAZvol'),
      placeholder: 'e.g. rpool/vols/data',
    };
  }
  return mediaOptions.length > 0
    ? {
        options: mediaOptions,
        blankLabel: t('machineEdit.createWizardSteps.selectRegisteredDiskImage'),
        placeholder: t('machineEdit.createWizardSteps.pathOnAgentHost'),
      }
    : null;
};

const diskifOptionsFrom = knobValues => knobValues?.['zones.diskif'] || DISKIF_OPTIONS;

const controllerTypeOptionsFrom = knobValues =>
  knobValues?.['disks.controller_type'] || [...DISKIF_OPTIONS, 'usb', 'floppy'];

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
  availablePools = null,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const diskifDefault = agentDefaultLabel(agentDefaults, 'diskif');
  const knobValues = agentDefaults?.knob_values || null;
  // The rows share the boot placement's pickers (Mark: same treatment
  // everywhere) — per-row dataset options follow that ROW's pool.
  const poolOptions = zfsPoolOptions(zfsPools);
  const volumeOptions = buildVolumeOptions(zfsVolumes, t);
  const mediaOptions = buildMediaOptions(vboxMedia, t);
  const mediaDirs = buildMediaDirs(vboxMedia);
  const existingDiskPicker = existingDiskPickerFor(bhyve, volumeOptions, mediaOptions, t);
  const diskifOptions = diskifOptionsFrom(knobValues);
  const controllerTypeOptions = controllerTypeOptionsFrom(knobValues);
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
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.bootDisk')}</h6>
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
        availablePools={availablePools}
        defaultPool={agentDefaults?.disks?.boot?.pool || null}
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

      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.additionalDisks')}</h6>
      <div className="d-flex flex-column gap-2 mb-3">
        {disks.additional.map((row, index) => {
          const rowKey = `additional-disk-${index}`;
          return (
            <div className="row g-2 align-items-end" key={rowKey}>
              <DiskSourceFields
                idPrefix={rowKey}
                sourceLabel={t('machineEdit.createWizardSteps.source')}
                valueCol="col-6 col-md-5"
                sizeLabel={t('machineEdit.createWizardSteps.size')}
                sizePlaceholder="e.g. 20G"
                existingLabel={
                  bhyve
                    ? t('machineEdit.createWizardSteps.existingZvol')
                    : t('machineEdit.createWizardSteps.existingDiskImage')
                }
                row={row}
                onPatch={patch => setAdditional(index, patch)}
                picker={existingDiskPicker}
                currentServer={currentServer}
                disabled={loading}
              />
              {advanced && vbox && (
                <ControllerPortFields
                  idPrefix={rowKey}
                  row={row}
                  onPatch={patch => setAdditional(index, patch)}
                  controllerList="machine-controller-names"
                  disabled={loading}
                />
              )}
              {advanced && vbox && row.mode === 'new' && (
                <div className="col-4 col-md-3">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-directory`}>
                    {t('machineEdit.createWizardSteps.directory')}
                  </label>
                  <PathInput
                    id={`${rowKey}-directory`}
                    className="form-control form-control-sm font-monospace"
                    value={row.directory ?? ''}
                    onChange={next => setAdditional(index, { directory: next })}
                    server={currentServer}
                    mode="directory"
                    pickTitle={t('machineEdit.createWizardSteps.pickFolderForCreatedDisk')}
                    placeholder={t('machineEdit.createWizardSteps.machineFolderPlaceholder')}
                    list="machine-media-dirs"
                    disabled={loading}
                  />
                </div>
              )}
              {advanced && bhyve && row.mode === 'new' && (
                <>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-volume`}>
                      {t('machineEdit.createWizardSteps.volumeName')}
                    </label>
                    <input
                      id={`${rowKey}-volume`}
                      className="form-control form-control-sm"
                      type="text"
                      placeholder={`disk${index}`}
                      value={row.volume_name ?? ''}
                      onChange={e => setAdditional(index, { volume_name: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-pool`}>
                      {t('machineEdit.storageDevicesEditor.pool')}
                    </label>
                    <PickOrType
                      id={`${rowKey}-pool`}
                      value={row.pool ?? ''}
                      onChange={next => setAdditional(index, { pool: next })}
                      options={poolOptions}
                      blankLabel="rpool"
                      placeholder="pool name"
                      small
                      disabled={loading}
                    />
                  </div>
                  <div className="col-3 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`${rowKey}-dataset`}>
                      {t('machineEdit.createWizardSteps.dataset')}
                    </label>
                    <PickOrType
                      id={`${rowKey}-dataset`}
                      value={row.dataset ?? ''}
                      onChange={next => setAdditional(index, { dataset: next })}
                      options={zfsDatasetOptions(zfsDatasets, (row.pool || '').trim() || 'rpool')}
                      blankLabel="zones"
                      placeholder="e.g. zones/companyA"
                      small
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
                        {t('machineEdit.createWizardSteps.sparse')}
                      </label>
                    </div>
                  </div>
                </>
              )}
              <RemoveRowButton
                label={t('machineEdit.createWizardSteps.removeDisk')}
                onClick={() =>
                  setDisks({
                    additional: disks.additional
                      .slice(0, index)
                      .concat(disks.additional.slice(index + 1)),
                  })
                }
                disabled={loading}
              />
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
            {t('machineEdit.createWizardSteps.addDisk')}
          </button>
        </div>
      </div>

      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.cdDvdIso')}</h6>
      <div className="d-flex flex-column gap-2">
        {disks.cdroms.map((row, index) => {
          const rowKey = `cdrom-${index}`;
          return (
            <div className="row g-2 align-items-end" key={rowKey}>
              <CdromSourceFields
                idPrefix={rowKey}
                sourceLabel={t('machineEdit.createWizardSteps.source')}
                sourceCol="col-4 col-md-2"
                isoCol="col-6 col-md-6"
                pathCol="col-10 col-md-6"
                row={row}
                onPatch={patch => setCdrom(index, patch)}
                isoOptions={isoList}
                currentServer={currentServer}
                disabled={loading}
              />
              {advanced && (
                <ControllerPortFields
                  idPrefix={rowKey}
                  row={row}
                  onPatch={patch => setCdrom(index, patch)}
                  controllerList="machine-controller-names"
                  disabled={loading}
                />
              )}
              <RemoveRowButton
                label={t('machineEdit.createWizardSteps.removeIso')}
                onClick={() =>
                  setDisks({
                    cdroms: disks.cdroms.slice(0, index).concat(disks.cdroms.slice(index + 1)),
                  })
                }
                disabled={loading}
              />
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
            {t('machineEdit.createWizardSteps.addIso')}
          </button>
        </div>
      </div>

      {bhyve && (
        <>
          <h6 className="fw-bold mt-3">
            {t('machineEdit.createWizardSteps.filesystemsLofsMounts')}
          </h6>
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
                      {t('machineEdit.filesystemsEditor.hostDir')}
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
                      {t('machineEdit.filesystemsEditor.mountPoint')}
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
                      {t('machineEdit.filesystemsEditor.type')}
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
                      {t('machineEdit.filesystemsEditor.options')}
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
                  <RemoveRowButton
                    label={t('machineEdit.createWizardSteps.removeMount')}
                    onClick={() =>
                      setDisks({
                        filesystems: disks.filesystems.filter(entry => entry.key !== row.key),
                      })
                    }
                    disabled={loading}
                  />
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
                {t('machineEdit.filesystemsEditor.addMount')}
              </button>
            </div>
          </div>
        </>
      )}

      <h6 className="fw-bold mt-3">{t('machineEdit.createWizardSteps.bootOrder')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.bootOrderIsoHintPrefix')} <code>dvd</code>{' '}
        {t('machineEdit.createWizardSteps.bootOrderIsoHintMiddle')} <code>disk</code>{' '}
        {t('machineEdit.createWizardSteps.bootOrderIsoHintTail')}
      </p>
      <BootOrderEditor
        bootOrder={bootOrder}
        setBootOrder={setBootOrder}
        deviceOptions={knobValues?.boot_order || null}
        loading={loading}
      />

      {advanced && (
        <>
          {bhyve && (
            <div className="row g-3 mt-1 mb-3">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="machine-zones-diskif">
                  {t('machineEdit.createWizardSteps.defaultControllerType')}
                </label>
                <VocabularySelect
                  id="machine-zones-diskif"
                  value={diskif}
                  entries={diskifOptions}
                  blankLabel={diskifDefault}
                  onChange={setDiskif}
                  disabled={loading}
                />
                <span className="form-text text-muted">
                  {t('machineEdit.createWizardSteps.singleControllerShapeHint')}
                </span>
              </div>
            </div>
          )}

          {vbox && (
            <>
              <h6 className="fw-bold">{t('machineEdit.createWizardSteps.storageControllers')}</h6>
              <p className="form-text text-muted mt-0">
                {t('machineEdit.createWizardSteps.vboxStorageSurfaceHint')}{' '}
                <code>controller/port</code> {t('machineEdit.createWizardSteps.explicitlySuffix')}
              </p>
              <div className="d-flex flex-column gap-2 mb-2">
                {(disks.controllers || []).map((row, index) => (
                  <div className="row g-2 align-items-end" key={`controller-${row.key}`}>
                    <div className="col-4 col-md-3">
                      <label
                        className="form-label small mb-1"
                        htmlFor={`controller-type-${row.key}`}
                      >
                        {t('machineEdit.createWizardSteps.type')}
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
                        {t('machineEdit.storageDevicesEditor.nameOptional')}
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
                        {t('machineEdit.createWizardSteps.ports')}
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
                          {t('machineEdit.createWizardSteps.bootable')}
                        </label>
                      </div>
                    </div>
                    <RemoveRowButton
                      label={t('machineEdit.createWizardSteps.removeController')}
                      onClick={() =>
                        setDisks({
                          controllers: disks.controllers.filter(entry => entry.key !== row.key),
                        })
                      }
                      disabled={loading}
                    />
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
                {t('machineEdit.createWizardSteps.addController')}
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
  availablePools: PropTypes.arrayOf(PropTypes.string),
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

// zones.* create vocabulary — Solaris/bhyve ONLY (Mark's ruling): vbox never
// reads the zones section; its knobs live under settings./hardware./disks./
// networks. Empty = agent default, never sent.
const SYSTEM_FIELDS = [
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

// firmware_type ↔ bootrom linkage (converged contract): a non-CSM ROM boots
// UEFI only → picking one LOCKS Firmware to UEFI; Firmware BIOS filters the
// ROM list to *_CSM entries; explicit bootrom wins agent-side.
const bootromLocksUefiFor = (bhyve, bootromValue) =>
  bhyve && bootromValue !== '' && !bootromValue.toUpperCase().endsWith('_CSM');

const bootromChoicesFor = (knobValues, firmwareType) => {
  const list = knobValues?.['zones.bootrom'] || [];
  return firmwareType === 'BIOS'
    ? list.filter(rom => String(rom).toUpperCase().endsWith('_CSM'))
    : list;
};

const firmwareChoicesFor = (knobValues, locksUefi) =>
  locksUefi ? ['UEFI'] : knobValues?.['settings.firmware_type'] || ['UEFI', 'BIOS'];

// System step — zones.* fields (bhyve), settings.os_type, cloud-init, the
// full vbox.<section>.<key> knob surface (Advanced), and the raw
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
  bhyveBootDevices = [],
  vbox,
  bhyve,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const defaultLabel = key => agentDefaultLabel(agentDefaults, key);
  const knobValues = agentDefaults?.knob_values || null;
  const cpuTopo = Array.isArray(zones.complex_cpu_conf) ? zones.complex_cpu_conf[0] || {} : {};
  const setCpuTopo = patch => setZone('complex_cpu_conf', [{ ...cpuTopo, ...patch }]);
  const bootromLocksUefi = bootromLocksUefiFor(bhyve, String(zones.bootrom ?? '').trim());
  const bootromChoices = bootromChoicesFor(knobValues, settings.firmware_type);
  const firmwareChoices = firmwareChoicesFor(knobValues, bootromLocksUefi);

  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.system')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machineEdit.createWizardSteps.emptyFieldsHint')}
      </p>
      <div className="row g-3 mb-3">
        {bhyve &&
          SYSTEM_FIELDS.map(field => {
            // knob_values (flat dotted keys) presence means dropdown; the
            // hardcoded list is the fallback for agents without the map.
            const vocabulary = knobValues?.[`zones.${field.key}`] || null;
            const current = zones[field.key] ?? '';
            return (
              <div className="col-6 col-md-4" key={field.key}>
                <label className="form-label" htmlFor={`machine-zones-${field.key}`}>
                  {t(`machineEdit.createWizardSteps.systemField.${field.key}`)}
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
                  <VocabularySelect
                    id={`machine-zones-${field.key}`}
                    value={current}
                    entries={vocabulary || field.options}
                    blankLabel={defaultLabel(field.key)}
                    onChange={next => setZone(field.key, next)}
                    disabled={loading}
                  />
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
              {t('machineEdit.generalSettingsTab.qemuGuestAgent')}
            </label>
          </div>
          <span className="form-text text-muted">
            {t('machineEdit.createWizardSteps.guestAgentChannelHint')}
          </span>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-system-firmware">
            {t('machineEdit.createWizardSteps.firmware')}
          </label>
          <VocabularySelect
            id="machine-system-firmware"
            value={settings.firmware_type ?? ''}
            entries={firmwareChoices}
            blankLabel={defaultLabel('firmware_type')}
            onChange={next => setSetting('firmware_type', next)}
            disabled={loading}
          />
          {bootromLocksUefi && (
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.lockedToUefiHint')}
            </span>
          )}
        </div>
        {advanced && bhyve && (
          <div className="col-6 col-md-4">
            <label className="form-label" htmlFor="machine-zones-bootrom">
              {t('machineEdit.createWizardSteps.bootRomOverride')}
            </label>
            <VocabularySelect
              id="machine-zones-bootrom"
              value={zones.bootrom ?? ''}
              entries={bootromChoices}
              blankLabel={defaultLabel('bootrom')}
              onChange={next => {
                setZone('bootrom', next);
                if (next && !next.toUpperCase().endsWith('_CSM')) {
                  setSetting('firmware_type', 'UEFI');
                }
              }}
              disabled={loading}
            />
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.explicitRomWinsHint')}
            </span>
          </div>
        )}
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="machine-setting-os_type">
            {t('machineEdit.createWizardSteps.guestOsType')}
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
                {t('machineEdit.createWizardSteps.bootOrderBlank')}{' '}
                {agentDefaults?.zones?.bootorder
                  ? t('machineEdit.createWizardSteps.defaultValue', {
                      value: agentDefaults.zones.bootorder,
                    })
                  : t('machineEdit.createWizardSteps.agentDefault')}
                )
              </span>
              <BootOrderEditor
                bootOrder={splitBhyveBootOrder(zones.bootorder)}
                setBootOrder={list => setZone('bootorder', list.join(','))}
                deviceOptions={bhyveBootDevices}
                maxSlots={Infinity}
                allowCustom
                loading={loading}
              />
              <span className="form-text text-muted">
                {t('machineEdit.createWizardSteps.deviceTokensHint')}
              </span>
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label" htmlFor="machine-zones-bootnext">
                {t('machineEdit.createWizardSteps.bootNext')}
              </label>
              <input
                id="machine-zones-bootnext"
                className="form-control"
                type="text"
                list={bhyveBootDevices.length > 0 ? 'machine-zones-bootnext-options' : undefined}
                placeholder="e.g. cdrom0"
                title={t('machineEdit.createWizardSteps.bootNextHint')}
                value={zones.bootnext ?? ''}
                onChange={e => setZone('bootnext', e.target.value)}
                disabled={loading}
              />
              {bhyveBootDevices.length > 0 && (
                <datalist id="machine-zones-bootnext-options">
                  {bhyveBootDevices.map(device => (
                    <option key={device} value={device} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label" htmlFor="machine-zones-cpu-config">
                {t('machineEdit.machineSettings.cpuTopology')}
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
                <option value="">{t('machineEdit.createWizardSteps.simpleDefault')}</option>
                <option value="complex">{t('machineEdit.machineSettings.complexTopo')}</option>
              </select>
            </div>
            {zones.cpu_configuration === 'complex' && (
              <CpuTopologyInputs
                idPrefix="machine-cpu"
                topo={cpuTopo}
                onField={(key, next) => setCpuTopo({ [key]: next })}
                disabled={loading}
              />
            )}
          </>
        )}
      </div>

      <h6 className="fw-bold">{t('machineEdit.createWizardSteps.cloudInit')}</h6>
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
              {t('machineEdit.createWizardSteps.enableCloudInit')}
            </label>
          </div>
        </div>
        {cloudInit.enabled && (
          <>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-cloudinit-dns">
                {t('machineEdit.generalSettingsTab.dnsDomain')}
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
                {t('machineEdit.createWizardSteps.password')}
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
                {t('machineEdit.createWizardSteps.resolversCommaSeparated')}
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
                {t('machineEdit.generalSettingsTab.sshPublicKey')}
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
          <h6 className="fw-bold">{t('machineEdit.createWizardSteps.hardware')}</h6>
          <p className="form-text text-muted mt-0">
            {t('machineEdit.createWizardSteps.hypervisorKnobSurfaceHint')}{' '}
            <code>vbox.&lt;section&gt;.&lt;key&gt;</code>{' '}
            {t('machineEdit.createWizardSteps.unvalidatedErrorHint')}
          </p>
          {HARDWARE_SECTIONS.map(section => (
            <details className="mb-2" key={section.id}>
              <summary className="fw-semibold">
                {t(`machineEdit.hardwareSections.${section.id}`)}
              </summary>
              <div className="mt-2 mb-2">
                <HardwareSectionForm
                  section={section}
                  values={hardware[section.id] || {}}
                  onChange={onHardwareChange}
                  knobValues={knobValues}
                  blankLabel={t('machineEdit.common.na')}
                  disabled={loading}
                />
              </div>
            </details>
          ))}
          <details className="mb-3">
            <summary className="fw-semibold">
              {t('machineEdit.createWizardSteps.serialParallelPorts')}
            </summary>
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

          <h6 className="fw-bold">
            {t('machineEdit.createWizardSteps.hypervisorPassthroughVbox')}
          </h6>
          <label className="form-label" htmlFor="machine-vbox-json">
            <code>vbox</code> {t('machineEdit.createWizardSteps.vboxSectionRawJsonHint')}
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
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string),
  vbox: PropTypes.bool,
  bhyve: PropTypes.bool,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

export const NetworkStep = ({
  networks,
  onNetworksChange,
  bridgeChoices,
  ipSuggestions,
  nicEnums,
  loading,
}) => (
  <NetworksEditor
    networks={networks}
    onNetworksChange={onNetworksChange}
    bridgeChoices={bridgeChoices}
    ipSuggestions={ipSuggestions}
    nicEnums={nicEnums}
    loading={loading}
  />
);

NetworkStep.propTypes = {
  networks: PropTypes.array.isRequired,
  onNetworksChange: PropTypes.func.isRequired,
  bridgeChoices: PropTypes.array.isRequired,
  ipSuggestions: PropTypes.object,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

const removeTransportBlankLabel = (value, t) => {
  if (value === null) {
    return t('machineEdit.common.na');
  }
  return value
    ? t('machineEdit.networkAdaptersEditor.remove')
    : t('machineEdit.networkAdaptersEditor.keep');
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
  agentDefaults = null,
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
  removeTransport,
  setRemoveTransport,
  removeTransportDefault = null,
  safeIdPath,
  setSafeIdPath,
  advanced,
  loading,
}) => {
  const { t } = useTranslation();
  const defaultLabel = key => agentDefaultLabel(agentDefaults, key);
  return (
    <>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-create-provisioner">
            {t('machineEdit.createWizardSteps.provisioner')}
          </label>
          <select
            id="machine-create-provisioner"
            className="form-select"
            value={familyName}
            onChange={e => onFamilyChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{t('machineEdit.createWizardSteps.noProvisioning')}</option>
            {provisioners.map(collection => (
              <option key={collection.name} value={collection.name}>
                {collection.metadata?.label || collection.name}
                {collection.valid ? '' : t('machineEdit.createWizardSteps.invalidSuffix')}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-create-version">
            {t('machineEdit.createWizardSteps.version')}
          </label>
          <select
            id="machine-create-version"
            className="form-select"
            value={versionKey}
            onChange={e => onVersionChange(e.target.value)}
            disabled={loading || !family}
          >
            <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
            {(family?.versions || []).map(v => (
              <option key={v.dir} value={v.version}>
                {v.version}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-sync-method">
            {t('machineEdit.createWizardSteps.syncMethod')}
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

      {/* The provisioning-transport removal signal (one per-create key, both
        agents fold it into their native transport). Absent = each agent's
        RULED default — keep on VirtualBox (home/dev), remove on zoneweaver
        (datacenter); the effective default shows when the agent serves it. */}
      {familyName && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="machine-create-remove-transport">
              {t('machineEdit.createWizardSteps.removeProvisioningNetwork')}
            </label>
            <select
              id="machine-create-remove-transport"
              className="form-select"
              value={removeTransport}
              onChange={e => setRemoveTransport(e.target.value)}
              disabled={loading}
            >
              <option value="">{removeTransportBlankLabel(removeTransportDefault, t)}</option>
              <option value="true">
                {t('machineEdit.createWizardSteps.removeTransportOption')}
              </option>
              <option value="false">
                {t('machineEdit.createWizardSteps.keepTransportOption')}
              </option>
            </select>
            <span className="form-text text-muted">
              {t('machineEdit.createWizardSteps.removalPipelineHint')}
            </span>
          </div>
        </div>
      )}

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
          {t('machineEdit.createWizardSteps.loadingVersionConfig')}
        </p>
      )}

      {version && !fieldConfig && !versionPending && (
        <p className="form-text text-muted">
          {t('machineEdit.createWizardSteps.manifestPredatesDslPrefix')}{' '}
          <code>metadata.configuration.groups/fields</code>
          {t('machineEdit.createWizardSteps.manifestPredatesDslMiddle')} <code>vars</code>
          {t('machineEdit.createWizardSteps.manifestPredatesDslTail')}
        </p>
      )}

      {(roles.length > 0 || (version && !versionPending)) && (
        <>
          <h6 className="fw-bold">{t('machineEdit.createWizardSteps.roles')}</h6>
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
              {t('machineEdit.createWizardSteps.safeIdPath')}
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
          <h6 className="fw-bold mt-3">
            {t('machineEdit.createWizardSteps.packageSettingOverrides')}
          </h6>
          <p className="form-text text-muted mt-0">
            {t('machineEdit.createWizardSteps.packageOverridesHint')}
          </p>
          <div className="row g-3">
            <SettingInput
              id="machine-setting-provider_type"
              label={t('machineEdit.createWizardSteps.providerType')}
              placeholder={defaultLabel('provider_type')}
              value={settings.provider_type}
              onChange={e => setSetting('provider_type', e.target.value)}
              disabled={loading}
            />
            <SettingInput
              id="machine-setting-setup_wait"
              label={t('machineEdit.createWizardSteps.setupWaitSeconds')}
              type="number"
              placeholder={defaultLabel('setup_wait')}
              value={settings.setup_wait}
              onChange={e => setSetting('setup_wait', e.target.value)}
              disabled={loading}
            />
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-setting-show_console">
                {t('machineEdit.createWizardSteps.showConsole')}
              </label>
              <select
                id="machine-setting-show_console"
                className="form-select"
                value={settings.show_console ?? ''}
                onChange={e => setSetting('show_console', e.target.value)}
                disabled={loading}
              >
                <option value="">{defaultLabel('show_console')}</option>
                <option value="true">{t('machineEdit.createWizardSteps.trueValue')}</option>
                <option value="false">{t('machineEdit.createWizardSteps.falseValue')}</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-setting-debug_build">
                {t('machineEdit.createWizardSteps.debugBuild')}
              </label>
              <select
                id="machine-setting-debug_build"
                className="form-select"
                value={settings.debug_build ?? ''}
                onChange={e => setSetting('debug_build', e.target.value)}
                disabled={loading}
              >
                <option value="">{defaultLabel('debug_build')}</option>
                <option value="true">{t('machineEdit.createWizardSteps.trueValue')}</option>
                <option value="false">{t('machineEdit.createWizardSteps.falseValue')}</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-setting-post_provision">
                {t('machineEdit.createWizardSteps.postProvisionTriggers')}
              </label>
              <select
                id="machine-setting-post_provision"
                className="form-select"
                value={settings.post_provision ?? ''}
                onChange={e => setSetting('post_provision', e.target.value)}
                disabled={loading}
              >
                <option value="">{defaultLabel('post_provision')}</option>
                <option value="true">{t('machineEdit.createWizardSteps.trueValue')}</option>
                <option value="false">{t('machineEdit.createWizardSteps.falseValue')}</option>
              </select>
            </div>
            <SettingInput
              id="machine-setting-consoleport"
              label={t('machineEdit.createWizardSteps.consolePort')}
              type="number"
              min={1025}
              max={65535}
              placeholder={defaultLabel('consoleport')}
              value={settings.consoleport}
              onChange={e => setSetting('consoleport', e.target.value)}
              disabled={loading}
            />
            <SettingInput
              id="machine-setting-vagrant_user"
              label={t('machineEdit.createWizardSteps.guestSshUser')}
              placeholder={defaultLabel('vagrant_user')}
              value={settings.vagrant_user}
              onChange={e => setSetting('vagrant_user', e.target.value)}
              disabled={loading}
            />
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-setting-vagrant_user_pass">
                {t('machineEdit.createWizardSteps.guestSshPassword')}
              </label>
              <input
                id="machine-setting-vagrant_user_pass"
                className="form-control"
                type="password"
                autoComplete="new-password"
                placeholder={defaultLabel('vagrant_user_pass')}
                value={settings.vagrant_user_pass ?? ''}
                onChange={e => setSetting('vagrant_user_pass', e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="machine-setting-vagrant_ssh_insert_key">
                {t('machineEdit.createWizardSteps.rotateSshKey')}
              </label>
              <select
                id="machine-setting-vagrant_ssh_insert_key"
                className="form-select"
                value={settings.vagrant_ssh_insert_key ?? ''}
                onChange={e => setSetting('vagrant_ssh_insert_key', e.target.value)}
                disabled={loading}
              >
                <option value="">{defaultLabel('vagrant_ssh_insert_key')}</option>
                <option value="true">{t('machineEdit.createWizardSteps.trueValue')}</option>
                <option value="false">{t('machineEdit.createWizardSteps.falseValue')}</option>
              </select>
              <span className="form-text text-muted">
                {t('machineEdit.createWizardSteps.rotateSshKeyHint')}
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

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
  agentDefaults: PropTypes.object,
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
  removeTransport: PropTypes.string.isRequired,
  setRemoveTransport: PropTypes.func.isRequired,
  removeTransportDefault: PropTypes.bool,
  safeIdPath: PropTypes.string.isRequired,
  setSafeIdPath: PropTypes.func.isRequired,
  advanced: PropTypes.bool,
  loading: PropTypes.bool,
};

/** One-network summary line for the Confirm table. */
const networkSummary = (network, t) =>
  [
    network.type || t('machineEdit.createWizardSteps.netFallback'),
    network.bridge && t('machineEdit.createWizardSteps.onBridge', { bridge: network.bridge }),
    network.dhcp4
      ? t('machineEdit.createWizardSteps.dhcp')
      : network.address || t('machineEdit.createWizardSteps.unaddressed'),
    network.mac &&
      network.mac !== 'auto' &&
      t('machineEdit.createWizardSteps.macValue', { mac: network.mac }),
  ]
    .filter(Boolean)
    .join(' · ');

/** Boot summary from the assembled spec — mirrors the storage phase's scenarios. */
const bootSummary = (spec, t) => {
  if (spec.settings?.box) {
    const arrow = spec.disks?.boot?.size
      ? t('machineEdit.createWizardSteps.arrowSize', { size: spec.disks.boot.size })
      : '';
    return `${t('machineEdit.createWizardSteps.bootTemplate', { box: spec.settings.box })}${arrow}`;
  }
  if (spec.disks?.boot?.path) {
    return t('machineEdit.createWizardSteps.bootExisting', { path: spec.disks.boot.path });
  }
  if (spec.disks?.boot?.size) {
    return t('machineEdit.createWizardSteps.bootBlank', { size: spec.disks.boot.size });
  }
  return t('machineEdit.createWizardSteps.bootDiskless');
};

export const ConfirmStep = ({ spec }) => {
  const { t } = useTranslation();
  const rows = [
    [
      t('machineEdit.createWizardSteps.confirmName'),
      spec.name || t('machineEdit.createWizardSteps.derivedName'),
    ],
    [
      t('machineEdit.createWizardSteps.confirmProvisioner'),
      spec.provisioner?.name
        ? `${spec.provisioner.name}/${spec.provisioner.version}`
        : t('machineEdit.createWizardSteps.noneNoProvisioning'),
    ],
    [t('machineEdit.createWizardSteps.confirmBoot'), bootSummary(spec, t)],
    ...(spec.disks?.additional_disks?.length
      ? [
          [
            t('machineEdit.createWizardSteps.confirmAdditionalDisks'),
            spec.disks.additional_disks.map(disk => disk.size || disk.path).join(', '),
          ],
        ]
      : []),
    ...(spec.disks?.cdroms?.length
      ? [
          [
            t('machineEdit.createWizardSteps.confirmCdDvd'),
            spec.disks.cdroms.map(cd => cd.iso || cd.path).join(', '),
          ],
        ]
      : []),
    ...(spec.zones
      ? [
          [
            t('machineEdit.createWizardSteps.confirmSystem'),
            Object.entries(spec.zones)
              .map(([key, value]) => `${key}: ${value}`)
              .join(' · '),
          ],
        ]
      : []),
    ...(spec.tags?.length
      ? [[t('machineEdit.createWizardSteps.confirmTags'), spec.tags.join(', ')]]
      : []),
    ...(spec.notes
      ? [
          [
            t('machineEdit.createWizardSteps.confirmNotes'),
            t('machineEdit.createWizardSteps.setValue'),
          ],
        ]
      : []),
    ...(spec.vbox
      ? [[t('machineEdit.createWizardSteps.confirmVbox'), Object.keys(spec.vbox).join(', ')]]
      : []),
    ...(spec.cloud_init
      ? [
          [
            t('machineEdit.createWizardSteps.confirmCloudInit'),
            t('machineEdit.createWizardSteps.enabledValue'),
          ],
        ]
      : []),
    ...Object.entries(spec.settings || {}).map(([key, value]) => [key, String(value)]),
    ...(spec.networks || []).map((network, index) => [
      t('machineEdit.createWizardSteps.confirmNetwork', { index: index + 1 }),
      networkSummary(network, t),
    ]),
    [
      t('machineEdit.createWizardSteps.confirmRolesEnabled'),
      (spec.roles || [])
        .filter(role => role?.enabled && role.name)
        .map(role => role.name)
        .join(', ') || t('machineEdit.createWizardSteps.noneValue'),
    ],
    [t('machineEdit.createWizardSteps.confirmSyncMethod'), spec.sync_method || 'rsync'],
    [
      t('machineEdit.createWizardSteps.confirmStartAfterCreate'),
      spec.start_after_create
        ? t('machineEdit.createWizardSteps.yesValue')
        : t('machineEdit.createWizardSteps.noValue'),
    ],
  ];
  return (
    <>
      <p className="form-text text-muted">
        {t('machineEdit.createWizardSteps.exactlyWhatWillBeSent')}
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
        <summary className="small">{t('machineEdit.createWizardSteps.fullRequestBody')}</summary>
        <pre className="small mt-2">{JSON.stringify(spec, null, 2)}</pre>
      </details>
    </>
  );
};

ConfirmStep.propTypes = {
  spec: PropTypes.object.isRequired,
};
