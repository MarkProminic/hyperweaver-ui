import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

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

import {
  CreatePoolModal,
  DestroyPoolModal,
  ImportPoolModal,
  PoolDeviceModal,
  PoolPropertiesModal,
  PoolStatusModal,
} from './ZfsPoolModals';
import {
  buildVdevGroups,
  capacityVariant,
  healthBadgeClass,
  healthTextClass,
  humanSize,
  parseZpoolStatus,
  queuedMessage,
  scanPercent,
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

/** The host's physical disks as chassis bays, tinted by pool membership. */
const DiskChassis = ({ disks, poolColorOf, rescanning, onRescan }) => (
  <div className="mt-4">
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
      <h3 className="fs-6 fw-bold mb-0">
        <i className="fas fa-server me-2" />
        Physical Disks ({disks.length})
      </h3>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title="Force a monitoring rescan of the disk inventory"
        onClick={onRescan}
        disabled={rescanning}
      >
        <i className={`fas fa-radar me-2 ${rescanning ? 'fa-spin' : ''}`} />
        Rescan
      </button>
    </div>
    <div className="row g-2">
      {disks.map(disk => {
        const color = disk.pool_assignment ? poolColorOf(disk.pool_assignment) : null;
        return (
          <div
            className="col-6 col-md-4 col-lg-3 col-xxl-2"
            key={disk.device_name || disk.disk_index}
          >
            <div
              className={`border rounded p-2 h-100 ${color ? `border-${color}` : 'border-success'}`}
              style={color ? undefined : { borderStyle: 'dashed' }}
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className={`fas ${disk.disk_type === 'SSD' ? 'fa-microchip' : 'fa-hard-drive'} text-muted`}
                />
                <strong className="small">{disk.device_name}</strong>
                <span className={`badge ms-auto ${color ? `text-bg-${color}` : 'text-bg-success'}`}>
                  {disk.pool_assignment || 'free'}
                </span>
              </div>
              <div
                className="small text-muted text-truncate"
                title={`${disk.manufacturer || ''} ${disk.model || ''}`.trim()}
              >
                {disk.model || '—'}
              </div>
              <div className="d-flex justify-content-between align-items-center small">
                <code className="small" title="Serial number">
                  {disk.serial_number || '—'}
                </code>
                <span>{disk.capacity || humanSize(disk.capacity_bytes)}</span>
              </div>
              <div className="d-flex gap-1 mt-1">
                {disk.disk_type && (
                  <span className="badge text-bg-secondary">{disk.disk_type}</span>
                )}
                {disk.interface_type && (
                  <span className="badge text-bg-light border">{disk.interface_type}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

DiskChassis.propTypes = {
  disks: PropTypes.array.isRequired,
  poolColorOf: PropTypes.func.isRequired,
  rescanning: PropTypes.bool,
  onRescan: PropTypes.func.isRequired,
};

/** The pool's vdev layout drawn as boxes of drive chips — a mirror IS two
 *  drives in one box; state dots color each disk; an active scrub/resilver
 *  sweeps a striped progress bar across the top. */
const PoolTopology = ({ parsed }) => {
  if (!parsed) {
    return (
      <p className="text-muted small mb-2">
        <i className="fas fa-spinner fa-pulse me-2" />
        Reading topology…
      </p>
    );
  }
  const groups = buildVdevGroups(parsed.rows);
  if (groups.length === 0) {
    return null;
  }
  const scanPct = scanPercent(parsed.fields.scan);
  return (
    <div className="mb-2">
      {scanPct !== null && (
        <div
          className="progress mb-2"
          style={{ height: '0.4rem' }}
          title={parsed.fields.scan}
          role="progressbar"
          aria-label="Scrub/resilver progress"
          aria-valuenow={scanPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-bar progress-bar-striped progress-bar-animated bg-info"
            style={{ width: `${scanPct}%` }}
          />
        </div>
      )}
      {/* One full-width row per vdev — a mirror's disks always sit together
          in ONE segment, and multiple vdevs stack as the pool's real layers. */}
      <div className="d-flex flex-column gap-1">
        {groups.map(group => (
          <div
            className="border rounded px-2 py-1 d-flex align-items-center gap-2 flex-wrap"
            key={group.name}
          >
            <span
              className="d-inline-flex align-items-center gap-2 flex-shrink-0"
              style={{ minWidth: '8rem' }}
            >
              <i className={`fas ${group.bare ? 'fa-hard-drive' : 'fa-layer-group'} text-muted`} />
              <span className="fw-semibold small">{group.bare ? 'stripe' : group.name}</span>
              <span className={`badge ${healthBadgeClass(group.state)}`}>{group.state}</span>
            </span>
            <span className="d-inline-flex align-items-center flex-wrap gap-1">
              {group.devices.map(device => (
                <span
                  className="badge text-bg-light border d-inline-flex align-items-center gap-1"
                  key={device.name}
                  title={`${device.state} · read ${device.read} · write ${device.write} · cksum ${device.cksum}${device.note ? ` · ${device.note}` : ''}`}
                >
                  <i className={`fas fa-circle small ${healthTextClass(device.state)}`} />
                  <i className="fas fa-hard-drive" />
                  <code className="small">{device.name}</code>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {(parsed.fields.scan || parsed.fields.scrub) && (
        <div
          className="small text-muted text-truncate mt-1"
          title={parsed.fields.scan || parsed.fields.scrub}
        >
          <i className="fas fa-broom me-1" />
          {parsed.fields.scan || parsed.fields.scrub}
        </div>
      )}
    </div>
  );
};

PoolTopology.propTypes = {
  parsed: PropTypes.object,
};

const PoolCard = ({ pool, topology, busy, onAction, onModal }) => {
  const percent = percentOf(pool);
  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <span className="fs-5 fw-bold">
              <i className="fas fa-database me-2 text-muted" />
              {pool.name}
            </span>
            {pool.altroot && (
              <code className="small ms-2" title="Alternate root">
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
          <>
            <div
              className="progress mb-1"
              style={{ height: '1.25rem' }}
              role="progressbar"
              aria-label={`${pool.name} capacity`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`progress-bar bg-${capacityVariant(percent)}`}
                style={{ width: `${Math.max(percent, 4)}%` }}
              >
                {percent}%
              </div>
            </div>
            <div className="d-flex justify-content-between small text-muted mb-2">
              <span>
                <strong>{humanSize(pool.alloc)}</strong> used
              </span>
              <span>
                <strong>{humanSize(pool.free)}</strong> free
              </span>
              <span>
                <strong>{humanSize(pool.size)}</strong> total
              </span>
            </div>
          </>
        )}

        <PoolTopology parsed={topology} />

        <div className="small text-muted mb-3">
          Dedup ratio <strong>{pool.dedup_ratio || '—'}</strong>
        </div>

        <div className="d-flex flex-wrap gap-1 mt-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-info"
            onClick={() => onModal({ kind: 'status', pool: pool.name })}
            disabled={busy}
          >
            <i className="fas fa-heart-pulse me-1" />
            Status
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            title="Start a scrub — verifies every block against its checksum"
            onClick={() => onAction(pool.name, 'scrub')}
            disabled={busy}
          >
            <i className="fas fa-broom me-1" />
            Scrub
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onModal({ kind: 'properties', pool: pool.name })}
            disabled={busy}
          >
            <i className="fas fa-sliders me-1" />
            Properties
          </button>
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              title="More pool actions"
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
                Stop scrub
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>Devices</Dropdown.Header>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'device', pool: pool.name, mode: 'add-vdev' })}
              >
                <i className="fas fa-plus me-2" />
                Add vdevs…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'device', pool: pool.name, mode: 'remove' })}
              >
                <i className="fas fa-minus me-2" />
                Remove device…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'device', pool: pool.name, mode: 'replace' })}
              >
                <i className="fas fa-right-left me-2" />
                Replace device…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'device', pool: pool.name, mode: 'online' })}
              >
                <i className="fas fa-circle-check text-success me-2" />
                Online device…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'device', pool: pool.name, mode: 'offline' })}
              >
                <i className="fas fa-circle-minus text-warning me-2" />
                Offline device…
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                title="Upgrade the pool to the latest supported feature set"
                onClick={() => onAction(pool.name, 'upgrade')}
              >
                <i className="fas fa-arrow-up me-2" />
                Upgrade
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Export the pool from this system"
                onClick={() => onAction(pool.name, 'export')}
              >
                <i className="fas fa-file-export me-2" />
                Export
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => onModal({ kind: 'destroy', pool: pool.name })}
              >
                <i className="fas fa-trash text-danger me-2" />
                Destroy…
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
  busy: PropTypes.bool,
  onAction: PropTypes.func.isRequired,
  onModal: PropTypes.func.isRequired,
};

