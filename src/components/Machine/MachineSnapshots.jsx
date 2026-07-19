import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getMachineSnapshots,
  takeMachineSnapshot,
  restoreMachineSnapshot,
  deleteMachineSnapshot,
  modifyMachineSnapshot,
  startMachine,
  getTask,
} from '../../api/machineAPI';
import { modifyInfrastructure } from '../../api/provisioningAPI';
import { getZfsSnapshotHolds, holdZfsSnapshot, releaseZfsSnapshotHold } from '../../api/zfsAPI';
import { hasFeature } from '../../utils/capabilities';
import { canCreateMachines } from '../../utils/permissions';
import { formatByteSize, pollTaskRow } from '../../utils/taskOperations';
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

const CONFIRM_TITLE_KEYS = {
  restore: 'machine.machineSnapshots.confirmRestoreTitle',
  'restore-start': 'machine.machineSnapshots.confirmRestoreStartTitle',
  delete: 'machine.machineSnapshots.confirmDeleteTitle',
};

const CONFIRM_ACTION_KEYS = {
  restore: 'machine.machineSnapshots.confirmRestoreAction',
  'restore-start': 'machine.machineSnapshots.confirmRestoreStartAction',
  delete: 'machine.machineSnapshots.confirmDeleteAction',
};

const confirmMessage = ({ kind, snapshot }, machineName, t) => {
  if (kind === 'delete') {
    return t('machine.machineSnapshots.confirmDeleteMessage', { snapshotName: snapshot.name });
  }
  const base = t('machine.machineSnapshots.confirmRestoreMessage', {
    machineName,
    snapshotName: snapshot.name,
  });
  return kind === 'restore-start'
    ? `${base} ${t('machine.machineSnapshots.confirmRestoreStartSuffix')}`
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
  const { t } = useTranslation();
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
      setError(
        t('machine.machineSnapshots.holdsQueryFailed', {
          dataset: failed.dataset,
          message: failed.result.message,
        })
      );
    }
    setHoldsByDataset(
      Object.fromEntries(
        results.map(({ dataset, result }) => [
          dataset,
          result.success && Array.isArray(result.data?.holds) ? result.data.holds : [],
        ])
      )
    );
  }, [isOpen, snapshot, currentServer, t]);

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
      setError(t('machine.machineSnapshots.releaseFailed', { dataset, message: result.message }));
      return;
    }
    setTimeout(load, 2000);
  };

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('machine.machineSnapshots.holdsTitle', { snapshotName: snapshot.name })}
      icon="fas fa-lock"
    >
      <p className="form-text mt-0">
        {t('machine.machineSnapshots.holdsExplanation', { count: datasets.length })}
      </p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {holdsByDataset === null && !error && (
        <p className="text-muted mb-2">
          <i className="fas fa-spinner fa-pulse me-2" />
          {t('machine.machineSnapshots.loading')}
        </p>
      )}
      {holdsByDataset !== null &&
        datasets.map(dataset => (
          <div className="mb-2" key={dataset}>
            <code className="small">{handleOf(dataset)}</code>
            {(holdsByDataset[dataset] || []).length === 0 ? (
              <span className="text-muted small ms-2">{t('machine.machineSnapshots.noHolds')}</span>
            ) : (
              <div className="d-flex flex-wrap gap-1 mt-1">
                {holdsByDataset[dataset].map(hold => (
                  <span className="badge text-bg-secondary d-inline-flex gap-1" key={hold.tag}>
                    {hold.tag}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-white"
                      title={t('machine.machineSnapshots.releaseHoldTooltip', {
                        tag: hold.tag,
                        dataset,
                      })}
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
          placeholder={t('machine.machineSnapshots.holdTagPlaceholder')}
          aria-label={t('machine.machineSnapshots.holdTagAriaLabel')}
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
          {t('machine.machineSnapshots.holdAllButton')}
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
  { value: 'none', labelKey: 'machine.machineSnapshots.policyNone' },
  { value: 'simple', labelKey: 'machine.machineSnapshots.policySimple' },
  { value: 'age', labelKey: 'machine.machineSnapshots.policyAge' },
  { value: 'rotation', labelKey: 'machine.machineSnapshots.policyRotation' },
];

// Placeholder keeps mirror the agent's rotation defaults per tier.
const TIER_KEEP_DEFAULT = { hourly: '24', daily: '8', weekly: '5' };

/**
 * Per-zone scheduled-snapshot retention policy — the PUT `snapshots` field
 * ({type: none|simple|age|rotation, quiesce?, keep?, max_age_days?, tiers?};
 * null clears the override back to the agent default).
 */
const SnapshotPolicyEditor = ({ currentServer, machineName, current, onFollowTask }) => {
  const { t } = useTranslation();
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
      setNote(t('machine.machineSnapshots.policyUpdateFailed', { message: result.message }));
      return;
    }
    setNote(
      policy === null
        ? t('machine.machineSnapshots.overrideCleared')
        : t('machine.machineSnapshots.policySaved')
    );
    if (result.data?.task_id) {
      onFollowTask(result.data.task_id);
    }
  };

  const handleApply = () => {
    if (!type) {
      setNote(t('machine.machineSnapshots.pickPolicyType'));
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
      <h5 className="fs-6 fw-bold mb-2">{t('machine.machineSnapshots.retentionPolicyHeading')}</h5>
      {note && <div className="alert alert-info py-1 small">{note}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1" htmlFor="snapshot-policy-type">
            {t('machine.machineSnapshots.policyLabel')}
          </label>
          <select
            id="snapshot-policy-type"
            className="form-select form-select-sm"
            value={type}
            onChange={e => setType(e.target.value)}
            disabled={busy}
          >
            <option value="">{t('machine.machineSnapshots.agentDefaultOption')}</option>
            {POLICY_TYPES.map(entry => (
              <option key={entry.value} value={entry.value}>
                {t(entry.labelKey)}
              </option>
            ))}
          </select>
        </div>
        {type === 'simple' && (
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1" htmlFor="snapshot-policy-keep">
              {t('machine.machineSnapshots.keepLabel')}
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
              {t('machine.machineSnapshots.maxAgeLabel')}
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
                {t('machine.machineSnapshots.tierKeepLabel', { tier })}
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
                {t('machine.machineSnapshots.quiesceLabel')}
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
            {t('machine.machineSnapshots.applyPolicyButton')}
          </button>
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => send(null)}
            disabled={busy}
            title={t('machine.machineSnapshots.clearOverrideTooltip')}
          >
            {t('machine.machineSnapshots.clearOverrideButton')}
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
  hypervisor,
  isRunning,
  user,
  snapshotPolicy,
  takeOpen,
  onTakeClose,
}) => {
  const { t } = useTranslation();
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
  // The snapshot being renamed/re-described (snapshot_modify wire) + its form.
  const [editSnap, setEditSnap] = useState(null);
  const [editForm, setEditForm] = useState({ new_name: '', description: '' });
  // {mode: 'export'|'publish', snapshot} — build a template FROM a snapshot.
  const [templateFrom, setTemplateFrom] = useState(null);
  // The snapshot whose ZFS holds are being managed (needs dataset_names[]).
  const [holdsFor, setHoldsFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [followTask, setFollowTask] = useState(null);

  const canMutate = canCreateMachines(user?.role);
  const templatesAvailable = hasFeature(currentServer, 'templates');
  // utm snapshots: take is stopped-only (running 400s), rename/description
  // does not exist (modify 400s), and the retention-policy override rides
  // the modify subset utm refuses — those controls hide on utm machines.
  const isUtm = hypervisor === 'utm';
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
      setMsg(t('machine.machineSnapshots.loadFailed', { message: result.message }));
    }
    setLoading(false);
  }, [currentServer, machineName, t]);

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
    if (isUtm && isRunning) {
      setMsg(t('machine.machineSnapshots.utmStoppedOnly'));
      return;
    }
    const usePrefix = takeForm.mode === 'prefix';
    if (usePrefix ? !takeForm.prefix.trim() : !takeForm.name.trim()) {
      setMsg(
        usePrefix
          ? t('machine.machineSnapshots.prefixRequired')
          : t('machine.machineSnapshots.nameRequired')
      );
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
      setMsg(t('machine.machineSnapshots.snapshotFailed', { message: result.message }));
    }
  };

  // Restore, wait for the task to land, then power the machine back on — the
  // restore itself requires a stopped machine, so starting is a second step.
  const restoreThenStart = async taskId => {
    if (!taskId) {
      setMsg(t('machine.machineSnapshots.restoreNoTaskId'));
      return;
    }
    const task = await pollTaskRow(
      () =>
        getTask(currentServer.hostname, currentServer.port, currentServer.protocol, taskId).then(
          result => (result.success ? result.data?.task || result.data : null)
        ),
      60
    );
    if (!task) {
      setMsg(t('machine.machineSnapshots.restoreStillRunning'));
      return;
    }
    if (task.status === 'failed') {
      setMsg(
        `${t('machine.machineSnapshots.restoreFailedNotStarting', {
          errorMessage: task.error_message || '',
        })}`.trim()
      );
      return;
    }
    const start = await startMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    setMsg(
      start.success
        ? ''
        : t('machine.machineSnapshots.restoredStartFailed', { message: start.message })
    );
  };

  // Rename and/or edit the description — only CHANGED fields ride (a
  // description edited to blank rides as "" and CLEARS it agent-side).
  const handleEdit = async () => {
    const body = {};
    const newName = editForm.new_name.trim();
    if (newName && newName !== editSnap.name) {
      body.new_name = newName;
    }
    if (editForm.description !== (editSnap.description || '')) {
      body.description = editForm.description;
    }
    if (Object.keys(body).length === 0) {
      setMsg(t('machine.machineSnapshots.editNothingChanged'));
      return;
    }
    setBusy(true);
    const result = await modifyMachineSnapshot(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      editSnap.name,
      body
    );
    setBusy(false);
    if (!result.success) {
      setMsg(t('machine.machineSnapshots.editFailed', { message: result.message }));
      return;
    }
    setEditSnap(null);
    setMsg('');
    await followQueuedTask(result.data?.task_id);
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
      setMsg(
        t('machine.machineSnapshots.confirmActionFailed', {
          action:
            kind === 'delete'
              ? t('machine.machineSnapshots.deleteWord')
              : t('machine.machineSnapshots.restoreWord'),
          message: result.message,
        })
      );
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
          {t('machine.machineSnapshots.snapshotsHeading', { count: snapshots.length })}
        </h4>

        {msg && <div className="alert alert-warning py-2">{msg}</div>}
        {!loading && snapshots.length === 0 && (
          <p className="text-muted mb-0 small">{t('machine.machineSnapshots.noSnapshotsYet')}</p>
        )}

        {canMutate && !isUtm && (
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
                      title={t('machine.machineSnapshots.currentStateTooltip')}
                    >
                      {t('machine.machineSnapshots.currentBadge')}
                    </span>
                  )}
                  {Array.isArray(snapshot.dataset_names) && snapshot.dataset_names.length > 0 ? (
                    <button
                      type="button"
                      className={`badge border-0 ms-2 ${snapshot.holds > 0 ? 'text-bg-secondary' : 'text-bg-light border'}`}
                      title={t('machine.machineSnapshots.holdsManageTooltip')}
                      onClick={() => setHoldsFor(snapshot)}
                      disabled={busy}
                    >
                      <i
                        className={`fas ${snapshot.holds > 0 ? 'fa-lock' : 'fa-lock-open'} me-1`}
                      />
                      {t('machine.machineSnapshots.holdsCount', { count: snapshot.holds || 0 })}
                    </button>
                  ) : (
                    snapshot.holds > 0 && (
                      <span
                        className="badge text-bg-secondary ms-2"
                        title={t('machine.machineSnapshots.holdsPinTooltip')}
                      >
                        {t('machine.machineSnapshots.holdsCount', { count: snapshot.holds })}
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
                      {formatByteSize(snapshot.used_bytes)}
                    </span>
                  )}
                  {snapshot.description && (
                    <div className="small text-muted">{snapshot.description}</div>
                  )}
                </div>
                {canMutate && (
                  <div className="d-flex gap-1 flex-shrink-0">
                    {!isUtm && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title={t('machine.machineSnapshots.renameTooltip')}
                        disabled={busy}
                        onClick={() => {
                          setEditSnap(snapshot);
                          setEditForm({ new_name: '', description: snapshot.description || '' });
                        }}
                      >
                        <i className="fas fa-pen" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      title={
                        isRunning
                          ? t('machine.machineSnapshots.restoreStoppedTooltip')
                          : t('machine.machineSnapshots.restoreTooltip')
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
                          ? t('machine.machineSnapshots.restoreStoppedTooltip')
                          : t('machine.machineSnapshots.restoreStartTooltip')
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
                          title={t('machine.machineSnapshots.buildTemplateTooltip')}
                          disabled={busy}
                          onClick={() => setTemplateFrom({ mode: 'export', snapshot })}
                        >
                          <i className="fas fa-box-archive" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info"
                          title={t('machine.machineSnapshots.publishTooltip')}
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
                      title={t('machine.machineSnapshots.deleteTooltip')}
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
        title={t('machine.machineSnapshots.takeSnapshotTitle', { machineName })}
        icon="fas fa-camera"
        submitText={t('machine.machineSnapshots.takeSnapshotSubmit')}
        loading={busy}
        showCancelButton
      >
        <div className="mb-3">
          <span className="form-label d-block">{t('machine.machineSnapshots.namingLabel')}</span>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn btn-outline-secondary ${takeForm.mode === 'name' ? 'active' : ''}`}
              onClick={() => setTakeForm(prev => ({ ...prev, mode: 'name' }))}
            >
              {t('machine.machineSnapshots.namedOption')}
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${takeForm.mode === 'prefix' ? 'active' : ''}`}
              onClick={() => setTakeForm(prev => ({ ...prev, mode: 'prefix' }))}
            >
              {t('machine.machineSnapshots.prefixOption')}
            </button>
          </div>
        </div>
        {takeForm.mode === 'prefix' ? (
          <>
            <div className="mb-3">
              <label className="form-label" htmlFor="snapshot-prefix">
                {t('machine.machineSnapshots.prefixLabel')}
              </label>
              <input
                id="snapshot-prefix"
                className="form-control"
                placeholder={t('machine.machineSnapshots.prefixPlaceholder')}
                value={takeForm.prefix}
                onChange={e => setTakeForm({ ...takeForm, prefix: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="snapshot-retention">
                {t('machine.machineSnapshots.retentionLabel')}
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
              {t('machine.machineSnapshots.nameLabel')}
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
            {t('machine.machineSnapshots.descriptionLabel')}
          </label>
          <input
            id="snapshot-description"
            className="form-control"
            value={takeForm.description}
            onChange={e => setTakeForm({ ...takeForm, description: e.target.value })}
          />
        </div>
        {isUtm && isRunning && (
          <div className="alert alert-warning py-2 mb-3">
            {t('machine.machineSnapshots.utmStoppedOnly')}
          </div>
        )}
        {!isUtm && (
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="snapshot-quiesce"
              checked={takeForm.quiesce}
              onChange={e => setTakeForm({ ...takeForm, quiesce: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="snapshot-quiesce">
              {t('machine.machineSnapshots.quiesceOptionLabel')}
            </label>
          </div>
        )}
        {isRunning && !isUtm && (
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="snapshot-live"
              checked={takeForm.live}
              onChange={e => setTakeForm({ ...takeForm, live: e.target.checked })}
            />
            <label className="form-check-label" htmlFor="snapshot-live">
              {t('machine.machineSnapshots.liveSnapshotLabel')}
            </label>
          </div>
        )}
      </FormModal>

      {editSnap && (
        <FormModal
          isOpen
          onClose={() => setEditSnap(null)}
          onSubmit={handleEdit}
          title={t('machine.machineSnapshots.editSnapshotTitle', { snapshotName: editSnap.name })}
          icon="fas fa-pen"
          submitText={t('machine.machineSnapshots.saveSubmit')}
          loading={busy}
          showCancelButton
        >
          <div className="mb-3">
            <label className="form-label" htmlFor="snapshot-edit-name">
              {t('machine.machineSnapshots.newNamePrefix')} <code>{editSnap.name}</code>
              {t('machine.machineSnapshots.newNameSuffix')}
            </label>
            <input
              id="snapshot-edit-name"
              className="form-control"
              value={editForm.new_name}
              onChange={e => setEditForm(prev => ({ ...prev, new_name: e.target.value }))}
            />
            <p className="form-text text-muted mb-0">
              {t('machine.machineSnapshots.renameCollisionNote')}
            </p>
          </div>
          <div className="mb-0">
            <label className="form-label" htmlFor="snapshot-edit-description">
              {t('machine.machineSnapshots.clearDescriptionLabel')}
            </label>
            <input
              id="snapshot-edit-description"
              className="form-control"
              value={editForm.description}
              onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </FormModal>
      )}

      {confirm && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
          title={t(CONFIRM_TITLE_KEYS[confirm.kind])}
          message={confirmMessage(confirm, machineName, t)}
          confirmText={t(CONFIRM_ACTION_KEYS[confirm.kind])}
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
  hypervisor: PropTypes.string,
  isRunning: PropTypes.bool,
  user: PropTypes.object,
  snapshotPolicy: PropTypes.object,
  takeOpen: PropTypes.bool,
  onTakeClose: PropTypes.func.isRequired,
};

export default MachineSnapshots;
