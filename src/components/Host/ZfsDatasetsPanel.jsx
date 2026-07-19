import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  destroyZfsSnapshot,
  getZfsDatasets,
  getZfsPools,
  promoteZfsDataset,
} from '../../api/zfsAPI';
import { ConfirmModal } from '../common';

import {
  CloneSnapshotModal,
  CreateDatasetModal,
  DatasetPropertiesModal,
  DestroyDatasetModal,
  RenameDatasetModal,
  RollbackSnapshotModal,
  SnapshotCreateModal,
  SnapshotHoldsModal,
} from './ZfsDatasetModals';
import { capacityVariant, humanSize, queuedMessage, usedPercent } from './zfsUtils';

/**
 * ZFS dataset manager — the pool's real hierarchy as an expandable tree:
 * filesystems and volumes nest by name path, each dataset's snapshots fold
 * under it, usage renders as a bar. Every mutation is a queued agent task.
 */

/** rows → nested nodes. Lexicographic sort guarantees parents insert first. */
const buildTree = rows => {
  const nodes = new Map();
  const roots = [];
  rows
    .filter(row => row.type !== 'snapshot')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(row => {
      const node = {
        row,
        name: row.name,
        label: row.name.includes('/') ? row.name.slice(row.name.lastIndexOf('/') + 1) : row.name,
        children: [],
        snapshots: [],
      };
      nodes.set(row.name, node);
      const parent = row.name.includes('/')
        ? nodes.get(row.name.slice(0, row.name.lastIndexOf('/')))
        : null;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
  rows
    .filter(row => row.type === 'snapshot')
    .forEach(row => {
      const parent = nodes.get(row.name.split('@')[0]);
      if (parent) {
        parent.snapshots.push(row);
      }
    });
  return roots;
};

/** A node shows when its own type is toggled on AND it matches the search —
 *  or when any descendant does (ancestors stay as structure). */
const nodeMatches = (node, needle, show) => {
  const typeOn = show[node.row.type] ?? true;
  const nameOk = !needle || node.name.toLowerCase().includes(needle);
  if (typeOn && nameOk) {
    return true;
  }
  if (
    show.snapshot &&
    node.snapshots.some(snap => !needle || snap.name.toLowerCase().includes(needle))
  ) {
    return true;
  }
  return node.children.some(child => nodeMatches(child, needle, show));
};

const typeIcon = (row, depth) => {
  if (depth === 0) {
    return 'fa-database';
  }
  return row.type === 'volume' ? 'fa-hard-drive' : 'fa-folder';
};

const UsageBar = ({ row }) => {
  const percent = usedPercent(row.used, row.avail);
  if (percent === null) {
    return null;
  }
  return (
    <div
      className="progress flex-shrink-0"
      style={{ width: '90px', height: '0.5rem' }}
      role="progressbar"
      aria-label={`${row.name} usage`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${percent}% used (${row.used} used, ${row.avail} available)`}
    >
      <div
        className={`progress-bar bg-${capacityVariant(percent)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

UsageBar.propTypes = {
  row: PropTypes.object.isRequired,
};

const DatasetRow = ({
  node,
  depth,
  isCollapsed,
  hasContent,
  showSnapshots,
  busy,
  onToggle,
  onModal,
  onPromote,
}) => (
  <div
    className="d-flex align-items-center gap-2 border-bottom py-1"
    style={{ paddingLeft: `${depth * 1.5}rem` }}
  >
    {hasContent ? (
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-decoration-none"
        style={{ width: '1.25rem' }}
        aria-label={isCollapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
        onClick={() => onToggle(node.name)}
      >
        <i className={`fas ${isCollapsed ? 'fa-caret-right' : 'fa-caret-down'}`} />
      </button>
    ) : (
      <span style={{ width: '1.25rem' }} />
    )}
    <i className={`fas ${typeIcon(node.row, depth)} text-muted`} />
    <span className={depth === 0 ? 'fw-bold' : 'fw-semibold'} title={node.name}>
      {node.label}
    </span>
    {node.row.type === 'volume' && <span className="badge text-bg-info">volume</span>}
    {showSnapshots && node.snapshots.length > 0 && (
      <span className="badge text-bg-secondary" title={`${node.snapshots.length} snapshots`}>
        <i className="fas fa-camera me-1" />
        {node.snapshots.length}
      </span>
    )}
    <span className="ms-auto d-flex align-items-center gap-2">
      <UsageBar row={node.row} />
      <span className="text-muted small text-nowrap" title="used / available / referenced">
        {humanSize(node.row.used)} / {humanSize(node.row.avail)} / {humanSize(node.row.refer)}
      </span>
      {node.row.mountpoint && node.row.mountpoint !== '-' && (
        <code className="small text-muted d-none d-lg-inline" title="Mountpoint">
          {node.row.mountpoint}
        </code>
      )}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary py-0"
        title="Take a snapshot"
        onClick={() => onModal({ kind: 'snapshot', name: node.name })}
        disabled={busy}
      >
        <i className="fas fa-camera" />
      </button>
      <Dropdown align="end">
        <Dropdown.Toggle
          variant="outline-secondary"
          size="sm"
          className="py-0"
          title="More actions"
          disabled={busy}
        >
          <i className="fas fa-gear" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'create', name: `${node.name}/` })}
          >
            <i className="fas fa-plus me-2" />
            Create child dataset…
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'properties', name: node.name })}
          >
            <i className="fas fa-sliders me-2" />
            Properties…
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'rename', name: node.name })}
          >
            <i className="fas fa-i-cursor me-2" />
            Rename…
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            title="Make this clone independent of its origin snapshot"
            onClick={() => onPromote(node.name)}
          >
            <i className="fas fa-arrow-up me-2" />
            Promote clone
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'destroy', name: node.name, isSnapshot: false })}
          >
            <i className="fas fa-trash text-danger me-2" />
            Destroy…
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </span>
  </div>
);

