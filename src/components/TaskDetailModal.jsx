import PropTypes from 'prop-types';
import { useState, useEffect, useRef, useCallback } from 'react';

import { getAgentBasePath, fetchWsTicket } from '../api/serverUtils';
import { useServers } from '../contexts/ServerContext';
import { buildWsUrl } from '../utils/websocket';

import ContentModal from './common/ContentModal';

const formatDate = dateStr => {
  if (!dateStr) {
    return '-';
  }
  return new Date(dateStr).toLocaleString();
};

const renderPriorityBadge = priority => {
  if (priority >= 100) {
    return <span className="badge text-bg-danger">CRITICAL</span>;
  }
  if (priority >= 80) {
    return <span className="badge text-bg-warning">HIGH</span>;
  }
  if (priority >= 60) {
    return <span className="badge text-bg-info">MEDIUM</span>;
  }
  if (priority >= 50) {
    return <span className="badge text-bg-primary">SERVICE</span>;
  }
  if (priority >= 40) {
    return <span className="badge text-bg-light">LOW</span>;
  }
  return <span className="badge text-bg-light">BACKGROUND</span>;
};

const renderStatusBadge = status => {
  const classMap = {
    completed: 'text-bg-success',
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
    <td>{task.operation}</td>
    <td>{task.zone_name}</td>
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

const TaskDetailModal = ({ task, onClose }) => {
  const { currentServer, makeAgentRequest } = useServers();
  const [output, setOutput] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [childTask, setChildTask] = useState(null);
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch subtasks if this is a parent task
  useEffect(() => {
    if (!task.parent_task_id && currentServer && makeAgentRequest) {
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'tasks',
        'GET',
        null,
        { parent_task_id: task.id, limit: 100 }
      ).then(result => {
        if (result.success && result.data?.tasks) {
          setSubtasks(result.data.tasks);
        }
      });
    }
  }, [task.id, task.parent_task_id, currentServer, makeAgentRequest]);

  // Connect to WebSocket for task output
  useEffect(() => {
    let cancelled = false;

    if (currentServer) {
      const basePath = getAgentBasePath(currentServer);
      if (basePath !== null) {
        // Phase H: fetch a fresh WS ticket, then open the mode-aware task-output stream.
        fetchWsTicket(currentServer).then(ticket => {
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
  }, [task.id, currentServer]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubtaskSelect = useCallback(subtask => {
    setChildTask(subtask);
  }, []);

  const parseMetadata = metadata => {
    if (!metadata) {
      return null;
    }
    try {
      return JSON.parse(metadata);
    } catch {
      return metadata;
    }
  };

  const parsedMetadata = parseMetadata(task.metadata);

  return (
    <>
      <ContentModal isOpen onClose={onClose} title={`Task: ${task.operation}`} icon="fas fa-tasks">
        {/* Task Info */}
        <div className="card">
          <div className="card-body">
            <h6 className="fs-6 fw-bold">Details</h6>
            <InfoRow label="ID">{task.id}</InfoRow>
            <InfoRow label="Operation">{task.operation}</InfoRow>
            <InfoRow label="Target">{task.zone_name}</InfoRow>
            <InfoRow label="Status">{renderStatusBadge(task.status)}</InfoRow>
            <InfoRow label="Priority">{renderPriorityBadge(task.priority)}</InfoRow>
            <InfoRow label="Created By">{task.created_by || '-'}</InfoRow>
            <InfoRow label="Created">{formatDate(task.created_at)}</InfoRow>
            <InfoRow label="Started">{formatDate(task.started_at)}</InfoRow>
            <InfoRow label="Completed">{formatDate(task.completed_at)}</InfoRow>
            {task.error_message && (
              <InfoRow label="Error">
                <span className="text-danger">{task.error_message}</span>
              </InfoRow>
            )}
            {task.depends_on && <InfoRow label="Depends On">{task.depends_on}</InfoRow>}
            {task.parent_task_id && <InfoRow label="Parent Task">{task.parent_task_id}</InfoRow>}
          </div>
        </div>

        {/* Progress */}
        {task.progress_percent > 0 && (
          <div className="card">
            <div className="card-body">
              <h6 className="fs-6 fw-bold">Progress</h6>
              <div
                className="progress"
                role="progressbar"
                aria-valuenow={task.progress_percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-bar bg-primary"
                  style={{ width: `${task.progress_percent}%` }}
                />
              </div>
              <p className="text-center">{task.progress_percent}%</p>
              {task.progress_info && (
                <pre className="small mt-2">{JSON.stringify(task.progress_info, null, 2)}</pre>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        {parsedMetadata && (
          <div className="card">
            <div className="card-body">
              <h6 className="fs-6 fw-bold">Metadata</h6>
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
            <h6 className="fs-6 fw-bold">
              Output
              {task.status === 'running' && (
                <span className="ms-2">
                  <i className="fas fa-spinner fa-spin small" />
                </span>
              )}
            </h6>
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
              {output.length === 0 && <span className="text-muted">No output available</span>}
              {output.map(entry => (
                <div
                  key={entry._ui_id}
                  className={entry.stream === 'stderr' ? 'text-danger' : 'text-white'}
                >
                  {entry.data}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h6 className="fs-6 fw-bold">Subtasks ({subtasks.length})</h6>
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Progress</th>
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