const ZfsPoolsPanel = ({ server }) => {
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
                [pool.name]: parseZpoolStatus(statusResult.data?.status),
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
    setHostDisks(result.success && Array.isArray(result.data?.disks) ? result.data.disks : []);
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
    // The task reshapes the list when it lands — refresh shortly after.
    setTimeout(load, 2000);
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
          Pools ({pools.length})
        </h3>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            disabled={loading || busy}
          >
            <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setModal({ kind: 'import' })}
            disabled={loading || busy}
          >
            <i className="fas fa-file-import me-2" />
            Import…
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setModal({ kind: 'create' })}
            disabled={loading || busy}
          >
            <i className="fas fa-plus me-2" />
            Create pool…
          </button>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {!loading && pools.length === 0 && (
        <p className="text-muted mb-0">No pools reported on this host.</p>
      )}

      <div className="row g-3">
        {pools.map(pool => (
          <div className="col-12 col-md-6 col-xxl-4" key={pool.name}>
            <PoolCard
              pool={pool}
              topology={statuses[pool.name] || null}
              busy={busy}
              onAction={runSimple}
              onModal={setModal}
            />
          </div>
        ))}
      </div>

      {hostDisks.length > 0 && (
        <DiskChassis
          disks={hostDisks}
          poolColorOf={poolColorOf}
          rescanning={rescanning}
          onRescan={rescanDisks}
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
      />
      <PoolPropertiesModal
        isOpen={modal?.kind === 'properties'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        onQueued={onQueued}
      />
      <PoolDeviceModal
        isOpen={modal?.kind === 'device'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        mode={modal?.mode}
        onQueued={onQueued}
      />
      <DestroyPoolModal
        isOpen={modal?.kind === 'destroy'}
        onClose={() => setModal(null)}
        server={server}
        pool={modal?.pool}
        onQueued={onQueued}
      />
    </div>
  );
};

ZfsPoolsPanel.propTypes = {
  server: PropTypes.object,
};

export default ZfsPoolsPanel;
