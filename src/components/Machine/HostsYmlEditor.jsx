import { yaml as yamlLanguage } from '@codemirror/lang-yaml';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import PropTypes from 'prop-types';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { parseDocument } from 'yaml';

import { useTheme } from '../../contexts/ThemeContext';

// Live YAML diagnostics — the `yaml` parser's error offsets feed the lint
// gutter as you type; the agent's authoritative parse still gates the save.
const yamlLinter = linter(view => {
  const text = view.state.doc.toString();
  if (!text.trim()) {
    return [];
  }
  return parseDocument(text).errors.map(err => {
    const [from = 0, to = 0] = Array.isArray(err.pos) ? err.pos : [];
    return {
      from: Math.min(from, text.length),
      to: Math.min(Math.max(to, from + 1), text.length),
      severity: 'error',
      message: err.message,
    };
  });
});

// The app's effective theme: ThemeContext resolves auto → the system
// preference and live-updates data-bs-theme; the editor mirrors it.
const useResolvedTheme = () => {
  const { theme } = useTheme();
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    if (theme !== 'auto') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = e => setPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  if (theme === 'auto') {
    return prefersDark ? 'dark' : 'light';
  }
  return theme;
};

const HostsYmlEditor = forwardRef(({ value, onChange, disabled }, ref) => {
  const viewRef = useRef(null);
  const resolvedTheme = useResolvedTheme();

  useImperativeHandle(ref, () => ({
    jumpTo: (line, column) => {
      const view = viewRef.current;
      if (!view || !line) {
        return;
      }
      const docLine = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines)));
      const pos = Math.min(docLine.from + Math.max(0, (column || 1) - 1), docLine.to);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      view.focus();
    },
  }));

  const extensions = useMemo(() => [yamlLanguage(), yamlLinter, lintGutter()], []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={resolvedTheme === 'dark' ? oneDark : 'light'}
      extensions={extensions}
      height="60vh"
      readOnly={disabled}
      onCreateEditor={view => {
        viewRef.current = view;
      }}
    />
  );
});

HostsYmlEditor.displayName = 'HostsYmlEditor';

HostsYmlEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default HostsYmlEditor;
