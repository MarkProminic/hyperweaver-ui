import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  getMachineSnapshots,
  takeMachineSnapshot,
  restoreMachineSnapshot,
  deleteMachineSnapshot,
  startMachine,
  getTask,
} from '../../api/machineAPI';
import { modifyInfrastructure } from '../../api/provisioningAPI';
import { getZfsSnapshotHolds, holdZfsSnapshot, releaseZfsSnapshotHold } from '../../api/zfsAPI';
import { hasFeature } from '../../utils/capabilities';
import { canCreateMachines } from '../../utils/permissions';
import { ConfirmModal, ContentModal, FormModal } from '../common';
import TaskDetailModal from '../TaskDetailModal';

import SnapshotTemplateModal from './SnapshotTemplateModal';

/**
 * Snapshots card (catalog §4, `machine-snapshots` token — the PARENT gates;
 * this component assumes the token is live). The list is a tree: each row's
 * `node` encodes its position (`SnapshotName`, `SnapshotName-1`,
 * `SnapshotName-1-1` — child depth = dash count) and `current: true` marks
 * the snapshot the machine currently derives from. Take works running or
 * stopped (live checkbox when running); restore requires a STOPPED machine
 * (button disabled with guidance otherwise); delete merges the snapshot's
 * state into its children. All three mutations queue tasks — the task
 * stream opens so the user watches them run.
 */

const depthOf = node => (String(node || '').match(/-/gu) || []).length;

const TERMINAL_STATUSES = ['completed', 'completed_with_errors', 'failed', 'cancelled'];

const wait = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

/** Recursive poll — answers the terminal task row, or null when it runs out. */
const pollTask = async (fetchRow, attempts) => {
  const row = await fetchRow();
  if (row && TERMINAL_STATUSES.includes(row.status)) {
    return row;
  }
  if (attempts <= 1) {
    return null;
  }
  await wait(2000);
  return pollTask(fetchRow, attempts - 1);
};

