import PropTypes from 'prop-types';
import { Fragment } from 'react';

// The VirtualBox flat showvminfo map: NICs as nic{N}/macaddress{N}/…,
// controllers as storagecontrollername{N}/-type{N}, attachments as
// "<Controller>-<port>-<device>". zadm configs carry their devices as
// bootdisk/disk[]/cdrom/net[] instead and parse via the zone branch below
// (Mark's word: keep the UI-parses-config pattern we have).
const NIC_KEY = /^nic(?<adapter>\d+)$/u;
const CTRL_NAME_KEY = /^storagecontrollername(?<index>\d+)$/u;
const ATTACHMENT_KEY = /^(?<controller>.+)-(?<port>\d+)-(?<device>\d+)$/u;

const listOf = value => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
};

// zadm renders a device as a bare string or an object keyed by path.
const zoneDeviceValue = entry => {
  if (typeof entry === 'string') {
    return entry;
  }
  return entry?.path || entry?.name || JSON.stringify(entry);
};

/** The zadm device families as a renderable shape; null off-zone. */
export const parseZoneHardware = configuration => {
  if (!configuration?.zonename) {
    return null;
  }
  const disks = [
    ...(configuration.bootdisk
      ? [{ name: 'bootdisk', value: zoneDeviceValue(configuration.bootdisk), boot: true }]
      : []),
    ...listOf(configuration.disk).map((entry, index) => ({
      name: `disk${index}`,
      value: zoneDeviceValue(entry),
      boot: false,
    })),
  ];
  const cdroms = listOf(configuration.cdrom).map((entry, index) => ({
    name: `cdrom${index}`,
    value: zoneDeviceValue(entry),
  }));
  const nics = listOf(configuration.net).map((entry, index) => ({
    name: `net${index}`,
    physical: entry?.physical || '',
    allowedAddress: entry?.['allowed-address'] || '',
    mac: entry?.['mac-addr'] || entry?.mac || '',
    globalNic: entry?.['global-nic'] || '',
    vlanId: entry?.['vlan-id'] !== undefined ? String(entry['vlan-id']) : '',
  }));
  if (disks.length === 0 && cdroms.length === 0 && nics.length === 0) {
    return null;
  }
  return { disks, cdroms, nics };
};

export const parseHardware = configuration => {
  const nics = [];
  const controllers = [];
  const attachments = [];
  const entries = Object.entries(configuration || {});
  // Controllers FIRST: attachment keys only parse against KNOWN controller
  // names — per-attachment metadata keys ("SATA Controller-discard-0-0",
  // "-nonrotational-", "-ImageUUID-", "-IsEjected-") never render as devices.
  entries.forEach(([key, value]) => {
    const ctrlMatch = CTRL_NAME_KEY.exec(key);
    if (ctrlMatch) {
      controllers.push({
        name: String(value),
        type: configuration[`storagecontrollertype${ctrlMatch.groups.index}`] || '',
      });
    }
  });
  const controllerNames = new Set(controllers.map(controller => controller.name));
  entries.forEach(([key, value]) => {
    const nicMatch = NIC_KEY.exec(key);
    if (nicMatch && value && value !== 'none') {
      const { adapter } = nicMatch.groups;
      nics.push({
        adapter: Number(adapter),
        mode: String(value),
        mac: configuration[`macaddress${adapter}`] || '',
        bridge:
          configuration[`bridgeadapter${adapter}`] ||
          configuration[`hostonlyadapter${adapter}`] ||
          '',
      });
      return;
    }
    const attachMatch = ATTACHMENT_KEY.exec(key);
    if (
      attachMatch &&
      controllerNames.has(attachMatch.groups.controller) &&
      value &&
      value !== 'none'
    ) {
      const path = String(value);
      attachments.push({
        controller: attachMatch.groups.controller,
        port: Number(attachMatch.groups.port),
        device: Number(attachMatch.groups.device),
        path,
        kind: path === 'emptydrive' || /\.iso$/iu.test(path) ? 'cdrom' : 'disk',
      });
    }
  });
  nics.sort((a, b) => a.adapter - b.adapter);
  attachments.sort((a, b) => a.controller.localeCompare(b.controller) || a.port - b.port);
  return { nics, controllers, attachments, zone: parseZoneHardware(configuration) };
};

// Mark-for-removal affordances shared by the Settings device editors — the
// row itself takes `hw-device-removed` while marked.
export const markButtonClass = isMarked => (isMarked ? 'btn-warning' : 'btn-outline-danger');
export const markIconClass = isMarked => (isMarked ? 'fa-rotate-left' : 'fa-trash');

const kindIcon = kind => (kind === 'cdrom' ? 'fa-compact-disc' : 'fa-hdd');

/** One attached medium as a read-only tree child row. */
const AttachmentRow = ({ entry }) => (
  <div className="hw-device-row hw-device-child">
    <i className={`fas ${kindIcon(entry.kind)} text-muted`} />
    <span className="hw-device-meta">
      port {entry.port} · dev {entry.device}
    </span>
    <span className="hw-device-path" title={entry.path}>
      {entry.path === 'emptydrive' ? '(empty drive)' : entry.path}
    </span>
    {entry.port === 0 && entry.kind === 'disk' && (
      <span
        className="badge text-bg-light ms-auto"
        title="Port 0 is the boot medium — the agent refuses removing it"
      >
        boot
      </span>
    )}
  </div>
);

