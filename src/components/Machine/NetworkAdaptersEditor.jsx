import PropTypes from 'prop-types';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { markButtonClass, markIconClass, nicSummary } from './CurrentHardware';
import { VocabularySelect } from './HardwareEditor';
import VnicLinkPropsEditor from './VnicLinkPropsEditor';

/** A locally-administered unicast MAC (02:xx:…) — the random-MAC dice. */
const randomMac = () => {
  const octet = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  return ['02', octet(), octet(), octet(), octet(), octet()].join(':');
};

/** One-click copy for the live values (MACs, vnic names). */
const CopyButton = ({ value, label }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-link p-0"
      title={
        copied
          ? t('machineEdit.networkAdaptersEditor.copied')
          : t('machineEdit.networkAdaptersEditor.copyLabel', { label })
      }
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      <i className={`fas small ${copied ? 'fa-check text-success' : 'fa-copy text-muted'}`} />
    </button>
  );
};

CopyButton.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

/**
 * The Settings → NICs editor: ONE device tree. Every EXISTING adapter is a
 * group row (identity + remove mark) with its tuning grid inline beneath —
 * tuning can never address an adapter that does not exist. "Adapter" appends
 * a NEW adapter card (bridge + MAC; the agent assigns the next free slot, so
 * its tuning becomes editable here once it exists). Tuning values seed from
 * knob_current and only CHANGED adapters ride the PUT `nics` family.
 */

const TUNING_FIELDS = [
  {
    key: 'cable_connected',
    label: 'Cable',
    options: [
      { value: 'on', label: 'connected' },
      { value: 'off', label: 'disconnected' },
    ],
  },
  { key: 'promisc', label: 'Promiscuous', enumKey: 'promisc' },
  { key: 'speed', label: 'Speed (kbps)', type: 'number' },
  { key: 'boot_prio', label: 'Boot prio', type: 'number' },
  { key: 'bandwidth_group', label: 'Bandwidth group' },
  { key: 'nic_type', label: 'NIC type', enumKey: 'nic_type' },
  // The converged remove-on-completion flag (legal per entry; the
  // provisioning NAT is the load-bearing case). Blank = the agent's
  // ruled default (keep on VirtualBox, remove on zoneweaver).
  {
    key: 'remove_on_completion',
    label: 'Remove on completion',
    options: [
      { value: 'true', label: 'remove' },
      { value: 'false', label: 'keep' },
    ],
  },
];

// Hardcoded vocabularies are the no-knob_values fallback (HardwareEditor's).
const FALLBACK_ENUMS = {
  promisc: ['deny', 'allow-vms', 'allow-all'],
  nic_type: ['Am79C970A', 'Am79C973', '82540EM', '82543GC', '82545EM', 'virtio'],
};

// In-place zone NIC keys (the agent's update_nics vocabulary) — blank =
// keep the current value. Placeholders speak BOTH layers: the zonecfg
// value where set, else the live dladm value the VNIC actually runs with.
const ZONE_NIC_EDIT_FIELDS = [
  {
    key: 'global_nic',
    label: 'Bridge (global-nic)',
    currentOf: nic => nic.globalNic,
    liveOf: live => live?.over || '',
  },
  {
    key: 'vlan_id',
    label: 'VLAN id',
    type: 'number',
    currentOf: nic => nic.vlanId,
    liveOf: live => (live?.vid === undefined || live?.vid === null ? '' : String(live.vid)),
  },
  {
    key: 'mac_addr',
    label: 'MAC',
    currentOf: nic => nic.mac,
    liveOf: live => live?.macaddress || '',
  },
  {
    key: 'allowed_address',
    label: 'Allowed address',
    currentOf: nic => nic.allowedAddress,
    liveOf: () => '',
  },
  {
    key: 'address',
    label: 'IP address (shared-IP)',
    currentOf: nic => nic.address,
    liveOf: () => '',
  },
  {
    key: 'defrouter',
    label: 'Default router',
    currentOf: nic => nic.defrouter,
    liveOf: () => '',
  },
];

// Enabling promiscphys is known to break host→VM traffic on this platform
// (illumos-omnios#1039, still open) — never let anyone flip it blind.
const PROP_WARNING_KEYS = new Set(['promiscphys']);

