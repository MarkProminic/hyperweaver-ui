import PropTypes from 'prop-types';
import { createContext, useState, useEffect } from 'react';

const UserSettings = createContext();

const UserSettingsProvider = ({ children }) => {
  // Load settings from localStorage with defaults
  const [sidebarMinimized, setSidebarMinimized] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_sidebar_minimized');
    return saved ? JSON.parse(saved) : false;
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_sidebar_width');
    return saved ? parseInt(saved) : 260;
  });

  const [footerHeight, setFooterHeight] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_footer_height');
    return saved ? parseInt(saved) : 200;
  });

  const [footerIsActive, setFooterIsActive] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_footer_is_active');
    return saved ? JSON.parse(saved) : false;
  });

  const [footerActiveView, setFooterActiveView] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_footer_active_view');
    return saved ? saved : 'tasks';
  });

  const [tasksScrollPosition, setTasksScrollPosition] = useState(0);

  const [taskMinPriority, setTaskMinPriority] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_task_min_priority');
    return saved ? parseInt(saved) : 40;
  });

  const [taskVisibleColumns, setTaskVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('hyperweaver_task_visible_columns');
    return saved
      ? JSON.parse(saved)
      : ['operation', 'machine_name', 'status', 'progress', 'priority', 'created_at'];
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hyperweaver_sidebar_minimized', JSON.stringify(sidebarMinimized));
  }, [sidebarMinimized]);

  useEffect(() => {
    if (sidebarWidth < 180) {
      setSidebarMinimized(true);
    }
    localStorage.setItem('hyperweaver_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('hyperweaver_footer_height', footerHeight.toString());
  }, [footerHeight]);

  useEffect(() => {
    localStorage.setItem('hyperweaver_footer_is_active', JSON.stringify(footerIsActive));
  }, [footerIsActive]);

  useEffect(() => {
    localStorage.setItem('hyperweaver_footer_active_view', footerActiveView);
  }, [footerActiveView]);

  useEffect(() => {
    localStorage.setItem('hyperweaver_task_min_priority', taskMinPriority.toString());
  }, [taskMinPriority]);

  useEffect(() => {
    localStorage.setItem('hyperweaver_task_visible_columns', JSON.stringify(taskVisibleColumns));
  }, [taskVisibleColumns]);

  return (
    <UserSettings.Provider
      value={{
        sidebarMinimized,
        setSidebarMinimized,
        sidebarWidth,
        setSidebarWidth,
        footerHeight,
        setFooterHeight,
        footerIsActive,
        setFooterIsActive,
        footerActiveView,
        setFooterActiveView,
        tasksScrollPosition,
        setTasksScrollPosition,
        taskMinPriority,
        setTaskMinPriority,
        taskVisibleColumns,
        setTaskVisibleColumns,
      }}
    >
      {children}
    </UserSettings.Provider>
  );
};

UserSettingsProvider.propTypes = {
  children: PropTypes.node,
};

export { UserSettings, UserSettingsProvider };