DatasetRow.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool,
  hasContent: PropTypes.bool,
  showSnapshots: PropTypes.bool,
  busy: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onModal: PropTypes.func.isRequired,
  onPromote: PropTypes.func.isRequired,
};

const SnapshotRow = ({ snap, depth, busy, isSelected, onSelect, onModal }) => (
  <div
    className="d-flex align-items-center gap-2 border-bottom py-1"
    style={{ paddingLeft: `${depth * 1.5}rem` }}
  >
    <span style={{ width: '1.25rem' }} />
    <input
      type="checkbox"
      className="form-check-input flex-shrink-0 mt-0"
      checked={isSelected}
      onChange={() => onSelect(snap.name)}
      disabled={busy}
      aria-label={`Select ${snap.name}`}
    />
    <i className="fas fa-camera text-muted" />
    <code className="small" title={snap.name}>
      @{snap.name.split('@')[1] || snap.name}
    </code>
    <span className="ms-auto d-flex align-items-center gap-2">
      <span className="text-muted small text-nowrap" title="used / referenced">
        {humanSize(snap.used)} / {humanSize(snap.refer)}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-outline-warning py-0"
        title="Roll the dataset back to this snapshot"
        onClick={() => onModal({ kind: 'rollback', name: snap.name })}
        disabled={busy}
      >
        <i className="fas fa-clock-rotate-left" />
      </button>
      <Dropdown align="end">
        <Dropdown.Toggle
          variant="outline-secondary"
          size="sm"
          className="py-0"
          title="More actions"
          disabled={busy}
        >
          <i className="fas fa-gear" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'clone', name: snap.name })}
          >
            <i className="fas fa-clone me-2" />
            Clone…
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'holds', name: snap.name })}
          >
            <i className="fas fa-lock me-2" />
            Holds…
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => onModal({ kind: 'destroy', name: snap.name, isSnapshot: true })}
          >
            <i className="fas fa-trash text-danger me-2" />
            Destroy…
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </span>
  </div>
);

SnapshotRow.propTypes = {
  snap: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  busy: PropTypes.bool,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onModal: PropTypes.func.isRequired,
};