AttachmentRow.propTypes = {
  entry: PropTypes.object.isRequired,
};

/** A NIC's identity line (mode/bridge/MAC), shared by panel and editor. */
export const nicSummary = nic =>
  [nic.mode, nic.bridge ? `on ${nic.bridge}` : '', nic.mac].filter(Boolean).join(' · ');

/** A zone NIC's identity line (vnic/allowed-address/MAC). */
export const zoneNicSummary = nic =>
  [nic.physical, nic.globalNic ? `over ${nic.globalNic}` : '', nic.allowedAddress, nic.mac]
    .filter(Boolean)
    .join(' · ');

/** The zone's device families as read-only tree rows — shared by the
 *  Overview panel and the Settings editors. */
export const ZoneDeviceRows = ({ zone, showNics = true }) => (
  <>
    {zone.disks.length > 0 && (
      <div className="hw-device-row hw-device-group">
        <i className="fas fa-hard-drive text-muted" />
        <span>Disks</span>
      </div>
    )}
    {zone.disks.map(disk => (
      <div className="hw-device-row hw-device-child" key={disk.name}>
        <i className="fas fa-hdd text-muted" />
        <span className="hw-device-meta">{disk.name}</span>
        <span className="hw-device-path" title={disk.value}>
          {disk.value}
        </span>
        {disk.boot && (
          <span className="badge text-bg-light ms-auto" title="The zone's boot medium">
            boot
          </span>
        )}
      </div>
    ))}
    {zone.cdroms.length > 0 && (
      <div className="hw-device-row hw-device-group">
        <i className="fas fa-compact-disc text-muted" />
        <span>CD/DVD</span>
      </div>
    )}
    {zone.cdroms.map(cdrom => (
      <div className="hw-device-row hw-device-child" key={cdrom.name}>
        <i className="fas fa-compact-disc text-muted" />
        <span className="hw-device-meta">{cdrom.name}</span>
        <span className="hw-device-path" title={cdrom.value}>
          {cdrom.value}
        </span>
      </div>
    ))}
    {showNics && zone.nics.length > 0 && (
      <div className="hw-device-row hw-device-group">
        <i className="fas fa-network-wired text-muted" />
        <span>Network</span>
      </div>
    )}
    {showNics &&
      zone.nics.map(nic => (
        <div className="hw-device-row hw-device-child" key={nic.name}>
          <i className="fas fa-ethernet text-muted" />
          <span className="hw-device-meta">{nic.name}</span>
          <span className="hw-device-path">{zoneNicSummary(nic)}</span>
        </div>
      ))}
  </>
);

ZoneDeviceRows.propTypes = {
  zone: PropTypes.object.isRequired,
  showNics: PropTypes.bool,
};

/**
 * The machine's hardware as a read-only device tree (the Overview card):
 * VirtualBox groups media under storage controllers; zones render their
 * bootdisk/disks/cdroms/net families. The editable versions live in
 * StorageDevicesEditor / NetworkAdaptersEditor.
 */
export const CurrentHardwarePanel = ({ currentHardware }) => {
  const { controllers, attachments, nics, zone } = currentHardware;
  if (zone) {
    return (
      <div className="hw-device-tree">
        <div className="hw-device-tree-head">
          <i className="fas fa-microchip" />
          <span>Hardware</span>
        </div>
        <ZoneDeviceRows zone={zone} />
      </div>
    );
  }
  if (controllers.length === 0 && attachments.length === 0 && nics.length === 0) {
    return null;
  }
  return (
    <div className="hw-device-tree">
      <div className="hw-device-tree-head">
        <i className="fas fa-microchip" />
        <span>Hardware</span>
      </div>
      {controllers.map(controller => (
        <Fragment key={controller.name}>
          <div className="hw-device-row hw-device-group">
            <i className="fas fa-hard-drive text-muted" />
            <span>{controller.name}</span>
            {controller.type && <span className="badge text-bg-secondary">{controller.type}</span>}
          </div>
          {attachments
            .filter(entry => entry.controller === controller.name)
            .map(entry => (
              <AttachmentRow
                entry={entry}
                key={`${entry.controller}-${entry.port}-${entry.device}`}
              />
            ))}
        </Fragment>
      ))}
      {nics.length > 0 && (
        <div className="hw-device-row hw-device-group">
          <i className="fas fa-network-wired text-muted" />
          <span>Network Adapters</span>
        </div>
      )}
      {nics.map(nic => (
        <div className="hw-device-row hw-device-child" key={nic.adapter}>
          <i className="fas fa-ethernet text-muted" />
          <span>Adapter {nic.adapter}</span>
          <span className="hw-device-meta">{nicSummary(nic)}</span>
          {nic.adapter === 1 && (
            <span
              className="badge text-bg-light ms-auto"
              title="Adapter 1 is the provisioning NAT on agent-created machines"
            >
              provisioning NAT
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

CurrentHardwarePanel.propTypes = {
  currentHardware: PropTypes.object.isRequired,
};
