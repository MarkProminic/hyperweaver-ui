import PropTypes from 'prop-types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { cancelTask } from '../api/machineAPI';
import { getAgentBasePath, fetchWsTicket } from '../api/serverUtils';
import { useServers } from '../contexts/ServerContext';
import { copyText } from '../utils/clipboard';
import {
  taskOperationLabel,
  taskProgressInfo,
  transferProgressLine,
} from '../utils/taskOperations';
import { buildWsUrl } from '../utils/websocket';

import { ConfirmModal } from './common';
import ContentModal from './common/ContentModal';

const formatDate = dateStr => {
  if (!dateStr) {
    return '-';
  }
  return new Date(dateStr).toLocaleString();
};

// Terminal-color rendering for task output: ansible (and anything else that
// writes SGR escape codes) comes through the stream verbatim, so the codes
// are parsed into colored spans instead of showing as `[0;32m` garbage.
// Palette is tuned for the dark output panel (ansible: green ok, yellow
// changed, cyan included, red failed, purple warnings).
const ANSI_COLORS = {
  30: '#8888aa',
  31: '#ff6b6b',
  32: '#69db7c',
  33: '#ffd43b',
  34: '#74c0fc',
  35: '#da77f2',
  36: '#66d9e8',
  37: '#f8f9fa',
  90: '#8888aa',
  91: '#ff8787',
  92: '#8ce99a',
  93: '#ffe066',
  94: '#a5d8ff',
  95: '#e599f7',
  96: '#99e9f2',
  97: '#ffffff',
};

// The ESC and BEL control characters, built by char code so no invisible
// byte lives in this file (and no-control-regex stays quiet). ESC must
// prefix every pattern — without it they would eat legitimate bracketed
// text like `ok: [localhost]`.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

// Non-color escape sequences (cursor movement, erase-line, OSC titles) carry
// nothing renderable — stripped before parsing.
const NON_SGR_ESCAPES = new RegExp(
  `${ESC}(?:\\[(?![0-9;]*m)[0-9;?]*[A-Za-z]|\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)?)`,
  'g'
);

// The captured group makes split() alternate text and SGR code parameters.
const SGR_SPLIT = new RegExp(`${ESC}\\[([0-9;]*)m`);

const ALL_SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');

// Plain-text form of an output entry — what the Copy button puts on the
// clipboard (colors are presentation; pasting wants clean console text).
const stripAnsi = data =>
  String(data ?? '')
    .replace(NON_SGR_ESCAPES, '')
    .replace(ALL_SGR, '');

const renderAnsi = data => {
  const cleaned = String(data ?? '').replace(NON_SGR_ESCAPES, '');
  const parts = cleaned.split(SGR_SPLIT);
  const spans = [];
  let color = null;
  let bold = false;
  parts.forEach((part, position) => {
    if (position % 2 === 1) {
      (part === '' ? ['0'] : part.split(';')).forEach(code => {
        const sgr = Number(code);
        if (sgr === 0) {
          color = null;
          bold = false;
        } else if (sgr === 1) {
          bold = true;
        } else if (sgr === 22) {
          bold = false;
        } else if (sgr === 39) {
          color = null;
        } else if (ANSI_COLORS[sgr]) {
          color = ANSI_COLORS[sgr];
        }
      });
      return;
    }
    if (part !== '') {
      spans.push(
        <span
          key={spans.length}
          style={{
            color: color || undefined,
            fontWeight: bold ? 'bold' : undefined,
          }}
        >
          {part}
        </span>
      );
    }
  });
  // Empty entries still occupy a line — blank lines separate the plays.
  return spans.length > 0 ? spans : ' ';
};

const renderPriorityBadge = (priority, t) => {
  if (priority >= 100) {
    return (
      <span className="badge text-bg-danger">{t('tasks.taskDetailModal.priorityCritical')}</span>
    );
  }
  if (priority >= 80) {
    return <span className="badge text-bg-warning">{t('tasks.taskDetailModal.priorityHigh')}</span>;
  }
  if (priority >= 60) {
    return <span className="badge text-bg-info">{t('tasks.taskDetailModal.priorityMedium')}</span>;
  }
  if (priority >= 50) {
    return (
      <span className="badge text-bg-primary">{t('tasks.taskDetailModal.priorityService')}</span>
    );
  }
  if (priority >= 40) {
    return <span className="badge text-bg-light">{t('tasks.taskDetailModal.priorityLow')}</span>;
  }
  return (
    <span className="badge text-bg-light">{t('tasks.taskDetailModal.priorityBackground')}</span>
  );
};

