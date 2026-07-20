/**
 * User-local xterm.js preferences — persisted in localStorage like the other
 * UserSettings knobs, read by every terminal surface (zone shells, the footer
 * host shell) when it builds its Terminal options. `saveXtermPrefs` fires
 * XTERM_PREFS_EVENT so already-open terminals that hold their instance can
 * re-apply live; component-mounted terminals pick the new values up on their
 * next open.
 */

const STORAGE_KEY = 'hyperweaver_xterm_prefs';

export const XTERM_PREFS_EVENT = 'xterm-prefs-changed';

export const XTERM_PREF_DEFAULTS = {
  fontSize: 12,
  fontFamily: '"Cascadia Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
  scrollback: 10000,
  cursorStyle: 'block',
  cursorBlink: true,
};

export const XTERM_FONT_SUGGESTIONS = [
  XTERM_PREF_DEFAULTS.fontFamily,
  '"Fira Code", monospace',
  '"JetBrains Mono", monospace',
  'Consolas, monospace',
  'Menlo, monospace',
  '"Courier New", monospace',
  'monospace',
];

export const loadXtermPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...XTERM_PREF_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...XTERM_PREF_DEFAULTS };
  }
};

export const saveXtermPrefs = prefs => {
  const clean = { ...XTERM_PREF_DEFAULTS, ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent(XTERM_PREFS_EVENT));
  return clean;
};

export const resetXtermPrefs = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(XTERM_PREFS_EVENT));
  return { ...XTERM_PREF_DEFAULTS };
};
