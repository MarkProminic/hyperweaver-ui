import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  getMachineSnapshots,
  takeMachineSnapshot,
  restoreMachineSnapshot,
  deleteMachineSnapshot,
  getTask,
} from '../../api/machineAPI';
import { modifyInfrastructure } from '../../api/provisioningAPI';
import { canCreateMachines } from '../../utils/permissions';
import { ConfirmModal, FormModal } from '../common';
import TaskDetailModal from '../TaskDetailModal';

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
  const [confirm, setConfirm] = useState(null); // {kind: 'restore'|'delete', snapshot}
  const [busy, setBusy] = useState(false);
  const [followTask, setFollowTask] = useState(null);

  const canMutate = canCreateMachines(user?.role);
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

  const handleConfirm = async () => {
    if (!confirm) {
      return;
    }
    setBusy(true);
    const call = confirm.kind === 'restore' ? restoreMachineSnapshot : deleteMachineSnapshot;
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      confirm.snapshot.name
    );
    setBusy(false);
    setConfirm(null);
    if (result.success) {
      setMsg('');
      await followQueuedTask(result.data?.task_id);
    } else {
      setMsg(`Snapshot ${confirm.kind} failed: ${result.message}`);
    }
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
                  {snapshot.holds > 0 && (
                    <span
                      className="badge text-bg-secondary ms-2"
                      title="ZFS holds pin this snapshot against deletion"
                    >
                      {snapshot.holds} hold{snapshot.holds === 1 ? '' : 's'}
                    </span>
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
          title={confirm.kind === 'restore' ? 'Restore Snapshot' : 'Delete Snapshot'}
          message={
            confirm.kind === 'restore'
              ? `Restore ${machineName} to snapshot "${confirm.snapshot.name}"? The machine's current disk state is replaced by the snapshot's.`
              : `Delete snapshot "${confirm.snapshot.name}"? The machine itself is unaffected.`
          }
          confirmText={confirm.kind === 'restore' ? 'Restore' : 'Delete'}
          loading={busy}
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
