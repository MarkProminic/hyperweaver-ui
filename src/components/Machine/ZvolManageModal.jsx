import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { modifyInfrastructure } from '../../api/provisioningAPI';
import { createZfsSnapshot, getZfsDataset, setZfsDatasetProperties } from '../../api/zfsAPI';
import { ContentModal } from '../common';
import ZfsPropertiesEditor, { propertyEdits } from '../Host/ZfsPropertiesEditor';
import { humanSize, parseZfsSize, queuedMessage } from '../Host/zfsUtils';

/**
 * Zone disk (zvol) manager — a gparted-style capacity slider. Resize rides
 * `resize_disks` on the machine PUT (the path that also updates the zone's
 * disk SIZE ATTR). volsize is ONE value: drag or type the new size. Growing
 * is capped at what the pool can back until Over-provision is ticked, which
 * unlocks a thin size past the pool free. Shrinking has no floor — a zvol can
 * be set to any size (`allow_shrink` rides so the agent permits it). The agent
 * owns the safety: a running guest sees a grow live on virtio/NVMe, and a
 * change it cannot apply live ACCRUES to the next power cycle (pending_changes).
 */

const GiB = 2 ** 30;
const MiB = 2 ** 20;

const propValue = (properties, key) => properties?.[key]?.value ?? '';

/** bytes → a clean size string for the numeric box (G, falling to M). */
const bytesToInput = bytes => {
  if (!bytes || bytes <= 0) {
    return '0';
  }
  const g = bytes / GiB;
  if (g >= 1) {
    return `${Number.isInteger(g) ? g : g.toFixed(1)}G`;
  }
  return `${Math.max(1, Math.round(bytes / MiB))}M`;
};

const clampPct = value => Math.min(100, Math.max(0, value));

/**
 * All the slider geometry from primitives — kept out of the component so the
 * render stays flat. capBytes/pctCap are null when the pool's free space is
 * unknown (pool absent from the list): a grow is then uncapped and the agent
 * decides, exactly as it did before the bar existed.
 */
const computeBar = (disk, properties, pools, target, overprovision) => {
  const currentBytes =
    parseZfsSize(disk.size) ?? parseZfsSize(propValue(properties, 'volsize')) ?? 0;
  const usedBytes = parseZfsSize(propValue(properties, 'used'));
  const blockSize = propValue(properties, 'volblocksize');
  const refreservation = propValue(properties, 'refreservation');
  const sparse = refreservation === '0' || refreservation === '';

  const [poolName] = (disk.value || '').split('/');
  const poolRow = pools.find(pool => pool.name === poolName);
  const poolFreeBytes = parseZfsSize(poolRow?.free) ?? 0;
  const poolKnown = Boolean(poolRow) && poolFreeBytes > 0;
  const capBytes = poolKnown ? currentBytes + poolFreeBytes : null;

  const targetBytes = target.trim() ? (parseZfsSize(target) ?? currentBytes) : currentBytes;
  const delta = targetBytes - currentBytes;
  const pastCap = capBytes !== null && targetBytes > capBytes + MiB;

  const openMax = Math.max(targetBytes, currentBytes * 2);
  const sliderMax = Math.max(
    overprovision || capBytes === null ? openMax : capBytes,
    currentBytes,
    GiB
  );
  const pct = value => clampPct((value / sliderMax) * 100);

  return {
    currentBytes,
    usedBytes,
    blockSize,
    refreservation,
    sparse,
    poolName,
    poolFreeBytes,
    capBytes,
    targetBytes,
    delta,
    pastCap,
    sliderMax,
    step: Math.max(MiB, parseZfsSize(blockSize) ?? MiB),
    pctUsed: pct(usedBytes ?? 0),
    pctCurrent: pct(currentBytes),
    pctCap: capBytes === null ? null : pct(capBytes),
    pctTarget: pct(targetBytes),
  };
};

/** The agent's per-disk resize outcome — the honest take-effect story. */
const resizeOutcome = data => {
  if (data?.status === 'pending_power_cycle') {
    return `${data.message || 'Resize accepted'} — it applies on the next power cycle.`;
  }
  const rows = Array.isArray(data?.resized_disks) ? data.resized_disks : [];
  if (rows.length === 0) {
    return data?.message || 'Resize applied.';
  }
  return rows
    .map(row => {
      const base = `${row.name} → ${row.resized_to}${row.shrunk ? ' (shrunk)' : ''}`;
      return row.requires_restart
        ? `${base} — the guest sees it after a power cycle (${row.diskif}).`
        : `${base} — the guest sees it now (${row.diskif}).`;
    })
    .join(' ');
};

const summaryLine = (bar, disk) =>
  [
    `${humanSize(bar.currentBytes) || disk.size || '—'} allocated`,
    bar.usedBytes !== null ? `${humanSize(bar.usedBytes)} used` : null,
    bar.blockSize ? `${humanSize(bar.blockSize)} block` : null,
    bar.sparse ? 'sparse' : `${humanSize(bar.refreservation)} reserved`,
  ]
    .filter(Boolean)
    .join(' · ');

