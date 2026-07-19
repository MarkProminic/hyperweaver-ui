import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { setMachineNotes, setMachineTags } from '../../api/machineAPI';

/**
 * Tags + notes — DB-immediate dedicated endpoints (no task, valid while
 * running), so they save here instead of riding the staged Apply flow;
 * a save must never force the details reload that wipes staged edits.
 */

const parseTags = text =>
  text
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

const TagsNotesPanel = ({ currentServer, machineName, currentTags, currentNotes, disabled }) => {
  const { t } = useTranslation();
  const seededTags = (Array.isArray(currentTags) ? currentTags : []).join(', ');
  const seededNotes = typeof currentNotes === 'string' ? currentNotes : '';
  const [tags, setTags] = useState(seededTags);
  const [notes, setNotes] = useState(seededNotes);
  const [savedTags, setSavedTags] = useState(seededTags);
  const [savedNotes, setSavedNotes] = useState(seededNotes);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setTags(seededTags);
    setNotes(seededNotes);
    setSavedTags(seededTags);
    setSavedNotes(seededNotes);
    setMsg('');
    setError('');
  }, [machineName, seededTags, seededNotes]);

  const changed = tags !== savedTags || notes !== savedNotes;

  const save = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    const failures = [];
    if (tags !== savedTags) {
      const list = parseTags(tags);
      const result = await setMachineTags(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        list.length > 0 ? list : null
      );
      if (result.success) {
        setSavedTags(tags);
      } else {
        failures.push(result.message);
      }
    }
    if (notes !== savedNotes) {
      const result = await setMachineNotes(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        notes.trim() !== '' ? notes : null
      );
      if (result.success) {
        setSavedNotes(notes);
      } else {
        failures.push(result.message);
      }
    }
    setSaving(false);
    if (failures.length > 0) {
      setError(failures.join('; '));
      return;
    }
    setMsg(t('machine.tagsNotesPanel.saved'));
  };

  return (
    <div className="border-top pt-3 mt-3">
      <h6 className="fw-bold">{t('machine.tagsNotesPanel.heading')}</h6>
      <p className="form-text text-muted mt-0">
        {t('machine.tagsNotesPanel.savedImmediatelyNote')}
      </p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-5">
          <label className="form-label" htmlFor="machine-tags">
            {t('machine.tagsNotesPanel.tagsLabel')}
          </label>
          <input
            id="machine-tags"
            className="form-control"
            type="text"
            placeholder={t('machine.tagsNotesPanel.tagsPlaceholder')}
            value={tags}
            onChange={e => setTags(e.target.value)}
            disabled={disabled || saving}
          />
        </div>
        <div className="col-12 col-md-7">
          <label className="form-label" htmlFor="machine-notes">
            {t('machine.tagsNotesPanel.notesLabel')}
          </label>
          <textarea
            id="machine-notes"
            className="form-control"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={disabled || saving}
          />
        </div>
      </div>
      <div className="d-flex align-items-center gap-2 mt-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={save}
          disabled={disabled || saving || !changed}
        >
          <i className={`fas ${saving ? 'fa-spinner fa-pulse' : 'fa-save'} me-2`} />
          {t('machine.tagsNotesPanel.saveButton')}
        </button>
        {msg && <span className="text-success small">{msg}</span>}
      </div>
    </div>
  );
};

TagsNotesPanel.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  currentTags: PropTypes.arrayOf(PropTypes.string),
  currentNotes: PropTypes.string,
  disabled: PropTypes.bool,
};

export default TagsNotesPanel;
