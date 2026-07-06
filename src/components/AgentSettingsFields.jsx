import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

// Organize the flat GET /settings document into tab sections (top-level objects)
// holding fields + nested subsections.
export const organizeBySection = settingsData => {
  const sections = [];

  const collectSectionContent = (obj, basePath = []) => {
    const content = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a subsection
        content.push({
          type: 'subsection',
          name: key,
          path: [...basePath, key],
          fields: collectSectionContent(value, [...basePath, key]),
        });
      } else {
        // This is a field
        content.push({
          type: 'field',
          key,
          value,
          path: [...basePath, key],
        });
      }
    });

    return content;
  };

  Object.entries(settingsData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sections.push({
        name: key,
        content: collectSectionContent(value, [key]),
      });
    }
  });

  return sections;
};

// Walk the schema to the descriptor for a field path. Object nodes nest their
// children under `properties`; free-form map nodes (e.g. logging.categories)
// describe every child through a `values` vocabulary instead — synthesized here
// as an enum so map entries render as dropdowns.
export const schemaNodeForPath = (schema, path) => {
  let node = schema?.[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!node) {
      return null;
    }
    if (node.properties) {
      node = node.properties[path[i]];
    } else if (Array.isArray(node.values)) {
      node = { type: 'string', enum: node.values };
    } else {
      return null;
    }
  }
  return node || null;
};

// Editable JSON field for array/object values that have no flat representation
// (e.g. artifact storage locations: an array of objects, which would otherwise
// stringify to "[object Object]"). The raw text is held locally so the user can
// type freely; the value is only committed to settings when the JSON parses.
const JsonField = ({ fieldId, label, value, onChange, description }) => {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  // Resync when the value changes from outside (settings reload / server switch)
  // without clobbering an in-progress edit that already matches the value.
  useEffect(() => {
    setText(prev => {
      try {
        if (JSON.stringify(JSON.parse(prev)) === JSON.stringify(value)) {
          return prev;
        }
      } catch {
        // prev is mid-edit invalid JSON; fall through to adopt the new value
      }
      return JSON.stringify(value, null, 2);
    });
    setError('');
  }, [value]);

  const handleChange = e => {
    const next = e.target.value;
    setText(next);
    try {
      onChange(JSON.parse(next));
      setError('');
    } catch (parseErr) {
      setError(parseErr.message);
    }
  };

  return (
    <div className="col-12">
      <div className="mb-3">
        <label className="form-label" htmlFor={fieldId}>
          {label}
        </label>
        <textarea
          id={fieldId}
          className={`form-control font-monospace${error ? ' is-invalid' : ''}`}
          rows="8"
          value={text}
          onChange={handleChange}
          spellCheck={false}
        />
        {error ? (
          <div className="invalid-feedback">
            Invalid JSON — changes won&apos;t be saved until corrected.
          </div>
        ) : (
          <p className="form-text text-muted">
            {description || 'Structured value, edited as JSON.'}
          </p>
        )}
      </div>
    </div>
  );
};

JsonField.propTypes = {
  fieldId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  onChange: PropTypes.func.isRequired,
  description: PropTypes.string,
};

const renderField = (item, schema, onSettingChange) => {
  const { key, value, path } = item;
  const fieldId = path.join('.');
  const descriptor = schemaNodeForPath(schema, path);
  const help = descriptor?.description;

  // Boolean → Bootstrap switch; the label carries the field name.
  if (typeof value === 'boolean') {
    return (
      <div key={fieldId} className="col-12 col-lg-6">
        <div className="mb-3">
          <div className="form-check form-switch">
            <input
              id={fieldId}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={value}
              onChange={e => onSettingChange(path, e.target.checked)}
            />
            <label className="form-check-label" htmlFor={fieldId}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
          </div>
          {help && <p className="form-text text-muted mb-0">{help}</p>}
        </div>
      </div>
    );
  }

  const isArray = Array.isArray(value);

  // Arrays of objects (e.g. artifact storage locations) have no flat input —
  // edit them as JSON instead of stringifying each entry to "[object Object]".
  if (isArray && value.some(entry => entry !== null && typeof entry === 'object')) {
    return (
      <JsonField
        key={fieldId}
        fieldId={fieldId}
        label={key.replace(/_/g, ' ')}
        value={value}
        onChange={parsed => onSettingChange(path, parsed)}
        description={help}
      />
    );
  }

  let inputElement;
  if (!isArray && Array.isArray(descriptor?.enum)) {
    // Schema enum → dropdown. A current value outside the vocabulary (hand-edited
    // config) stays selectable so opening the page never silently rewrites it.
    inputElement = (
      <select
        id={fieldId}
        className="form-select"
        value={value}
        onChange={e =>
          onSettingChange(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)
        }
      >
        {!descriptor.enum.includes(value) && <option value={value}>{String(value)}</option>}
        {descriptor.enum.map(option => (
          <option key={option} value={option}>
            {String(option)}
          </option>
        ))}
      </select>
    );
  } else if (isArray) {
    inputElement = (
      <textarea
        id={fieldId}
        className="form-control"
        rows="6"
        value={value.join('\n')}
        onChange={e => onSettingChange(path, e.target.value.split('\n'))}
      />
    );
  } else {
    // Empty string is a meaningful default on some fields ("resolve at runtime") —
    // the schema description states what empty resolves to, surfaced as placeholder.
    inputElement = (
      <input
        id={fieldId}
        className="form-control"
        type={typeof value === 'number' ? 'number' : 'text'}
        value={value}
        min={typeof value === 'number' ? descriptor?.min : undefined}
        max={typeof value === 'number' ? descriptor?.max : undefined}
        placeholder={value === '' && help ? help : undefined}
        onChange={e =>
          onSettingChange(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)
        }
      />
    );
  }

  return (
    <div key={fieldId} className={isArray ? 'col-12' : 'col-12 col-lg-6'}>
      <div className="mb-3">
        <label className="form-label" htmlFor={fieldId}>
          {key.replace(/_/g, ' ')}
        </label>
        {inputElement}
        {help && <p className="form-text text-muted mb-0">{help}</p>}
      </div>
    </div>
  );
};

// Render a list of items (fields + nested subsections) as grid columns in a row.
const renderItems = (items, schema, onSettingChange) =>
  items.map(item => {
    if (item.type === 'subsection') {
      const subHelp = schemaNodeForPath(schema, item.path)?.description;
      return (
        <div key={item.name} className="col-12">
          <h4 className="fs-6 fw-semibold text-muted mt-2 mb-2">
            {item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h4>
          {subHelp && <p className="form-text text-muted">{subHelp}</p>}
          <div className="row g-3">{renderItems(item.fields, schema, onSettingChange)}</div>
        </div>
      );
    }
    return renderField(item, schema, onSettingChange);
  });

/**
 * Schema-decorated settings field list: values from GET /settings drive structure,
 * the schema only decorates (enum→dropdown, min/max, description help text).
 */
const SettingsFieldList = ({ items, schema, onSettingChange }) => (
  <>{renderItems(items, schema, onSettingChange)}</>
);

SettingsFieldList.propTypes = {
  items: PropTypes.array.isRequired,
  schema: PropTypes.object,
  onSettingChange: PropTypes.func.isRequired,
};

export default SettingsFieldList;
