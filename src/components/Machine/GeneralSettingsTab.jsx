import PropTypes from 'prop-types';
import { useState } from 'react';

import { hasHypervisor } from '../../utils/capabilities';

import {
  BootOrderEditor,
  OsTypeSelect,
  splitBhyveBootOrder,
  stepMemory,
} from './CreateWizardSteps';
import SecureBootPanel from './SecureBootPanel';

/** Settings → General: the flat zones.* knob fields + autoboot, the
 *  guest-agent toggle, boot priority/order, and (VirtualBox) Secure Boot.
 *  Dropdowns come ONLY from the agent's knob_values (flat dotted keys);
 *  freeText knobs (agent-stated free strings legal) render as a select
 *  with a "Custom value…" escape. Blank labels show the agent's REAL
 *  default from GET /machines/defaults where it reports one. */

const unchangedLabelFor = (defaultsDoc, key) => {
  const value = defaultsDoc?.zones?.[key] ?? defaultsDoc?.settings?.[key];
  return value !== undefined && value !== null && value !== ''
    ? `(unchanged — default ${value})`
    : '(unchanged)';
};

const FieldControl = ({
  field,
  vocabulary,
  value,
  onChange,
  blankLabel,
  isCustom,
  onToggleCustom,
  disabled,
}) => {
  // freeText + served vocabulary: a real dropdown with a Custom escape —
  // off-list current values stay selectable, so the field never lies.
  if (field.freeText && vocabulary && !isCustom) {
    return (
      <select
        id={`machine-edit-${field.key}`}
        className="form-select"
        value={value}
        onChange={e => {
          if (e.target.value === '__custom__') {
            onToggleCustom(true);
            return;
          }
          onChange(e);
        }}
        disabled={disabled}
      >
        <option value="">{blankLabel}</option>
        {value && !vocabulary.includes(value) && <option value={value}>{value}</option>}
        {vocabulary.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom__">Custom value…</option>
      </select>
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
          onChange={onChange}
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
              back to the list
            </button>
          </>
        )}
      </>
    );
  }
  if (vocabulary) {
    return (
      <select
        id={`machine-edit-${field.key}`}
        className="form-select"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">{blankLabel}</option>
        {value && !vocabulary.includes(value) && <option value={value}>{value}</option>}
        {vocabulary.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
      onChange={onChange}
      disabled={disabled}
    />
  );
};

FieldControl.propTypes = {
  field: PropTypes.object.isRequired,
  vocabulary: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  isCustom: PropTypes.bool,
  onToggleCustom: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** Memory as a −/+ stepper (G units; other strings pass through, buttons
 *  grey) — the create wizard's Resources interaction, parity on Edit. */
const MemoryStepper = ({ field, value, onSet, blankLabel, disabled }) => (
  <div className="input-group">
    <button
      type="button"
      className="btn btn-outline-secondary"
      aria-label="Less memory"
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
      aria-label="More memory"
      onClick={() => onSet(stepMemory(value, 1))}
      disabled={disabled || !stepMemory(value, 1)}
    >
      +
    </button>
  </div>
);

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
  const count = /^\d+$/u.test(value.trim()) ? Number(value.trim()) : null;
  return (
    <div className="input-group">
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label="Fewer vCPUs"
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
        title="A count, or bhyve's extended shape: 4,sockets=2,cores=2"
        value={value}
        onChange={e => onSet(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label="More vCPUs"
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
  bootOrder,
  setBootOrder,
  currentServer,
  machineName,
  isRunning,
  formDisabled,
}) => {
  const isVbox = hasHypervisor(currentServer, 'virtualbox');
  // Which freeText fields are in Custom-value input mode.
  const [customFields, setCustomFields] = useState({});
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
          const vocabulary = knobValues?.[`zones.${field.key}`] || null;
          const value = values[field.key] ?? '';
          const blankLabel = unchangedLabelFor(defaultsDoc, field.key);
          const onChange = e => setValues(prev => ({ ...prev, [field.key]: e.target.value }));
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
                onChange={onChange}
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
                onChange={onChange}
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
          Autoboot
        </label>
        <select
          id="machine-edit-autoboot"
          className="form-select"
          value={autoboot}
          onChange={e => setAutoboot(e.target.value)}
          disabled={formDisabled}
        >
          <option value="">{unchangedLabelFor(defaultsDoc, 'autoboot')}</option>
          <option value="true">on</option>
          <option value="false">off</option>
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
              QEMU Guest Agent
            </label>
          </div>
          <span className="form-text text-muted small">
            On wires the guest-agent channel; off removes it.
          </span>
        </div>
      )}
      <div className="col-12 col-md-4">
        <label className="form-label" htmlFor="machine-edit-boot-priority">
          Boot Priority (orchestration)
        </label>
        <input
          id="machine-edit-boot-priority"
          className="form-control"
          type="number"
          min="1"
          max="100"
          placeholder="(unchanged — default 95)"
          value={bootPriority}
          onChange={e => setBootPriority(e.target.value)}
          disabled={formDisabled}
        />
        <span className="form-text text-muted small">
          Applies immediately, even while running — no restart involved.
        </span>
      </div>
      {isVbox && (
        <div className="col-12">
          <span className="form-label d-block">
            Boot Order (blank = unchanged; requires restart)
          </span>
          <BootOrderEditor
            bootOrder={bootOrder}
            setBootOrder={setBootOrder}
            deviceOptions={knobValues?.boot_order || null}
            loading={formDisabled}
          />
        </div>
      )}
      {bootorderField && (
        <div className="col-12">
          <span className="form-label d-block">
            Boot Order (blank = unchanged; requires restart)
          </span>
          <BootOrderEditor
            bootOrder={splitBhyveBootOrder(values.bootorder)}
            setBootOrder={list => setValues(prev => ({ ...prev, bootorder: list.join(',') }))}
            deviceOptions={[]}
            maxSlots={Infinity}
            allowCustom
            loading={formDisabled}
          />
          <span className="form-text text-muted small">{bootorderField.hint}</span>
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
  bootOrder: PropTypes.array.isRequired,
  setBootOrder: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

export default GeneralSettingsTab;
