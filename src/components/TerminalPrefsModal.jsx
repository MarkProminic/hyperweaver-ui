import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  XTERM_FONT_SUGGESTIONS,
  loadXtermPrefs,
  resetXtermPrefs,
  saveXtermPrefs,
} from '../utils/xtermPrefs';

import { FormModal } from './common';

/**
 * Terminal preferences editor — the user-local xterm.js knobs (font, size,
 * scrollback, cursor). Saving applies live to the footer host shell and to
 * every terminal opened afterwards.
 */
const TerminalPrefsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => loadXtermPrefs());

  useEffect(() => {
    if (isOpen) {
      setDraft(loadXtermPrefs());
    }
  }, [isOpen]);

  const setField = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    saveXtermPrefs({
      ...draft,
      fontSize: Math.min(32, Math.max(6, Number(draft.fontSize) || 12)),
      scrollback: Math.min(200000, Math.max(0, Number(draft.scrollback) || 0)),
      fontFamily: String(draft.fontFamily || '').trim() || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setDraft(resetXtermPrefs());
  };

  const resetButton = (
    <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
      {t('chrome.termPrefs.resetDefaults')}
    </button>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('chrome.termPrefs.title')}
      icon="fas fa-terminal"
      submitText={t('chrome.termPrefs.save')}
      showCancelButton
      cancelText={t('chrome.termPrefs.cancel')}
      additionalActions={resetButton}
    >
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="term-prefs-font-size">
            {t('chrome.termPrefs.fontSize')}
          </label>
          <input
            id="term-prefs-font-size"
            className="form-control"
            type="number"
            min="6"
            max="32"
            value={draft.fontSize}
            onChange={e => setField('fontSize', e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="term-prefs-scrollback">
            {t('chrome.termPrefs.scrollback')}
          </label>
          <input
            id="term-prefs-scrollback"
            className="form-control"
            type="number"
            min="0"
            max="200000"
            step="1000"
            value={draft.scrollback}
            onChange={e => setField('scrollback', e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="term-prefs-cursor-style">
            {t('chrome.termPrefs.cursorStyle')}
          </label>
          <select
            id="term-prefs-cursor-style"
            className="form-select"
            value={draft.cursorStyle}
            onChange={e => setField('cursorStyle', e.target.value)}
          >
            <option value="block">{t('chrome.termPrefs.cursorBlock')}</option>
            <option value="underline">{t('chrome.termPrefs.cursorUnderline')}</option>
            <option value="bar">{t('chrome.termPrefs.cursorBar')}</option>
          </select>
        </div>
        <div className="col-6 col-md-3">
          <span className="form-label d-block">{t('chrome.termPrefs.cursorBlink')}</span>
          <div className="form-check form-switch mt-2">
            <input
              id="term-prefs-cursor-blink"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={draft.cursorBlink === true}
              onChange={e => setField('cursorBlink', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="term-prefs-cursor-blink">
              {draft.cursorBlink ? t('chrome.termPrefs.on') : t('chrome.termPrefs.off')}
            </label>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="term-prefs-font-family">
            {t('chrome.termPrefs.fontFamily')}
          </label>
          <input
            id="term-prefs-font-family"
            className="form-control font-monospace"
            type="text"
            list="term-prefs-font-options"
            value={draft.fontFamily}
            onChange={e => setField('fontFamily', e.target.value)}
          />
          <datalist id="term-prefs-font-options">
            {XTERM_FONT_SUGGESTIONS.map(font => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <span className="form-text text-muted small">{t('chrome.termPrefs.fontHint')}</span>
        </div>
        <div className="col-12">
          <span
            className="form-text text-muted small"
            style={{ fontFamily: draft.fontFamily, fontSize: `${draft.fontSize}px` }}
          >
            {t('chrome.termPrefs.preview')}
          </span>
        </div>
        <div className="col-12">
          <span className="form-text text-muted small">{t('chrome.termPrefs.applyNote')}</span>
        </div>
      </div>
    </FormModal>
  );
};

TerminalPrefsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TerminalPrefsModal;
