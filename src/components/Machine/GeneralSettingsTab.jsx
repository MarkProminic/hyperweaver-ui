import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasHypervisor } from '../../utils/capabilities';

import {
  BootOrderEditor,
  OsTypeSelect,
  splitBhyveBootOrder,
  stepMemory,
} from './CreateWizardSteps';
import { VocabularySelect } from './HardwareEditor';
import { agentDefaultLabel } from './machineHelpers';
import SecureBootPanel from './SecureBootPanel';

/** Settings → General: the flat zones.* knob fields + autoboot, the
 *  guest-agent toggle, boot priority/order, and (VirtualBox) Secure Boot.
 *  Dropdowns come ONLY from the agent's knob_values (flat dotted keys);
 *  freeText knobs (agent-stated free strings legal) render as a select
 *  with a "Custom value…" escape. Blank labels show the agent's REAL
 *  default from GET /machines/defaults where it reports one. */

/** " — default disk,dvd" suffix for the boot-order labels; '' when the
 *  defaults doc reports nothing. */
const bootOrderDefaultSuffix = (value, t) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? t('machineEdit.generalSettingsTab.bootOrderDefault', { value: value.join(',') })
      : '';
  }
  return t('machineEdit.generalSettingsTab.bootOrderDefault', { value });
};

const FieldControl = ({
  field,
  vocabulary,
  value,
  onValue,
  blankLabel,
  isCustom,
  onToggleCustom,
  disabled,
}) => {
  const { t } = useTranslation();
  if (field.freeText && vocabulary && !isCustom) {
    return (
      <VocabularySelect
        id={`machine-edit-${field.key}`}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        onChange={onValue}
        onCustom={() => onToggleCustom(true)}
        disabled={disabled}
      />
    );
  }
  if (field.freeText) {
    return (
      <>
        <input
          id={`machine-edit-${field.key}`}
          className="form-control"
          type="text"
          list={vocabulary ? `machine-edit-${field.key}-options` : undefined}
          placeholder={field.placeholder || blankLabel}
          title={field.hint}
          value={value}
          onChange={e => onValue(e.target.value)}
          disabled={disabled}
        />
        {vocabulary && (
          <>
            <datalist id={`machine-edit-${field.key}-options`}>
              {vocabulary.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={() => onToggleCustom(false)}
            >
              {t('machineEdit.pickOrType.backToList')}
            </button>
          </>
        )}
      </>
    );
  }
  if (vocabulary) {
    return (
      <VocabularySelect
        id={`machine-edit-${field.key}`}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        onChange={onValue}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={`machine-edit-${field.key}`}
      className="form-control"
      type="text"
      placeholder={field.placeholder || blankLabel}
      title={field.hint}
      value={value}
      onChange={e => onValue(e.target.value)}
      disabled={disabled}
    />
  );
};

FieldControl.propTypes = {
  field: PropTypes.object.isRequired,
  vocabulary: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.string.isRequired,
  onValue: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  isCustom: PropTypes.bool,
  onToggleCustom: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** Memory as a −/+ stepper (G units; other strings pass through, buttons
 *  grey) — the create wizard's Resources interaction, parity on Edit. */
const MemoryStepper = ({ field, value, onSet, blankLabel, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="input-group">
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label={t('machineEdit.generalSettingsTab.lessMemory')}
        onClick={() => onSet(stepMemory(value, -1))}
        disabled={disabled || !stepMemory(value, -1)}
      >
        −
      </button>
      <input
        id={`machine-edit-${field.key}`}
        className="form-control text-center"
        type="text"
        placeholder={field.placeholder || blankLabel}
        value={value}
        onChange={e => onSet(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label={t('machineEdit.generalSettingsTab.moreMemory')}
        onClick={() => onSet(stepMemory(value, 1))}
        disabled={disabled || !stepMemory(value, 1)}
      >
        +
      </button>
    </div>
  );
};

MemoryStepper.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onSet: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

/** vCPUs as a −/+ stepper. The input stays free text — bhyve's extended
 *  `[cpus=]n[,sockets=n][,cores=n][,threads=n]` shape is typable; the
 *  buttons grey out on anything but a plain count. */
const VcpusStepper = ({ field, value, onSet, blankLabel, disabled }) => {
  const { t } = useTranslation();
  const count = /^\d+$/u.test(value.trim()) ? Number(value.trim()) : null;
  return (
    <div className="input-group">
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label={t('machineEdit.generalSettingsTab.fewerVcpus')}
        onClick={() => onSet(String(count - 1))}
        disabled={disabled || count === null || count <= 1}
      >
        −
      </button>
      <input
        id={`machine-edit-${field.key}`}
        className="form-control text-center"
        type="text"
        placeholder={field.placeholder || blankLabel}
        title={t('machineEdit.generalSettingsTab.vcpusHint')}
        value={value}
        onChange={e => onSet(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label={t('machineEdit.generalSettingsTab.moreVcpus')}
        onClick={() => onSet(String(count + 1))}
        disabled={disabled || count === null}
      >
        +
      </button>
    </div>
  );
};

VcpusStepper.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onSet: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const GeneralSettingsTab = ({
  fields,
  knobValues,
  defaultsDoc,
  osTypes,
  values,
  setValues,
  autoboot,
  setAutoboot,
  seed,
  guestAgent,
  setGuestAgent,
  bootPriority,
  setBootPriority,
  consolePort = '',
  setConsolePort,
  consoleHost = '',
  setConsoleHost,
  bootOrder,
  setBootOrder,
  cloudInit = {},
  setCloudInit,
  cloudInitCurrent,
  bhyveBootDevices = [],
  currentServer,
  machineName,
  isRunning,
  formDisabled,
}) => {
  const { t } = useTranslation();
  const isVbox = hasHypervisor(currentServer, 'virtualbox');
  // Which freeText fields are in Custom-value input mode.
  const [customFields, setCustomFields] = useState({});
  // Cloud-init "Enabled" in config-URL input mode (vs the on/off select).
  const [ciCustomUrl, setCiCustomUrl] = useState(false);
  // The bhyve bootorder attr gets the SAME draggable editor as the
  // VirtualBox boot order (parity ruling) — it renders below, not as a
  // plain field in the loop.
  const bootorderField = fields.find(field => field.key === 'bootorder') || null;

  const setValue = key => next => setValues(prev => ({ ...prev, [key]: next ?? prev[key] }));

  return (
    <div className="row g-3">
      {fields
        .filter(field => field.key !== 'bootorder')
        .map(field => {
          // Served vocabulary wins; a field's own agent-stated option set
          // (uefivars/rng on|off) keeps the control a select either way.
          const vocabulary =
            field.key === 'bootnext' && bhyveBootDevices.length > 0
              ? bhyveBootDevices
              : knobValues?.[`zones.${field.key}`] || field.options || null;
          const value = values[field.key] ?? '';
          const blankLabel = agentDefaultLabel(defaultsDoc, field.key);
          const commit = next => setValues(prev => ({ ...prev, [field.key]: next }));
          let control;
          if (field.key === 'ram') {
            control = (
              <MemoryStepper
                field={field}
                value={value}
                onSet={setValue(field.key)}
                blankLabel={blankLabel}
                disabled={formDisabled}
              />
            );
          } else if (field.key === 'vcpus') {
            control = (
              <VcpusStepper
                field={field}
                value={value}
                onSet={setValue(field.key)}
                blankLabel={blankLabel}
                disabled={formDisabled}
              />
            );
          } else if (field.key === 'os_type' && osTypes) {
            control = (
              <OsTypeSelect
                id={`machine-edit-${field.key}`}
                osTypes={osTypes}
                value={value}
                onChange={e => commit(e.target.value)}
                blankLabel={blankLabel}
                disabled={formDisabled}
              />
            );
          } else {
            control = (
              <FieldControl
                field={field}
                vocabulary={vocabulary}
                value={value}
                onValue={commit}
                blankLabel={blankLabel}
                isCustom={!!customFields[field.key]}
                onToggleCustom={next => setCustomFields(prev => ({ ...prev, [field.key]: next }))}
                disabled={formDisabled}
              />
            );
          }
          return (
            <div className="col-12 col-md-4" key={field.key}>
              <label className="form-label" htmlFor={`machine-edit-${field.key}`}>
                {field.label}
              </label>
              {control}
              {field.hint && <span className="form-text text-muted small">{field.hint}</span>}
            </div>
          );
        })}
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-edit-autoboot">
          {t('machineEdit.generalSettingsTab.autoboot')}
        </label>
        <select
          id="machine-edit-autoboot"
          className="form-select"
          value={autoboot}
          onChange={e => setAutoboot(e.target.value)}
          disabled={formDisabled}
        >
          <option value="">{agentDefaultLabel(defaultsDoc, 'autoboot')}</option>
          <option value="true">{t('machineEdit.generalSettingsTab.on')}</option>
          <option value="false">{t('machineEdit.generalSettingsTab.off')}</option>
        </select>
      </div>
      {seed.guestAgent !== null && (
        <div className="col-12 col-md-4">
          <div className="form-check form-switch mt-4">
            <input
              id="machine-edit-guest_agent"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={guestAgent === true}
              onChange={e => setGuestAgent(e.target.checked)}
              disabled={formDisabled}
            />
            <label className="form-check-label" htmlFor="machine-edit-guest_agent">
              {t('machineEdit.generalSettingsTab.qemuGuestAgent')}
            </label>
          </div>
          <span className="form-text text-muted small">
            {t('machineEdit.generalSettingsTab.guestAgentHint')}
          </span>
        </div>
      )}
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-edit-boot-priority">
          {t('machineEdit.generalSettingsTab.bootPriority')}
        </label>
        <input
          id="machine-edit-boot-priority"
          className="form-control"
          type="number"
          min="1"
          max="100"
          placeholder="95"
          value={bootPriority}
          onChange={e => setBootPriority(e.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          {t('machineEdit.generalSettingsTab.appliesImmediatelyNoRestart')}
        </span>
      </div>
      {!isVbox && (
        <>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-edit-consoleport">
              {t('machineEdit.generalSettingsTab.vncWebPort')}
            </label>
            <input
              id="machine-edit-consoleport"
              className="form-control"
              type="text"
              placeholder="dynamic"
              title={t('machineEdit.generalSettingsTab.vncWebPortHint', { keyword: 'dynamic' })}
              value={consolePort}
              onChange={e => setConsolePort(e.target.value)}
              disabled={formDisabled}
            />
            <span className="form-text text-muted small">
              {t('machineEdit.generalSettingsTab.appliesNextVncSessionType')} <code>dynamic</code>{' '}
              {t('machineEdit.generalSettingsTab.toClearPin')}
            </span>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-edit-consolehost">
              {t('machineEdit.generalSettingsTab.vncBindAddress')}
            </label>
            <input
              id="machine-edit-consolehost"
              className="form-control"
              type="text"
              placeholder="0.0.0.0"
              value={consoleHost}
              onChange={e => setConsoleHost(e.target.value)}
              disabled={formDisabled}
            />
            <span className="form-text text-muted small">
              {t('machineEdit.generalSettingsTab.appliesNextVncSession')}
            </span>
          </div>
        </>
      )}
      {isVbox && (
        <div className="col-12">
          <span className="form-label d-block">
            {t('machineEdit.generalSettingsTab.bootOrderBlankDefault')}
            {bootOrderDefaultSuffix(
              defaultsDoc?.settings?.boot_order ?? defaultsDoc?.zones?.boot_order,
              t
            )}
            {t('machineEdit.generalSettingsTab.requiresRestartSuffix')}
          </span>
          <BootOrderEditor
            bootOrder={bootOrder}
            setBootOrder={setBootOrder}
            deviceOptions={knobValues?.boot_order || null}
            loading={formDisabled}
          />
        </div>
      )}
      {bootorderField &&
        (() => {
          // Explicit attr tokens win; with the attr unset the slots show the
          // zone's REAL devices (bootdisk → disks → cdroms → nets — the
          // firmware's disk-then-cdrom default order) exactly like the
          // VirtualBox slot list. Touching the list writes the attr.
          const explicit = splitBhyveBootOrder(values.bootorder);
          const showingDevices = explicit.length === 0 && bhyveBootDevices.length > 0;
          return (
            <div className="col-12">
              <span className="form-label d-block">
                {t('machineEdit.generalSettingsTab.bootOrderRequiresRestart')}
              </span>
              <BootOrderEditor
                bootOrder={showingDevices ? bhyveBootDevices : explicit}
                setBootOrder={list => setValues(prev => ({ ...prev, bootorder: list.join(',') }))}
                deviceOptions={bhyveBootDevices}
                maxSlots={Infinity}
                allowCustom
                loading={formDisabled}
              />
              <span className="form-text text-muted small">
                {showingDevices
                  ? t('machineEdit.generalSettingsTab.showingZoneDevicesOrder')
                  : bootorderField.hint}
              </span>
            </div>
          );
        })()}
      {!isVbox && (
        <div className="col-12">
          <span className="form-label d-block">
            {t('machineEdit.generalSettingsTab.cloudInit')}{' '}
            <span className="text-muted small fw-normal">
              {t('machineEdit.generalSettingsTab.cloudInitCurrent', {
                current: cloudInitCurrent || 'off',
              })}
            </span>
          </span>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <label className="form-label small mb-1" htmlFor="machine-edit-ci-enabled">
                {t('machineEdit.generalSettingsTab.enabled')}
              </label>
              {ciCustomUrl ? (
                <>
                  <input
                    id="machine-edit-ci-enabled"
                    className="form-control"
                    type="text"
                    placeholder="https://…"
                    title={t('machineEdit.generalSettingsTab.cloudInitUrlHint')}
                    value={cloudInit.enabled ?? ''}
                    onChange={e => setCloudInit(prev => ({ ...prev, enabled: e.target.value }))}
                    disabled={formDisabled}
                  />
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => {
                      setCiCustomUrl(false);
                      setCloudInit(prev => ({ ...prev, enabled: '' }));
                    }}
                  >
                    {t('machineEdit.generalSettingsTab.backToOnOff')}
                  </button>
                </>
              ) : (
                <VocabularySelect
                  id="machine-edit-ci-enabled"
                  value={cloudInit.enabled ?? ''}
                  entries={[
                    { value: 'on', label: t('machineEdit.generalSettingsTab.on') },
                    { value: 'off', label: t('machineEdit.generalSettingsTab.off') },
                  ]}
                  blankLabel={agentDefaultLabel(defaultsDoc, 'cloud_init')}
                  onChange={next => setCloudInit(prev => ({ ...prev, enabled: next }))}
                  onCustom={() => {
                    setCiCustomUrl(true);
                    setCloudInit(prev => ({ ...prev, enabled: '' }));
                  }}
                  customLabel={t('machineEdit.generalSettingsTab.configUrl')}
                  disabled={formDisabled}
                />
              )}
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small mb-1" htmlFor="machine-edit-ci-domain">
                {t('machineEdit.generalSettingsTab.dnsDomain')}
              </label>
              <input
                id="machine-edit-ci-domain"
                className="form-control"
                type="text"
                placeholder={t('machineEdit.generalSettingsTab.keepCurrent')}
                value={cloudInit.dns_domain ?? ''}
                onChange={e => setCloudInit(prev => ({ ...prev, dns_domain: e.target.value }))}
                disabled={formDisabled}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small mb-1" htmlFor="machine-edit-ci-resolvers">
                {t('machineEdit.generalSettingsTab.resolvers')}
              </label>
              <input
                id="machine-edit-ci-resolvers"
                className="form-control"
                type="text"
                placeholder="e.g. 1.1.1.1,8.8.8.8"
                value={cloudInit.resolvers ?? ''}
                onChange={e => setCloudInit(prev => ({ ...prev, resolvers: e.target.value }))}
                disabled={formDisabled}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small mb-1" htmlFor="machine-edit-ci-password">
                {t('machineEdit.generalSettingsTab.rootPassword')}
              </label>
              <input
                id="machine-edit-ci-password"
                className="form-control"
                type="password"
                autoComplete="new-password"
                placeholder={t('machineEdit.generalSettingsTab.keepCurrent')}
                value={cloudInit.password ?? ''}
                onChange={e => setCloudInit(prev => ({ ...prev, password: e.target.value }))}
                disabled={formDisabled}
              />
            </div>
            <div className="col-12 col-md-8">
              <label className="form-label small mb-1" htmlFor="machine-edit-ci-sshkey">
                {t('machineEdit.generalSettingsTab.sshPublicKey')}
              </label>
              <input
                id="machine-edit-ci-sshkey"
                className="form-control font-monospace"
                type="text"
                placeholder="ssh-ed25519 AAAA… user@host"
                value={cloudInit.sshkey ?? ''}
                onChange={e => setCloudInit(prev => ({ ...prev, sshkey: e.target.value }))}
                disabled={formDisabled}
              />
            </div>
          </div>
        </div>
      )}
      {isVbox && (
        <div className="col-12">
          <SecureBootPanel
            currentServer={currentServer}
            machineName={machineName}
            isRunning={isRunning}
            bootrom={values.bootrom || seed.values.bootrom || ''}
            disabled={formDisabled}
          />
        </div>
      )}
    </div>
  );
};

GeneralSettingsTab.propTypes = {
  fields: PropTypes.array.isRequired,
  knobValues: PropTypes.object,
  defaultsDoc: PropTypes.object,
  osTypes: PropTypes.array,
  values: PropTypes.object.isRequired,
  setValues: PropTypes.func.isRequired,
  autoboot: PropTypes.string.isRequired,
  setAutoboot: PropTypes.func.isRequired,
  seed: PropTypes.object.isRequired,
  guestAgent: PropTypes.bool,
  setGuestAgent: PropTypes.func.isRequired,
  bootPriority: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setBootPriority: PropTypes.func.isRequired,
  consolePort: PropTypes.string,
  setConsolePort: PropTypes.func,
  consoleHost: PropTypes.string,
  setConsoleHost: PropTypes.func,
  bootOrder: PropTypes.array.isRequired,
  setBootOrder: PropTypes.func.isRequired,
  cloudInit: PropTypes.object,
  setCloudInit: PropTypes.func,
  cloudInitCurrent: PropTypes.string,
  bhyveBootDevices: PropTypes.arrayOf(PropTypes.string),
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

export default GeneralSettingsTab;
