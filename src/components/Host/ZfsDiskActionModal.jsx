import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  offlineZfsPoolDevice,
  onlineZfsPoolDevice,
  removeZfsPoolVdev,
  replaceZfsPoolDevice,
} from '../../api/zfsAPI';
import { ContentModal } from '../common';

import { healthBadgeClass, humanSize, queuedMessage } from './zfsUtils';

/**
 * Click-a-disk-in-the-diagram → everything about THAT disk plus its
 * operations: replace (pick a free disk from the inventory — no typing),
 * online (expand), offline (temporary), remove. Each op targets this one
 * device only.
 */

/** Long ctd/WWN device names truncate for chips — the full name lives here. */
export const shortDevice = name =>
  String(name).length > 16 ? `${String(name).slice(0, 7)}…${String(name).slice(-6)}` : String(name);

const diskTypeIcon = type => (type === 'SSD' || type === 'NVMe' ? 'fa-microchip' : 'fa-hard-drive');

/** Clickable free-disk cards, grouped by type — the replace target picker. */
const FreeDiskPicker = ({ disks, selected, onSelect, disabled }) => {
  const { t } = useTranslation();
  const groups = ['HDD', 'SSD', 'NVMe'];
  const grouped = groups
    .map(type => ({ type, disks: disks.filter(disk => (disk.disk_type || 'HDD') === type) }))
    .filter(group => group.disks.length > 0);
  const other = disks.filter(disk => !groups.includes(disk.disk_type || 'HDD'));
  if (other.length > 0) {
    grouped.push({ type: 'Other', disks: other });
  }
  return (
    <>
      {grouped.map(group => (
        <div key={group.type} className="mb-2">
          <div className="small fw-semibold text-muted mb-1">{group.type}</div>
          <div className="row g-2">
            {group.disks.map(disk => {
              const isSelected = selected === disk.device_name;
              return (
                <div className="col-6 col-md-4" key={disk.device_name}>
                  <button
                    type="button"
                    className={`border rounded p-2 w-100 text-start bg-transparent ${
                      isSelected ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => onSelect(disk.device_name)}
                    disabled={disabled}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className={`fas ${diskTypeIcon(disk.disk_type)} text-muted`} />
                      <strong className="small" title={disk.device_name}>
                        {shortDevice(disk.device_name)}
                      </strong>
                      {disk.faulty && (
                        <span
                          className="badge text-bg-danger"
                          title={t('host.freeDiskPicker.faultyTitle')}
                        >
                          {t('host.freeDiskPicker.faultyBadge')}
                        </span>
                      )}
                      {isSelected && <i className="fas fa-circle-check text-primary ms-auto" />}
                    </div>
                    <div className="small text-muted text-truncate" title={disk.model || ''}>
                      {disk.model || '—'}
                    </div>
                    <div className="d-flex justify-content-between small">
                      <code className="small text-truncate" title={disk.serial_number || ''}>
                        {disk.serial_number || '—'}
                      </code>
                      <span className="text-nowrap ms-1">
                        {disk.capacity || humanSize(disk.capacity_bytes)}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

FreeDiskPicker.propTypes = {
  disks: PropTypes.array.isRequired,
  selected: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const InfoLine = ({ label, children }) => (
  <div className="d-flex gap-2 small">
    <span className="text-muted" style={{ minWidth: '7rem' }}>
      {label}
    </span>
    <span className="text-break">{children}</span>
  </div>
);

InfoLine.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
};

/** The disk's identity block — status-layer facts plus the inventory match. */
const DiskInfoCard = ({ device, inventoryDisk }) => {
  const { t } = useTranslation();
  return (
    <div className="border rounded p-2 mb-3">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className={`fas ${diskTypeIcon(inventoryDisk?.disk_type)} fa-lg text-muted`} />
        <code>{device.name}</code>
        <span className={`badge ${healthBadgeClass(device.state)}`}>{device.state}</span>
        {device.note && <span className="badge text-bg-warning">{device.note}</span>}
        {inventoryDisk?.faulty && (
          <span className="badge text-bg-danger" title={t('host.diskActionModal.faultyTitle')}>
            {t('host.diskActionModal.faultyBadge')}
          </span>
        )}
      </div>
      <InfoLine label={t('host.diskActionModal.errorsLabel')}>
        {t('host.diskActionModal.readWriteCksum', {
          read: device.read,
          write: device.write,
          cksum: device.cksum,
        })}
      </InfoLine>
      {inventoryDisk && (
        <>
          <InfoLine label={t('host.diskActionModal.modelLabel')}>
            {`${inventoryDisk.manufacturer || ''} ${inventoryDisk.model || ''}`.trim() || '—'}
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.serialLabel')}>
            <code className="small">{inventoryDisk.serial_number || '—'}</code>
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.capacityLabel')}>
            {inventoryDisk.capacity || humanSize(inventoryDisk.capacity_bytes)}
          </InfoLine>
          <InfoLine label={t('host.diskActionModal.typeLabel')}>
            {[
              inventoryDisk.disk_type,
              inventoryDisk.interface_type,
              inventoryDisk.firmware,
              inventoryDisk.removable ? 'removable' : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </InfoLine>
          {inventoryDisk.chassis !== null &&
            inventoryDisk.chassis !== undefined &&
            inventoryDisk.bay !== null &&
            inventoryDisk.bay !== undefined && (
              <InfoLine label={t('host.diskActionModal.locationLabel')}>
                {t('host.diskActionModal.locationValue', {
                  chassis: inventoryDisk.chassis,
                  bay: inventoryDisk.bay,
                })}
              </InfoLine>
            )}
          {inventoryDisk.device_path && (
            <InfoLine label={t('host.diskActionModal.pathLabel')}>
              <code className="small">{inventoryDisk.device_path}</code>
            </InfoLine>
          )}
        </>
      )}
      {!inventoryDisk && (
        <p className="form-text text-muted mb-0 mt-1">
          {t('host.diskActionModal.noInventoryText')}
        </p>
      )}
    </div>
  );
};

DiskInfoCard.propTypes = {
  device: PropTypes.object.isRequired,
  inventoryDisk: PropTypes.object,
};

/** The one request a confirmed mode fires — null when inputs are missing. */
const buildDiskRequest = ({ mode, server, pool, device, target, flag }) => {
  const base = [server.hostname, server.port, server.protocol, pool];
  if (mode === 'replace') {
    if (!target) {
      return null;
    }
    return replaceZfsPoolDevice(...base, {
      old_device: device.name,
      new_device: target,
      ...(flag && { force: true }),
    });
  }
  if (mode === 'online') {
    return onlineZfsPoolDevice(...base, { device: device.name, ...(flag && { expand: true }) });
  }
  if (mode === 'offline') {
    return offlineZfsPoolDevice(...base, { device: device.name, ...(flag && { temporary: true }) });
  }
  if (mode === 'remove') {
    return removeZfsPoolVdev(...base, device.name);
  }
  return null;
};

const DiskActionModal = ({
  isOpen,
  onClose,
  server,
  pool,
  device,
  inventoryDisk,
  freeDisks,
  rescanning = false,
  onRescan,
  onQueued,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null); // null | replace | online | offline | remove
  const [replacement, setReplacement] = useState('');
  const [manualReplacement, setManualReplacement] = useState('');
  const [flag, setFlag] = useState(false); // force | expand | temporary, by mode
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(null);
      setReplacement('');
      setManualReplacement('');
      setFlag(false);
      setError('');
    }
  }, [isOpen, device]);

  if (!device) {
    return null;
  }

  const run = async () => {
    const target = replacement || manualReplacement.trim();
    if (mode === 'replace' && !target) {
      setError(t('host.diskActionModal.errorPickReplacement'));
      return;
    }
    const request = buildDiskRequest({ mode, server, pool, device, target, flag });
    if (!request) {
      return;
    }
    setLoading(true);
    setError('');
    const result = await request;
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(
      queuedMessage(
        result,
        t('host.diskActionModal.queuedMessage', { mode, device: device.name, pool })
      )
    );
    onClose();
  };

  const flagLabel = {
    replace: t('host.diskActionModal.forceReplace'),
    online: t('host.diskActionModal.expandDevice'),
    offline: t('host.diskActionModal.temporaryOffline'),
  }[mode];

  const confirmLabel = {
    replace: t('host.diskActionModal.confirmReplace'),
    online: t('host.diskActionModal.confirmOnline'),
    offline: t('host.diskActionModal.confirmOffline'),
    remove: t('host.diskActionModal.confirmRemove'),
  }[mode];

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('host.diskActionModal.title', { pool })}
      icon="fas fa-hard-drive"
    >
      <DiskInfoCard device={device} inventoryDisk={inventoryDisk} />

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="d-flex flex-wrap gap-1 mb-3">
        <button
          type="button"
          className={`btn btn-sm ${mode === 'replace' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode(mode === 'replace' ? null : 'replace')}
          disabled={loading}
        >
          <i className="fas fa-right-left me-1" />
          {t('host.diskActionModal.replace')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'online' ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setMode(mode === 'online' ? null : 'online')}
          disabled={loading}
        >
          <i className="fas fa-circle-check me-1" />
          {t('host.diskActionModal.online')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'offline' ? 'btn-warning' : 'btn-outline-warning'}`}
          onClick={() => setMode(mode === 'offline' ? null : 'offline')}
          disabled={loading}
        >
          <i className="fas fa-circle-minus me-1" />
          {t('host.diskActionModal.offline')}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'remove' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setMode(mode === 'remove' ? null : 'remove')}
          disabled={loading}
        >
          <i className="fas fa-minus me-1" />
          {t('host.diskActionModal.remove')}
        </button>
      </div>

      {mode === 'replace' && (
        <div className="mb-3">
          <span className="form-label d-block">
            {t('host.diskActionModal.pickReplacementLabel')} <span className="text-danger">*</span>
          </span>
          {freeDisks.length > 0 ? (
            <FreeDiskPicker
              disks={freeDisks}
              selected={replacement}
              onSelect={name => setReplacement(name === replacement ? '' : name)}
              disabled={loading}
            />
          ) : (
            <>
              <div className="alert alert-warning py-2 d-flex align-items-center gap-2 flex-wrap">
                <span>{t('host.diskActionModal.noDiskInventoryAlert')}</span>
                {onRescan && (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={onRescan}
                    disabled={rescanning || loading}
                  >
                    <i className={`fas fa-radar me-2 ${rescanning ? 'fa-spin' : ''}`} />
                    {t('host.zfsPoolsPanel.rescan')}
                  </button>
                )}
              </div>
              <label className="form-label small" htmlFor="disk-action-manual-replacement">
                {t('host.diskActionModal.lastResortLabel')}
              </label>
              <input
                id="disk-action-manual-replacement"
                className="form-control font-monospace"
                type="text"
                placeholder={t('host.diskActionModal.replacementPlaceholder')}
                value={manualReplacement}
                onChange={e => setManualReplacement(e.target.value)}
                disabled={loading}
              />
            </>
          )}
        </div>
      )}

      {mode === 'offline' && (
        <div className="alert alert-warning py-2">{t('host.diskActionModal.offlineWarning')}</div>
      )}
      {mode === 'remove' && (
        <div className="alert alert-danger py-2">{t('host.diskActionModal.removeWarning')}</div>
      )}

      {mode && flagLabel && (
        <div className="form-check mb-3">
          <input
            id="disk-action-flag"
            className="form-check-input"
            type="checkbox"
            checked={flag}
            onChange={e => setFlag(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="disk-action-flag">
            {flagLabel}
          </label>
        </div>
      )}

      {mode && (
        <button
          type="button"
          className={`btn ${mode === 'remove' ? 'btn-danger' : 'btn-primary'}`}
          onClick={run}
          disabled={loading}
        >
          {loading && <i className="fas fa-spinner fa-pulse me-2" />}
          {confirmLabel}
        </button>
      )}
    </ContentModal>
  );
};

DiskActionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pool: PropTypes.string,
  device: PropTypes.object,
  inventoryDisk: PropTypes.object,
  freeDisks: PropTypes.array.isRequired,
  rescanning: PropTypes.bool,
  onRescan: PropTypes.func,
  onQueued: PropTypes.func.isRequired,
};

export default DiskActionModal;
