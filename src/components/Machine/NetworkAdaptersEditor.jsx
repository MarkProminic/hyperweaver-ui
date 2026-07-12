import PropTypes from 'prop-types';
import { Fragment, useState } from 'react';

import { markButtonClass, markIconClass, nicSummary } from './CurrentHardware';

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
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-link p-0"
      title={copied ? 'Copied' : `Copy ${label}`}
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
];

const zoneNicPlaceholder = (field, nic, live) => {
  const current = field.currentOf(nic);
  if (current) {
    return current;
  }
  const liveValue = field.liveOf(live);
  return liveValue ? `unset — live: ${liveValue}` : '(unset)';
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
  if (!live) {
    return (
      <span className="text-muted small">no live VNIC record — the vnic may not exist yet</span>
    );
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1 align-items-center small">
      <span
        className={`badge ${live.state === 'up' ? 'text-bg-success' : 'text-bg-secondary'}`}
        title="Link state"
      >
        {live.state || 'unknown'}
      </span>
      {live.over && (
        <span className="badge text-bg-secondary" title="Physical link the VNIC rides">
          over {live.over}
        </span>
      )}
      {liveSpeed(live.speed) && (
        <span className="badge text-bg-info" title="Link speed">
          {liveSpeed(live.speed)}
        </span>
      )}
      <code className="small" title={`Live MAC (${live.macaddrtype || 'unknown type'})`}>
        {live.macaddress}
      </code>
      {live.macaddress && <CopyButton value={live.macaddress} label="live MAC" />}
      {live.macaddrtype && <span className="text-muted">({live.macaddrtype})</span>}
      <span className="badge text-bg-light border" title="VLAN id">
        VID {live.vid ?? 0}
      </span>
      {live.mtu && (
        <span className="badge text-bg-light border" title="MTU">
          MTU {live.mtu}
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
});

const NicTuningField = ({ inputId, field, value, nicEnums, onChange, disabled }) => {
  // nicEnums is the agent's whole knob_values map (flat dotted keys).
  const vocabulary =
    field.options ||
    (field.enumKey ? nicEnums?.[`nics.${field.enumKey}`] || FALLBACK_ENUMS[field.enumKey] : null);
  if (vocabulary) {
    const entries = field.options
      ? field.options
      : vocabulary.map(option => ({ value: option, label: option }));
    return (
      <select
        id={inputId}
        className="form-select form-select-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">(default)</option>
        {value && !entries.some(entry => entry.value === value) && (
          <option value={value}>{value}</option>
        )}
        {entries.map(entry => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={inputId}
      className="form-control form-control-sm"
      type={field.type || 'text'}
      placeholder="(default)"
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
  formDisabled = false,
}) => {
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
        <span>Network Adapters</span>
      </div>

      {isZone &&
        zoneNics.map(nic => {
          const isMarked = zoneNicRemovals.includes(nic.physical);
          const edits = zoneNicEdits[nic.physical] || {};
          const live = hostVnics.find(vnic => vnic.link === nic.physical) || null;
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
                    <CopyButton value={nic.physical} label="VNIC name" />
                  </>
                )}
                {nic.allowedAddress && (
                  <span className="badge text-bg-light border" title="zonecfg allowed-address">
                    {nic.allowedAddress}
                  </span>
                )}
                {nic.physical && (
                  <div className="hw-device-actions">
                    <button
                      type="button"
                      className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                      title={
                        isMarked
                          ? 'Unmark'
                          : 'Detach this NIC from the zone — the host VNIC survives'
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
                <i className="fas fa-wave-square text-muted" title="Live dladm state" />
                <LiveVnicLine live={live} />
              </div>
              {!isMarked && nic.physical && (
                <div className="hw-device-row hw-device-child hw-device-child-form">
                  <div className="row g-2 align-items-end">
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
                          placeholder={zoneNicPlaceholder(field, nic, live)}
                          title="Blank = keep the current value; clearing a property needs detach + re-add"
                          value={edits[field.key] ?? ''}
                          onChange={e => onZoneNicEdit(nic.physical, field.key, e.target.value)}
                          disabled={formDisabled}
                        />
                      );
                      return (
                        <div className="col-6 col-md-3" key={field.key}>
                          <label className="form-label small mb-1" htmlFor={inputId}>
                            {field.label}
                          </label>
                          {isMac ? (
                            <div className="input-group input-group-sm">
                              {control}
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title="Generate a random locally-administered MAC"
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
            </Fragment>
          );
        })}
      {isZone && (
        <div className="hw-device-row hw-device-meta">
          Edits apply IN PLACE (blank = keep current; clearing a property needs detach + re-add).
          Detached NICs keep their host VNIC. Changes queue on Apply; a running zone accrues them
          for the next power cycle.
        </div>
      )}

      {!isZone && nics.length === 0 && addNics.length === 0 && (
        <div className="hw-device-row hw-device-meta">No network adapters reported.</div>
      )}

      {nics.map(nic => {
        const isMarked = nicMarked(nic.adapter);
        const row = rowFor(nic.adapter) || blankNicRow(nic.adapter);
        return (
          <Fragment key={nic.adapter}>
            <div className={`hw-device-row hw-device-group ${isMarked ? 'hw-device-removed' : ''}`}>
              <i className="fas fa-ethernet text-muted" />
              <span>Adapter {nic.adapter}</span>
              <span className="hw-device-meta">{nicSummary(nic)}</span>
              {nic.adapter === 1 && (
                <span
                  className="badge text-bg-light"
                  title="Adapter 1 is the provisioning NAT on agent-created machines"
                >
                  provisioning NAT
                </span>
              )}
              <div className="hw-device-actions">
                <button
                  type="button"
                  className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                  title={isMarked ? 'Unmark' : 'Mark this adapter for removal'}
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
                          {field.label}
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
            <span>New adapter</span>
            <span className="hw-device-meta">bridged — the agent assigns the next free slot</span>
            <div className="hw-device-actions">
              <button
                type="button"
                className="btn btn-sm py-0 btn-outline-danger"
                aria-label="Drop this new adapter"
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
                  Bridge interface
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
                  MAC (blank = auto)
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
                    title="Generate a random locally-administered MAC"
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
                      VLAN id
                    </label>
                    <input
                      id={`add-nic-vlan-${row.key}`}
                      className="form-control form-control-sm"
                      type="number"
                      min="0"
                      placeholder="(none)"
                      value={row.vlan_id ?? ''}
                      onChange={e => patchAddNic(row.key, { vlan_id: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label small mb-1" htmlFor={`add-nic-allowed-${row.key}`}>
                      Allowed address
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
                      VNIC name (blank = auto)
                    </label>
                    <input
                      id={`add-nic-physical-${row.key}`}
                      className="form-control form-control-sm font-monospace"
                      value={row.physical ?? ''}
                      onChange={e => patchAddNic(row.key, { physical: e.target.value })}
                      disabled={formDisabled}
                    />
                  </div>
                </>
              )}
            </div>
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
                        {field.label}
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
          Adapter
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
  formDisabled: PropTypes.bool,
};

export default NetworkAdaptersEditor;
