import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';

import {
  exportZfsPool,
  forceMonitoringCollect,
  getHostDisks,
  getZfsPools,
  getZfsPoolStatus,
  scrubZfsPool,
  stopZfsPoolScrub,
  upgradeZfsPool,
} from '../../api/zfsAPI';
import { hasFeature } from '../../utils/capabilities';

import DiskActionModal, { shortDevice } from './ZfsDiskActionModal';
import {
  AddVdevsModal,
  CreatePoolModal,
  DestroyPoolModal,
  ImportPoolModal,
  PoolPropertiesModal,
  PoolStatusModal,
} from './ZfsPoolModals';
import {
  capacityVariant,
  flatVdevDevices,
  healthBadgeClass,
  healthTextClass,
  humanSize,
  queuedMessage,
  vdevKey,
} from './zfsUtils';

/**
 * ZFS pool manager — one card per pool: health at a glance, a capacity bar,
 * scrub control, and the full device/property/lifecycle surface behind it.
 * Every mutation is a queued agent task; the Tasks page carries the outcome.
 */

const percentOf = pool => {
  const parsed = Number.parseInt(String(pool.capacity_percent ?? '').replace('%', ''), 10);
  return Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed));
};

const healthIcon = health => {
  switch ((health || '').toUpperCase()) {
    case 'ONLINE':
      return 'fa-circle-check';
    case 'DEGRADED':
      return 'fa-triangle-exclamation';
    default:
      return 'fa-circle-xmark';
  }
};

// Per-pool tint palette for the chassis view — green is reserved for free.
const POOL_COLORS = ['primary', 'info', 'warning', 'danger', 'dark', 'secondary'];

/** Capacity as an SVG donut — r=15.9155 makes the circumference ≈ 100, so the
 *  dash array reads straight as a percentage. Percent stacks in the middle. */