const formatBytes = bytes => {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KiB`;
  }
  return `${bytes} B`;
};

const CONFIRM_TITLES = {
  restore: 'Restore Snapshot',
  'restore-start': 'Restore Snapshot and Start',
  delete: 'Delete Snapshot',
};

const CONFIRM_ACTIONS = {
  restore: 'Restore',
  'restore-start': 'Restore and start',
  delete: 'Delete',
};

const confirmMessage = ({ kind, snapshot }, machineName) => {
  if (kind === 'delete') {
    return `Delete snapshot "${snapshot.name}"? The machine itself is unaffected.`;
  }
  const base = `Restore ${machineName} to snapshot "${snapshot.name}"? The machine's current disk state is replaced by the snapshot's.`;
  return kind === 'restore-start'
    ? `${base} The machine powers back on once the restore completes.`
    : base;
};

/**
 * Holds on a MACHINE snapshot — there is no machine-level hold: the snapshot's
 * `dataset_names[]` are the handles, and every hold/release addresses one
 * `dataset@snapshot` through the dataset-level API. Hold fans the tag out
 * across all datasets (a machine snapshot is one point in time — pinning half
 * of it pins nothing).
 */
const SnapshotHoldsModal = ({ isOpen, onClose, currentServer, snapshot }) => {
  const [holdsByDataset, setHoldsByDataset] = useState(null);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const datasets = Array.isArray(snapshot?.dataset_names) ? snapshot.dataset_names : [];
  const handleOf = dataset => `${dataset}@${snapshot.name}`;

  const load = useCallback(async () => {
    const list = Array.isArray(snapshot?.dataset_names) ? snapshot.dataset_names : [];
    if (!isOpen || !snapshot || list.length === 0) {
      return;
    }
    setHoldsByDataset(null);
    setError('');
    const results = await Promise.all(
      list.map(dataset =>
        getZfsSnapshotHolds(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          `${dataset}@${snapshot.name}`
        ).then(result => ({ dataset, result }))
      )
    );
    const failed = results.find(({ result }) => !result.success);
    if (failed) {
      setError(`Holds query failed on ${failed.dataset}: ${failed.result.message}`);
    }
    setHoldsByDataset(
      Object.fromEntries(
        results.map(({ dataset, result }) => [
          dataset,
          result.success && Array.isArray(result.data?.holds) ? result.data.holds : [],
        ])
      )
    );
  }, [isOpen, snapshot, currentServer]);

  useEffect(() => {
    setTag('');
    load();
  }, [load]);

  if (!snapshot) {
    return null;
  }

  const holdAll = async () => {
    setBusy(true);
    setError('');
    const results = await Promise.all(
      datasets.map(dataset =>
        holdZfsSnapshot(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          handleOf(dataset),
          {
            tag: tag.trim(),
          }
        ).then(result => ({ dataset, result }))
      )
    );
    setBusy(false);
    const failures = results
      .filter(({ result }) => !result.success)
      .map(({ dataset, result }) => `${dataset}: ${result.message}`);
    if (failures.length > 0) {
      setError(failures.join('; '));
      return;
    }
    setTag('');
    // Holds land via tasks — re-list shortly after.
    setTimeout(load, 2000);
  };

  const release = async (dataset, holdTag) => {
    setBusy(true);
    setError('');
    const result = await releaseZfsSnapshotHold(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      handleOf(dataset),
      holdTag
    );
    setBusy(false);
    if (!result.success) {
      setError(`Release failed on ${dataset}: ${result.message}`);
      return;
    }
    setTimeout(load, 2000);
  };

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Holds — ${snapshot.name}`}
      icon="fas fa-lock"
    >
      <p className="form-text mt-0">
        A held snapshot cannot be destroyed until every hold releases. A machine snapshot spans{' '}
        {datasets.length} dataset{datasets.length === 1 ? '' : 's'} — holding pins the tag on ALL of
        them.
      </p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {holdsByDataset === null && !error && (
        <p className="text-muted mb-2">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {holdsByDataset !== null &&
        datasets.map(dataset => (
          <div className="mb-2" key={dataset}>
            <code className="small">{handleOf(dataset)}</code>
            {(holdsByDataset[dataset] || []).length === 0 ? (
              <span className="text-muted small ms-2">no holds</span>
            ) : (
              <div className="d-flex flex-wrap gap-1 mt-1">
                {holdsByDataset[dataset].map(hold => (
                  <span className="badge text-bg-secondary d-inline-flex gap-1" key={hold.tag}>
                    {hold.tag}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-white"
                      title={`Release '${hold.tag}' on ${dataset}`}
                      onClick={() => release(dataset, hold.tag)}
                      disabled={busy}
                    >
                      <i className="fas fa-lock-open small" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      <div className="input-group input-group-sm mt-3">
        <input
          className="form-control"
          type="text"
          placeholder="e.g. keep-for-audit"
          aria-label="New hold tag"
          value={tag}
          onChange={e => setTag(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={holdAll}
          disabled={busy || !tag.trim()}
        >
          <i className="fas fa-lock me-1" />
          Hold all datasets
        </button>
      </div>
    </ContentModal>
  );
};

SnapshotHoldsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  snapshot: PropTypes.object,
};

const POLICY_TYPES = [
  { value: 'none', label: 'None — scheduled snapshots off' },
  { value: 'simple', label: 'Simple — keep the newest N' },
  { value: 'age', label: 'Age — delete older than N days' },
  { value: 'rotation', label: 'Rotation — hourly/daily/weekly tiers' },
];

// Placeholder keeps mirror the agent's rotation defaults per tier.
const TIER_KEEP_DEFAULT = { hourly: '24', daily: '8', weekly: '5' };

/**
 * Per-zone scheduled-snapshot retention policy — the PUT `snapshots` field
 * ({type: none|simple|age|rotation, quiesce?, keep?, max_age_days?, tiers?};
 * null clears the override back to the agent default).
 */
const SnapshotPolicyEditor = ({ currentServer, machineName, current, onFollowTask }) => {
  const [type, setType] = useState('');
  const [quiesce, setQuiesce] = useState(false);
  const [keep, setKeep] = useState('');
  const [maxAgeDays, setMaxAgeDays] = useState('');
  const [tiers, setTiers] = useState({ hourly: '', daily: '', weekly: '' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setType(current?.type || '');
    setQuiesce(current?.quiesce === true);
    setKeep(current?.keep !== undefined ? String(current.keep) : '');
    setMaxAgeDays(current?.max_age_days !== undefined ? String(current.max_age_days) : '');
    setTiers({
      hourly: current?.tiers?.hourly?.keep !== undefined ? String(current.tiers.hourly.keep) : '',
      daily: current?.tiers?.daily?.keep !== undefined ? String(current.tiers.daily.keep) : '',
      weekly: current?.tiers?.weekly?.keep !== undefined ? String(current.tiers.weekly.keep) : '',
    });
    setNote('');
  }, [current, machineName]);

  const send = async policy => {
    setBusy(true);
    setNote('');
    const result = await modifyInfrastructure(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      { snapshots: policy }
    );
    setBusy(false);
    if (!result.success) {
      setNote(`Policy update failed: ${result.message}`);
      return;
    }
    setNote(policy === null ? 'Override cleared — the agent default applies.' : 'Policy saved.');
    if (result.data?.task_id) {
      onFollowTask(result.data.task_id);
    }
  };

  const handleApply = () => {
    if (!type) {
      setNote('Pick a policy type first.');
      return;
    }
    const policy = { type };
    if (type !== 'none' && quiesce) {
      policy.quiesce = true;
    }
    if (type === 'simple' && keep !== '') {
      policy.keep = Number(keep);
    }
    if (type === 'age' && maxAgeDays !== '') {
      policy.max_age_days = Number(maxAgeDays);
    }
    if (type === 'rotation') {
      policy.tiers = {};
      ['hourly', 'daily', 'weekly'].forEach(tier => {
        if (tiers[tier] !== '') {
          policy.tiers[tier] = { keep: Number(tiers[tier]) };
        }
      });
      if (Object.keys(policy.tiers).length === 0) {
        delete policy.tiers;
      }
    }
    send(policy);
  };

  return (
    <div className="border-top pt-2 mt-3">
      <h5 className="fs-6 fw-bold mb-2">Scheduled snapshots (retention policy)</h5>
      {note && <div className="alert alert-info py-1 small">{note}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1" htmlFor="snapshot-policy-type">
            Policy
          </label>
          <select
            id="snapshot-policy-type"
            className="form-select form-select-sm"
            value={type}
            onChange={e => setType(e.target.value)}
            disabled={busy}
          >
            <option value="">(agent default)</option>
            {POLICY_TYPES.map(entry => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        {type === 'simple' && (
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="snapshot-policy-keep">
              Keep
            </label>
            <input
              id="snapshot-policy-keep"
              className="form-control form-control-sm"
              type="number"
              min="1"
              placeholder="24"
              value={keep}
              onChange={e => setKeep(e.target.value)}
              disabled={busy}
            />
          </div>
        )}
        {type === 'age' && (
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="snapshot-policy-age">
              Max age (days)
            </label>
            <input
              id="snapshot-policy-age"
              className="form-control form-control-sm"
              type="number"
              min="1"
              placeholder="14"
              value={maxAgeDays}
              onChange={e => setMaxAgeDays(e.target.value)}
              disabled={busy}
            />
          </div>
        )}
        {type === 'rotation' &&
          ['hourly', 'daily', 'weekly'].map(tier => (
            <div className="col-4 col-md-2" key={tier}>
              <label className="form-label small mb-1" htmlFor={`snapshot-policy-${tier}`}>
                {tier} keep
              </label>
              <input
                id={`snapshot-policy-${tier}`}
                className="form-control form-control-sm"
                type="number"
                min="1"
                placeholder={TIER_KEEP_DEFAULT[tier]}
                value={tiers[tier]}
                onChange={e => setTiers(prev => ({ ...prev, [tier]: e.target.value }))}
                disabled={busy}
              />
            </div>
          ))}
        {type && type !== 'none' && (
          <div className="col-auto">
            <div className="form-check mb-1">
              <input
                id="snapshot-policy-quiesce"
                className="form-check-input"
                type="checkbox"
                checked={quiesce}
                onChange={e => setQuiesce(e.target.checked)}
                disabled={busy}
              />
              <label className="form-check-label small" htmlFor="snapshot-policy-quiesce">
                Quiesce (qga fsfreeze)
              </label>
            </div>
          </div>
        )}
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApply}
            disabled={busy || !type}
          >
            Apply policy
          </button>
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => send(null)}
            disabled={busy}
            title="Remove this machine's override — the agent default applies"
          >
            Clear override
          </button>
        </div>
      </div>
    </div>
  );
};

SnapshotPolicyEditor.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  current: PropTypes.object,
  onFollowTask: PropTypes.func.isRequired,
};

const MachineSnapshots = ({
  currentServer,
  machineName,
  isRunning,
  user,
  snapshotPolicy,
  takeOpen,
  onTakeClose,
}) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [takeForm, setTakeForm] = useState({
    mode: 'name',
    name: '',
    prefix: '',
    retention: '',
    description: '',
    quiesce: false,
    live: false,
  });
  // {kind: 'restore'|'restore-start'|'delete', snapshot}
  const [confirm, setConfirm] = useState(null);
  // {mode: 'export'|'publish', snapshot} — build a template FROM a snapshot.
  const [templateFrom, setTemplateFrom] = useState(null);
  // The snapshot whose ZFS holds are being managed (needs dataset_names[]).
  const [holdsFor, setHoldsFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [followTask, setFollowTask] = useState(null);

  const canMutate = canCreateMachines(user?.role);
  const templatesAvailable = hasFeature(currentServer, 'templates');
  const resetTakeForm = () =>
    setTakeForm({
      mode: 'name',
      name: '',
      prefix: '',
      retention: '',
      description: '',
      quiesce: false,
      live: false,
    });

  const load = useCallback(async () => {
    if (!currentServer || !machineName) {
      return;
    }
    setLoading(true);
    const result = await getMachineSnapshots(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    if (result.success) {
      setSnapshots(result.data?.snapshots || []);
      setMsg('');
    } else {
      setMsg(`Failed to load snapshots: ${result.message}`);
    }
    setLoading(false);
  }, [currentServer, machineName]);

  // Slow poll keeps the list honest without a refresh button (Mark's nit:
  // the card carries no action buttons — Take Snapshot lives in the page
  // header beside Clone/Edit).
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Queued mutation answered with a task_id — fetch the row and open the
  // task stream (the pattern every 202 surface follows, catalog §13).
  const followQueuedTask = async taskId => {
    if (!taskId) {
      return;
    }
    const result = await getTask(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      taskId
    );
    if (result.success && result.data) {
      setFollowTask(result.data.task || result.data);
    }
  };

  const handleTake = async () => {
    const usePrefix = takeForm.mode === 'prefix';
    if (usePrefix ? !takeForm.prefix.trim() : !takeForm.name.trim()) {
      setMsg(usePrefix ? 'Snapshot prefix is required.' : 'Snapshot name is required.');
      return;
    }
    setBusy(true);
    const body = {};
    if (usePrefix) {
      body.prefix = takeForm.prefix.trim();
      if (takeForm.retention !== '') {
        body.retention = Number(takeForm.retention);
      }
    } else {
      body.name = takeForm.name.trim();
    }
    if (takeForm.description.trim()) {
      body.description = takeForm.description.trim();
    }
    if (takeForm.quiesce) {
      body.quiesce = true;
    }
    if (isRunning && takeForm.live) {
      body.live = true;
    }
    const result = await takeMachineSnapshot(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      body
    );
    setBusy(false);
    if (result.success) {
      onTakeClose();
      resetTakeForm();
      setMsg('');
      await followQueuedTask(result.data?.task_id);
    } else {
      setMsg(`Snapshot failed: ${result.message}`);
    }
  };

  // Restore, wait for the task to land, then power the machine back on — the
  // restore itself requires a stopped machine, so starting is a second step.
  const restoreThenStart = async taskId => {
    if (!taskId) {
      setMsg('Restore queued, but no task id came back — start the machine yourself.');
      return;
    }
    const task = await pollTask(
      () =>
        getTask(currentServer.hostname, currentServer.port, currentServer.protocol, taskId).then(
          result => (result.success ? result.data?.task || result.data : null)
        ),
      60
    );
    if (!task) {
      setMsg('Restore is still running — start the machine once it completes.');
      return;
    }
    if (task.status === 'failed') {
      setMsg(`Restore failed — not starting. ${task.error_message || ''}`.trim());
      return;
    }
    const start = await startMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    setMsg(start.success ? '' : `Restored, but the start failed: ${start.message}`);
  };

  const handleConfirm = async () => {
    if (!confirm) {
      return;
    }
    const { kind, snapshot } = confirm;
    setBusy(true);
    const call = kind === 'delete' ? deleteMachineSnapshot : restoreMachineSnapshot;
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      snapshot.name
    );
    setConfirm(null);
    if (!result.success) {
      setBusy(false);
      setMsg(`Snapshot ${kind === 'delete' ? 'delete' : 'restore'} failed: ${result.message}`);
      return;
    }
    setMsg('');
    await followQueuedTask(result.data?.task_id);
    if (kind === 'restore-start') {
      await restoreThenStart(result.data?.task_id);
    }
    setBusy(false);
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-2">
          <i className="fas fa-camera me-2" />
          Snapshots ({snapshots.length})
        </h4>

        {msg && <div className="alert alert-warning py-2">{msg}</div>}
        {!loading && snapshots.length === 0 && (
          <p className="text-muted mb-0 small">No snapshots yet.</p>
        )}

        {canMutate && (
          <SnapshotPolicyEditor
            currentServer={currentServer}
            machineName={machineName}
            current={snapshotPolicy}
            onFollowTask={followQueuedTask}
          />
        )}

        {snapshots.length > 0 && (
          <div className="d-flex flex-column gap-1 mt-3">
            {snapshots.map(snapshot => (
              <div
                className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
                key={snapshot.uuid || snapshot.name}
                style={{ marginLeft: `${depthOf(snapshot.node) * 16}px` }}
              >
                <div className="me-2">
                  <span
                    className="fw-semibold"
                    title={
                      Array.isArray(snapshot.datasets) ? snapshot.datasets.join(', ') : undefined
                    }
                  >
                    {snapshot.name}
                  </span>
                  {snapshot.current && (
                    <span
                      className="badge text-bg-success ms-2"
                      title="The machine's current state derives from this snapshot"
                    >
                      Current
                    </span>
                  )}
                  {Array.isArray(snapshot.dataset_names) && snapshot.dataset_names.length > 0 ? (
                    <button
                      type="button"
                      className={`badge border-0 ms-2 ${snapshot.holds > 0 ? 'text-bg-secondary' : 'text-bg-light border'}`}
                      title="ZFS holds pin this snapshot against deletion — click to manage"
                      onClick={() => setHoldsFor(snapshot)}
                      disabled={busy}
                    >
                      <i
                        className={`fas ${snapshot.holds > 0 ? 'fa-lock' : 'fa-lock-open'} me-1`}
                      />
                      {snapshot.holds || 0} hold{snapshot.holds === 1 ? '' : 's'}
                    </button>
                  ) : (
                    snapshot.holds > 0 && (
                      <span
                        className="badge text-bg-secondary ms-2"
                        title="ZFS holds pin this snapshot against deletion"
                      >
                        {snapshot.holds} hold{snapshot.holds === 1 ? '' : 's'}
                      </span>
                    )
                  )}
                  {snapshot.created && (
                    <span className="text-muted small ms-2">
                      {new Date(snapshot.created).toLocaleString()}
                    </span>
                  )}
                  {typeof snapshot.used_bytes === 'number' && (
                    <span className="text-muted small ms-2">
                      {formatBytes(snapshot.used_bytes)}
                    </span>
                  )}
                  {snapshot.description && (
                    <div className="small text-muted">{snapshot.description}</div>
                  )}
                </div>
                {canMutate && (
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      title={
                        isRunning
                          ? 'Restore needs the machine stopped — stop it first'
                          : 'Restore the machine to this snapshot'
                      }
                      disabled={isRunning || busy}
                      onClick={() => setConfirm({ kind: 'restore', snapshot })}
                    >
                      <i className="fas fa-history" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      title={
                        isRunning
                          ? 'Restore needs the machine stopped — stop it first'
                          : 'Restore to this snapshot, then power the machine back on'
                      }
                      disabled={isRunning || busy}
                      onClick={() => setConfirm({ kind: 'restore-start', snapshot })}
                    >
                      <i className="fas fa-play" />
                    </button>
                    {templatesAvailable && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Build a local .box template from this snapshot"
                          disabled={busy}
                          onClick={() => setTemplateFrom({ mode: 'export', snapshot })}
                        >
                          <i className="fas fa-box-archive" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info"
                          title="Publish this snapshot to a registry"
                          disabled={busy}
                          onClick={() => setTemplateFrom({ mode: 'publish', snapshot })}
                        >
                          <i className="fas fa-cloud-arrow-up" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Delete this snapshot (its state merges into child snapshots)"
                      disabled={busy}
                      onClick={() => setConfirm({ kind: 'delete', snapshot })}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        isOpen={takeOpen}
        onClose={onTakeClose}
        onSubmit={handleTake}
        title={`Take Snapshot — ${machineName}`}
        icon="fas fa-camera"
        submitText="Take Snapshot"
        loading={busy}
        showCancelButton
      >
        <div className="mb-3">
          <span className="form-label d-block">Naming</span>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn btn-outline-secondary ${takeForm.mode === 'name' ? 'active' : ''}`}
              onClick={() => setTakeForm(prev => ({ ...prev, mode: 'name' }))}
            >
              Named
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${takeForm.mode === 'prefix' ? 'active' : ''}`}
              onClick={() => setTakeForm(prev => ({ ...prev, mode: 'prefix' }))}
            >
              Prefix (timestamped, auto-pruned)
            </button>
          </div>
        </div>
        {takeForm.mode === 'prefix' ? (
          <>
            <div className="mb-3">
              <label className="form-label" htmlFor="snapshot-prefix">
                Prefix
              </label>
              <input
                id="snapshot-prefix"
                className="form-control"
                placeholder="e.g. nightly — becomes nightly-YYYYMMDD-HHMM"
                value={takeForm.prefix}
                onChange={e => setTakeForm({ ...takeForm, prefix: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="snapshot-retention">
                Retention (keep newest N; 0 = keep all)
              </label>
              <input
                id="snapshot-retention"
                className="form-control"
                type="number"
                min="0"
                placeholder="0"
                value={takeForm.retention}
                onChange={e => setTakeForm({ ...takeForm, retention: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div className="mb-3">
            <label className="form-label" htmlFor="snapshot-name">
              Name
            </label>
            <input
              id="snapshot-name"
              className="form-control"
              value={takeForm.name}
              onChange={e => setTakeForm({ ...takeForm, name: e.target.value })}
              required
            />
          </div>
        )}
        <div className="mb-3">
          <label className="form-label" htmlFor="snapshot-description">
            Description (optional)
          </label>
          <input
            id="snapshot-description"
            className="form-control"
            value={takeForm.description}
            onChange={e => setTakeForm({ ...takeForm, description: e.target.value })}
          />
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="snapshot-quiesce"
            checked={takeForm.quiesce}
            onChange={e => setTakeForm({ ...takeForm, quiesce: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="snapshot-quiesce">
            Quiesce — fsfreeze the guest via the guest agent for an app-consistent snapshot
          </label>
        </div>
        {isRunning && (
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="snapshot-live"
              checked={takeForm.live}
              onChange={e => setTakeForm({ ...takeForm, live: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="snapshot-live">
              Live snapshot — capture without pausing the running machine
            </label>
          </div>
        )}
      </FormModal>

      {confirm && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
          title={CONFIRM_TITLES[confirm.kind]}
          message={confirmMessage(confirm, machineName)}
          confirmText={CONFIRM_ACTIONS[confirm.kind]}
          loading={busy}
        />
      )}

      {templateFrom && (
        <SnapshotTemplateModal
          isOpen
          mode={templateFrom.mode}
          onClose={() => setTemplateFrom(null)}
          currentServer={currentServer}
          machineName={machineName}
          snapshotName={templateFrom.snapshot.name}
          onQueued={(data, fallback) => {
            setMsg(data?.message || fallback);
            followQueuedTask(data?.task_id);
          }}
        />
      )}

      {holdsFor && (
        <SnapshotHoldsModal
          isOpen
          onClose={() => {
            setHoldsFor(null);
            load();
          }}
          currentServer={currentServer}
          snapshot={holdsFor}
        />
      )}

      {followTask && (
        <TaskDetailModal
          task={followTask}
          onClose={() => {
            setFollowTask(null);
            load();
          }}
        />
      )}
    </div>
  );
};

MachineSnapshots.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  isRunning: PropTypes.bool,
  user: PropTypes.object,
  snapshotPolicy: PropTypes.object,
  takeOpen: PropTypes.bool,
  onTakeClose: PropTypes.func.isRequired,
};

export default MachineSnapshots;
