import PropTypes from 'prop-types';

// hardware.<section>.<key> — mirrors the agent vocabulary (hyperweaver-agent
// internal/machines/hardware.go). kind: onoff | int | string. `suggest`
// feeds a datalist; values ride unvalidated — VirtualBox's own errors answer.
export const HARDWARE_SECTIONS = [
  {
    id: 'cpu',
    label: 'CPU',
    fields: [
      { key: 'hotplug', kind: 'onoff' },
      { key: 'execution_cap', kind: 'int', hint: '1-100 %' },
      { key: 'profile', kind: 'string', suggest: ['host'] },
      { key: 'pae', kind: 'onoff' },
      { key: 'long_mode', kind: 'onoff' },
      { key: 'hwvirtex', kind: 'onoff' },
      { key: 'nested_paging', kind: 'onoff' },
      { key: 'large_pages', kind: 'onoff' },
      { key: 'nested_hw_virt', kind: 'onoff' },
      { key: 'virt_vmsave_vmload', kind: 'onoff' },
      { key: 'vtx_vpid', kind: 'onoff' },
      { key: 'vtx_ux', kind: 'onoff' },
      { key: 'apic', kind: 'onoff' },
      { key: 'x2apic', kind: 'onoff' },
      { key: 'hpet', kind: 'onoff' },
      { key: 'spec_ctrl', kind: 'onoff' },
      { key: 'ibpb_on_vm_exit', kind: 'onoff' },
      { key: 'ibpb_on_vm_entry', kind: 'onoff' },
      { key: 'l1d_flush_on_sched', kind: 'onoff' },
      { key: 'l1d_flush_on_vm_entry', kind: 'onoff' },
      { key: 'mds_clear_on_sched', kind: 'onoff' },
      { key: 'mds_clear_on_vm_entry', kind: 'onoff' },
      { key: 'arm_gic_its', kind: 'onoff' },
      { key: 'cpuid_portability_level', kind: 'int' },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    fields: [
      { key: 'vram', kind: 'int', hint: 'MB' },
      { key: 'page_fusion', kind: 'onoff' },
      { key: 'balloon', kind: 'int', hint: 'MB' },
    ],
  },
  {
    id: 'graphics',
    label: 'Graphics',
    fields: [
      { key: 'controller', kind: 'string', suggest: ['vboxvga', 'vmsvga', 'vboxsvga', 'none'] },
      { key: 'monitor_count', kind: 'int' },
      { key: 'accelerate_3d', kind: 'onoff' },
    ],
  },
  {
    id: 'audio',
    label: 'Audio',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      {
        key: 'driver',
        kind: 'string',
        suggest: ['default', 'null', 'dsound', 'was', 'oss', 'alsa', 'pulse', 'coreaudio'],
      },
      { key: 'controller', kind: 'string', suggest: ['ac97', 'hda', 'sb16'] },
      { key: 'codec', kind: 'string', suggest: ['stac9700', 'ad1980', 'stac9221', 'sb16'] },
      { key: 'in', kind: 'onoff' },
      { key: 'out', kind: 'onoff' },
    ],
  },
  {
    id: 'usb',
    label: 'USB',
    fields: [
      { key: 'ohci', kind: 'onoff' },
      { key: 'ehci', kind: 'onoff' },
      { key: 'xhci', kind: 'onoff' },
      { key: 'card_reader', kind: 'onoff' },
    ],
  },
  {
    id: 'integration',
    label: 'Integration',
    fields: [
      {
        key: 'clipboard_mode',
        kind: 'string',
        suggest: ['disabled', 'hosttoguest', 'guesttohost', 'bidirectional'],
      },
      { key: 'clipboard_file_transfers', kind: 'string', suggest: ['enabled', 'disabled'] },
      {
        key: 'drag_and_drop',
        kind: 'string',
        suggest: ['disabled', 'hosttoguest', 'guesttohost', 'bidirectional'],
      },
      {
        key: 'mouse',
        kind: 'string',
        suggest: ['ps2', 'usb', 'usbtablet', 'usbmultitouch', 'usbmtscreenpluspad'],
      },
      { key: 'keyboard', kind: 'string', suggest: ['ps2', 'usb'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    fields: [
      { key: 'chipset', kind: 'string', suggest: ['piix3', 'ich9', 'armv8virtual'] },
      { key: 'iommu', kind: 'string', suggest: ['none', 'automatic', 'amd', 'intel'] },
      { key: 'tpm_type', kind: 'string', suggest: ['none', '1.2', '2.0', 'host', 'swtpm'] },
      { key: 'tpm_location', kind: 'string' },
      { key: 'rtc_use_utc', kind: 'onoff' },
      {
        key: 'paravirt_provider',
        kind: 'string',
        suggest: ['none', 'default', 'legacy', 'minimal', 'hyperv', 'kvm'],
      },
      { key: 'ioapic', kind: 'onoff' },
      { key: 'triple_fault_reset', kind: 'onoff' },
      { key: 'hardware_uuid', kind: 'string' },
      { key: 'system_uuid_le', kind: 'onoff' },
      { key: 'snapshot_folder', kind: 'string' },
      { key: 'description', kind: 'string' },
      { key: 'groups', kind: 'string', hint: '/group/subgroup' },
      { key: 'icon_file', kind: 'string' },
      { key: 'default_frontend', kind: 'string', suggest: ['gui', 'headless', 'sdl', 'separate'] },
      {
        key: 'vm_process_priority',
        kind: 'string',
        suggest: ['default', 'flat', 'low', 'normal', 'high'],
      },
      {
        key: 'vm_execution_engine',
        kind: 'string',
        suggest: ['default', 'hm', 'hwvirt', 'nem', 'native-api', 'interpreter', 'recompiler'],
      },
    ],
  },
  {
    id: 'firmware',
    label: 'Firmware',
    fields: [
      { key: 'boot_menu', kind: 'string', suggest: ['disabled', 'menuonly', 'messageandmenu'] },
      { key: 'apic', kind: 'string', suggest: ['disabled', 'apic', 'x2apic'] },
      { key: 'logo_fade_in', kind: 'onoff' },
      { key: 'logo_fade_out', kind: 'onoff' },
      { key: 'logo_display_time', kind: 'int', hint: 'ms' },
      { key: 'logo_image_path', kind: 'string' },
      { key: 'system_time_offset', kind: 'int', hint: 'ms' },
      { key: 'pxe_debug', kind: 'onoff' },
    ],
  },
  {
    id: 'recording',
    label: 'Recording',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'screens', kind: 'string', suggest: ['all'] },
      { key: 'file', kind: 'string' },
      { key: 'max_size_mb', kind: 'int' },
      { key: 'max_time_seconds', kind: 'int' },
      { key: 'opts', kind: 'string' },
      { key: 'video_fps', kind: 'int' },
      { key: 'video_rate', kind: 'int', hint: 'kbps' },
      { key: 'video_res', kind: 'string', hint: 'e.g. 1024x768' },
    ],
  },
  {
    id: 'vrde',
    label: 'VRDE',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'port', kind: 'string', hint: 'ranges: 5000,5010-5012' },
      { key: 'extpack', kind: 'string' },
      { key: 'address', kind: 'string' },
      { key: 'auth_type', kind: 'string', suggest: ['null', 'external', 'guest'] },
      { key: 'auth_library', kind: 'string' },
      { key: 'multi_con', kind: 'onoff' },
      { key: 'reuse_con', kind: 'onoff' },
      { key: 'video_channel', kind: 'onoff' },
      { key: 'video_channel_quality', kind: 'int', hint: '10-100 %' },
    ],
  },
  {
    id: 'autostart',
    label: 'Autostart',
    fields: [
      { key: 'enabled', kind: 'onoff' },
      { key: 'delay', kind: 'int', hint: 'seconds' },
    ],
  },
];

