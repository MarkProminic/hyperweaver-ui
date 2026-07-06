import PropTypes from 'prop-types';
import { useState, useContext, useEffect, useRef, useCallback, forwardRef } from 'react';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import { ResizableBox } from 'react-resizable';

import { useFooter } from '../contexts/FooterContext';
import { useServers } from '../contexts/ServerContext';
import { UserSettings } from '../contexts/UserSettingsContext';
import { hasFeature } from '../utils/capabilities';

import HostShell from './Host/HostShell';
import Tasks, { TASK_COLUMNS } from './Tasks';

const PRIORITY_OPTIONS = [
  { label: 'All', value: 20 },
  { label: 'Low+', value: 40 },
  { label: 'Medium+', value: 60 },
  { label: 'High+', value: 80 },
  { label: 'Critical', value: 100 },
];

// Custom dropdown toggle for the footer toolbar: a small icon button with no Bootstrap
// caret. react-bootstrap injects onClick/ref/aria-* AND a `dropdown-toggle` className (whose
// ::after draws the caret); we spread its props first, then override className with our own so
// the `dropdown-toggle` class — and therefore the caret — is dropped.
const FooterToggle = forwardRef(({ active, title, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    {...props}
    className={`btn btn-sm border-0 ${active ? 'btn-info' : 'bg-body-secondary text-body'}`}
    title={title}
  >
    {children}
  </button>
));

FooterToggle.displayName = 'FooterToggle';

FooterToggle.propTypes = {
  active: PropTypes.bool,
  title: PropTypes.string,
  children: PropTypes.node,
};

const Footer = () => {
  const userSettings = useContext(UserSettings);
  const {
    footerIsActive,
    setFooterIsActive,
    footerActiveView,
    setFooterActiveView,
    taskMinPriority,
    setTaskMinPriority,
    taskVisibleColumns,
    setTaskVisibleColumns,
  } = userSettings;
  const { restartShell } = useFooter();
  const { currentServer } = useServers();
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [versionClickCount, setVersionClickCount] = useState(0);
  const resizeTimeoutRef = useRef(null);

  // Both footer panes are capability-gated on v1 feature tokens (the Node agent already
  // advertises these; the Go agent adds them as its surfaces ship). The saved view is
  // honored when its surface exists, otherwise we fall to whichever one is available.
  const shellAvailable = hasFeature(currentServer, 'host-terminal');
  const tasksAvailable = hasFeature(currentServer, 'tasks');
  const anyPane = shellAvailable || tasksAvailable;
  let effectiveView = footerActiveView;
  if (effectiveView === 'tasks' && !tasksAvailable) {
    effectiveView = 'shell';
  }
  if (effectiveView === 'shell' && !shellAvailable) {
    effectiveView = 'tasks';
  }

  const handleToggle = () => {
    if (!footerIsActive) {
      userSettings.setFooterHeight(130);
    }
    setFooterIsActive(!footerIsActive);
  };

  const triggerDestroyThis = () => {
    window.KICKASSVERSION = '2.0';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//hi.kickassapp.com/kickass.js';
    document.body.appendChild(script);
  };

  const handleVersionClick = () => {
    const newCount = versionClickCount + 1;
    setVersionClickCount(newCount);

    if (newCount === 3) {
      triggerDestroyThis();
      setVersionClickCount(0);
    }
  };

  const handleViewChange = view => {
    setFooterActiveView(view);
  };

  // Shell button is dual-purpose: when the footer is closed or showing another view it
  // switches to the shell; when the shell is already showing it toggles the restart menu.
  // react-bootstrap drives this through the controlled dropdown's onToggle.
  const handleShellToggle = nextShow => {
    if (!footerIsActive) {
      userSettings.setFooterHeight(130);
      setFooterIsActive(true);
      handleViewChange('shell');
      setShowShellDropdown(false);
    } else if (effectiveView === 'shell') {
      setShowShellDropdown(nextShow);
    } else {
      handleViewChange('shell');
      setShowShellDropdown(false);
    }
  };

  const handleTasksClick = () => {
    if (!footerIsActive) {
      userSettings.setFooterHeight(130);
      setFooterIsActive(true);
    }
    handleViewChange('tasks');
  };

  const handleRestartShell = async () => {
    setShowShellDropdown(false);
    await restartShell();
  };

  const handleColumnToggle = columnKey => {
    setTaskVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter(k => k !== columnKey);
      }
      return [...prev, columnKey];
    });
  };

  const handleResize = useCallback(
    (e, { size }) => {
      void e;
      if (footerIsActive) {
        userSettings.setFooterHeight(size.height);

        if (size.height <= 100) {
          setFooterIsActive(false);
        }

        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('footer-resized', {
              detail: { height: size.height },
            })
          );
        }, 100);
      }
    },
    [footerIsActive, setFooterIsActive, userSettings]
  );

  useEffect(
    () => () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    },
    []
  );

  const effectiveHeight = footerIsActive ? userSettings.footerHeight : 0;
  const isTasksView = effectiveView === 'tasks' && footerIsActive && tasksAvailable;
  const currentPriorityLabel =
    PRIORITY_OPTIONS.find(o => o.value === taskMinPriority)?.label || 'Low+';

  // Footer handle that positions itself to overlay the header.
  // react-resizable v4 calls `handle` as (handleAxis, ref); the ref must reach the
  // DOM node — v4 dropped the findDOMNode fallback that React 19 removed. This
  // function form is also valid on v3, so it works before/after the upgrade.
  const FooterHandle = (handleAxis, ref) => (
    <div
      ref={ref}
      className={`react-resizable-handle react-resizable-handle-${handleAxis}`}
      style={{
        position: 'absolute',
        top: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60px',
        zIndex: 10,
      }}
    >
      <i className="fas fa-solid fa-grip-lines" />
    </div>
  );

  return (
    <div className="position-relative flex-shrink-0">
      <div className="d-flex justify-content-between align-items-center mb-0">
        <div className="ps-1">
          <a href="/docs" className="text-primary" target="_blank" rel="noopener noreferrer">
            Hyperweaver
          </a>{' '}
          <button
            type="button"
            onClick={handleVersionClick}
            className="btn btn-link p-0 text-primary text-decoration-none align-baseline"
            style={{
              transition: 'transform 0.1s ease',
              display: 'inline-block',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title="Click me 3 times for a surprise!"
          >
            v{__APP_VERSION__ || '1.0.0'}
          </button>
          <span className="text-primary"> © </span>
          <a href="https://startcloud.com/" className="text-primary">
            STARTcloud.com&#8482; {new Date().getFullYear()}
          </a>
        </div>

        <div className="hw-footer-grip-visual" />

        {anyPane && (
          <div className="btn-group">
            {/* Shell view toggle + restart menu (drops up so it stays in the viewport) */}
            {shellAvailable && (
              <Dropdown
                as={ButtonGroup}
                drop="up"
                align="end"
                show={showShellDropdown && footerIsActive && effectiveView === 'shell'}
                onToggle={handleShellToggle}
              >
                <Dropdown.Toggle as={FooterToggle} active={effectiveView === 'shell'} title="Shell">
                  <i className="fas fa-terminal" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as="button" type="button" onClick={handleRestartShell}>
                    <i className="fas fa-refresh me-2" />
                    Restart Shell
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Tasks view toggle */}
            {tasksAvailable && (
              <button
                type="button"
                className={`btn btn-sm border-0 ${effectiveView === 'tasks' ? 'btn-info' : 'bg-body-secondary text-body'}`}
                onClick={handleTasksClick}
                title="Tasks"
              >
                <i className="fas fa-tasks" />
              </button>
            )}

            {isTasksView && (
              <>
                {/* Priority filter */}
                <Dropdown
                  as={ButtonGroup}
                  drop="up"
                  align="end"
                  show={showFilterDropdown}
                  onToggle={nextShow => {
                    setShowFilterDropdown(nextShow);
                    if (nextShow) {
                      setShowColumnsDropdown(false);
                    }
                  }}
                >
                  <Dropdown.Toggle
                    as={FooterToggle}
                    active={showFilterDropdown}
                    title={`Priority filter: ${currentPriorityLabel}`}
                  >
                    <i className="fas fa-filter" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {PRIORITY_OPTIONS.map(option => (
                      <Dropdown.Item
                        as="button"
                        type="button"
                        key={option.value}
                        active={taskMinPriority === option.value}
                        onClick={() => setTaskMinPriority(option.value)}
                      >
                        {option.label}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Column visibility — stays open while toggling (autoClose outside only) */}
                <Dropdown
                  as={ButtonGroup}
                  drop="up"
                  align="end"
                  autoClose="outside"
                  show={showColumnsDropdown}
                  onToggle={nextShow => {
                    setShowColumnsDropdown(nextShow);
                    if (nextShow) {
                      setShowFilterDropdown(false);
                    }
                  }}
                >
                  <Dropdown.Toggle
                    as={FooterToggle}
                    active={showColumnsDropdown}
                    title="Toggle columns"
                  >
                    <i className="fas fa-table-columns" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {TASK_COLUMNS.map(col => (
                      <label
                        key={col.key}
                        className="dropdown-item d-flex align-items-center gap-2 mb-0 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="form-check-input m-0"
                          checked={taskVisibleColumns.includes(col.key)}
                          onChange={() => handleColumnToggle(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </>
            )}

            {/* Expand / collapse the footer */}
            <button
              type="button"
              className="btn btn-sm border-0 bg-body-secondary text-body"
              onClick={handleToggle}
              title={footerIsActive ? 'Collapse' : 'Expand'}
            >
              <i className={`fa ${footerIsActive ? 'fa-angle-down' : 'fa-angle-up'}`} />
            </button>
          </div>
        )}
      </div>

      {anyPane && (
        <ResizableBox
          onResize={handleResize}
          className={!footerIsActive ? 'is-footer-minimized' : ''}
          height={effectiveHeight}
          width={Infinity}
          resizeHandles={footerIsActive ? ['n'] : []}
          axis="y"
          maxConstraints={[Infinity, Math.floor(window.innerHeight * 0.9)]}
          minConstraints={[Infinity, 0]}
          handle={FooterHandle}
        >
          <div className="log-console text-white h-100">
            {effectiveView === 'shell' ? <HostShell /> : <Tasks />}
          </div>
        </ResizableBox>
      )}
    </div>
  );
};

export default Footer;