const TreeNode = ({
  node,
  depth,
  needle,
  show,
  collapsed,
  snapsOpen,
  busy,
  selected,
  handlers,
}) => {
  if (!nodeMatches(node, needle, show)) {
    return null;
  }
  // A live search expands everything it matched through.
  const isCollapsed = !needle && collapsed.has(node.name);
  const snapsVisible = needle
    ? node.snapshots.some(snap => snap.name.toLowerCase().includes(needle)) ||
      snapsOpen.has(node.name)
    : snapsOpen.has(node.name);
  const hasContent = node.children.length > 0 || (show.snapshot && node.snapshots.length > 0);
  return (
    <>
      <DatasetRow
        node={node}
        depth={depth}
        isCollapsed={isCollapsed}
        hasContent={hasContent}
        showSnapshots={show.snapshot}
        busy={busy}
        onToggle={handlers.onToggle}
        onModal={handlers.onModal}
        onPromote={handlers.onPromote}
      />
      {!isCollapsed && show.snapshot && node.snapshots.length > 0 && (
        <div
          className="d-flex align-items-center gap-2 border-bottom py-1"
          style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}
        >
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-decoration-none"
            style={{ width: '1.25rem' }}
            aria-label={`${snapsVisible ? 'Collapse' : 'Expand'} snapshots of ${node.name}`}
            onClick={() => handlers.onToggleSnaps(node.name)}
          >
            <i className={`fas ${snapsVisible ? 'fa-caret-down' : 'fa-caret-right'}`} />
          </button>
          <i className="fas fa-camera text-muted" />
          <span className="text-muted small">
            {node.snapshots.length} snapshot{node.snapshots.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
      {!isCollapsed &&
        show.snapshot &&
        snapsVisible &&
        node.snapshots.map(snap => (
          <SnapshotRow
            snap={snap}
            depth={depth + 2}
            busy={busy}
            isSelected={selected.has(snap.name)}
            onSelect={handlers.onSelect}
            onModal={handlers.onModal}
            key={snap.name}
          />
        ))}
      {!isCollapsed &&
        node.children.map(child => (
          <TreeNode
            node={child}
            depth={depth + 1}
            needle={needle}
            show={show}
            collapsed={collapsed}
            snapsOpen={snapsOpen}
            busy={busy}
            selected={selected}
            handlers={handlers}
            key={child.name}
          />
        ))}
    </>
  );
};

TreeNode.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  needle: PropTypes.string.isRequired,
  show: PropTypes.object.isRequired,
  collapsed: PropTypes.instanceOf(Set).isRequired,
  snapsOpen: PropTypes.instanceOf(Set).isRequired,
  busy: PropTypes.bool,
  selected: PropTypes.instanceOf(Set).isRequired,
  handlers: PropTypes.object.isRequired,
};

const TYPE_TOGGLES = [
  { key: 'filesystem', label: 'Filesystems', icon: 'fa-folder' },
  { key: 'volume', label: 'Volumes', icon: 'fa-hard-drive' },
  { key: 'snapshot', label: 'Snapshots', icon: 'fa-camera' },
];

const toggleIn = (set, name) => {
  const next = new Set(set);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  return next;
};

const allNodeNames = nodes => nodes.flatMap(node => [node.name, ...allNodeNames(node.children)]);

/** The whole modal stack — one open at a time, keyed on modal.kind. Split out
 *  of the panel purely for the complexity budget; behavior is identical. */
const DatasetModals = ({ modal, onClose, server, pools, busy, onQueued, onPromote }) => (
  <>
    <CreateDatasetModal
      isOpen={modal?.kind === 'create'}
      onClose={onClose}
      server={server}
      pools={pools}
      initialName={modal?.kind === 'create' ? modal?.name || '' : ''}
      onQueued={onQueued}
    />
    <SnapshotCreateModal
      isOpen={modal?.kind === 'snapshot'}
      onClose={onClose}
      server={server}
      dataset={modal?.name}
      onQueued={onQueued}
    />
    <RenameDatasetModal
      isOpen={modal?.kind === 'rename'}
      onClose={onClose}
      server={server}
      dataset={modal?.name}
      onQueued={onQueued}
    />
    <CloneSnapshotModal
      isOpen={modal?.kind === 'clone'}
      onClose={onClose}
      server={server}
      snapshot={modal?.name}
      onQueued={onQueued}
    />
    <RollbackSnapshotModal
      isOpen={modal?.kind === 'rollback'}
      onClose={onClose}
      server={server}
      snapshot={modal?.name}
      onQueued={onQueued}
    />
    <SnapshotHoldsModal
      isOpen={modal?.kind === 'holds'}
      onClose={onClose}
      server={server}
      snapshot={modal?.name}
      onQueued={onQueued}
    />
    <DatasetPropertiesModal
      isOpen={modal?.kind === 'properties'}
      onClose={onClose}
      server={server}
      dataset={modal?.name}
      onQueued={onQueued}
    />
    <DestroyDatasetModal
      isOpen={modal?.kind === 'destroy'}
      onClose={onClose}
      server={server}
      name={modal?.name}
      isSnapshot={modal?.isSnapshot}
      onQueued={onQueued}
    />
    {modal?.kind === 'promote' && (
      <ConfirmModal
        isOpen
        onClose={onClose}
        onConfirm={() => onPromote(modal.name)}
        title="Promote clone"
        message={`Promote ${modal.name} to an independent dataset? It stops depending on its origin snapshot and takes over that snapshot's space accounting — the origin becomes deletable. Only valid on a CLONE; the agent refuses anything else.`}
        confirmText="Promote"
        confirmVariant="is-primary"
        loading={busy}
      />
    )}
  </>
);

DatasetModals.propTypes = {
  modal: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object,
  pools: PropTypes.array.isRequired,
  busy: PropTypes.bool,
  onQueued: PropTypes.func.isRequired,
  onPromote: PropTypes.func.isRequired,
};

const ZfsDatasetsPanel = ({ server }) => {
  const [tree, setTree] = useState([]);
  const [pools, setPools] = useState([]);
  const [poolFilter, setPoolFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());
  const [snapsOpen, setSnapsOpen] = useState(new Set());
  // Type visibility toggles — hiding filesystems keeps ancestors whose
  // descendants are still visible (structure survives).
  const [show, setShow] = useState({ filesystem: true, volume: true, snapshot: true });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  // {kind: 'create'|'snapshot'|'rename'|'clone'|'rollback'|'holds'|'properties'|'destroy', name?, isSnapshot?}
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const report = (text, variant) => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    // Two sweeps: `zfs list` leaves snapshots out of the default type set,
    // so they ride their own query; the tree folds them under their dataset.
    const base = { recursive: true, ...(poolFilter && { pool: poolFilter }) };
    const [datasetsResult, snapshotsResult] = await Promise.all([
      getZfsDatasets(server.hostname, server.port, server.protocol, base),
      getZfsDatasets(server.hostname, server.port, server.protocol, {
        ...base,
        type: 'snapshot',
      }),
    ]);
    if (!datasetsResult.success) {
      report(`Failed to load datasets: ${datasetsResult.message}`, 'danger');
      setLoading(false);
      return;
    }
    if (!snapshotsResult.success) {
      report(`Failed to list snapshots: ${snapshotsResult.message}`, 'danger');
    }
    const merged = new Map();
    [
      ...(Array.isArray(datasetsResult.data?.datasets) ? datasetsResult.data.datasets : []),
      ...(Array.isArray(snapshotsResult.data?.datasets) ? snapshotsResult.data.datasets : []),
    ].forEach(row => merged.set(row.name, row));
    setTree(buildTree([...merged.values()]));
    setSelected(prev => new Set([...prev].filter(name => merged.has(name))));
    setLoading(false);
  }, [server, poolFilter]);

  useEffect(() => {
    setMsg('');
    load();
  }, [load]);

  useEffect(() => {
    if (!server) {
      return;
    }
    getZfsPools(server.hostname, server.port, server.protocol).then(result => {
      setPools(
        result.success && Array.isArray(result.data?.pools)
          ? result.data.pools.map(pool => pool.name)
          : []
      );
    });
  }, [server]);

  const onQueued = text => {
    report(text, 'success');
    // The task reshapes the list when it lands — refresh shortly after.
    setTimeout(load, 2000);
  };

  const runPromote = async name => {
    setBusy(true);
    setMsg('');
    const result = await promoteZfsDataset(server.hostname, server.port, server.protocol, name);
    setBusy(false);
    if (!result.success) {
      report(`Promote failed on ${name}: ${result.message}`, 'danger');
      return;
    }
    onQueued(queuedMessage(result, `Promote queued for ${name}.`));
  };

  const runBulkDestroy = async () => {
    const targets = [...selected];
    if (targets.length === 0) {
      return;
    }
    setBusy(true);
    setMsg('');
    const failures = [];
    await Promise.all(
      targets.map(name =>
        destroyZfsSnapshot(server.hostname, server.port, server.protocol, name)
          .then(result => {
            if (!result.success) {
              failures.push(`${name}: ${result.message || 'failed'}`);
            }
          })
          .catch(err => failures.push(`${name}: ${err.message}`))
      )
    );
    setBusy(false);
    setBulkOpen(false);
    setSelected(new Set());
    if (failures.length > 0) {
      report(`${failures.length} failed — ${failures.join('; ')}`, 'danger');
    } else {
      report(
        `Destroy queued for ${targets.length} snapshot${targets.length === 1 ? '' : 's'}.`,
        'success'
      );
    }
    setTimeout(load, 2000);
  };

  const handlers = {
    onModal: setModal,
    // Promote confirms first — it silently rewires clone/origin dependency.
    onPromote: name => setModal({ kind: 'promote', name }),
    onToggle: name => setCollapsed(prev => toggleIn(prev, name)),
    onToggleSnaps: name => setSnapsOpen(prev => toggleIn(prev, name)),
    onSelect: name => setSelected(prev => toggleIn(prev, name)),
  };

  const needle = nameFilter.trim().toLowerCase();
  const visibleRoots = tree.filter(node => nodeMatches(node, needle, show));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="fs-6 fw-bold mb-0">
          <i className="fas fa-folder-tree me-2" />
          Datasets
        </h3>
        <div className="d-flex gap-2 align-items-center">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            title="Destroy every ticked snapshot"
            onClick={() => setBulkOpen(true)}
            disabled={loading || busy || selected.size === 0}
          >
            <i className="fas fa-trash me-2" />
            Destroy selected snapshots ({selected.size})
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title="Expand every dataset"
            onClick={() => setCollapsed(new Set())}
          >
            <i className="fas fa-angles-down" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title="Collapse to the pools"
            onClick={() => {
              setCollapsed(new Set(allNodeNames(tree)));
              setSnapsOpen(new Set());
            }}
          >
            <i className="fas fa-angles-up" />
          </button>
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
            className="btn btn-sm btn-primary"
            onClick={() => setModal({ kind: 'create' })}
            disabled={loading || busy}
          >
            <i className="fas fa-plus me-2" />
            Create dataset…
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <input
            className="form-control form-control-sm"
            type="search"
            placeholder="Search datasets and snapshots…"
            aria-label="Search datasets"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-3">
          <select
            className="form-select form-select-sm"
            aria-label="Filter by pool"
            value={poolFilter}
            onChange={e => setPoolFilter(e.target.value)}
          >
            <option value="">All pools</option>
            {pools.map(pool => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <div className="btn-group btn-group-sm w-100" role="group" aria-label="Show types">
            {TYPE_TOGGLES.map(toggle => (
              <button
                type="button"
                key={toggle.key}
                className={`btn ${show[toggle.key] ? 'btn-primary' : 'btn-outline-secondary'}`}
                aria-pressed={show[toggle.key]}
                title={`${show[toggle.key] ? 'Hide' : 'Show'} ${toggle.label.toLowerCase()}`}
                onClick={() => setShow(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
              >
                <i className={`fas ${toggle.icon} me-1`} />
                {toggle.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {!loading && visibleRoots.length === 0 && (
        <p className="text-muted mb-0">
          {tree.length === 0 ? 'No datasets reported on this host.' : 'Nothing matches the search.'}
        </p>
      )}

      {visibleRoots.length > 0 && (
        <div className="border rounded px-2">
          {visibleRoots.map(node => (
            <TreeNode
              node={node}
              depth={0}
              needle={needle}
              show={show}
              collapsed={collapsed}
              snapsOpen={snapsOpen}
              busy={busy}
              selected={selected}
              handlers={handlers}
              key={node.name}
            />
          ))}
        </div>
      )}

      <DatasetModals
        modal={modal}
        onClose={() => setModal(null)}
        server={server}
        pools={pools}
        busy={busy}
        onQueued={onQueued}
        onPromote={name => {
          setModal(null);
          runPromote(name);
        }}
      />

      {bulkOpen && (
        <ConfirmModal
          isOpen={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onConfirm={runBulkDestroy}
          title={`Destroy ${selected.size} snapshot${selected.size === 1 ? '' : 's'}`}
          message={`Destroy ${[...selected].join(', ')}? This cannot be undone.`}
          confirmText={`Destroy ${selected.size}`}
          confirmVariant="is-danger"
          loading={busy}
        />
      )}
    </div>
  );
};

ZfsDatasetsPanel.propTypes = {
  server: PropTypes.object,
};

export default ZfsDatasetsPanel;