const fieldLabel = key => key.replace(/_/gu, ' ');

export const VocabularySelect = ({
  id,
  value,
  entries,
  blankLabel,
  onChange,
  onCustom = null,
  customLabel = 'Custom value…',
  small = false,
  disabled = false,
}) => {
  const rows = entries.map(entry =>
    entry && typeof entry === 'object' ? entry : { value: entry, label: String(entry) }
  );
  return (
    <select
      id={id}
      className={small ? 'form-select form-select-sm' : 'form-select'}
      value={value}
      onChange={e => {
        if (onCustom && e.target.value === '__custom__') {
          onCustom();
          return;
        }
        onChange(e.target.value);
      }}
      disabled={disabled}
    >
      <option value="">{blankLabel}</option>
      {value && !rows.some(row => row.value === value) && <option value={value}>{value}</option>}
      {rows.map(row => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
      {onCustom && <option value="__custom__">{customLabel}</option>}
    </select>
  );
};

VocabularySelect.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  entries: PropTypes.array.isRequired,
  blankLabel: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onCustom: PropTypes.func,
  customLabel: PropTypes.string,
  small: PropTypes.bool,
  disabled: PropTypes.bool,
};

const HardwareFieldControl = ({
  inputId,
  sectionId,
  field,
  value,
  enumValues,
  onChange,
  blankLabel,
  disabled,
}) => {
  const vocabulary = enumValues || (field.kind === 'onoff' ? ['on', 'off'] : field.suggest);
  if (vocabulary) {
    return (
      <VocabularySelect
        id={inputId}
        value={value}
        entries={vocabulary}
        blankLabel={blankLabel}
        small
        onChange={next => onChange(sectionId, field.key, next)}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      id={inputId}
      className="form-control form-control-sm"
      type={field.kind === 'int' ? 'number' : 'text'}
      placeholder={field.hint || blankLabel}
      value={value}
      onChange={e => onChange(sectionId, field.key, e.target.value)}
      disabled={disabled}
    />
  );
};

HardwareFieldControl.propTypes = {
  inputId: PropTypes.string.isRequired,
  sectionId: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  enumValues: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  blankLabel: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

/**
 * One hardware section as a compact grid. Blank = not sent. `knobValues` is
 * the agent's whole knob_values map (flat dotted keys) — presence of
 * `hardware.<section>.<key>` means dropdown.
 */
export const HardwareSectionForm = ({
  section,
  values,
  onChange,
  knobValues = null,
  blankLabel = 'unchanged',
  disabled,
}) => (
  <div className="row g-2">
    {section.fields.map(field => {
      const inputId = `hw-${section.id}-${field.key}`;
      return (
        <div className="col-6 col-md-4 col-lg-3" key={field.key}>
          <label className="form-label small mb-1 text-capitalize" htmlFor={inputId}>
            {fieldLabel(field.key)}
          </label>
          <HardwareFieldControl
            inputId={inputId}
            sectionId={section.id}
            field={field}
            value={values[field.key] ?? ''}
            enumValues={knobValues?.[`hardware.${section.id}.${field.key}`] || null}
            onChange={onChange}
            blankLabel={blankLabel}
            disabled={disabled}
          />
        </div>
      );
    })}
  </div>
);

HardwareSectionForm.propTypes = {
  section: PropTypes.object.isRequired,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  knobValues: PropTypes.object,
  blankLabel: PropTypes.string,
  disabled: PropTypes.bool,
};

/** Sparse hardware payload — only set values ride; ints become numbers. */
export const buildHardwarePayload = hardware => {
  const payload = {};
  HARDWARE_SECTIONS.forEach(section => {
    const values = hardware[section.id] || {};
    const cleaned = {};
    section.fields.forEach(field => {
      const value = values[field.key];
      if (value === '' || value === undefined || value === null) {
        return;
      }
      cleaned[field.key] = field.kind === 'int' ? Number(value) : value;
    });
    if (Object.keys(cleaned).length > 0) {
      payload[section.id] = cleaned;
    }
  });
  return Object.keys(payload).length > 0 ? payload : null;
};

/**
 * CHANGED-only hardware payload for the Settings surface: a key rides only
 * when it differs from the seeded current value (knob_current). Blank =
 * unchanged, never sent.
 */
export const diffHardwarePayload = (hardware, seededHardware) => {
  const payload = {};
  HARDWARE_SECTIONS.forEach(section => {
    const values = hardware[section.id] || {};
    const seeded = seededHardware[section.id] || {};
    const cleaned = {};
    section.fields.forEach(field => {
      const value = values[field.key];
      if (value === '' || value === undefined || value === null) {
        return;
      }
      if (value === (seeded[field.key] ?? '')) {
        return;
      }
      cleaned[field.key] = field.kind === 'int' ? Number(value) : value;
    });
    if (Object.keys(cleaned).length > 0) {
      payload[section.id] = cleaned;
    }
  });
  return Object.keys(payload).length > 0 ? payload : null;
};

const CPU_TOPO_FIELDS = [
  ['sockets', 16],
  ['cores', 32],
  ['threads', 2],
];

export const cpuTopoProduct = topo =>
  (Number(topo.sockets) || 0) * (Number(topo.cores) || 0) * (Number(topo.threads) || 0);

export const CpuTopologyInputs = ({ idPrefix, topo, onField, disabled }) => (
  <>
    {CPU_TOPO_FIELDS.map(([key, max]) => (
      <div className="col-4 col-md-2" key={key}>
        <label className="form-label" htmlFor={`${idPrefix}-${key}`}>
          {key[0].toUpperCase() + key.slice(1)}
        </label>
        <input
          id={`${idPrefix}-${key}`}
          className="form-control"
          type="number"
          min="1"
          max={max}
          value={topo[key] ?? ''}
          onChange={e => onField(key, e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
        />
      </div>
    ))}
    <div className="col-12">
      <span className={`form-text ${cpuTopoProduct(topo) > 32 ? 'text-danger' : 'text-muted'}`}>
        sockets × cores × threads = {cpuTopoProduct(topo) || '…'} vCPUs — bhyve limits: sockets ≤16,
        cores ≤32, threads ≤2, product ≤32. Over-limit values are refused by the agent.
      </span>
    </div>
  </>
);

CpuTopologyInputs.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  topo: PropTypes.object.isRequired,
  onField: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const portRow = fields => ({ key: Date.now() + Math.random(), ...fields });

/** hardware.serial[] rows — {port 1-4, io_base, irq, mode, type}. */
export const SerialPortsEditor = ({ rows, onRowsChange, disabled }) => (
  <div className="d-flex flex-column gap-2">
    {rows.map((row, index) => (
      <div className="row g-2 align-items-end" key={`serial-${row.key}`}>
        <div className="col-2 col-md-1">
          <label className="form-label small mb-1" htmlFor={`serial-port-${row.key}`}>
            Port
          </label>
          <select
            id={`serial-port-${row.key}`}
            className="form-select form-select-sm"
            value={row.port}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, port: e.target.value } : r)))
            }
            disabled={disabled}
          >
            {['1', '2', '3', '4'].map(port => (
              <option key={port} value={port}>
                {port}
              </option>
            ))}
          </select>
        </div>
        <div className="col-3 col-md-2">
          <label className="form-label small mb-1" htmlFor={`serial-iobase-${row.key}`}>
            IO base
          </label>
          <input
            id={`serial-iobase-${row.key}`}
            className="form-control form-control-sm"
            list={`serial-iobase-${row.key}-options`}
            placeholder="off"
            value={row.io_base}
            onChange={e =>
              onRowsChange(
                rows.map((r, i) => (i === index ? { ...r, io_base: e.target.value } : r))
              )
            }
            disabled={disabled}
          />
          <datalist id={`serial-iobase-${row.key}-options`}>
            {['off', '0x3F8', '0x2F8', '0x3E8', '0x2E8'].map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-2 col-md-1">
          <label className="form-label small mb-1" htmlFor={`serial-irq-${row.key}`}>
            IRQ
          </label>
          <input
            id={`serial-irq-${row.key}`}
            className="form-control form-control-sm"
            type="number"
            min="0"
            value={row.irq}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, irq: e.target.value } : r)))
            }
            disabled={disabled}
          />
        </div>
        <div className="col-3 col-md-4">
          <label className="form-label small mb-1" htmlFor={`serial-mode-${row.key}`}>
            Mode
          </label>
          <input
            id={`serial-mode-${row.key}`}
            className="form-control form-control-sm"
            placeholder="disconnected | server <pipe> | tcpserver <port> | file <path> | <device>"
            value={row.mode}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, mode: e.target.value } : r)))
            }
            disabled={disabled}
          />
        </div>
        <div className="col-2 col-md-2">
          <label className="form-label small mb-1" htmlFor={`serial-type-${row.key}`}>
            UART type
          </label>
          <input
            id={`serial-type-${row.key}`}
            className="form-control form-control-sm"
            list={`serial-type-${row.key}-options`}
            value={row.type}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, type: e.target.value } : r)))
            }
            disabled={disabled}
          />
          <datalist id={`serial-type-${row.key}-options`}>
            {['16450', '16550A', '16750'].map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label="Drop this serial port row"
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>
    ))}
    <div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() =>
          onRowsChange([...rows, portRow({ port: '1', io_base: '', irq: '', mode: '', type: '' })])
        }
        disabled={disabled}
      >
        <i className="fas fa-plus me-2" />
        Serial Port
      </button>
    </div>
  </div>
);

SerialPortsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** hardware.parallel[] rows — {port 1-2, io_base, irq, device}. */
export const ParallelPortsEditor = ({ rows, onRowsChange, disabled }) => (
  <div className="d-flex flex-column gap-2">
    {rows.map((row, index) => (
      <div className="row g-2 align-items-end" key={`parallel-${row.key}`}>
        <div className="col-2 col-md-1">
          <label className="form-label small mb-1" htmlFor={`parallel-port-${row.key}`}>
            Port
          </label>
          <select
            id={`parallel-port-${row.key}`}
            className="form-select form-select-sm"
            value={row.port}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, port: e.target.value } : r)))
            }
            disabled={disabled}
          >
            {['1', '2'].map(port => (
              <option key={port} value={port}>
                {port}
              </option>
            ))}
          </select>
        </div>
        <div className="col-3 col-md-2">
          <label className="form-label small mb-1" htmlFor={`parallel-iobase-${row.key}`}>
            IO base
          </label>
          <input
            id={`parallel-iobase-${row.key}`}
            className="form-control form-control-sm"
            list={`parallel-iobase-${row.key}-options`}
            placeholder="off"
            value={row.io_base}
            onChange={e =>
              onRowsChange(
                rows.map((r, i) => (i === index ? { ...r, io_base: e.target.value } : r))
              )
            }
            disabled={disabled}
          />
          <datalist id={`parallel-iobase-${row.key}-options`}>
            {['off', '0x378', '0x278'].map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-2 col-md-1">
          <label className="form-label small mb-1" htmlFor={`parallel-irq-${row.key}`}>
            IRQ
          </label>
          <input
            id={`parallel-irq-${row.key}`}
            className="form-control form-control-sm"
            type="number"
            min="0"
            value={row.irq}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, irq: e.target.value } : r)))
            }
            disabled={disabled}
          />
        </div>
        <div className="col-4 col-md-4">
          <label className="form-label small mb-1" htmlFor={`parallel-device-${row.key}`}>
            Device
          </label>
          <input
            id={`parallel-device-${row.key}`}
            className="form-control form-control-sm"
            placeholder="e.g. LPT1 or /dev/lp0"
            value={row.device}
            onChange={e =>
              onRowsChange(rows.map((r, i) => (i === index ? { ...r, device: e.target.value } : r)))
            }
            disabled={disabled}
          />
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label="Drop this parallel port row"
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>
    ))}
    <div>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() =>
          onRowsChange([...rows, portRow({ port: '1', io_base: '', irq: '', device: '' })])
        }
        disabled={disabled}
      >
        <i className="fas fa-plus me-2" />
        Parallel Port
      </button>
    </div>
  </div>
);

ParallelPortsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** Ports payload rows: numbers for irq, everything else verbatim. */
export const buildPortsPayload = rows =>
  rows
    .filter(row => row.port !== '')
    .map(row => {
      const entry = { port: Number(row.port) };
      if (row.io_base?.trim()) {
        entry.io_base = row.io_base.trim();
      }
      if (row.irq !== '' && row.irq !== undefined) {
        entry.irq = Number(row.irq);
      }
      if (row.mode?.trim()) {
        entry.mode = row.mode.trim();
      }
      if (row.type?.trim()) {
        entry.type = row.type.trim();
      }
      if (row.device?.trim()) {
        entry.device = row.device.trim();
      }
      return entry;
    });

// Per-adapter NIC tuning lives in NetworkAdaptersEditor — one editor per
// EXISTING adapter, so tuning can never address an adapter that isn't there.