const renderStatusBadge = status => {
  const classMap = {
    completed: 'text-bg-success',
    completed_with_errors: 'text-bg-warning',
    failed: 'text-bg-danger',
    running: 'text-bg-warning',
    pending: 'text-bg-light',
    cancelled: 'text-bg-dark',
  };
  return <span className={`badge ${classMap[status] || 'text-bg-light'}`}>{status}</span>;
};

const InfoRow = ({ label, children }) => (
  <div className="row mb-1">
    <div className="col-4 text-muted">{label}</div>
    <div className="col">{children}</div>
  </div>
);

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const SubtaskRow = ({ task, onSelect }) => (
  <tr onClick={() => onSelect(task)} style={{ cursor: 'pointer' }}>
    <td>{taskOperationLabel(task.operation)}</td>
    <td>{task.machine_name}</td>
    <td>{renderStatusBadge(task.status)}</td>
    <td>
      {task.progress_percent !== null && task.progress_percent !== undefined
        ? `${task.progress_percent}%`
        : '-'}
    </td>
  </tr>
);

SubtaskRow.propTypes = {
  task: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// Statuses that keep the modal polling — a task opened while PENDING must
// keep refreshing through running to its terminal state (Mark's snapshot
// modal froze because only 'running' polled).
const ACTIVE_STATUSES = ['pending', 'running'];

const TaskDetailModal = ({ task, onClose }) => {
  const { t } = useTranslation();
  const { currentServer, makeAgentRequest } = useServers();
  const [output, setOutput] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [childTask, setChildTask] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  // Live row refresh while active — status/progress/error move; the prop
  // row is a snapshot from whenever the modal was opened.
  const [liveRow, setLiveRow] = useState(null);
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  // Everything below renders the LIVE row once a refresh answered.
  const row = liveRow || task;

  const handleCopyOutput = useCallback(async () => {
    const text = output.map(entry => stripAnsi(entry.data)).join('\n');
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  // REST output backfill + poll (sync-file bug, 2026-07-05). The WS stream below only
  // delivers entries emitted AFTER it connects — completed tasks showed nothing — and
  // the Go agent serves no WS surfaces at all until its Phase E. GET tasks/{id}/output
  // returns the full buffer (live in-memory while running, persisted after), shape
  // {task_id, status, output: [{stream, data, timestamp}]}. Each fetch REPLACES the
  // list, so interleaved WS appends never accumulate duplicates.
  const fetchOutput = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `tasks/${task.id}/output`
    );
    if (result.success && Array.isArray(result.data?.output)) {
      setOutput(result.data.output.map((entry, index) => ({ ...entry, _ui_id: `rest-${index}` })));
    }
  }, [currentServer, makeAgentRequest, task.id]);

  const fetchLiveRow = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `tasks/${task.id}`
    );
    if (result.success && result.data) {
      setLiveRow(result.data.task || result.data);
    }
  }, [currentServer, makeAgentRequest, task.id]);

  // Subtasks of a parent task — refreshed by the same poll below so child
  // statuses move while the parent runs.
  const fetchSubtasks = useCallback(async () => {
    if (task.parent_task_id || !currentServer) {
      return;
    }
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'tasks',
      'GET',
      null,
      { parent_task_id: task.id, limit: 100 }
    );
    if (result.success && result.data?.tasks) {
      setSubtasks(result.data.tasks);
    }
  }, [task.id, task.parent_task_id, currentServer, makeAgentRequest]);

  // Poll while the LIVE status is pending/running; each transition re-arms
  // (or stops) the interval, and the terminal transition still lands one
  // final output/row fetch via the leading calls.
  useEffect(() => {
    fetchOutput();
    fetchSubtasks();
    if (!ACTIVE_STATUSES.includes(row.status)) {
      return undefined;
    }
    fetchLiveRow();
    const interval = setInterval(() => {
      fetchOutput();
      fetchLiveRow();
      fetchSubtasks();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchOutput, fetchLiveRow, fetchSubtasks, row.status]);

  // Connect to WebSocket for task output
  useEffect(() => {
    let cancelled = false;

    if (currentServer) {
      const basePath = getAgentBasePath(currentServer);
      if (basePath !== null) {
        // Phase H: fetch a fresh WS ticket, then open the mode-aware task-output stream.
        // Machine tasks mint a machine-scoped ticket; system/artifact tasks are
        // host-level and mint unscoped (the agents' scoping contract).
        const taskMachine =
          task.machine_name && !['system', 'artifact'].includes(task.machine_name)
            ? task.machine_name
            : null;
        fetchWsTicket(currentServer, taskMachine).then(ticket => {
          if (cancelled) {
            return;
          }
          const ws = new WebSocket(buildWsUrl(`${basePath}/tasks/${task.id}/stream`, ticket));
          wsRef.current = ws;

          ws.onmessage = event => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
              msg._ui_id = Date.now() + Math.random();
              setOutput(prev => [...prev, msg]);
            }
          };

          ws.onerror = err => {
            console.error('Task stream WebSocket error:', err);
          };
        });
      }
    }

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [task.id, task.machine_name, currentServer]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubtaskSelect = useCallback(subtask => {
    setChildTask(subtask);
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    const result = await cancelTask(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      row.id
    );
    setCancelling(false);
    setConfirmCancel(false);
    if (result.success) {
      fetchLiveRow();
      fetchOutput();
      fetchSubtasks();
    } else {
      setCancelError(`Cancel failed: ${result.message}`);
    }
  };

  const parseMetadata = metadata => {
    if (!metadata) {
      return null;
    }
    if (typeof metadata === 'object') {
      return metadata;
    }
    try {
      return JSON.parse(metadata);
    } catch {
      return metadata;
    }
  };

  const parsedMetadata = parseMetadata(row.metadata);

  return (
    <>
      <ContentModal
        isOpen
        onClose={onClose}
        title={`${t('tasks.taskDetailModal.taskTitle')}: ${taskOperationLabel(row.operation)}`}
        icon="fas fa-tasks"
      >
        {ACTIVE_STATUSES.includes(row.status) && (
          <div className="d-flex justify-content-end mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
            >
              <i className={`fas ${cancelling ? 'fa-spinner fa-pulse' : 'fa-ban'} me-2`} />
              <span>
                {cancelling
                  ? t('tasks.taskDetailModal.cancelling')
                  : t('tasks.taskDetailModal.cancelTask')}
              </span>
            </button>
          </div>
        )}
        {cancelError && <div className="alert alert-warning py-2">{cancelError}</div>}

        {/* Task Info */}
        <div className="card">
          <div className="card-body">
            <h6 className="fs-6 fw-bold">{t('tasks.taskDetailModal.details')}</h6>
            <InfoRow label={t('tasks.taskDetailModal.labelId')}>{row.id}</InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelOperation')}>
              {taskOperationLabel(row.operation)}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelTarget')}>{row.machine_name}</InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelStatus')}>
              {renderStatusBadge(row.status)}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelPriority')}>
              {renderPriorityBadge(row.priority, t)}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelCreatedBy')}>
              {row.created_by || '-'}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelCreated')}>
              {formatDate(row.created_at)}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelStarted')}>
              {formatDate(row.started_at)}
            </InfoRow>
            <InfoRow label={t('tasks.taskDetailModal.labelCompleted')}>
              {formatDate(row.completed_at)}
            </InfoRow>
            {row.error_message && (
              <InfoRow label={t('tasks.taskDetailModal.labelError')}>
                <span className="text-danger">{row.error_message}</span>
              </InfoRow>
            )}
            {row.depends_on && (
              <InfoRow label={t('tasks.taskDetailModal.labelDependsOn')}>{row.depends_on}</InfoRow>
            )}
            {row.parent_task_id && (
              <InfoRow label={t('tasks.taskDetailModal.labelParentTask')}>
                {row.parent_task_id}
              </InfoRow>
            )}
          </div>
        </div>

        {/* Progress — machine_provision tasks carry the guest's LIVE ansible
            progress (catalog §10b): progress_info.message is the current
            step, ansible_percent the guest's own 0-100. Playbooks without
            the progress role only have the coarse {status} — never assume
            ansible_percent exists. */}
        {(() => {
          const progressPercent = row.progress_percent;
          const progressInfo = taskProgressInfo(row);
          // Registry transfers (converged progress_info wire) — live byte
          // counts + client-derived speed.
          const transfer = transferProgressLine(row);
          if (!progressPercent || progressPercent <= 0) {
            return null;
          }
          return (
            <div className="card">
              <div className="card-body">
                <h6 className="fs-6 fw-bold">{t('tasks.taskDetailModal.progress')}</h6>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar bg-primary"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-center mb-1">{progressPercent}%</p>
                {transfer && (
                  <p className="text-center small mb-1">
                    <i
                      className={`fas ${progressInfo?.status === 'uploading' ? 'fa-upload' : 'fa-download'} me-2`}
                    />
                    {transfer}
                  </p>
                )}
                {progressInfo?.message && (
                  <p className="text-center small mb-1">
                    <i className="fas fa-list-check me-2" />
                    {progressInfo.message}
                    {progressInfo.ansible_percent !== undefined &&
                      progressInfo.ansible_percent !== null && (
                        <span className="text-muted">
                          {' '}
                          — {progressInfo.ansible_percent}% {t('tasks.taskDetailModal.inGuest')}
                        </span>
                      )}
                  </p>
                )}
                {progressInfo && !progressInfo.message && !transfer && (
                  <pre className="small mt-2">{JSON.stringify(progressInfo, null, 2)}</pre>
                )}
              </div>
            </div>
          );
        })()}

        {/* Metadata */}
        {parsedMetadata && (
          <div className="card">
            <div className="card-body">
              <h6 className="fs-6 fw-bold">{t('tasks.taskDetailModal.metadata')}</h6>
              <pre className="small" style={{ maxHeight: '200px', overflow: 'auto' }}>
                {typeof parsedMetadata === 'string'
                  ? parsedMetadata
                  : JSON.stringify(parsedMetadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Task Output */}
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center mb-2">
              <h6 className="fs-6 fw-bold mb-0">
                {t('tasks.taskDetailModal.output')}
                {ACTIVE_STATUSES.includes(row.status) && (
                  <span className="ms-2">
                    <i className="fas fa-spinner fa-spin small" />
                  </span>
                )}
              </h6>
              {output.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary ms-auto"
                  onClick={handleCopyOutput}
                  title={t('tasks.taskDetailModal.copyOutput')}
                >
                  <i className={copied ? 'fas fa-check' : 'fas fa-copy'} />{' '}
                  {copied ? t('tasks.taskDetailModal.copied') : t('tasks.taskDetailModal.copy')}
                </button>
              )}
            </div>
            <div
              ref={outputRef}
              style={{
                maxHeight: '300px',
                overflow: 'auto',
                backgroundColor: '#1a1a2e',
                borderRadius: '4px',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              {output.length === 0 && (
                <span className="text-muted">{t('tasks.taskDetailModal.noOutput')}</span>
              )}
              {output.map(entry => (
                <div
                  key={entry._ui_id}
                  className={entry.stream === 'stderr' ? 'text-danger' : 'text-white'}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {renderAnsi(entry.data)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h6 className="fs-6 fw-bold">
                {t('tasks.taskDetailModal.subtasks', { count: subtasks.length })}
              </h6>
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>{t('tasks.taskDetailModal.columnOperation')}</th>
                    <th>{t('tasks.taskDetailModal.columnTarget')}</th>
                    <th>{t('tasks.taskDetailModal.columnStatus')}</th>
                    <th>{t('tasks.taskDetailModal.columnProgress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {subtasks.map(st => (
                    <SubtaskRow key={st.id} task={st} onSelect={handleSubtaskSelect} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ContentModal>

      {confirmCancel && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirmCancel(false)}
          onConfirm={handleCancel}
          title={t('tasks.taskDetailModal.confirmCancelTitle')}
          message={
            subtasks.length > 0
              ? t('tasks.taskDetailModal.confirmCancelWithSubtasks', {
                  status: row.status,
                  count: subtasks.length,
                })
              : t('tasks.taskDetailModal.confirmCancel', { status: row.status })
          }
          confirmText={t('tasks.taskDetailModal.cancelTask')}
          loading={cancelling}
        />
      )}

      {/* Child task detail modal (recursive) */}
      {childTask && <TaskDetailModal task={childTask} onClose={() => setChildTask(null)} />}
    </>
  );
};

TaskDetailModal.propTypes = {
  task: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TaskDetailModal;
