import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

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
      ? [
          {
            name: 'bootdisk',
            value: zoneDeviceValue(configuration.bootdisk),
            size: configuration.bootdisk?.size || '',
            boot: true,
          },
        ]
      : []),
    ...listOf(configuration.disk).map((entry, index) => ({
      name: `disk${index}`,
      value: zoneDeviceValue(entry),
      size: entry?.size || '',
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
    address: entry?.address || '',
    defrouter: entry?.defrouter || '',
  }));
  if (disks.length === 0 && cdroms.length === 0 && nics.length === 0) {
    return null;
  }
  return { disks, cdroms, nics };
};

export const currentHardwareOf = machineDetails => {
  const devices = machineDetails?.knob_current?.devices;
  return {
    nics: Array.isArray(devices?.nics) ? devices.nics : [],
    controllers: Array.isArray(devices?.controllers) ? devices.controllers : [],
    attachments: Array.isArray(devices?.attachments) ? devices.attachments : [],
    zone: parseZoneHardware(machineDetails?.configuration),
  };
};

// Mark-for-removal affordances shared by the Settings device editors — the
// row itself takes `hw-device-removed` while marked.
export const markButtonClass = isMarked => (isMarked ? 'btn-warning' : 'btn-outline-danger');
export const markIconClass = isMarked => (isMarked ? 'fa-rotate-left' : 'fa-trash');

const kindIcon = kind => (kind === 'cdrom' ? 'fa-compact-disc' : 'fa-hdd');

/** One attached medium as a read-only tree child row. */
const AttachmentRow = ({ entry }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-device-row hw-device-child">
      <i className={`fas ${kindIcon(entry.kind)} text-muted`} />
      <span className="hw-device-meta">
        {t('machineEdit.currentHardware.portDev', { port: entry.port, device: entry.device })}
      </span>
      <span className="hw-device-path" title={entry.path}>
        {entry.path || t('machineEdit.currentHardware.emptyDrive')}
      </span>
      {entry.port === 0 && entry.kind === 'disk' && (
        <span
          className="badge text-bg-light ms-auto"
          title={t('machineEdit.currentHardware.bootMediumTitle')}
        >
          {t('machineEdit.currentHardware.boot')}
        </span>
      )}
    </div>
  );
};

AttachmentRow.propTypes = {
  entry: PropTypes.object.isRequired,
};

/** A NIC's identity line (mode/network/MAC), shared by panel and editor. */
export const nicSummary = nic =>
  [nic.mode, nic.network ? `on ${nic.network}` : '', nic.mac].filter(Boolean).join(' · ');

/** A zone NIC's identity line (vnic/allowed-address/MAC). */
export const zoneNicSummary = nic =>
  [nic.physical, nic.globalNic ? `over ${nic.globalNic}` : '', nic.allowedAddress, nic.mac]
    .filter(Boolean)
    .join(' · ');

/** The zone's device families as read-only tree rows — shared by the
 *  Overview panel and the Settings editors. */
export const ZoneDeviceRows = ({ zone, showNics = true }) => {
  const { t } = useTranslation();
  return (
    <>
      {zone.disks.length > 0 && (
        <div className="hw-device-row hw-device-group">
          <i className="fas fa-hard-drive text-muted" />
          <span>{t('machineEdit.currentHardware.disks')}</span>
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
            <span
              className="badge text-bg-light ms-auto"
              title={t('machineEdit.currentHardware.zoneBootMediumTitle')}
            >
              {t('machineEdit.currentHardware.boot')}
            </span>
          )}
        </div>
      ))}
      {zone.cdroms.length > 0 && (
        <div className="hw-device-row hw-device-group">
          <i className="fas fa-compact-disc text-muted" />
          <span>{t('machineEdit.currentHardware.cdDvd')}</span>
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
          <span>{t('machineEdit.currentHardware.network')}</span>
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
};

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
export const HardwareDeviceTree = ({ currentHardware }) => {
  const { t } = useTranslation();
  const { controllers, attachments, nics, zone } = currentHardware;
  if (zone) {
    return (
      <div className="hw-device-tree mb-0">
        <div className="hw-device-tree-head">
          <i className="fas fa-plug" />
          <span>{t('machineEdit.currentHardware.devices')}</span>
        </div>
        <ZoneDeviceRows zone={zone} />
      </div>
    );
  }
  if (controllers.length === 0 && attachments.length === 0 && nics.length === 0) {
    return null;
  }
  return (
    <div className="hw-device-tree mb-0">
      <div className="hw-device-tree-head">
        <i className="fas fa-plug" />
        <span>{t('machineEdit.currentHardware.devices')}</span>
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
          <span>{t('machineEdit.currentHardware.networkAdapters')}</span>
        </div>
      )}
      {nics.map(nic => (
        <div className="hw-device-row hw-device-child" key={nic.adapter}>
          <i className="fas fa-ethernet text-muted" />
          <span>{t('machineEdit.currentHardware.adapter', { adapter: nic.adapter })}</span>
          <span className="hw-device-meta">{nicSummary(nic)}</span>
          {nic.adapter === 1 && (
            <span
              className="badge text-bg-light ms-auto"
              title={t('machineEdit.currentHardware.provisioningNatTitle')}
            >
              {t('machineEdit.currentHardware.provisioningNat')}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

HardwareDeviceTree.propTypes = {
  currentHardware: PropTypes.object.isRequired,
};
