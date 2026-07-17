import PropTypes from 'prop-types';
import { useState } from 'react';

/**
 * The manifest field DSL (design ruling 2026-07-16) — the ONE shape a
 * package's form is written in: metadata.configuration = {groups, fields}.
 * This module is both the evaluator (show_if, defaults, validation, hidden
 * pruning — the same semantics the agents enforce authoritatively) and the
 * React/Bootstrap renderer the machine-create flow mounts. Answers are a
 * flat map keyed by each field's EXACT name (the Jinja2 context contract,
 * unchanged); multiselect delivers a native list. basicFields/advancedFields
 * are GONE — packages that predate the DSL render a hint, never a form.
 */

// The closed type set. Unknown types are an agent-side import error; the
// renderer mirrors that as an inline error row, never a silent text input.
export const DSL_TYPES = [
  'text',
  'textarea',
  'number',
  'checkbox',
  'select',
  'multiselect',
  'password',
  'fqdn',
  'ipaddr',
  'cidr',
  'path',
];

/**
 * A version's {groups, fields} configuration, shape-checked — null when the
 * manifest predates the DSL (callers show the hint; nothing renders).
 */
export const dslConfiguration = version => {
  const configuration = version?.metadata?.configuration;
  if (!configuration || typeof configuration !== 'object') {
    return null;
  }
  const fields = Array.isArray(configuration.fields)
    ? configuration.fields.filter(field => field && typeof field === 'object' && field.name)
    : null;
  if (!fields || fields.length === 0) {
    return null;
  }
  const groups = (Array.isArray(configuration.groups) ? configuration.groups : []).filter(
    group => group && typeof group === 'object' && group.name
  );
  return { groups, fields };
};

/** Option rows normalized to {value, label} — scalars double as both. */
const optionRows = field =>
  (Array.isArray(field.options) ? field.options : []).map(option =>
    option && typeof option === 'object'
      ? { value: option.value, label: option.label ?? String(option.value) }
      : { value: option, label: String(option) }
  );

/**
 * Role-enable flags as condition operands — `<metadata.roles name>_enabled`,
 * VERBATIM (the accepted example: metadata.roles [{name: traveler}] →
 * show_if {traveler_enabled: true}). The roles here are the create form's
 * toggles, seeded from the MANIFEST's metadata.roles[] — the document's
 * roles[] (FQCNs) is rendered OUTPUT and never feeds a flag.
 */
export const roleFlagScope = roles => {
  const scope = {};
  (Array.isArray(roles) ? roles : []).forEach(role => {
    const name = String(role?.name || '');
    if (name) {
      scope[`${name}_enabled`] = !!role.enabled;
    }
  });
  return scope;
};

/** Defaults for untouched fields — merged BEFORE conditionals (the rule). */
export const seedAnswers = config => {
  const answers = {};
  (config?.fields || []).forEach(field => {
    if (field.default !== undefined && field.type !== 'password') {
      answers[field.name] = field.default;
    }
  });
  return answers;
};