/** The gparted-style bar: layered pool zones with a draggable size thumb. */
const CapacityBar = ({ bar, overprovision, busy, shrinking, onValue }) => (
  <>
    <div className="d-flex justify-content-between align-items-baseline">
      <label className="fw-bold mb-0" htmlFor="zvol-size-range">
        Size
      </label>
      <span className="small text-muted">
        {humanSize(bar.currentBytes)}
        {bar.delta !== 0 && (
          <>
            {' → '}
            <span className={`fw-bold ${shrinking ? 'text-warning' : 'text-primary'}`}>
              {humanSize(bar.targetBytes)}
            </span>{' '}
            ({bar.delta > 0 ? '+' : '−'}
            {humanSize(Math.abs(bar.delta))})
          </>
        )}
      </span>
    </div>

    <div className="hw-zvol">
      <div className="hw-zvol-track">
        {bar.usedBytes !== null && (
          <div
            className="hw-zvol-seg hw-zvol-used"
            style={{ left: 0, width: `${bar.pctUsed}%` }}
            title={`${humanSize(bar.usedBytes)} in use`}
          />
        )}
        <div
          className="hw-zvol-seg hw-zvol-alloc"
          style={{ left: `${bar.pctUsed}%`, width: `${clampPct(bar.pctCurrent - bar.pctUsed)}%` }}
        />
        {bar.pctCap !== null && (
          <div
            className="hw-zvol-seg hw-zvol-free"
            style={{
              left: `${bar.pctCurrent}%`,
              width: `${clampPct(bar.pctCap - bar.pctCurrent)}%`,
            }}
            title={`${humanSize(bar.poolFreeBytes)} free on ${bar.poolName}`}
          />
        )}
        {overprovision && bar.pctCap !== null && (
          <div
            className="hw-zvol-seg hw-zvol-over"
            style={{ left: `${bar.pctCap}%`, width: `${clampPct(100 - bar.pctCap)}%` }}
            title="Over-provisioned (thin) — past what the pool can back"
          />
        )}
        <div className="hw-zvol-mark hw-zvol-mark-current" style={{ left: `${bar.pctCurrent}%` }} />
        {bar.pctCap !== null && bar.capBytes < bar.sliderMax && (
          <div
            className="hw-zvol-mark hw-zvol-mark-cap"
            style={{ left: `${bar.pctCap}%` }}
            title={`Pool ceiling — ${humanSize(bar.capBytes)}`}
          />
        )}
        <div className="hw-zvol-mark hw-zvol-mark-target" style={{ left: `${bar.pctTarget}%` }} />
      </div>
      <input
        id="zvol-size-range"
        className="hw-zvol-range"
        type="range"
        min={0}
        max={bar.sliderMax}
        step={bar.step}
        value={Math.min(Math.max(bar.targetBytes, 0), bar.sliderMax)}
        onChange={e => onValue(Number(e.target.value))}
        disabled={busy}
        aria-label="Drag to set the new size"
      />
    </div>
  </>
);

CapacityBar.propTypes = {
  bar: PropTypes.object.isRequired,
  overprovision: PropTypes.bool,
  busy: PropTypes.bool,
  shrinking: PropTypes.bool,
  onValue: PropTypes.func.isRequired,
};

/** The ZFS-properties drawer — populated when the dataset query answered. */
const PropertiesDrawer = ({ properties, propsError, edits, onEdit, onApply, busy }) => (
  <details>
    <summary className="fw-bold">ZFS properties</summary>
    {properties === null && (
      <p className="text-muted mb-0 mt-1">
        <i className="fas fa-spinner fa-pulse me-2" />
        Loading…
      </p>
    )}
    {propsError && (
      <p className="form-text text-muted mt-1">
        Properties unavailable — the dataset query returned 404 for this zvol.
      </p>
    )}
    {properties !== null && !propsError && (
      <>
        <p className="form-text text-muted mt-1">
          Applies immediately (compression, dedup, logbias…). Read-only properties display as-is.
        </p>
        <ZfsPropertiesEditor
          properties={properties}
          edits={edits}
          onEdit={onEdit}
          disabled={busy}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm mt-2"
          onClick={onApply}
          disabled={busy}
        >
          Apply changed properties
        </button>
      </>
    )}
  </details>
);

PropertiesDrawer.propTypes = {
  properties: PropTypes.object,
  propsError: PropTypes.bool,
  edits: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};

const ZvolManageModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  disk,
  isRunning,
  pools = [],
  onResized,
}) => {
  const [properties, setProperties] = useState(null);
  const [propsError, setPropsError] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [overprovision, setOverprovision] = useState(false);
  const [snapName, setSnapName] = useState('');
  const [edits, setEdits] = useState({});

  const dataset = disk?.value || '';

  const load = useCallback(async () => {
    if (!isOpen || !dataset || !currentServer) {
      return;
    }
    setProperties(null);
    setPropsError(false);
    const result = await getZfsDataset(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      dataset
    );
    if (result.success) {
      setProperties(result.data?.properties || {});
    } else {
      // The bar does not depend on this — current size comes from the zone
      // config. Only the properties drawer and the used/block overlay degrade.
      setProperties({});
      setPropsError(true);
    }
  }, [isOpen, dataset, currentServer]);

  useEffect(() => {
    setTarget('');
    setOverprovision(false);
    setSnapName('');
    setEdits({});
    setNotice('');
    setError('');
    load();
  }, [load]);

  if (!disk) {
    return null;
  }

  const bar = computeBar(disk, properties, pools, target, overprovision);
  const shrinking = bar.delta < 0;
  const applyBlocked =
    busy || bar.targetBytes <= 0 || bar.delta === 0 || (bar.pastCap && !overprovision);

  const runResize = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    const result = await modifyInfrastructure(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      {
        resize_disks: [
          {
            name: disk.name,
            size: target.trim(),
            ...(shrinking && { allow_shrink: true }),
            ...(overprovision && { allow_overprovision: true }),
          },
        ],
      }
    );
    setBusy(false);
    if (!result.success) {
      // A grow the pool can't back that we didn't predict (pool free unknown)
      // still gets the deliberate-thin nudge the old flow gave.
      setError(
        !overprovision && bar.delta > 0
          ? `${result.message} — if the pool can't back this, tick Over-provision to force a thin size.`
          : result.message
      );
      return;
    }
    setNotice(resizeOutcome(result.data));
    setTarget('');
    load();
    if (onResized) {
      onResized();
    }
  };

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

  const shrinkNote = shrinking
    ? 'Shrink the filesystem and partition INSIDE the guest first — a zvol set below the written size loses everything past it.'
    : 'Grow is non-destructive; extend the partition and filesystem inside the guest afterwards.';
  const runningNote = isRunning
    ? ' The machine is running — a grow applies live on virtio/NVMe; anything it cannot apply live accrues to the next power cycle.'
    : '';

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage ${disk.name}`}
      icon="fas fa-hard-drive"
    >
      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
        <i className="fas fa-hdd text-muted" />
        <code className="text-break">{dataset}</code>
        {disk.boot && (
          <span className="badge text-bg-light border" title="The zone's boot medium">
            boot
          </span>
        )}
      </div>
      <div className="text-muted small mb-3">{summaryLine(bar, disk)}</div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {notice && <div className="alert alert-success py-2">{notice}</div>}

      <CapacityBar
        bar={bar}
        overprovision={overprovision}
        busy={busy}
        shrinking={shrinking}
        onValue={value => setTarget(bytesToInput(value))}
      />

      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
        <div className="input-group input-group-sm" style={{ maxWidth: '11rem' }}>
          <input
            className="form-control"
            type="text"
            placeholder={bytesToInput(bar.currentBytes)}
            aria-label="Exact size"
            value={target}
            onChange={e => setTarget(e.target.value)}
            disabled={busy}
          />
          <span className="input-group-text">size</span>
        </div>
        <div className="form-check form-switch mb-0">
          <input
            id="zvol-overprovision"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={overprovision}
            onChange={e => setOverprovision(e.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label small" htmlFor="zvol-overprovision">
            Over-provision (thin — allow a size past pool free)
          </label>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary ms-auto"
          onClick={runResize}
          disabled={applyBlocked}
        >
          {shrinking ? 'Shrink' : 'Grow'} to {target.trim() ? humanSize(bar.targetBytes) : '—'}
        </button>
      </div>

      {bar.pastCap && !overprovision && (
        <p className="form-text text-warning mt-0">
          {humanSize(bar.targetBytes)} is past the {humanSize(bar.capBytes)} the pool can back —
          tick Over-provision to allow it (thin; the guest can corrupt if the pool later fills).
        </p>
      )}
      <p className="form-text text-muted mt-0">{`${shrinkNote}${runningNote}`}</p>

      {/* --- Snapshot: the only way back, one line --- */}
      <div className="input-group input-group-sm mb-3">
        <span className="input-group-text font-monospace">{dataset}@</span>
        <input
          className="form-control"
          type="text"
          placeholder="snapshot before resizing (optional)"
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

      <PropertiesDrawer
        properties={properties}
        propsError={propsError}
        edits={edits}
        onEdit={(key, value) => setEdits(prev => ({ ...prev, [key]: value }))}
        onApply={handleProperties}
        busy={busy}
      />
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
  pools: PropTypes.arrayOf(PropTypes.object),
  onResized: PropTypes.func,
};

export default ZvolManageModal;