const CapacityRing = ({ percent, variant }) => {
  const { t } = useTranslation();
  return (
    <div
      className="hw-cap-ring"
      role="progressbar"
      aria-label={t('host.poolCard.capacityTitle')}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${percent}% used`}
    >
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <circle className="hw-cap-ring-track" cx="21" cy="21" r="15.9155" />
        <circle
          className="hw-cap-ring-fill"
          cx="21"
          cy="21"
          r="15.9155"
          style={{ stroke: `var(--bs-${variant})`, strokeDasharray: `${percent} ${100 - percent}` }}
        />
      </svg>
      <div className="hw-cap-ring-center">
        <span className="hw-cap-ring-pct" style={{ color: `var(--bs-${variant})` }}>
          {percent}%
        </span>
        <span className="hw-cap-ring-sub">used</span>
      </div>
    </div>
  );
};

CapacityRing.propTypes = {
  percent: PropTypes.number.isRequired,
  variant: PropTypes.string.isRequired,
};

/** The host's physical disks as chassis bays, tinted by pool membership;
 *  pool-member bays click through to that disk's detail + operations. */
const DiskChassis = ({ disks, poolColorOf, rescanning, onRescan, onDiskClick }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <h3 className="fs-6 fw-bold mb-0">
          <i className="fas fa-server me-2" />
          {t('host.zfsPoolsPanel.physicalDisksTitle')}
        </h3>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title={t('host.zfsPoolsPanel.rescanTitle')}
          onClick={onRescan}
          disabled={rescanning}
        >
          <i className={`fas fa-radar me-2 ${rescanning ? 'fa-spin' : ''}`} />
          {t('host.zfsPoolsPanel.rescan')}
        </button>
      </div>
      {disks.length === 0 && (
        <div className="alert alert-warning py-2">{t('host.zfsPoolsPanel.noDiskAlert')}</div>
      )}
      <div className="row g-2">
        {disks.map(disk => {
          const color = disk.pool_assignment ? poolColorOf(disk.pool_assignment) : null;
          const clickable = !!disk.pool_assignment;
          const hasLocation =
            disk.chassis !== null &&
            disk.chassis !== undefined &&
            disk.bay !== null &&
            disk.bay !== undefined;
          const solidState = disk.disk_type === 'SSD' || disk.disk_type === 'NVMe';
          let ledClass = 'text-success';
          if (disk.faulty) {
            ledClass = 'text-danger';
          } else if (color) {
            ledClass = `text-${color}`;
          }
          let bayClass = 'hw-bay';
          if (disk.faulty) {
            bayClass += ' hw-bay-faulty';
          } else if (!clickable) {
            bayClass += ' hw-bay-free';
          }
          const accentStyle = color ? { '--hw-bay-accent': `var(--bs-${color})` } : undefined;
          const bay = (
            <>
              <div className="d-flex align-items-center gap-2">
                <i className={`fas fa-circle hw-drive-led ${ledClass}`} />
                <i className={`fas ${solidState ? 'fa-microchip' : 'fa-hard-drive'} text-muted`} />
                <strong className="small text-truncate" title={disk.device_name}>
                  {shortDevice(disk.device_name)}
                </strong>
                {disk.faulty && (
                  <span
                    className="badge text-bg-danger"
                    title={t('host.zfsPoolsPanel.faultyTitle')}
                  >
                    {t('host.zfsPoolsPanel.faulty')}
                  </span>
                )}
                <span className={`badge ms-auto ${color ? `text-bg-${color}` : 'text-bg-success'}`}>
                  {disk.pool_assignment || t('host.zfsPoolsPanel.free')}
                </span>
              </div>
              <div
                className="small text-muted text-truncate"
                title={`${disk.manufacturer || ''} ${disk.model || ''}`.trim()}
              >
                {disk.model || '—'}
              </div>
              {hasLocation && (
                <div
                  className="small text-muted"
                  title={t('host.zfsPoolsPanel.physicalLocationTitle')}
                >
                  <i className="fas fa-location-dot me-1" />
                  {t('host.zfsPoolsPanel.chassisLocation', {
                    chassis: disk.chassis,
                    bay: disk.bay,
                  })}
                </div>
              )}
              <div className="d-flex justify-content-between align-items-center gap-2 small">
                <span className="hw-bay-serial" title={t('host.diskChassis.serialNumberTitle')}>
                  {disk.serial_number || '—'}
                </span>
                <span className="fw-semibold text-nowrap">
                  {disk.capacity || humanSize(disk.capacity_bytes)}
                </span>
              </div>
              <div className="d-flex gap-1 mt-auto pt-1">
                {disk.disk_type && (
                  <span className="badge text-bg-secondary">{disk.disk_type}</span>
                )}
                {disk.interface_type && (
                  <span className="badge text-bg-light border">{disk.interface_type}</span>
                )}
              </div>
            </>
          );
          return (
            <div
              className="col-6 col-md-4 col-lg-3 col-xxl-2"
              key={disk.device_name || disk.disk_index}
            >
              {clickable ? (
                <button
                  type="button"
                  className={bayClass}
                  style={accentStyle}
                  title={t('host.diskChassis.diskDetailsTitle')}
                  onClick={() => onDiskClick(disk)}
                >
                  {bay}
                </button>
              ) : (
                <div className={bayClass} style={accentStyle}>
                  {bay}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

DiskChassis.propTypes = {
  disks: PropTypes.array.isRequired,
  poolColorOf: PropTypes.func.isRequired,
  rescanning: PropTypes.bool,
  onRescan: PropTypes.func.isRequired,
  onDiskClick: PropTypes.func.isRequired,
};

/** The pool's vdev layout drawn as boxes of drive chips — a mirror IS two
 *  drives in one box; state dots color each disk; an active scrub/resilver
 *  sweeps a striped progress bar across the top. Chips truncate the long
 *  ctd names and CLICK OPEN the disk's full identity + its operations. */
const PoolTopology = ({ parsed, onDiskClick }) => {
  const { t } = useTranslation();
  if (!parsed) {
    return (
      <p className="text-muted small mb-2">
        <i className="fas fa-spinner fa-pulse me-2" />
        {t('host.zfsPoolsPanel.readingTopology')}
      </p>
    );
  }
  const groups = Array.isArray(parsed.vdevs) ? parsed.vdevs : [];
  if (groups.length === 0) {
    return null;
  }
  const scan = parsed.scan || null;
  return (
    <div className="mb-2">
      {scan && (
        <div
          className="progress hw-scan-bar mb-2"
          title={scan.action}
          role="progressbar"
          aria-label={t('host.zfsPoolsPanel.scanProgressLabel')}
          aria-valuenow={scan.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-bar progress-bar-striped progress-bar-animated bg-info fw-semibold"
            style={{ width: `${Math.max(scan.pct, 8)}%` }}
          >
            {scan.pct}%
          </div>
        </div>
      )}
      {/* One module per vdev, disks NEVER wrap — a mirror's members sit on the
          same line always; an over-wide row scrolls inside itself. Multiple
          vdevs stack as the pool's real layers. */}
      <div className="d-flex flex-column gap-2">
        {groups.map(group => {
          const bare = group.type === 'disk';
          return (
            <div className="hw-vdev" key={vdevKey(group)}>
              <div className="hw-vdev-head">
                <i className={`fas ${bare ? 'fa-hard-drive' : 'fa-layer-group'} text-muted`} />
                <span>{bare ? t('host.zfsPoolsPanel.stripe') : group.type}</span>
                <span className={`badge ${healthBadgeClass(group.state)} ms-auto`}>
                  {group.state}
                </span>
              </div>
              <div className="hw-vdev-drives">
                {group.devices.map(device => (
                  <button
                    type="button"
                    className="hw-drive"
                    key={device.name}
                    title={`${device.name} — ${device.state} · read ${device.read} · write ${device.write} · cksum ${device.cksum}${device.note ? ` · ${device.note}` : ''} — click for details and actions`}
                    onClick={() => onDiskClick(device)}
                  >
                    <i className={`fas fa-circle hw-drive-led ${healthTextClass(device.state)}`} />
                    <i className="fas fa-hard-drive hw-drive-glyph" />
                    <span className="hw-drive-name">{shortDevice(device.name)}</span>
                    {device.note && <i className="fas fa-triangle-exclamation text-warning" />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {scan && (
        <div className="small text-muted text-truncate mt-1" title={scan.action}>
          <i className="fas fa-broom me-1" />
          {scan.action}
        </div>
      )}
    </div>
  );
};

PoolTopology.propTypes = {
  parsed: PropTypes.object,
  onDiskClick: PropTypes.func.isRequired,
};

const PoolCard = ({ pool, topology, accent, busy, onAction, onModal, onDiskClick }) => {
  const { t } = useTranslation();
  const percent = percentOf(pool);
  return (
    <div
      className="card h-100 hw-zpool-card"
      style={{ '--hw-zpool-accent': `var(--bs-${accent})` }}
    >
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <span className="fs-5 fw-bold">
              <i className="fas fa-database me-2 text-muted" />
              {pool.name}
            </span>
            {pool.altroot && (
              <code className="small ms-2" title={t('host.poolCard.alternateRootTitle')}>
                {pool.altroot}
              </code>
            )}
          </div>
          <span className={`badge ${healthBadgeClass(pool.health)}`}>
            <i className={`fas ${healthIcon(pool.health)} me-1`} />
            {pool.health || '?'}
          </span>
        </div>

        {percent !== null && (
          <div className="d-flex align-items-center gap-3 mb-3">
            <CapacityRing percent={percent} variant={capacityVariant(percent)} />
            <div className="hw-zpool-stats flex-grow-1">
              <div className="hw-zpool-stat">
                <span className="hw-zpool-stat-k">{t('host.poolCard.usedLabel')}</span>
                <span className="hw-zpool-stat-v">{humanSize(pool.alloc)}</span>
              </div>
              <div className="hw-zpool-stat">
                <span className="hw-zpool-stat-k">{t('host.poolCard.freeLabel')}</span>
                <span className="hw-zpool-stat-v">{humanSize(pool.free)}</span>
              </div>
              <div className="hw-zpool-stat">
                <span className="hw-zpool-stat-k">{t('host.poolCard.totalLabel')}</span>
                <span className="hw-zpool-stat-v">{humanSize(pool.size)}</span>
              </div>
              <div className="hw-zpool-stat">
                <span className="hw-zpool-stat-k">{t('host.poolCard.dedupLabel')}</span>
                <span className="hw-zpool-stat-v">{pool.dedup_ratio || '—'}</span>
              </div>
            </div>
          </div>
        )}

        <PoolTopology parsed={topology} onDiskClick={device => onDiskClick(pool.name, device)} />

        {percent === null && (
          <div className="small text-muted mb-3">
            Dedup ratio <strong>{pool.dedup_ratio || '—'}</strong>
          </div>
        )}

        <div className="d-flex flex-wrap gap-1 mt-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => onModal({ kind: 'status', pool: pool.name, health: pool.health })}
            disabled={busy}
          >
            <i className="fas fa-heart-pulse me-1" />
            {t('host.zfsPoolsPanel.status')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            title={t('host.zfsPoolsPanel.scrubTitle')}
            onClick={() => onAction(pool.name, 'scrub')}
            disabled={busy}
          >
            <i className="fas fa-broom me-1" />
            {t('host.zfsPoolsPanel.scrub')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onModal({ kind: 'properties', pool: pool.name })}
            disabled={busy}
          >
            <i className="fas fa-sliders me-1" />
            {t('host.zfsPoolsPanel.properties')}
          </button>
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              title={t('host.zfsPoolsPanel.morePoolActionsTitle')}
              disabled={busy}
            >
              <i className="fas fa-gear" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onAction(pool.name, 'scrub-stop')}
              >
                <i className="fas fa-stop text-warning me-2" />
                {t('host.zfsPoolsPanel.stopScrub')}
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                title={t('host.zfsPoolsPanel.addVdevsTitle')}
                onClick={() => onModal({ kind: 'device', pool: pool.name })}
              >
                <i className="fas fa-plus me-2" />
                {t('host.zfsPoolsPanel.addVdevs')}
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                title={t('host.zfsPoolsPanel.upgradeTitle')}
                onClick={() => onAction(pool.name, 'upgrade')}
              >
                <i className="fas fa-arrow-up me-2" />
                {t('host.zfsPoolsPanel.upgrade')}
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title={t('host.zfsPoolsPanel.exportTitle')}
                onClick={() => onAction(pool.name, 'export')}
              >
                <i className="fas fa-file-export me-2" />
                {t('host.zfsPoolsPanel.export')}
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'destroy', pool: pool.name })}
              >
                <i className="fas fa-trash text-danger me-2" />
                {t('host.zfsPoolsPanel.destroy')}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

PoolCard.propTypes = {
  pool: PropTypes.object.isRequired,
  topology: PropTypes.object,
  accent: PropTypes.string.isRequired,
  busy: PropTypes.bool,
  onAction: PropTypes.func.isRequired,
  onModal: PropTypes.func.isRequired,
  onDiskClick: PropTypes.func.isRequired,
};

const ZfsPoolsPanel = ({ server }) => {
  const { t } = useTranslation();
  const [pools, setPools] = useState([]);
  // Per-pool parsed zpool status — feeds the card topology diagrams.
  const [statuses, setStatuses] = useState({});
  // The monitoring disk inventory — feeds the chassis view.
  const [hostDisks, setHostDisks] = useState([]);
  const [rescanning, setRescanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  // {kind: 'create'|'import'|'status'|'properties'|'device'|'destroy', pool?, mode?}
  const [modal, setModal] = useState(null);

  const report = (text, variant) => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await getZfsPools(server.hostname, server.port, server.protocol);
    if (result.success) {
      const list = Array.isArray(result.data?.pools) ? result.data.pools : [];
      setPools(list);
      // Topologies load per pool in the background — cards fill in as they land.
      list.forEach(pool => {
        getZfsPoolStatus(server.hostname, server.port, server.protocol, pool.name).then(
          statusResult => {
            if (statusResult.success) {
              setStatuses(prev => ({
                ...prev,
                [pool.name]: statusResult.data?.parsed || null,
              }));
            }
          }
        );
      });
    } else {
      report(`Failed to load pools: ${result.message}`, 'danger');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    setMsg('');
    load();
  }, [load]);

  const loadDisks = useCallback(async () => {
    if (!server || !hasFeature(server, 'monitoring')) {
      return;
    }
    const result = await getHostDisks(server.hostname, server.port, server.protocol);
    if (result.success) {
      setHostDisks(Array.isArray(result.data?.disks) ? result.data.disks : []);
    } else {
      setHostDisks([]);
      report(
        `Disk inventory failed (GET monitoring/storage/disks, ${result.status ?? '?'}): ${result.message}`,
        'danger'
      );
    }
  }, [server]);

  useEffect(() => {
    loadDisks();
  }, [loadDisks]);

  const rescanDisks = async () => {
    setRescanning(true);
    const result = await forceMonitoringCollect(server.hostname, server.port, server.protocol);
    if (!result.success) {
      report(`Rescan failed: ${result.message}`, 'danger');
    }
    await loadDisks();
    setRescanning(false);
  };

  const poolColorOf = poolName => {
    const index = pools.findIndex(pool => pool.name === poolName);
    return POOL_COLORS[(index === -1 ? 0 : index) % POOL_COLORS.length];
  };

  const onQueued = text => {
    report(text, 'success');
    // The task reshapes the list when it lands — refresh shortly after. Pool
    // mutations also kick an immediate storage collection agent-side, so the
    // disk inventory (pool_assignment / is_available) is re-read too.
    setTimeout(() => {
      load();
      loadDisks();
    }, 2000);
  };

  const runSimple = async (pool, action) => {
    const call = {
      scrub: scrubZfsPool,
      'scrub-stop': stopZfsPoolScrub,
      upgrade: upgradeZfsPool,
      export: exportZfsPool,
    }[action];
    setBusy(true);
    setMsg('');
    const result = await call(server.hostname, server.port, server.protocol, pool);
    setBusy(false);
    if (!result.success) {
      report(`${action} failed on ${pool}: ${result.message}`, 'danger');
      return;
    }
    onQueued(queuedMessage(result, `${action} queued on ${pool}.`));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="fs-6 fw-bold mb-0">
          <i className="fas fa-database me-2" />
          {t('host.zfsPoolsPanel.poolsHeading')} ({pools.length})
        </h3>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            disabled={loading || busy}
          >
            <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`} />
            {t('host.zfsPoolsPanel.refresh')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setModal({ kind: 'import' })}
            disabled={loading || busy}
          >
            <i className="fas fa-file-import me-2" />
            {t('host.zfsPoolsPanel.import')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setModal({ kind: 'create' })}
            disabled={loading || busy}
          >
            <i className="fas fa-plus me-2" />
            {t('host.zfsPoolsPanel.createPool')}
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {!loading && pools.length === 0 && (
        <p className="text-muted mb-0">{t('host.zfsPoolsPanel.noPools')}</p>
      )}

      <div className="row g-3">
        {pools.map(pool => (
          <div className="col-12 col-xl-6" key={pool.name}>
            <PoolCard
              pool={pool}
              topology={statuses[pool.name] || null}
              accent={poolColorOf(pool.name)}
              busy={busy}
              onAction={runSimple}
              onModal={setModal}
              onDiskClick={(poolName, device) => setModal({ kind: 'disk', pool: poolName, device })}
            />
          </div>
        ))}
      </div>

      {hasFeature(server, 'monitoring') && (
        <DiskChassis
          disks={hostDisks}
          poolColorOf={poolColorOf}
          rescanning={rescanning}
          onRescan={rescanDisks}
          onDiskClick={disk => {
            const row = flatVdevDevices(statuses[disk.pool_assignment]).find(
              entry => entry.name === disk.device_name || entry.name.startsWith(disk.device_name)
            );
            setModal({
              kind: 'disk',
              pool: disk.pool_assignment,
              device: row || {
                name: disk.device_name,
                state: '',
                read: '—',
                write: '—',
                cksum: '—',
                note: '',
              },
            });
          }}
        />
      )}

      <CreatePoolModal
        isOpen={modal?.kind === 'create'}
        onClose={() => setModal(null)}
        server={server}
        onQueued={onQueued}
      />
      <ImportPoolModal
        isOpen={modal?.kind === 'import'}
        onClose={() => setModal(null)}
        server={server}
        onQueued={onQueued}
      />
      <PoolStatusModal
        isOpen={modal?.kind === 'status'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        health={modal?.health}
      />
      <PoolPropertiesModal
        isOpen={modal?.kind === 'properties'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        onQueued={onQueued}
      />
      <AddVdevsModal
        isOpen={modal?.kind === 'device'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        onQueued={onQueued}
      />
      <DestroyPoolModal
        isOpen={modal?.kind === 'destroy'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        onQueued={onQueued}
      />
      <DiskActionModal
        isOpen={modal?.kind === 'disk'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        device={modal?.device || null}
        inventoryDisk={
          modal?.device
            ? hostDisks.find(
                disk =>
                  disk.device_name === modal.device.name ||
                  modal.device.name.startsWith(disk.device_name)
              ) || null
            : null
        }
        freeDisks={hostDisks.filter(disk => disk.is_available)}
        rescanning={rescanning}
        onRescan={rescanDisks}
        onQueued={onQueued}
      />
    </div>
  );
};

ZfsPoolsPanel.propTypes = {
  server: PropTypes.object,
};

export default ZfsPoolsPanel;