// ---- the closed show_if grammar: map = AND of entries; entry values are
// scalar (equals), [list] (IN), {not: v|[..]}, {gt|gte|lt|lte: n}; a
// top-level {any: [map, map]} is an OR of AND-maps. Never expression strings.
const numberOf = value => {
  // ''/null/undefined are NOT zero — a cleared field must fail numeric
  // conditions exactly as it does agent-side (absent ≠ 0).
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const matchEntry = (actual, expected) => {
  if (Array.isArray(expected)) {
    return expected.some(candidate => matchEntry(actual, candidate));
  }
  if (expected !== null && typeof expected === 'object') {
    if ('not' in expected) {
      return !matchEntry(actual, expected.not);
    }
    const current = numberOf(actual);
    return Object.entries(expected).every(([op, bound]) => {
      const limit = numberOf(bound);
      if (current === null || limit === null) {
        return false;
      }
      if (op === 'gt') {
        return current > limit;
      }
      if (op === 'gte') {
        return current >= limit;
      }
      if (op === 'lt') {
        return current < limit;
      }
      if (op === 'lte') {
        return current <= limit;
      }
      return false;
    });
  }
  if (typeof expected === 'number') {
    return numberOf(actual) === expected;
  }
  // Booleans and strings compare canonical-string — the Go agent's
  // looseEqual ("true"≡true, "false"≡false; ABSENT never equals false).
  return String(actual ?? '') === String(expected);
};

export const evaluateShowIf = (condition, scope) => {
  if (!condition || typeof condition !== 'object') {
    return true;
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some(branch => evaluateShowIf(branch, scope));
  }
  return Object.entries(condition).every(([name, expected]) => matchEntry(scope[name], expected));
};

/**
 * Visibility over the whole configuration — a DECLARATION-ORDER CASCADE
 * mirroring what the agent derives from the pruned wire: fields evaluate
 * top to bottom (operands are earlier-declared fields only — the agents'
 * manifest lint guarantees it); a VISIBLE field contributes its answer
 * (falling back to its default) to the scope, a HIDDEN field contributes
 * only its DEFAULT — never a stale answer edited while it was visible.
 * Group show_if ANDs with each member's own; a field naming an UNDECLARED
 * group is treated as ungrouped (it must render — never a ghost the gate
 * blocks on). Returns {fields: Set<name>, groups: Set<name>}.
 */
export const visibility = (config, answers, roles) => {
  const scope = { ...roleFlagScope(roles) };
  const byGroup = new Map((config?.groups || []).map(group => [group.name, group]));
  const fields = new Set();
  const groups = new Set();
  (config?.fields || []).forEach(field => {
    const group = field.group ? byGroup.get(field.group) : undefined;
    const inGroup = group ? evaluateShowIf(group.show_if, scope) : true;
    const isVisible = inGroup && evaluateShowIf(field.show_if, scope);
    if (isVisible) {
      fields.add(field.name);
      if (group) {
        groups.add(group.name);
      }
    }
    const contributed =
      isVisible && answers[field.name] !== undefined ? answers[field.name] : field.default;
    if (contributed !== undefined) {
      scope[field.name] = contributed;
    }
  });
  return { fields, groups };
};

/** Answers minus hidden fields — what the wire carries (names ABSENT). */
export const pruneHidden = (config, answers, roles) => {
  if (!config) {
    return answers;
  }
  const visible = visibility(config, answers, roles).fields;
  const pruned = {};
  Object.entries(answers).forEach(([name, value]) => {
    if (visible.has(name) && value !== undefined) {
      pruned[name] = value;
    }
  });
  return pruned;
};

// ---- validation: the UI's live convenience pass. The agent re-runs this
// authoritatively pre-render (422 {FIELD: message}); one source of rules.
const FQDN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu;

const ipv4Ok = value => {
  const parts = String(value).split('.');
  return (
    parts.length === 4 &&
    parts.every(part => /^\d{1,3}$/u.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
};

const ipv6Ok = value => {
  const text = String(value);
  if (!/^[0-9a-f:.]+$/iu.test(text) || !text.includes(':')) {
    return false;
  }
  const doubles = text.split('::').length - 1;
  if (doubles > 1) {
    return false;
  }
  const parts = text.split('::').flatMap(half => (half === '' ? [] : half.split(':')));
  if (parts.some(part => part === '')) {
    return false; // a bare ':' outside the one '::'
  }
  const tailV4 = parts.length > 0 && parts[parts.length - 1].includes('.');
  if (tailV4 && !ipv4Ok(parts[parts.length - 1])) {
    return false;
  }
  const hexParts = tailV4 ? parts.slice(0, -1) : parts;
  if (!hexParts.every(part => /^[0-9a-f]{1,4}$/iu.test(part))) {
    return false;
  }
  const full = tailV4 ? 6 : 8;
  return doubles === 1 ? hexParts.length <= full - 1 : hexParts.length === full;
};

const ipOk = (value, version) => {
  if (version === 4) {
    return ipv4Ok(value);
  }
  if (version === 6) {
    return ipv6Ok(value);
  }
  return ipv4Ok(value) || ipv6Ok(value);
};

const isBlank = value =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);

/** number rules: coercion + min/max. */
const numberError = (field, value) => {
  const rules = field.validate || {};
  const parsed = numberOf(value);
  if (parsed === null) {
    return 'Must be a number';
  }
  if (rules.min !== undefined && parsed < rules.min) {
    return `Must be at least ${rules.min}`;
  }
  if (rules.max !== undefined && parsed > rules.max) {
    return `Must be at most ${rules.max}`;
  }
  return '';
};

/** select/multiselect rule: every pick ∈ declared options. */
const optionsError = (field, value) => {
  const allowed = optionRows(field).map(option => option.value);
  if (allowed.length === 0) {
    return ''; // options_source pickers validate agent-side against inventory
  }
  const picks = field.type === 'multiselect' && Array.isArray(value) ? value : [value];
  const stray = picks.find(pick => !allowed.some(candidate => String(candidate) === String(pick)));
  return stray === undefined ? '' : `"${stray}" is not one of the options`;
};

/** String-length rules, password's floor of 8 included. */
const lengthError = (field, text) => {
  const rules = field.validate || {};
  if (field.type === 'password' && text.length < Math.max(8, rules.min_length || 0)) {
    return `At least ${Math.max(8, rules.min_length || 0)} characters`;
  }
  if (rules.min_length !== undefined && text.length < rules.min_length) {
    return `At least ${rules.min_length} characters`;
  }
  if (rules.max_length !== undefined && text.length > rules.max_length) {
    return `At most ${rules.max_length} characters`;
  }
  return '';
};

/** Type-intrinsic format checks: fqdn / ipaddr / cidr. */
const formatError = (field, text) => {
  if (field.type === 'fqdn' && !FQDN_PATTERN.test(text)) {
    return 'Not a valid FQDN';
  }
  if (field.type === 'ipaddr' && !ipOk(text, field.version)) {
    return `Not a valid IPv${field.version || '4/6'} address`;
  }
  if (field.type === 'cidr') {
    const [address, prefix, extra] = text.split('/');
    if (extra !== undefined || !prefix || !/^\d{1,3}$/u.test(prefix) || !ipOk(address)) {
      return 'Not valid CIDR notation (address/prefix)';
    }
    if (Number(prefix) > (ipv4Ok(address) ? 32 : 128)) {
      return 'CIDR prefix out of range';
    }
  }
  return '';
};

/** The author's pattern rule — pattern_error is their message. */
const patternError = (field, text) => {
  const rules = field.validate || {};
  if (!rules.pattern) {
    return '';
  }
  try {
    if (!new RegExp(rules.pattern, 'u').test(text)) {
      return rules.pattern_error || 'Does not match the required pattern';
    }
  } catch {
    // an unusable pattern is the manifest lint's problem, not the user's
  }
  return '';
};

/** One field's error text, '' when fine. Required applies only while visible. */
export const validateField = (field, value) => {
  // A checkbox always answers — unchecked (undefined or false) passes
  // required identically regardless of touch history.
  if (field.type === 'checkbox') {
    return '';
  }
  if (isBlank(value)) {
    return field.required ? `${field.label || field.name} is required` : '';
  }
  if (field.type === 'number') {
    return numberError(field, value);
  }
  if (field.type === 'select' || field.type === 'multiselect') {
    return optionsError(field, value);
  }
  const text = String(value);
  return lengthError(field, text) || formatError(field, text) || patternError(field, text);
};

/** {FIELD: message} over the VISIBLE fields — the Next-gate + 422 mirror. */
export const validateAnswers = (config, answers, roles) => {
  const errors = {};
  if (!config) {
    return errors;
  }
  const visible = visibility(config, answers, roles).fields;
  config.fields.forEach(field => {
    if (!visible.has(field.name)) {
      return;
    }
    const message = validateField(field, answers[field.name]);
    if (message) {
      errors[field.name] = message;
    }
  });
  return errors;
};

/** A generated secret for password fields carrying generate:{length}. */
const generateSecret = length => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%^*-_=+';
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('');
};

// ---- the renderer ----

const PasswordInput = ({ field, fieldId, value, error, onChange, disabled }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-group">
      <input
        id={fieldId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        type={shown ? 'text' : 'password'}
        autoComplete="new-password"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        aria-label={shown ? 'Hide the value' : 'Show the value'}
        onClick={() => setShown(prev => !prev)}
        disabled={disabled}
      >
        <i className={`fas ${shown ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
      {field.generate && (
        <button
          type="button"
          className="btn btn-outline-secondary"
          title="Generate a random value"
          onClick={() => onChange(generateSecret(field.generate.length || 24))}
          disabled={disabled}
        >
          <i className="fas fa-dice" />
        </button>
      )}
    </div>
  );
};

PasswordInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The option rows a select/multiselect renders — the platform-inventory
 * source when the field declares one AND the caller's inventory carries it,
 * else the manifest's own options.
 */
const rowsFor = (field, inventory) => {
  const sourced =
    field.options_source && Array.isArray(inventory?.[field.options_source])
      ? inventory[field.options_source]
      : null;
  if (sourced) {
    return sourced.map(entry => ({ value: entry, label: String(entry) }));
  }
  return optionRows(field);
};

const SelectInput = ({ field, fieldId, rows, value, error, onChange, disabled }) => {
  if (rows.length === 0 && field.options_source) {
    // The inventory picker with nothing listed degrades to free text.
    return (
      <input
        id={fieldId}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        type="text"
        placeholder={`(${field.options_source} — none listed; type a value)`}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }
  const commit = picked => {
    // Commit the option's NATIVE value (numbers/booleans survive) — the
    // DOM stringifies; blank = unanswered, the key drops.
    if (picked === '') {
      onChange(undefined);
      return;
    }
    const match = rows.find(row => String(row.value) === picked);
    onChange(match ? match.value : picked);
  };
  return (
    <select
      id={fieldId}
      className={`form-select ${error ? 'is-invalid' : ''}`}
      value={value ?? ''}
      onChange={e => commit(e.target.value)}
      disabled={disabled}
    >
      <option value="">Select…</option>
      {value !== undefined &&
        value !== '' &&
        !rows.some(row => String(row.value) === String(value)) && (
          <option value={value}>{String(value)}</option>
        )}
      {rows.map(row => (
        <option key={String(row.value)} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  );
};

SelectInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const MultiselectInput = ({ field, fieldId, rows, value, error, onChange, disabled }) => {
  const picks = Array.isArray(value) ? value : [];
  if (rows.length === 0) {
    return (
      <p className="form-text text-muted mb-0">
        (no options{' '}
        {field.options_source ? `— ${field.options_source} inventory empty` : 'declared'})
      </p>
    );
  }
  return (
    <div className={error ? 'border border-danger rounded p-2' : ''}>
      {rows.map(row => {
        const checked = picks.some(pick => String(pick) === String(row.value));
        const optionId = `${fieldId}-${String(row.value)}`;
        return (
          <div className="form-check form-check-inline" key={String(row.value)}>
            <input
              id={optionId}
              className="form-check-input"
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(
                  checked
                    ? picks.filter(pick => String(pick) !== String(row.value))
                    : [...picks, row.value]
                )
              }
              disabled={disabled}
            />
            <label className="form-check-label" htmlFor={optionId}>
              {row.label}
            </label>
          </div>
        );
      })}
    </div>
  );
};

MultiselectInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const DslFieldInput = ({ field, fieldId, value, error, onChange, inventory, disabled }) => {
  const invalid = error ? 'is-invalid' : '';

  if (field.type === 'checkbox') {
    return (
      <div className="form-check form-switch">
        <input
          id={fieldId}
          className={`form-check-input ${invalid}`}
          type="checkbox"
          role="switch"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={fieldId}>
          {field.label || field.name}
        </label>
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <SelectInput
        field={field}
        fieldId={fieldId}
        rows={rowsFor(field, inventory)}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'multiselect') {
    return (
      <MultiselectInput
        field={field}
        fieldId={fieldId}
        rows={rowsFor(field, inventory)}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'password') {
    return (
      <PasswordInput
        field={field}
        fieldId={fieldId}
        value={value}
        error={error}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        id={fieldId}
        className={`form-control font-monospace ${invalid}`}
        rows={field.rows || 4}
        value={value ?? ''}
        spellCheck={false}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }
  if (field.type === 'number') {
    return (
      <input
        id={fieldId}
        className={`form-control ${invalid}`}
        type="number"
        min={field.validate?.min}
        max={field.validate?.max}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        disabled={disabled}
      />
    );
  }
  if (!DSL_TYPES.includes(field.type)) {
    // Fail-closed, mirroring the agents' import lint — no silent text input.
    return (
      <div className="alert alert-danger py-1 px-2 mb-0 small">
        Unknown field type <code>{String(field.type)}</code> — the manifest fails the agent&apos;s
        schema lint.
      </div>
    );
  }
  // text · fqdn · ipaddr · cidr · path — one input, differing validation.
  return (
    <input
      id={fieldId}
      className={`form-control ${field.type === 'path' ? 'font-monospace' : ''} ${invalid}`}
      type="text"
      placeholder={field.placeholder}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};

DslFieldInput.propTypes = {
  field: PropTypes.object.isRequired,
  fieldId: PropTypes.string.isRequired,
  value: PropTypes.any,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  inventory: PropTypes.object,
  disabled: PropTypes.bool,
};

/**
 * The whole configuration form: groups in declared order (ungrouped fields
 * lead), advanced groups collapsed behind the caller's ONE advanced toggle,
 * conditionals evaluated live against answers + role-enable flags.
 */
const DslConfigForm = ({
  config,
  answers,
  errors,
  onChange,
  roles,
  inventory,
  showAdvanced,
  idPrefix,
  disabled,
}) => {
  const visible = visibility(config, answers, roles);
  const groupsInOrder = [{ name: '', label: '' }, ...config.groups];
  // A field naming an UNDECLARED group renders with the ungrouped leaders —
  // never a ghost the validation gate names but the screen can't show.
  const declared = new Set(config.groups.map(group => group.name));
  const bucketOf = field => (field.group && declared.has(field.group) ? field.group : '');

  return (
    <>
      {groupsInOrder.map(group => {
        if (group.name && !visible.groups.has(group.name)) {
          return null;
        }
        const members = config.fields.filter(
          field => bucketOf(field) === group.name && visible.fields.has(field.name)
        );
        if (members.length === 0) {
          return null;
        }
        // Advanced groups hide behind the ONE toggle — unless one of their
        // fields is currently in error, which must never be invisible.
        if (
          group.name &&
          group.advanced &&
          !showAdvanced &&
          !members.some(field => errors?.[field.name])
        ) {
          return null;
        }
        return (
          <div className="mb-3" key={group.name || '(ungrouped)'}>
            {group.label && <h6 className="fw-bold">{group.label}</h6>}
            {group.help && <p className="form-text text-muted mt-0">{group.help}</p>}
            <div className="row g-3">
              {members.map(field => {
                const fieldId = `${idPrefix}-${field.name}`;
                const error = errors?.[field.name] || '';
                return (
                  <div className="col-12 col-md-6" key={field.name}>
                    {field.type !== 'checkbox' && (
                      <label className="form-label" htmlFor={fieldId}>
                        {field.label || field.name}
                        {field.required && <span className="text-danger ms-1">*</span>}
                      </label>
                    )}
                    <DslFieldInput
                      field={field}
                      fieldId={fieldId}
                      value={answers[field.name]}
                      error={error}
                      onChange={value => onChange(field.name, value)}
                      inventory={inventory}
                      disabled={disabled}
                    />
                    {error && <div className="invalid-feedback d-block">{error}</div>}
                    {field.help && !error && (
                      <p className="form-text text-muted mb-0">{field.help}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

DslConfigForm.propTypes = {
  config: PropTypes.shape({
    groups: PropTypes.array.isRequired,
    fields: PropTypes.array.isRequired,
  }).isRequired,
  answers: PropTypes.object.isRequired,
  errors: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  roles: PropTypes.array,
  inventory: PropTypes.object,
  showAdvanced: PropTypes.bool,
  idPrefix: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default DslConfigForm;
