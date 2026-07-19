import PropTypes from 'prop-types';
import { useRef, useEffect, useContext, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFooter } from '../contexts/FooterContext';
import { UserSettings } from '../contexts/UserSettingsContext';
import { taskOperationLabel, transferProgressLine } from '../utils/taskOperations';

import TaskDetailModal from './TaskDetailModal';

const renderPriority = (task, t) => {
  const p = task.priority;
  if (p >= 100) {
    return <span className="text-danger">{t('tasks.tasks.priorityCritical')}</span>;
  }
  if (p >= 80) {
    return <span className="text-warning">{t('tasks.tasks.priorityHigh')}</span>;
  }
  if (p >= 60) {
    return <span>{t('tasks.tasks.priorityMedium')}</span>;
  }
  if (p >= 50) {
    return <span>{t('tasks.tasks.priorityService')}</span>;
  }
  if (p >= 40) {
    return <span className="text-muted">{t('tasks.tasks.priorityLow')}</span>;
  }
  return <span className="text-muted">{t('tasks.tasks.priorityBg')}</span>;
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

export const getTaskColumns = t => [
  { key: 'id', label: t('tasks.tasks.columnId'), render: task => task.id },
  {
    key: 'operation',
    label: t('tasks.tasks.columnOperation'),
    render: task => taskOperationLabel(task.operation),
  },
  { key: 'machine_name', label: t('tasks.tasks.columnTarget'), render: task => task.machine_name },
  { key: 'status', label: t('tasks.tasks.columnStatus'), render: renderStatus },
  { key: 'progress', label: t('tasks.tasks.columnProgress'), render: renderProgress },
  {
    key: 'priority',
    label: t('tasks.tasks.columnPriority'),
    render: task => renderPriority(task, t),
  },
  {
    key: 'created_by',
    label: t('tasks.tasks.columnCreatedBy'),
    render: task => task.created_by || '-',
  },
  {
    key: 'created_at',
    label: t('tasks.tasks.columnCreated'),
    render: task => formatDate(task.created_at),
  },
  {
    key: 'started_at',
    label: t('tasks.tasks.columnStarted'),
    render: task => formatDate(task.started_at),
  },
  {
    key: 'completed_at',
    label: t('tasks.tasks.columnCompleted'),
    render: task => formatDate(task.completed_at),
  },
  {
    key: 'error_message',
    label: t('tasks.tasks.columnError'),
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
  const { t } = useTranslation();
  const { tasks, loadingTasks, tasksError } = useFooter();
  const { tasksScrollPosition, setTasksScrollPosition, taskVisibleColumns } =
    useContext(UserSettings);
  const tableContainerRef = useRef(null);
  const [previousTasksLength, setPreviousTasksLength] = useState(0);
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const allColumns = getTaskColumns(t);
  const visibleColumns = allColumns.filter(col => taskVisibleColumns.includes(col.key));

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
        {loadingTasks && <p>{t('tasks.tasks.loading')}</p>}
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
