import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { modifyInfrastructure } from '../../api/provisioningAPI';
import { createZfsSnapshot, getZfsDataset, setZfsDatasetProperties } from '../../api/zfsAPI';
import { ContentModal } from '../common';
import ZfsPropertiesEditor, { propertyEdits } from '../Host/ZfsPropertiesEditor';
import { humanSize, queuedMessage } from '../Host/zfsUtils';

/**
 * Zone disk (zvol) manager. Resize rides `resize_disks` on the machine PUT —
 * the only path that also updates the zone's disk SIZE ATTR (a raw `zfs set`
 * leaves the zone config lying about its own disk). GROW applies immediately
 * and, on virtio/nvme backends, the running guest sees the new capacity with
 * no reboot; ahci/ide bake the size in at boot, so the answer's
 * `requires_restart` says when a power cycle is still needed. SHRINK is gated
 * by the agent: it needs `allow_shrink` AND a powered-off machine.
 */

const propValue = (properties, key) => properties?.[key]?.value ?? '';

const InfoLine = ({ label, children }) => (
  <div className="d-flex gap-2 small">
    <span className="text-muted" style={{ minWidth: '8rem' }}>
      {label}
    </span>
    <span className="text-break">{children}</span>
  </div>
);

InfoLine.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
};

/** The agent's per-disk resize outcome — the honest take-effect story. */
const resizeOutcome = data => {
  const rows = Array.isArray(data?.resized_disks) ? data.resized_disks : [];
  if (rows.length === 0) {
    return data?.message || 'Resize applied.';
  }
  return rows
    .map(row => {
      const base = `${row.name} → ${row.resized_to}${row.shrunk ? ' (shrunk)' : ''}`;
      return row.requires_restart
        ? `${base} — the ${row.diskif} backend bakes the size in at boot, so the guest sees it after a power cycle.`
        : `${base} — the guest sees the new capacity now (${row.diskif}).`;
    })
    .join(' ');
};

const ZvolManageModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  disk,
  isRunning,
  onResized,
}) => {
  const [properties, setProperties] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [growSize, setGrowSize] = useState('');
  const [overprovision, setOverprovision] = useState(false);
  const [capacityRefused, setCapacityRefused] = useState(false);
  const [shrinkSize, setShrinkSize] = useState('');
  const [shrinkAck, setShrinkAck] = useState(false);
  const [snapName, setSnapName] = useState('');
  const [edits, setEdits] = useState({});

  const dataset = disk?.value || '';

  const load = useCallback(async () => {
    if (!isOpen || !dataset || !currentServer) {
      return;
    }
    setProperties(null);
    setError('');
    const result = await getZfsDataset(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      dataset
    );
    if (result.success) {
      setProperties(result.data?.properties || {});
    } else {
      setError(
        `GET storage/datasets/${dataset} failed (${result.status ?? '?'}): ${result.message}`
      );
    }
  }, [isOpen, dataset, currentServer]);

  useEffect(() => {
    setGrowSize('');
    setShrinkSize('');
    setShrinkAck(false);
    setOverprovision(false);
    setCapacityRefused(false);
    setSnapName('');
    setEdits({});
    setNotice('');
    load();
  }, [load]);

  if (!disk) {
    return null;
  }

  const currentSize = propValue(properties, 'volsize');
  const blockSize = propValue(properties, 'volblocksize');
  const refreservation = propValue(properties, 'refreservation');
  const used = propValue(properties, 'used');

  /** One resize_disks entry through the machine PUT. */
  const runResize = async entry => {
    setBusy(true);
    setError('');
    setNotice('');
    const result = await modifyInfrastructure(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      { resize_disks: [entry] }
    );
    setBusy(false);
    if (!result.success) {
      // A grow the pool cannot back is a 400 — offer the deliberate override
      // rather than silently over-provisioning.
      if (!entry.allow_shrink && !entry.allow_overprovision) {
        setCapacityRefused(true);
      }
      setError(result.message);
      return;
    }
    setNotice(resizeOutcome(result.data));
    setCapacityRefused(false);
    setGrowSize('');
    setShrinkSize('');
    setShrinkAck(false);
    load();
    if (onResized) {
      onResized();
    }
  };

  const handleGrow = () =>
    runResize({
      name: disk.name,
      size: growSize.trim(),
      ...(overprovision && { allow_overprovision: true }),
    });

  const handleShrink = () =>
    runResize({ name: disk.name, size: shrinkSize.trim(), allow_shrink: true });

  const handleSnapshot = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    const result = await createZfsSnapshot(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      dataset,
      { snapshot_name: snapName.trim() }
    );
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setNotice(queuedMessage(result, `Snapshot queued — ${dataset}@${snapName.trim()}.`));
    setSnapName('');
  };

  const handleProperties = async () => {
    const props = propertyEdits(properties || {}, edits);
    if (Object.keys(props).length === 0) {
      setError('Nothing changed — edit a property value first.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const result = await setZfsDatasetProperties(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      dataset,
      props
    );
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setNotice(queuedMessage(result, `Property update queued for ${dataset}.`));
    load();
  };

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage ${disk.name}`}
      icon="fas fa-hard-drive"
    >
      <div className="border rounded p-2 mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className="fas fa-hdd fa-lg text-muted" />
          <code>{dataset}</code>
          {disk.boot && (
            <span className="badge text-bg-light border" title="The zone's boot medium">
              boot
            </span>
          )}
        </div>
        <InfoLine label="Size">{humanSize(currentSize) || disk.size || '—'}</InfoLine>
        <InfoLine label="Used">{humanSize(used)}</InfoLine>
        <InfoLine label="Block size">{humanSize(blockSize)}</InfoLine>
        <InfoLine label="Reservation">
          {refreservation === '0' || refreservation === ''
            ? 'none (sparse)'
            : humanSize(refreservation)}
        </InfoLine>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {notice && <div className="alert alert-success py-2">{notice}</div>}

      <h6 className="fw-bold">Grow</h6>
      <p className="form-text text-muted mt-0">
        Applies immediately. Growing is non-destructive, and on virtio/NVMe disks the running guest
        detects the new capacity on its own — no reboot. Extend the partition and filesystem INSIDE
        the guest afterwards to actually use the space.
      </p>
      {capacityRefused && (
        <div className="form-check mb-2">
          <input
            id="zvol-overprovision"
            className="form-check-input"
            type="checkbox"
            checked={overprovision}
            onChange={e => setOverprovision(e.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="zvol-overprovision">
            The pool cannot back this size. Over-provision anyway (thin) — if the pool later runs
            out of space, the guest filesystem can corrupt.
          </label>
        </div>
      )}
      <div className="input-group mb-3">
        <input
          className="form-control"
          type="text"
          placeholder="new size — e.g. 200G"
          aria-label="Grow to"
          value={growSize}
          onChange={e => setGrowSize(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGrow}
          disabled={busy || !growSize.trim()}
        >
          Grow
        </button>
      </div>

      <h6 className="fw-bold text-danger">Shrink</h6>
      <div className="alert alert-danger py-2">
        Shrinking <strong>destroys every block past the new size</strong>, with no undo. Do it ONLY
        after the filesystem and partition inside the guest are already shrunk to fit below the new
        boundary. Snapshot first — it is the only way back.
      </div>
      {isRunning ? (
        <div className="alert alert-warning py-2 mb-3">
          <strong>The machine is running — shrink is blocked.</strong> Stop it first; the agent
          refuses a live truncation.
        </div>
      ) : (
        <>
          <div className="form-check mb-2">
            <input
              id="zvol-shrink-ack"
              className="form-check-input"
              type="checkbox"
              checked={shrinkAck}
              onChange={e => setShrinkAck(e.target.checked)}
              disabled={busy}
            />
            <label className="form-check-label" htmlFor="zvol-shrink-ack">
              The guest filesystem is already shrunk to fit, and I accept that everything past the
              new size is destroyed.
            </label>
          </div>
          <div className="input-group mb-3">
            <input
              className="form-control"
              type="text"
              placeholder="new size — e.g. 50G"
              aria-label="Shrink to"
              value={shrinkSize}
              onChange={e => setShrinkSize(e.target.value)}
              disabled={busy || !shrinkAck}
            />
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleShrink}
              disabled={busy || !shrinkAck || !shrinkSize.trim()}
            >
              Shrink now
            </button>
          </div>
        </>
      )}

      <h6 className="fw-bold">Snapshot</h6>
      <p className="form-text text-muted mt-0">
        Take one before any resize — a snapshot is the only way back.
      </p>
      <div className="input-group mb-3">
        <span className="input-group-text font-monospace">{dataset}@</span>
        <input
          className="form-control"
          type="text"
          placeholder="e.g. before-resize"
          aria-label="Snapshot name"
          value={snapName}
          onChange={e => setSnapName(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={handleSnapshot}
          disabled={busy || !snapName.trim()}
        >
          Snapshot
        </button>
      </div>

      <details>
        <summary className="fw-bold">ZFS properties</summary>
        <p className="form-text text-muted mt-1">
          Applies immediately to the volume (compression, dedup, logbias…). Read-only properties
          display as-is.
        </p>
        {properties === null && !error && (
          <p className="text-muted mb-0">
            <i className="fas fa-spinner fa-pulse me-2" />
            Loading…
          </p>
        )}
        {properties !== null && (
          <>
            <ZfsPropertiesEditor
              properties={properties}
              edits={edits}
              onEdit={(key, value) => setEdits(prev => ({ ...prev, [key]: value }))}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={handleProperties}
              disabled={busy}
            >
              Apply changed properties
            </button>
          </>
        )}
      </details>
    </ContentModal>
  );
};

ZvolManageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  disk: PropTypes.object,
  isRunning: PropTypes.bool,
  onResized: PropTypes.func,
};

export default ZvolManageModal;
