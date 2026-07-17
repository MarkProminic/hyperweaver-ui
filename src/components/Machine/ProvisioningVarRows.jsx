import PropTypes from 'prop-types';
import { useState } from 'react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Free key/value variable rows — the document's `vars:`/`environment:` maps
 * verbatim (Ansible's model: a variable is a WHOLE value; the argument spec
 * never dictates the set — Mark's ruling). Scalars edit inline; list/dict
 * values collapse to a compact preview and expand into a YAML editor (JSON
 * is valid YAML input; storage stays JSON — a role-level dict REPLACES a
 * global one, Ansible's default hash_behaviour, never a deep merge). Spec
 * assistance only: name autocomplete plus an info tooltip where the role's
 * argument spec documents the variable.
 */

// Ansible variable names are identifiers; role names are dot-joined segments.
export const VAR_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
export const ROLE_NAME_PATTERN = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/u;

export const VAR_NAME_RULE =
  'Variable names: letters, numbers, underscores — can’t start with a number.';

/** Render a vars value for editing; parse it back preserving JSON types. */
export const varToText = value => (typeof value === 'string' ? value : JSON.stringify(value));
export const textToVar = text => {
  try {
    return JSON.parse(text);
  } catch {
    return text; // plain string
  }
};

/** Apply a patch to a row object; undefined values DELETE their key (unset). */
export const applyPatch = (row, patch) => {
  const next = { ...row, ...patch };
  Object.keys(patch).forEach(key => {
    if (patch[key] === undefined) {
      delete next[key];
    }
  });
  return next;
};

/**
 * A one-entry-per-line editor over a string list (rsync args, excludes,
 * collections). Edits locally, commits the cleaned list on blur — live
 * splitting would eat the blank line you just typed.
 */
export const LinesField = ({ id, label, lines, onCommit, disabled, placeholder }) => {
  const [draft, setDraft] = useState((lines || []).join('\n'));
  return (
    <div className="hw-lines-field">
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="form-control form-control-sm font-monospace"
        rows={3}
        value={draft}
        placeholder={placeholder}
        spellCheck={false}
        disabled={disabled}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const list = draft
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
          onCommit(list.length > 0 ? list : undefined);
        }}
      />
    </div>
  );
};

LinesField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  lines: PropTypes.array,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
};

/** A tri-state select over an OPTIONAL boolean key: (not set) / true / false. */
export const OptionalBoolSelect = ({ id, label, value, onChange, disabled }) => (
  <span className="hw-field">
    <label htmlFor={id}>{label}</label>
    <select
      id={id}
      className="form-select form-select-sm w-auto"
      value={value === undefined ? '' : String(value)}
      disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
    >
      <option value="">(not set)</option>
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  </span>
);

OptionalBoolSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** The parsed structure when the stored text is a list/dict, else null. */
const structureOf = text => {
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const yamlFromText = text => {
  const parsed = structureOf(text);
  return parsed ? stringifyYaml(parsed) : text;
};

const previewOf = text => {
  const parsed = structureOf(text);
  if (!parsed) {
    return text;
  }
  if (Array.isArray(parsed)) {
    return `[ ${parsed.length} item${parsed.length === 1 ? '' : 's'} ]`;
  }
  const keys = Object.keys(parsed).length;
  return `{ ${keys} key${keys === 1 ? '' : 's'} }`;
};

/**
 * Tooltip text for a spec-documented option — the description with the
 * default folded in; '' when the spec has no description (no button then —
 * Mark's ruling: only a real description earns the info affordance).
 */
export const specInfoText = option => {
  if (!option || !option.description) {
    return '';
  }
  const description = Array.isArray(option.description)
    ? option.description.join(' ')
    : String(option.description);
  const extras = [];
  if (option.default !== undefined) {
    extras.push(`default: ${varToText(option.default)}`);
  }
  if (option.required) {
    extras.push('required');
  }
  return extras.length > 0 ? `${description} (${extras.join(', ')})` : description;
};

/** Floating tooltip on an info button — hover/focus shows, click pins. */
const InfoTip = ({ text }) => {
  const [pinned, setPinned] = useState(false);
  return (
    <span className={`hw-tip-wrap ${pinned ? 'hw-tip-pinned' : ''}`}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        aria-label="About this variable"
        onClick={() => setPinned(prev => !prev)}
      >
        <i className="fas fa-circle-info" />
      </button>
      <span className="hw-tip" role="tooltip">
        {text}
      </span>
    </span>
  );
};

InfoTip.propTypes = {
  text: PropTypes.string.isRequired,
};

/** The YAML structure editor — commits on blur, and ONLY when it parses. */
const YamlValueEditor = ({ initialText, onCommit, disabled }) => {
  const [draft, setDraft] = useState(() => yamlFromText(initialText));
  const [invalid, setInvalid] = useState(false);
  const parses = value => {
    if (value.trim() === '') {
      return false;
    }
    try {
      parseYaml(value);
      return true;
    } catch {
      return false;
    }
  };
  return (
    <>
      <textarea
        className={`form-control form-control-sm font-monospace hw-yaml-edit ${invalid ? 'is-invalid' : ''}`}
        rows={6}
        value={draft}
        spellCheck={false}
        disabled={disabled}
        aria-label="Variable value (YAML)"
        onChange={e => {
          setDraft(e.target.value);
          setInvalid(!parses(e.target.value) && e.target.value.trim() !== '');
        }}
        onBlur={() => {
          if (parses(draft)) {
            onCommit(JSON.stringify(parseYaml(draft)));
          }
        }}
      />
      {invalid && (
        <div className="hw-invalid-msg">
          Not valid YAML — the value is not saved until it parses.
        </div>
      )}
    </>
  );
};

YamlValueEditor.propTypes = {
  initialText: PropTypes.string.isRequired,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * One variable row. Key and scalar value edit locally and commit on blur;
 * structures render as a preview with the { } YAML editor behind it.
 */
const VarRow = ({ name, valueText, info, listId, disabled, onRename, onValueText, onRemove }) => {
  const [keyText, setKeyText] = useState(name);
  const [valText, setValText] = useState(valueText);
  const [expanded, setExpanded] = useState(false);
  const trimmedKey = keyText.trim();
  const badKey = trimmedKey !== '' && !VAR_NAME_PATTERN.test(trimmedKey);
  const structured = structureOf(valueText) !== null;

  const commitKey = () => {
    if (trimmedKey !== name && !badKey) {
      onRename(trimmedKey);
    }
  };

  let valueArea;
  if (expanded) {
    valueArea = (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setExpanded(false)}
        disabled={disabled}
      >
        Done
      </button>
    );
  } else if (structured) {
    valueArea = (
      <>
        <span
          className="hw-val-preview"
          title={`A ${Array.isArray(structureOf(valueText)) ? 'list' : 'dict'} — open the YAML editor to change it`}
        >
          {previewOf(valueText)}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary font-monospace"
          title="Edit as YAML"
          onClick={() => setExpanded(true)}
          disabled={disabled}
        >
          {'{ }'}
        </button>
      </>
    );
  } else {
    valueArea = (
      <>
        <input
          className="form-control form-control-sm font-monospace hw-var-value"
          type="text"
          placeholder="value"
          aria-label="Variable value"
          value={valText}
          disabled={disabled}
          onChange={e => setValText(e.target.value)}
          onBlur={() => {
            if (valText !== valueText) {
              onValueText(valText);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary font-monospace"
          title="Edit as YAML (lists, dicts)"
          onClick={() => setExpanded(true)}
          disabled={disabled}
        >
          {'{ }'}
        </button>
      </>
    );
  }

  return (
    <div className="hw-var-row-box">
      <div className="hw-var-row">
        <input
          className={`form-control form-control-sm font-monospace hw-var-key ${badKey ? 'is-invalid' : ''}`}
          type="text"
          list={listId}
          placeholder="variable"
          aria-label="Variable name"
          value={keyText}
          disabled={disabled}
          onChange={e => setKeyText(e.target.value)}
          onBlur={commitKey}
        />
        {valueArea}
        {info && <InfoTip text={info} />}
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          aria-label="Remove this variable"
          onClick={onRemove}
          disabled={disabled}
        >
          <i className="fas fa-trash" />
        </button>
      </div>
      {expanded && (
        <YamlValueEditor initialText={valueText} onCommit={onValueText} disabled={disabled} />
      )}
      {badKey && <div className="hw-invalid-msg">{VAR_NAME_RULE}</div>}
    </div>
  );
};

VarRow.propTypes = {
  name: PropTypes.string.isRequired,
  valueText: PropTypes.string.isRequired,
  info: PropTypes.string,
  listId: PropTypes.string,
  disabled: PropTypes.bool,
  onRename: PropTypes.func.isRequired,
  onValueText: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The row list over one vars map. Committed rows mutate `entries` through
 * onChange; drafts (the + button) live locally until their name commits.
 */
export const VarRowList = ({ idPrefix, entries, onChange, specOptions, disabled, addLabel }) => {
  const [drafts, setDrafts] = useState([]);
  const knownNames = specOptions ? Object.keys(specOptions) : [];
  const listId = knownNames.length > 0 ? `${idPrefix}-known-vars` : undefined;

  const renameEntry = (oldName, nextName) => {
    const next = {};
    Object.entries(entries).forEach(([key, value]) => {
      if (key === oldName) {
        if (nextName) {
          next[nextName] = value;
        }
      } else {
        next[key] = value;
      }
    });
    onChange(next);
  };

  const commitDraft = (draft, name) => {
    setDrafts(prev => prev.filter(entry => entry.id !== draft.id));
    if (name) {
      onChange({ ...entries, [name]: textToVar(draft.value) });
    }
  };

  return (
    <div className="hw-var-rows">
      {listId && (
        <datalist id={listId}>
          {knownNames.map(known => (
            <option key={known} value={known} />
          ))}
        </datalist>
      )}
      {Object.entries(entries).map(([name, value]) => (
        <VarRow
          key={`${name}:${varToText(value)}`}
          name={name}
          valueText={varToText(value)}
          info={specInfoText(specOptions?.[name])}
          listId={listId}
          disabled={disabled}
          onRename={next => renameEntry(name, next)}
          onValueText={text => onChange({ ...entries, [name]: textToVar(text) })}
          onRemove={() => renameEntry(name, '')}
        />
      ))}
      {drafts.map(draft => (
        <VarRow
          key={draft.id}
          name={draft.key}
          valueText={draft.value}
          info={specInfoText(specOptions?.[draft.key])}
          listId={listId}
          disabled={disabled}
          onRename={next => commitDraft(draft, next)}
          onValueText={text =>
            setDrafts(prev =>
              prev.map(entry => (entry.id === draft.id ? { ...entry, value: text } : entry))
            )
          }
          onRemove={() => setDrafts(prev => prev.filter(entry => entry.id !== draft.id))}
        />
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            setDrafts(prev => [
              ...prev,
              { id: `draft-${Date.now()}-${prev.length}`, key: '', value: '' },
            ])
          }
          disabled={disabled}
        >
          <i className="fas fa-plus me-2" />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

VarRowList.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  entries: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  specOptions: PropTypes.object,
  disabled: PropTypes.bool,
  addLabel: PropTypes.string.isRequired,
};

export default VarRowList;
