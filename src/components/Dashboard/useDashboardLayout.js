import { useCallback, useState } from 'react';

/**
 * pfSense-style dashboard layout state — widget order, per-widget collapsed
 * and hidden flags, persisted in localStorage like the other UserSettings
 * knobs. Unknown saved ids drop out and newly added widgets append, so the
 * saved layout survives widget-set changes across releases.
 */

const STORAGE_KEY = 'hyperweaver_dashboard_layout';

export const DASHBOARD_WIDGET_IDS = ['summary', 'quickActions', 'serverCards', 'topology'];

const defaultLayout = () =>
  DASHBOARD_WIDGET_IDS.map(id => ({ id, hidden: false, collapsed: false }));

const normalize = saved => {
  const rows = Array.isArray(saved) ? saved.filter(row => row && typeof row.id === 'string') : [];
  const known = rows
    .filter(row => DASHBOARD_WIDGET_IDS.includes(row.id))
    .map(row => ({ id: row.id, hidden: row.hidden === true, collapsed: row.collapsed === true }));
  const missing = DASHBOARD_WIDGET_IDS.filter(id => !known.some(row => row.id === id)).map(id => ({
    id,
    hidden: false,
    collapsed: false,
  }));
  return [...known, ...missing];
};

const useDashboardLayout = () => {
  const [layout, setLayout] = useState(() => {
    try {
      return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch {
      return defaultLayout();
    }
  });
  const [draggingId, setDraggingId] = useState(null);

  const commit = useCallback(next => {
    setLayout(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const moveWidget = useCallback(
    (fromId, toId) => {
      if (!fromId || fromId === toId) {
        return;
      }
      const without = layout.filter(row => row.id !== fromId);
      const moved = layout.find(row => row.id === fromId);
      const targetIndex = without.findIndex(row => row.id === toId);
      if (!moved || targetIndex === -1) {
        return;
      }
      commit([...without.slice(0, targetIndex), moved, ...without.slice(targetIndex)]);
    },
    [layout, commit]
  );

  const toggleCollapsed = useCallback(
    id => commit(layout.map(row => (row.id === id ? { ...row, collapsed: !row.collapsed } : row))),
    [layout, commit]
  );

  const toggleHidden = useCallback(
    id => commit(layout.map(row => (row.id === id ? { ...row, hidden: !row.hidden } : row))),
    [layout, commit]
  );

  return { layout, draggingId, setDraggingId, moveWidget, toggleCollapsed, toggleHidden };
};

export default useDashboardLayout;