// Legal zonecfg net props bhyve does not document consuming — the agent
// deliberately serves no default for them (may be no-ops), so the blank
// label says so instead of inventing one.
const UNDOCUMENTED_PROPS = new Set(['mtu', 'backend']);

const propLabel = key => key.replace(/_/gu, ' ');

/**
 * The zonecfg NET-RESOURCE properties the bhyve brand consumes. Which ones
 * apply depends on the NIC's BACKEND (viona takes the ring/queue knobs;
 * virtio/e1000 take the promiscuous-mode knobs) — the agent says which via
 * `nic_props_by_netif`, so the UI never offers a knob bhyve would ignore.
 * Current values, defaults and vocabularies all come from the agent; a blank
 * field shows the default it actually runs with.
 */
const NicPropsEditor = ({
  idPrefix,
  netif,
  props,
  currentProps = {},
  propsByNetif = null,
  propDefaults = {},
  propValues = {},
  onChange,
  disabled,
}) => {
  const { t } = useTranslation();
  const applicable = propsByNetif?.[netif] || null;
  if (!applicable || applicable.length === 0) {
    return null;
  }
  return (
    <div className="hw-device-row hw-device-child hw-device-child-form">
      <details className="w-100">
        <summary className="small fw-semibold">
          {t('machineEdit.networkAdaptersEditor.brandNetProperties')}
          {netif ? ` — ${netif}` : ''}
        </summary>
        <div className="row g-2 align-items-end mt-0">
          {applicable.map(key => {
            const inputId = `${idPrefix}-prop-${key}`;
            const vocabulary = propValues[`nics.props.${key}`] || null;
            const fallback = propDefaults[`nics.props.${key}`];
            const current = currentProps[key];
            // Set → show it; unset → the default it actually runs with —
            // except the props bhyve doesn't document, which say so honestly.
            let blankLabel = fallback === undefined ? t('machineEdit.common.na') : String(fallback);
            if (current !== undefined && current !== '') {
              blankLabel = String(current);
            } else if (fallback === undefined && UNDOCUMENTED_PROPS.has(key)) {
              blankLabel = t('machineEdit.networkAdaptersEditor.undocumentedProp');
            }
            const warning = PROP_WARNING_KEYS.has(key)
              ? t(`machineEdit.networkAdaptersEditor.propWarning.${key}`)
              : undefined;
            return (
              <div className="col-6 col-md-3" key={key}>
                <label className="form-label small mb-1 text-capitalize" htmlFor={inputId}>
                  {propLabel(key)}
                  {warning && (
                    <i
                      className="fas fa-triangle-exclamation text-warning ms-1"
                      title={warning}
                      aria-label={warning}
                    />
                  )}
                </label>
                {vocabulary ? (
                  <select
                    id={inputId}
                    className="form-select form-select-sm"
                    value={props[key] ?? ''}
                    onChange={e => onChange(key, e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">
                      {vocabulary.some(option => String(option) === blankLabel)
                        ? `${blankLabel} - Default`
                        : blankLabel}
                    </option>
                    {vocabulary
                      .filter(option => String(option) !== blankLabel)
                      .map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    id={inputId}
                    className="form-control form-control-sm"
                    placeholder={blankLabel}
                    value={props[key] ?? ''}
                    onChange={e => onChange(key, e.target.value)}
                    disabled={disabled}
                  />
                )}
                {warning && <span className="form-text text-warning small">{warning}</span>}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};

NicPropsEditor.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  netif: PropTypes.string,
  props: PropTypes.object.isRequired,
  currentProps: PropTypes.object,
  propsByNetif: PropTypes.object,
  propDefaults: PropTypes.object,
  propValues: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const removeOnCompletionLabel = (current, t) => {
  if (current?.remove_on_completion === undefined) {
    return t('machineEdit.common.na');
  }
  return current.remove_on_completion
    ? t('machineEdit.networkAdaptersEditor.remove')
    : t('machineEdit.networkAdaptersEditor.keep');
};

const zoneNicPlaceholder = (field, nic, live, t) => {
  const current = field.currentOf(nic);
  if (current) {
    return current;
  }
  const liveValue = field.liveOf(live);
  return liveValue
    ? t('machineEdit.networkAdaptersEditor.unsetLive', { live: liveValue })
    : t('machineEdit.networkAdaptersEditor.unset');
};

const liveSpeed = speed => {
  if (!speed) {
    return null;
  }
  return speed >= 1000 ? `${speed / 1000}G` : `${speed}M`;
};

/** The dladm layer's truth for one zone NIC — over-link, live MAC, VID,
 *  state — shown beside the zonecfg fields it backs. */
const LiveVnicLine = ({ live }) => {
  const { t } = useTranslation();
  if (!live) {
    return (
      <span className="text-muted small">
        {t('machineEdit.networkAdaptersEditor.noLiveVnicRecord')}
      </span>
    );
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1 align-items-center small">
      <span
        className={`badge ${live.state === 'up' ? 'text-bg-success' : 'text-bg-secondary'}`}
        title={t('machineEdit.networkAdaptersEditor.linkState')}
      >
        {live.state || t('machineEdit.networkAdaptersEditor.unknown')}
      </span>
      {live.over && (
        <span
          className="badge text-bg-secondary"
          title={t('machineEdit.networkAdaptersEditor.physicalLinkTitle')}
        >
          {t('machineEdit.networkAdaptersEditor.over', { over: live.over })}
        </span>
      )}
      {liveSpeed(live.speed) && (
        <span
          className="badge text-bg-info"
          title={t('machineEdit.networkAdaptersEditor.linkSpeed')}
        >
          {liveSpeed(live.speed)}
        </span>
      )}
      <code
        className="small"
        title={t('machineEdit.networkAdaptersEditor.liveMacTitle', {
          type: live.macaddrtype || t('machineEdit.networkAdaptersEditor.unknownType'),
        })}
      >
        {live.macaddress}
      </code>
      {live.macaddress && (
        <CopyButton
          value={live.macaddress}
          label={t('machineEdit.networkAdaptersEditor.liveMac')}
        />
      )}
      {live.macaddrtype && <span className="text-muted">({live.macaddrtype})</span>}
      <span
        className="badge text-bg-light border"
        title={t('machineEdit.networkAdaptersEditor.vlanId')}
      >
        {t('machineEdit.networkAdaptersEditor.vid', { vid: live.vid ?? 0 })}
      </span>
      {live.mtu && (
        <span
          className="badge text-bg-light border"
          title={t('machineEdit.networkAdaptersEditor.mtu')}
        >
          {t('machineEdit.networkAdaptersEditor.mtuValue', { mtu: live.mtu })}
        </span>
      )}
    </span>
  );
};

LiveVnicLine.propTypes = {
  live: PropTypes.object,
};

/** A tuning row for an adapter that knob_current did not seed. */
export const blankNicRow = adapter => ({
  key: `nic-${adapter}`,
  adapter: String(adapter),
  cable_connected: '',
  promisc: '',
  speed: '',
  boot_prio: '',
  bandwidth_group: '',
  nic_type: '',
  remove_on_completion: '',
});

const NicTuningField = ({ inputId, field, value, nicEnums, onChange, disabled }) => {
  const { t } = useTranslation();
  let vocabulary = null;
  if (field.options) {
    vocabulary = field.options.map(option => ({
      ...option,
      label: t(`machineEdit.networkAdaptersEditor.tuningOption.${field.key}.${option.value}`),
    }));
  } else if (field.enumKey) {
    vocabulary = nicEnums?.[`nics.${field.enumKey}`] || FALLBACK_ENUMS[field.enumKey];
  }
  if (vocabulary) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={t('machineEdit.common.na')}
        small
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={inputId}
      className="form-control form-control-sm"
      type={field.type || 'text'}
      placeholder={t('machineEdit.common.na')}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};

NicTuningField.propTypes = {
  inputId: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  nicEnums: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const NetworkAdaptersEditor = ({
  nics,
  nicRows,
  onNicRowsChange,
  addNics,
  onAddNicsChange,
  nicMarked,
  onToggleNic,
  nicEnums = null,
  zoneNics = null,
  hostVnics = [],
  bridgeOptions = [],
  zoneNicRemovals = [],
  onToggleZoneNic = () => {},
  zoneNicEdits = {},
  onZoneNicEdit = () => {},
  onZoneNicPropEdit = () => {},
  zoneNicCurrent = [],
  nicPropsByNetif = null,
  knobDefaults = {},
  machineNetif = '',
  currentServer = null,
  formDisabled = false,
}) => {
  const { t } = useTranslation();
  // Zone NICs remove by their PHYSICAL vnic name (agent-confirmed wire) —
  // zone detach only, the host VNIC survives. The per-adapter tuning grid
  // hides on zones: those keys are VirtualBox modifyvm vocabulary.
  const isZone = zoneNics !== null;
  const rowFor = adapter => nicRows.find(row => row.adapter === String(adapter));
  const patchAdapter = (adapter, patch) => {
    const existing = rowFor(adapter);
    onNicRowsChange(
      existing
        ? nicRows.map(row => (row === existing ? { ...row, ...patch } : row))
        : [...nicRows, { ...blankNicRow(adapter), ...patch }]
    );
  };
  const patchAddNic = (key, patch) =>
    onAddNicsChange(addNics.map(row => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <div className="hw-device-tree">
      <div className="hw-device-tree-head">
        <i className="fas fa-network-wired" />
        <span>{t('machineEdit.networkAdaptersEditor.networkAdapters')}</span>
      </div>

      {isZone &&
        zoneNics.map(nic => {
          const isMarked = zoneNicRemovals.includes(nic.physical);
          const edits = zoneNicEdits[nic.physical] || {};
          const live = hostVnics.find(vnic => vnic.link === nic.physical) || null;
          // knob_current.nics[] — the NIC's effective backend and the props
          // that are EXPLICITLY set on it.
          const current = zoneNicCurrent.find(entry => entry.physical === nic.physical) || null;
          // The agent-attached provisioning transport (knob_current marker,
          // the declared pairing rule) — badged and LOCKED against
          // hand-edits: breaking it mid-pipeline strands the provision.
          const isProvisional = current?.provisional === true;
          return (
            <Fragment key={nic.name}>
              <div
                className={`hw-device-row hw-device-group ${isMarked ? 'hw-device-removed' : ''}`}
              >
                <i className="fas fa-ethernet text-muted" />
                <span>{nic.name}</span>
                {nic.physical && (
                  <>
                    <code className="small">{nic.physical}</code>
                    <CopyButton
                      value={nic.physical}
                      label={t('machineEdit.networkAdaptersEditor.vnicName')}
                    />
                  </>
                )}
                {isProvisional && (
                  <span
                    className="badge text-bg-warning"
                    title={t('machineEdit.networkAdaptersEditor.provisionalTitle')}
                  >
                    <i className="fas fa-cubes me-1" />
                    {t('machineEdit.networkAdaptersEditor.provisional')}
                  </span>
                )}
                {nic.allowedAddress && (
                  <span className="badge text-bg-light border" title="zonecfg allowed-address">
                    {nic.allowedAddress}
                  </span>
                )}
                {nic.physical && !isProvisional && (
                  <div className="hw-device-actions">
                    <button
                      type="button"
                      className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                      title={
                        isMarked
                          ? t('machineEdit.networkAdaptersEditor.unmark')
                          : t('machineEdit.networkAdaptersEditor.detachZoneNicTitle')
                      }
                      onClick={() => onToggleZoneNic(nic.physical)}
                      disabled={formDisabled}
                    >
                      <i className={`fas ${markIconClass(isMarked)}`} />
                    </button>
                  </div>
                )}
              </div>
              <div className="hw-device-row hw-device-child">
                <i
                  className="fas fa-wave-square text-muted"
                  title={t('machineEdit.networkAdaptersEditor.liveDladmState')}
                />
                <LiveVnicLine live={live} />
              </div>
              {!isMarked && nic.physical && (
                <div className="hw-device-row hw-device-child hw-device-child-form">
                  <div className="row g-2 align-items-end">
                    {/* The converged remove-on-completion flag — the ONE
                        control that stays live on provisional rows (the
                        agent maps NIC → document entry and updates it). */}
                    <div className="col-6 col-md-3">
                      <label
                        className="form-label small mb-1"
                        htmlFor={`zone-nic-${nic.physical}-roc`}
                      >
                        {t('machineEdit.networkAdaptersEditor.removeOnCompletion')}
                      </label>
                      <select
                        id={`zone-nic-${nic.physical}-roc`}
                        className="form-select form-select-sm"
                        value={edits.remove_on_completion ?? ''}
                        onChange={e =>
                          onZoneNicEdit(nic.physical, 'remove_on_completion', e.target.value)
                        }
                        disabled={formDisabled}
                      >
                        <option value="">{removeOnCompletionLabel(current, t)}</option>
                        <option value="true">
                          {t('machineEdit.networkAdaptersEditor.remove')}
                        </option>
                        <option value="false">{t('machineEdit.networkAdaptersEditor.keep')}</option>
                      </select>
                    </div>
                    {ZONE_NIC_EDIT_FIELDS.map(field => {
                      const inputId = `zone-nic-${nic.physical}-${field.key}`;
                      const isBridge = field.key === 'global_nic';
                      const isMac = field.key === 'mac_addr';
                      const control = (
                        <input
                          id={inputId}
                          className="form-control form-control-sm"
                          type={field.type || 'text'}
                          list={
                            isBridge && bridgeOptions.length > 0 ? `${inputId}-options` : undefined
                          }
                          placeholder={zoneNicPlaceholder(field, nic, live, t)}
                          title={
                            isProvisional
                              ? t('machineEdit.networkAdaptersEditor.lockedProvisioning')
                              : t('machineEdit.networkAdaptersEditor.blankKeepsCurrent')
                          }
                          value={edits[field.key] ?? ''}
                          onChange={e => onZoneNicEdit(nic.physical, field.key, e.target.value)}
                          disabled={formDisabled || isProvisional}
                        />
                      );
                      return (
                        <div className="col-6 col-md-3" key={field.key}>
                          <label className="form-label small mb-1" htmlFor={inputId}>
                            {t(`machineEdit.networkAdaptersEditor.zoneNicField.${field.key}`)}
                          </label>
                          {isMac ? (
                            <div className="input-group input-group-sm">
                              {control}
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title={t('machineEdit.networkAdaptersEditor.generateRandomMac')}
                                onClick={() => onZoneNicEdit(nic.physical, field.key, randomMac())}
                                disabled={formDisabled}
                              >
                                <i className="fas fa-dice" />
                              </button>
                            </div>
                          ) : (
                            control
                          )}
                          {isBridge && bridgeOptions.length > 0 && (
                            <datalist id={`${inputId}-options`}>
                              {bridgeOptions.map(option => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!isMarked && nic.physical && (
                <NicPropsEditor
                  idPrefix={`zone-nic-${nic.physical}`}
                  netif={current?.netif || ''}
                  props={edits.props || {}}
                  currentProps={current?.props || {}}
                  propsByNetif={nicPropsByNetif}
                  propDefaults={knobDefaults}
                  propValues={nicEnums || {}}
                  onChange={(propKey, value) => onZoneNicPropEdit(nic.physical, propKey, value)}
                  disabled={formDisabled}
                />
              )}
              {!isMarked && nic.physical && currentServer && (
                <VnicLinkPropsEditor
                  currentServer={currentServer}
                  vnic={nic.physical}
                  disabled={formDisabled}
                />
              )}
            </Fragment>
          );
        })}
      {isZone && (
        <div className="hw-device-row hw-device-meta">
          {t('machineEdit.networkAdaptersEditor.editsApplyInPlace')}
        </div>
      )}

      {!isZone && nics.length === 0 && addNics.length === 0 && (
        <div className="hw-device-row hw-device-meta">
          {t('machineEdit.networkAdaptersEditor.noAdaptersReported')}
        </div>
      )}

      {nics.map(nic => {
        const isMarked = nicMarked(nic.adapter);
        const row = rowFor(nic.adapter) || blankNicRow(nic.adapter);
        return (
          <Fragment key={nic.adapter}>
            <div className={`hw-device-row hw-device-group ${isMarked ? 'hw-device-removed' : ''}`}>
              <i className="fas fa-ethernet text-muted" />
              <span>
                {t('machineEdit.networkAdaptersEditor.adapter', { adapter: nic.adapter })}
              </span>
              <span className="hw-device-meta">{nicSummary(nic)}</span>
              {nic.adapter === 1 && (
                <span
                  className="badge text-bg-light"
                  title={t('machineEdit.networkAdaptersEditor.provisioningNatTitle')}
                >
                  {t('machineEdit.networkAdaptersEditor.provisioningNat')}
                </span>
              )}
              <div className="hw-device-actions">
                <button
                  type="button"
                  className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                  title={
                    isMarked
                      ? t('machineEdit.networkAdaptersEditor.unmark')
                      : t('machineEdit.networkAdaptersEditor.markAdapterForRemoval')
                  }
                  onClick={() => onToggleNic(nic.adapter)}
                  disabled={formDisabled}
                >
                  <i className={`fas ${markIconClass(isMarked)}`} />
                </button>
              </div>
            </div>
            {!isMarked && (
              <div className="hw-device-row hw-device-child hw-device-child-form">
                <div className="row g-2 align-items-end">
                  {TUNING_FIELDS.map(field => {
                    const inputId = `nic-${nic.adapter}-${field.key}`;
                    return (
                      <div className="col-6 col-md-2" key={field.key}>
                        <label className="form-label small mb-1" htmlFor={inputId}>
                          {t(`machineEdit.networkAdaptersEditor.tuningField.${field.key}`)}
                        </label>
                        <NicTuningField
                          inputId={inputId}
                          field={field}
                          value={row[field.key] ?? ''}
                          nicEnums={nicEnums}
                          onChange={value => patchAdapter(nic.adapter, { [field.key]: value })}
                          disabled={formDisabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}

      {addNics.map(row => (
        <Fragment key={row.key}>
          <div className="hw-device-row hw-device-group">
            <i className="fas fa-plus text-success" />
            <span>{t('machineEdit.networkAdaptersEditor.newAdapter')}</span>
            <span className="hw-device-meta">
              {t('machineEdit.networkAdaptersEditor.bridgedHint')}
            </span>
            <div className="hw-device-actions">
              <button
                type="button"
                className="btn btn-sm py-0 btn-outline-danger"
                aria-label={t('machineEdit.networkAdaptersEditor.dropNewAdapter')}
                onClick={() => onAddNicsChange(addNics.filter(entry => entry.key !== row.key))}
                disabled={formDisabled}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
          <div className="hw-device-row hw-device-child hw-device-child-form">
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-4">
                <label className="form-label small mb-1" htmlFor={`add-nic-bridge-${row.key}`}>
                  {t('machineEdit.networkAdaptersEditor.bridgeInterface')}
                </label>
                <input
                  id={`add-nic-bridge-${row.key}`}
                  className="form-control form-control-sm"
                  list={bridgeOptions.length > 0 ? `add-nic-bridge-${row.key}-options` : undefined}
                  value={row.bridge}
                  onChange={e => patchAddNic(row.key, { bridge: e.target.value })}
                  disabled={formDisabled}
                />
                {bridgeOptions.length > 0 && (
                  <datalist id={`add-nic-bridge-${row.key}-options`}>
                    {bridgeOptions.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                )}
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1" htmlFor={`add-nic-mac-${row.key}`}>
                  {t('machineEdit.networkAdaptersEditor.macBlankAuto')}
                </label>
                <div className="input-group input-group-sm">
                  <input
                    id={`add-nic-mac-${row.key}`}
                    className="form-control"
                    value={row.mac}
                    onChange={e => patchAddNic(row.key, { mac: e.target.value })}
                    disabled={formDisabled}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title={t('machineEdit.networkAdaptersEditor.generateRandomMac')}
                    onClick={() => patchAddNic(row.key, { mac: randomMac() })}
                    disabled={formDisabled}
                  >
                    <i className="fas fa-dice" />
                  </button>
                </div>
              </div>
              {isZone && (
                <>
                  <div className="col-6 col-md-2">
                    <label className="form-label small mb-1" htmlFor={`add-nic-vlan-${row.key}`}>
                      {t('machineEdit.networkAdaptersEditor.zoneNicField.vlan_id')}
                    </label>
                    <input
                      id={`add-nic-vlan-${row.key}`}
                      className="form-control form-control-sm"
                      type="number"
                      min="0"
                      placeholder="none"
                      value={row.vlan_id ?? ''}
                      onChange={e => patchAddNic(row.key, { vlan_id: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1" htmlFor={`add-nic-allowed-${row.key}`}>
                      {t('machineEdit.networkAdaptersEditor.zoneNicField.allowed_address')}
                    </label>
                    <input
                      id={`add-nic-allowed-${row.key}`}
                      className="form-control form-control-sm font-monospace"
                      placeholder="e.g. 10.0.0.12/24"
                      value={row.allowed_address ?? ''}
                      onChange={e => patchAddNic(row.key, { allowed_address: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor={`add-nic-physical-${row.key}`}
                    >
                      {t('machineEdit.networkAdaptersEditor.vnicNameOrHwNic')}
                    </label>
                    <input
                      id={`add-nic-physical-${row.key}`}
                      className="form-control form-control-sm font-monospace"
                      placeholder="blank, or a physical link e.g. igb2"
                      value={row.physical ?? ''}
                      onChange={e => patchAddNic(row.key, { physical: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1" htmlFor={`add-nic-address-${row.key}`}>
                      {t('machineEdit.networkAdaptersEditor.zoneNicField.address')}
                    </label>
                    <input
                      id={`add-nic-address-${row.key}`}
                      className="form-control form-control-sm font-monospace"
                      placeholder="none"
                      value={row.address ?? ''}
                      onChange={e => patchAddNic(row.key, { address: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor={`add-nic-defrouter-${row.key}`}
                    >
                      {t('machineEdit.networkAdaptersEditor.zoneNicField.defrouter')}
                    </label>
                    <input
                      id={`add-nic-defrouter-${row.key}`}
                      className="form-control form-control-sm font-monospace"
                      placeholder="none"
                      value={row.defrouter ?? ''}
                      onChange={e => patchAddNic(row.key, { defrouter: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                </>
              )}
            </div>
            {/* New NICs take the MACHINE's netif (per-NIC overrides don't
                exist at add time) — the applicability map keys off it. */}
            {isZone && (
              <NicPropsEditor
                idPrefix={`add-nic-${row.key}`}
                netif={machineNetif}
                props={row.props || {}}
                propsByNetif={nicPropsByNetif}
                propDefaults={knobDefaults}
                propValues={nicEnums || {}}
                onChange={(propKey, value) =>
                  patchAddNic(row.key, { props: { ...(row.props || {}), [propKey]: value } })
                }
                disabled={formDisabled}
              />
            )}
            {/* Tuning rides INLINE on the add_nics entry — the agent applies
                it on whichever free slot it assigns. VirtualBox vocabulary,
                hidden on zones. */}
            {!isZone && (
              <div className="row g-2 align-items-end mt-0">
                {TUNING_FIELDS.map(field => {
                  const inputId = `add-nic-${row.key}-${field.key}`;
                  return (
                    <div className="col-6 col-md-2" key={field.key}>
                      <label className="form-label small mb-1" htmlFor={inputId}>
                        {t(`machineEdit.networkAdaptersEditor.tuningField.${field.key}`)}
                      </label>
                      <NicTuningField
                        inputId={inputId}
                        field={field}
                        value={row[field.key] ?? ''}
                        nicEnums={nicEnums}
                        onChange={value => patchAddNic(row.key, { [field.key]: value })}
                        disabled={formDisabled}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Fragment>
      ))}

      <div className="hw-device-tree-foot">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onAddNicsChange([...addNics, { key: Date.now(), bridge: '', mac: '' }])}
          disabled={formDisabled}
        >
          <i className="fas fa-plus me-1" />
          {t('machineEdit.networkAdaptersEditor.adapterButton')}
        </button>
      </div>
    </div>
  );
};

NetworkAdaptersEditor.propTypes = {
  nics: PropTypes.array.isRequired,
  nicRows: PropTypes.array.isRequired,
  onNicRowsChange: PropTypes.func.isRequired,
  addNics: PropTypes.array.isRequired,
  onAddNicsChange: PropTypes.func.isRequired,
  nicMarked: PropTypes.func.isRequired,
  onToggleNic: PropTypes.func.isRequired,
  nicEnums: PropTypes.object,
  zoneNics: PropTypes.array,
  hostVnics: PropTypes.array,
  bridgeOptions: PropTypes.arrayOf(PropTypes.string),
  zoneNicRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneNic: PropTypes.func,
  zoneNicEdits: PropTypes.object,
  onZoneNicEdit: PropTypes.func,
  onZoneNicPropEdit: PropTypes.func,
  zoneNicCurrent: PropTypes.array,
  nicPropsByNetif: PropTypes.object,
  knobDefaults: PropTypes.object,
  machineNetif: PropTypes.string,
  currentServer: PropTypes.object,
  formDisabled: PropTypes.bool,
};

export default NetworkAdaptersEditor;
