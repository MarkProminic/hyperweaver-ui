import PropTypes from 'prop-types';
import { useRef, useEffect, useContext, memo, useState } from 'react';

import { useFooter } from '../contexts/FooterContext';
import { UserSettings } from '../contexts/UserSettingsContext';
import { taskOperationLabel, transferProgressLine } from '../utils/taskOperations';

import TaskDetailModal from './TaskDetailModal';

const renderPriority = task => {
  const p = task.priority;
  if (p >= 100) {
    return <span className="text-danger">CRITICAL</span>;
  }
  if (p >= 80) {
    return <span className="text-warning">HIGH</span>;
  }
  if (p >= 60) {
    return <span>MEDIUM</span>;
  }
  if (p >= 50) {
    return <span>SERVICE</span>;
  }
  if (p >= 40) {
    return <span className="text-muted">LOW</span>;
  }
  return <span className="text-muted">BG</span>;
};

const renderStatus = task => {
  if (task.status === 'running') {
    return (
      <span>
        <i className="fas fa-spinner fa-spin me-1" />
        {task.status}
      </span>
    );
  }
  return task.status;
};

const renderProgress = task => {
  const { status, progress_percent } = task;

  if (['completed', 'prepared', 'pending'].includes(status)) {
    return '-';
  }

  if (status === 'running') {
    // Registry transfers carry live byte counts (converged progress_info
    // wire) — rendered under the bar; speed derives from the deltas.
    const transfer = transferProgressLine(task);
    if (progress_percent !== null && progress_percent !== undefined) {
      return (
        <div>
          <div className="d-flex align-items-center gap-2 mb-0">
            <div
              className="progress flex-grow-1"
              style={{ height: '0.5rem' }}
              role="progressbar"
              aria-valuenow={progress_percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-bar bg-primary" style={{ width: `${progress_percent}%` }} />
            </div>
            <span className="small">{progress_percent}%</span>
          </div>
          {transfer && <span className="small text-muted">{transfer}</span>}
        </div>
      );
    }
    return transfer || 'running';
  }

  if (progress_percent !== null && progress_percent !== undefined) {
    return `${progress_percent}%`;
  }

  return '-';
};

const formatDate = dateStr => {
  if (!dateStr) {
    return '-';
  }
  return new Date(dateStr).toLocaleString();
};

const truncate = (str, max = 40) => {
  if (!str) {
    return '-';
  }
  return str.length > max ? `${str.substring(0, max)}...` : str;
};

export const TASK_COLUMNS = [
  { key: 'id', label: 'ID', render: task => task.id },
  { key: 'operation', label: 'Operation', render: task => taskOperationLabel(task.operation) },
  { key: 'machine_name', label: 'Target', render: task => task.machine_name },
  { key: 'status', label: 'Status', render: renderStatus },
  { key: 'progress', label: 'Progress', render: renderProgress },
  { key: 'priority', label: 'Priority', render: renderPriority },
  {
    key: 'created_by',
    label: 'Created By',
    render: task => task.created_by || '-',
  },
  {
    key: 'created_at',
    label: 'Created',
    render: task => formatDate(task.created_at),
  },
  {
    key: 'started_at',
    label: 'Started',
    render: task => formatDate(task.started_at),
  },
  {
    key: 'completed_at',
    label: 'Completed',
    render: task => formatDate(task.completed_at),
  },
  {
    key: 'error_message',
    label: 'Error',
    render: task => truncate(task.error_message),
  },
];

const getStatusClass = status => {
  switch (status) {
    case 'failed':
    case 'completed_with_errors':
      return 'task-failed';
    case 'running':
      return 'task-running';
    default:
      return '';
  }
};

const TaskRow = memo(({ task, visibleColumns, onSelect }) => (
  <tr
    className={getStatusClass(task.status)}
    onClick={() => onSelect(task)}
    style={{ cursor: 'pointer' }}
  >
    {visibleColumns.map(col => (
      <td key={col.key}>{col.render(task)}</td>
    ))}
  </tr>
));

TaskRow.displayName = 'TaskRow';

TaskRow.propTypes = {
  task: PropTypes.shape({
    status: PropTypes.string,
  }).isRequired,
  visibleColumns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
    })
  ).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const Tasks = () => {
  const { tasks, loadingTasks, tasksError } = useFooter();
  const { tasksScrollPosition, setTasksScrollPosition, taskVisibleColumns } =
    useContext(UserSettings);
  const tableContainerRef = useRef(null);
  const [previousTasksLength, setPreviousTasksLength] = useState(0);
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const visibleColumns = TASK_COLUMNS.filter(col => taskVisibleColumns.includes(col.key));

  // Only restore scroll position on initial load or server change
  useEffect(() => {
    if (tableContainerRef.current && !isScrollRestored && tasks.length > 0) {
      tableContainerRef.current.scrollTop = tasksScrollPosition;
      setIsScrollRestored(true);
    }
  }, [tasks.length, tasksScrollPosition, isScrollRestored]);

  // Adjust scroll position when new tasks are added to maintain user's view
  useEffect(() => {
    if (tableContainerRef.current && isScrollRestored && tasks.length > previousTasksLength) {
      const newTasksCount = tasks.length - previousTasksLength;
      const rowHeight = 40;
      const addedHeight = newTasksCount * rowHeight;

      if (tableContainerRef.current.scrollTop > 0) {
        tableContainerRef.current.scrollTop += addedHeight;
      }
    }
    setPreviousTasksLength(tasks.length);
  }, [tasks.length, previousTasksLength, isScrollRestored]);

  // Reset scroll restoration flag when tasks are cleared (server change)
  useEffect(() => {
    if (tasks.length === 0) {
      setIsScrollRestored(false);
      setPreviousTasksLength(0);
    }
  }, [tasks.length]);

  const handleScroll = () => {
    if (tableContainerRef.current && isScrollRestored) {
      setTasksScrollPosition(tableContainerRef.current.scrollTop);
    }
  };

  return (
    <>
      <div onScroll={handleScroll} ref={tableContainerRef} className="has-overflow-y-scroll">
        {loadingTasks && <p>Loading tasks...</p>}
        {tasksError && <p className="text-danger">{tasksError}</p>}
        {!loadingTasks && !tasksError && (
          <table className="table table-striped">
            <thead>
              <tr>
                {visibleColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  visibleColumns={visibleColumns}
                  onSelect={setSelectedTask}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
};

export default memo(Tasks);
