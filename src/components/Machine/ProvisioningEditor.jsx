import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { getProvisionerVersion, updateProvisionerDocument } from '../../api/provisioningAPI';

/**
 * The provisioner-document editor, INLINE on the machine's Provisioning tab
 * (it replaced the Edit Provisioning modal — the tab IS the editor). PUT
 * /machines/{name} stores the document verbatim — a Hosts.yml host entry,
 * edited structured. Keys the tabs don't cover survive untouched; Raw JSON
 * is the escape hatch. Playbooks live at provisioning.ansible.playbooks —
 * sometimes an ARRAY wrapping {local:[]}, sometimes {local:[]} directly;
 * reads tolerate both, writes keep the shape they found. Storing a FIRST
 * document on a bare machine enables the pipeline.
 */

const TABS = [
  { id: 'folders', label: 'Folders' },
  { id: 'playbooks', label: 'Playbooks' },
  { id: 'roles', label: 'Roles' },
  { id: 'vars', label: 'Variables' },
  { id: 'json', label: 'Raw JSON' },
];

const FOLDER_TYPES = ['rsync', 'scp', 'virtualbox', 'disabled'];
const RUN_MODES = ['always', 'once', 'not_first'];

/** The playbooks.local list, whichever wrapping the document uses. */
const localPlaybooksOf = doc => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  if (Array.isArray(playbooks)) {
    return Array.isArray(playbooks[0]?.local) ? playbooks[0].local : [];
  }
  return Array.isArray(playbooks?.local) ? playbooks.local : [];
};

/** Write the local list back in the SAME wrapping it came in. */
const withLocalPlaybooks = (doc, local) => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  const wrapped = Array.isArray(playbooks)
    ? [{ ...(playbooks[0] || {}), local }, ...playbooks.slice(1)]
    : { ...(playbooks || {}), local };
  return {
    ...doc,
    provisioning: {
      ...(doc.provisioning || {}),
      ansible: { ...(doc.provisioning?.ansible || {}), playbooks: wrapped },
    },
  };
};

// Row identity for React keys: rows get a _ui_id when the document loads
// (and on add); clean() strips it before anything reaches the wire or the
// JSON tab — the tag never leaves the editor.
let uiIdSeq = 0;
const tagRow = row => ({ ...row, _ui_id: (uiIdSeq += 1) });
const stripTag = row => {
  const { _ui_id, ...rest } = row;
  void _ui_id;
  return rest;
};
const tagRows = doc => {
  let next = { ...doc };
  if (Array.isArray(next.folders)) {
    next.folders = next.folders.map(tagRow);
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.map(tagRow);
  }
  const local = localPlaybooksOf(next);
  if (local.length > 0) {
    next = withLocalPlaybooks(next, local.map(tagRow));
  }
  return next;
};
const clean = doc => {
  let next = { ...doc };
  if (Array.isArray(next.folders)) {
    next.folders = next.folders.map(stripTag);
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.map(stripTag);
  }
  const local = localPlaybooksOf(next);
  if (local.length > 0) {
    next = withLocalPlaybooks(next, local.map(stripTag));
  }
  return next;
};

/** Move the dragged row in front of the hovered row — array order IS the
    sync/run order on the wire, so reordering needs no tear-down. */
const reorderRows = (rows, dragId, overId) => {
  const dragged = rows.find(row => row._ui_id === dragId);
  if (!dragged || dragId === overId) {
    return rows;
  }
  const next = rows.filter(row => row._ui_id !== dragId);
  next.splice(
    next.findIndex(row => row._ui_id === overId),
    0,
    dragged
  );
  return next;
};

/** Render a vars value for editing; parse it back preserving JSON types. */
const varToText = value => (typeof value === 'string' ? value : JSON.stringify(value));
const textToVar = text => {
  try {
    return JSON.parse(text);
  } catch {
    return text; // plain string
  }
};

const varRowsOf = doc =>
  Object.entries(doc.vars || {}).map(([key, value], index) => ({
    key,
    value: varToText(value),
    id: index,
  }));

const specDescription = spec =>
  Array.isArray(spec.description) ? spec.description.join(' ') : spec.description;

const RoleOptionField = ({ roleName, name, spec, value, onSet }) => {
  const fieldId = `rolevar-${roleName}-${name}`;
  const defaultText = spec.default === undefined ? '' : varToText(spec.default);
  const blankLabel = defaultText !== '' ? `(default — ${defaultText})` : '(role default)';
  let control;
  if (spec.type === 'bool') {
    control = (
      <select
        id={fieldId}
        className="form-select form-select-sm"
        value={value === undefined ? '' : String(value)}
        onChange={e => onSet(name, e.target.value === '' ? undefined : e.target.value === 'true')}
      >
        <option value="">{blankLabel}</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  } else if (Array.isArray(spec.choices) && spec.choices.length > 0) {
    const current = value === undefined ? '' : varToText(value);
    control = (
      <select
        id={fieldId}
        className="form-select form-select-sm"
        value={current}
        onChange={e => onSet(name, e.target.value === '' ? undefined : textToVar(e.target.value))}
      >
        <option value="">{blankLabel}</option>
        {current !== '' && !spec.choices.map(String).includes(current) && (
          <option value={current}>{current}</option>
        )}
        {spec.choices.map(choice => (
          <option key={String(choice)} value={String(choice)}>
            {String(choice)}
          </option>
        ))}
      </select>
    );
  } else if (spec.type === 'int' || spec.type === 'float') {
    control = (
      <input
        id={fieldId}
        className="form-control form-control-sm"
        type="number"
        step={spec.type === 'float' ? 'any' : 1}
        placeholder={blankLabel}
        value={value ?? ''}
        onChange={e => onSet(name, e.target.value === '' ? undefined : Number(e.target.value))}
      />
    );
  } else {
    control = (
      <input
        id={fieldId}
        className="form-control form-control-sm"
        type="text"
        placeholder={blankLabel}
        value={value === undefined ? '' : varToText(value)}
        onChange={e => onSet(name, e.target.value === '' ? undefined : textToVar(e.target.value))}
      />
    );
  }
  const described = specDescription(spec);
  return (
    <div className="col-12 col-md-6">
      <label className="form-label small mb-1" htmlFor={fieldId}>
        {name}
        {spec.required && <span className="text-danger"> *</span>}
      </label>
      {control}
      {described && <span className="form-text text-muted small">{described}</span>}
    </div>
  );
};

RoleOptionField.propTypes = {
  roleName: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  spec: PropTypes.object.isRequired,
  value: PropTypes.any,
  onSet: PropTypes.func.isRequired,
};

const ProvisioningEditor = ({ currentServer, machineName, document, onSaved }) => {
  const [doc, setDoc] = useState({});
  const [tab, setTab] = useState('folders');
  const [jsonText, setJsonText] = useState('');
  const [varRows, setVarRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The row being dragged for reorder — {list: 'folders'|'playbooks', id}.
  const [dragRow, setDragRow] = useState(null);
  const [roleSpecs, setRoleSpecs] = useState(null);

  useEffect(() => {
    setRoleSpecs(null);
    const provName = document?.provisioner_name;
    const provVersion = document?.provisioner_version;
    if (!currentServer || !provName || !provVersion) {
      return;
    }
    getProvisionerVersion(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      provName,
      provVersion
    ).then(result => {
      setRoleSpecs(result.success ? result.data?.role_specs?.roles || null : null);
    });
  }, [currentServer, document]);

  // Reseed from the stored document — on machine switch and after each
  // store (the parent reloads details, the document prop changes).
  useEffect(() => {
    const initial = tagRows(document ?? {});
    setDoc(initial);
    setJsonText(JSON.stringify(clean(initial), null, 2));
    setVarRows(varRowsOf(initial));
    setTab('folders');
    setError('');
  }, [machineName, document]);

  // Keep the JSON tab in sync with structured edits (structured wins until
  // the user applies raw JSON explicitly).
  const updateDoc = next => {
    setDoc(next);
    setJsonText(JSON.stringify(clean(next), null, 2));
  };

  const folders = Array.isArray(doc.folders) ? doc.folders : [];
  const playbooks = localPlaybooksOf(doc);
  const roles = Array.isArray(doc.roles) ? doc.roles : [];

  const setFolder = (index, patch) =>
    updateDoc({
      ...doc,
      folders: folders.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  const setPlaybook = (index, patch) =>
    updateDoc(
      withLocalPlaybooks(
        doc,
        playbooks.map((row, i) => (i === index ? { ...row, ...patch } : row))
      )
    );
  const setRole = (index, patch) =>
    updateDoc({
      ...doc,
      roles: roles.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });

  const applyVarRows = rows => {
    setVarRows(rows);
    const vars = {};
    rows.forEach(row => {
      if (row.key.trim()) {
        vars[row.key.trim()] = textToVar(row.value);
      }
    });
    updateDoc({ ...doc, vars });
  };

  const setVar = (key, value) => {
    const vars = { ...(doc.vars || {}) };
    if (value === undefined) {
      delete vars[key];
    } else {
      vars[key] = value;
    }
    const next = { ...doc, vars };
    updateDoc(next);
    setVarRows(varRowsOf(next));
  };

  const applyJson = () => {
    try {
      const parsed = tagRows(JSON.parse(jsonText));
      setDoc(parsed);
      setVarRows(varRowsOf(parsed));
      setError('');
    } catch (parseErr) {
      setError(`Not valid JSON: ${parseErr.message}`);
    }
  };

  const discard = () => {
    const initial = tagRows(document ?? {});
    setDoc(initial);
    setJsonText(JSON.stringify(clean(initial), null, 2));
    setVarRows(varRowsOf(initial));
    setError('');
  };

  const handleStore = async () => {
    // The JSON tab may hold unapplied text — refuse rather than silently
    // saving something other than what the user sees.
    if (tab === 'json' && jsonText !== JSON.stringify(clean(doc), null, 2)) {
      setError('Apply the JSON first (button below the editor) — it differs from the stored form.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await updateProvisionerDocument(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      clean(doc)
    );
    setLoading(false);
    if (result.success) {
      onSaved(result.data?.message || 'Provisioning document stored');
    } else {
      setError(result.message);
    }
  };

  return (
    <div>
      <h5 className="fs-6 fw-bold mt-3 mb-2">
        <i className="fas fa-pen-to-square me-2" />
        Provisioning Document
      </h5>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {TABS.map(entry => (
          <li key={entry.id} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-2 ${tab === entry.id ? 'active' : ''}`}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'folders' && (
        <div className="d-flex flex-column gap-2">
          <p className="form-text text-muted mt-0 mb-1">
            Folders sync top to bottom — drag the grip to reorder. <strong>Sync back</strong> also
            pulls the folder guest→host (To→From) after provisioning and on an ad-hoc Sync Back
            (rsync/scp folders only).
          </p>
          {folders.map((folder, index) => (
            <div
              className={`border rounded p-2 ${dragRow?.list === 'folders' && dragRow.id === folder._ui_id ? 'opacity-50 border-primary' : ''}`}
              key={folder._ui_id}
              role="listitem"
              onDragOver={e => {
                e.preventDefault();
                if (dragRow?.list === 'folders' && dragRow.id !== folder._ui_id) {
                  updateDoc({
                    ...doc,
                    folders: reorderRows(folders, dragRow.id, folder._ui_id),
                  });
                }
              }}
            >
              <div className="row g-2 align-items-end">
                <div className="col-auto align-self-center">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted"
                    draggable
                    style={{ cursor: 'grab' }}
                    title="Drag to reorder"
                    onDragStart={() => setDragRow({ list: 'folders', id: folder._ui_id })}
                    onDragEnd={() => setDragRow(null)}
                  >
                    <i className="fas fa-grip-vertical" />
                  </button>
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small mb-1" htmlFor={`folder-map-${index}`}>
                    From (host)
                  </label>
                  <input
                    id={`folder-map-${index}`}
                    className="form-control form-control-sm"
                    value={folder.map ?? ''}
                    onChange={e => setFolder(index, { map: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small mb-1" htmlFor={`folder-to-${index}`}>
                    To (guest)
                  </label>
                  <input
                    id={`folder-to-${index}`}
                    className="form-control form-control-sm"
                    value={folder.to ?? ''}
                    onChange={e => setFolder(index, { to: e.target.value })}
                  />
                </div>
                <div className="col-4 col-md-2">
                  <label className="form-label small mb-1" htmlFor={`folder-type-${index}`}>
                    Type
                  </label>
                  <select
                    id={`folder-type-${index}`}
                    className="form-select form-select-sm"
                    value={folder.type ?? 'rsync'}
                    onChange={e => setFolder(index, { type: e.target.value })}
                  >
                    {FOLDER_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-4 col-md-2">
                  <div className="form-check mt-3">
                    <input
                      id={`folder-disabled-${index}`}
                      className="form-check-input"
                      type="checkbox"
                      checked={!!folder.disabled}
                      onChange={e => setFolder(index, { disabled: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor={`folder-disabled-${index}`}>
                      Disabled
                    </label>
                  </div>
                </div>
                <div className="col-4 col-md-2">
                  <div className="form-check mt-3">
                    <input
                      id={`folder-syncback-${index}`}
                      className="form-check-input"
                      type="checkbox"
                      checked={!!folder.syncback}
                      disabled={folder.type === 'virtualbox' || !!folder.disabled}
                      onChange={e => setFolder(index, { syncback: e.target.checked })}
                    />
                    <label
                      className="form-check-label small"
                      htmlFor={`folder-syncback-${index}`}
                      title="Pull this folder from the guest (To) back to the host (From) after provisioning, or on an ad-hoc Sync Back"
                    >
                      Sync back
                    </label>
                  </div>
                </div>
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    aria-label="Remove folder"
                    onClick={() =>
                      updateDoc({
                        ...doc,
                        folders: folders.filter(entry => entry._ui_id !== folder._ui_id),
                      })
                    }
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
                {folder.description && (
                  <div className="col-12">
                    <span className="form-text text-muted small">{folder.description}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() =>
                updateDoc({
                  ...doc,
                  folders: [...folders, tagRow({ map: '', to: '', type: 'rsync' })],
                })
              }
            >
              <i className="fas fa-plus me-2" />
              Add Folder
            </button>
          </div>
        </div>
      )}

      {tab === 'playbooks' && (
        <div className="d-flex flex-column gap-2">
          <p className="form-text text-muted mt-0 mb-1">
            Playbooks run top to bottom — drag the grip to reorder. Primary fields only — everything
            else on each playbook (interpreter, collections, callbacks…) is preserved untouched; use
            Raw JSON for those.
          </p>
          {playbooks.map((playbook, index) => (
            <div
              className={`border rounded p-2 ${dragRow?.list === 'playbooks' && dragRow.id === playbook._ui_id ? 'opacity-50 border-primary' : ''}`}
              key={playbook._ui_id}
              role="listitem"
              onDragOver={e => {
                e.preventDefault();
                if (dragRow?.list === 'playbooks' && dragRow.id !== playbook._ui_id) {
                  updateDoc(
                    withLocalPlaybooks(doc, reorderRows(playbooks, dragRow.id, playbook._ui_id))
                  );
                }
              }}
            >
              <div className="row g-2 align-items-end">
                <div className="col-auto align-self-center">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted"
                    draggable
                    style={{ cursor: 'grab' }}
                    title="Drag to reorder"
                    onDragStart={() => setDragRow({ list: 'playbooks', id: playbook._ui_id })}
                    onDragEnd={() => setDragRow(null)}
                  >
                    <i className="fas fa-grip-vertical" />
                  </button>
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label small mb-1" htmlFor={`playbook-path-${index}`}>
                    Playbook
                  </label>
                  <input
                    id={`playbook-path-${index}`}
                    className="form-control form-control-sm"
                    value={playbook.playbook ?? ''}
                    onChange={e => setPlaybook(index, { playbook: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small mb-1" htmlFor={`playbook-run-${index}`}>
                    Run
                  </label>
                  <select
                    id={`playbook-run-${index}`}
                    className="form-select form-select-sm"
                    value={playbook.run ?? 'once'}
                    onChange={e => setPlaybook(index, { run: e.target.value })}
                  >
                    {RUN_MODES.map(mode => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    aria-label="Remove playbook"
                    onClick={() =>
                      updateDoc(
                        withLocalPlaybooks(
                          doc,
                          playbooks.filter(entry => entry._ui_id !== playbook._ui_id)
                        )
                      )
                    }
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
                {playbook.description && (
                  <div className="col-12">
                    <span className="form-text text-muted small">{playbook.description}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() =>
                updateDoc(
                  withLocalPlaybooks(doc, [...playbooks, tagRow({ playbook: '', run: 'once' })])
                )
              }
            >
              <i className="fas fa-plus me-2" />
              Add Playbook
            </button>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="d-flex flex-column gap-2">
          {roles.map((role, index) => {
            const spec = role.name ? roleSpecs?.[role.name] : null;
            const options = spec?.options || {};
            const optionNames = Object.keys(options);
            const setCount = optionNames.filter(
              name => (doc.vars || {})[name] !== undefined
            ).length;
            return (
              <div className="border rounded p-2" key={role._ui_id}>
                <div className="row g-2 align-items-end">
                  <div className="col-7 col-md-6">
                    <label className="form-label small mb-1" htmlFor={`role-name-${index}`}>
                      Role
                    </label>
                    <input
                      id={`role-name-${index}`}
                      className="form-control form-control-sm"
                      value={role.name ?? ''}
                      onChange={e => setRole(index, { name: e.target.value })}
                    />
                  </div>
                  <div className="col-3 col-md-3">
                    <label className="form-label small mb-1" htmlFor={`role-tags-${index}`}>
                      Tags
                    </label>
                    <input
                      id={`role-tags-${index}`}
                      className="form-control form-control-sm"
                      placeholder="e.g. always"
                      value={role.tags ?? ''}
                      onChange={e =>
                        setRole(
                          index,
                          e.target.value ? { tags: e.target.value } : { tags: undefined }
                        )
                      }
                    />
                  </div>
                  <div className="col-auto">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      aria-label="Remove role"
                      onClick={() =>
                        updateDoc({
                          ...doc,
                          roles: roles.filter(entry => entry._ui_id !== role._ui_id),
                        })
                      }
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                  {spec?.short_description && (
                    <div className="col-12">
                      <span className="form-text text-muted small">{spec.short_description}</span>
                    </div>
                  )}
                  {optionNames.length > 0 && (
                    <div className="col-12">
                      <details>
                        <summary className="small fw-semibold">
                          Variables ({setCount}/{optionNames.length} set)
                        </summary>
                        <div className="row g-2 mt-1">
                          {optionNames.map(name => (
                            <RoleOptionField
                              key={name}
                              roleName={role.name}
                              name={name}
                              spec={options[name]}
                              value={(doc.vars || {})[name]}
                              onSet={setVar}
                            />
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => updateDoc({ ...doc, roles: [...roles, tagRow({ name: '' })] })}
            >
              <i className="fas fa-plus me-2" />
              Add Role
            </button>
          </div>
        </div>
      )}

      {tab === 'vars' && (
        <div className="d-flex flex-column gap-2">
          <p className="form-text text-muted mt-0 mb-1">
            Values keep their JSON types — <code>true</code>/<code>false</code>/numbers parse as
            such, anything else stays a string.
          </p>
          {varRows.map((row, index) => (
            <div className="row g-2 align-items-center" key={row.id}>
              <div className="col-5 col-md-4">
                <input
                  className="form-control form-control-sm"
                  aria-label="Variable name"
                  value={row.key}
                  onChange={e =>
                    applyVarRows(
                      varRows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r))
                    )
                  }
                />
              </div>
              <div className="col-5 col-md-5">
                <input
                  className="form-control form-control-sm font-monospace"
                  aria-label="Variable value"
                  value={row.value}
                  onChange={e =>
                    applyVarRows(
                      varRows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r))
                    )
                  }
                />
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove variable"
                  onClick={() => applyVarRows(varRows.filter(entry => entry.id !== row.id))}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => applyVarRows([...varRows, { key: '', value: '', id: Date.now() }])}
            >
              <i className="fas fa-plus me-2" />
              Add Variable
            </button>
          </div>
        </div>
      )}

      {tab === 'json' && (
        <>
          <textarea
            className="form-control font-monospace"
            rows={16}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            disabled={loading}
            aria-label="Provisioner document JSON"
            spellCheck={false}
          />
          <button type="button" className="btn btn-sm btn-outline-primary mt-2" onClick={applyJson}>
            Apply JSON to the form
          </button>
        </>
      )}

      <div className="d-flex gap-2 mt-3 border-top pt-3">
        <button type="button" className="btn btn-primary" onClick={handleStore} disabled={loading}>
          {loading ? (
            <i className="fas fa-spinner fa-spin me-2" />
          ) : (
            <i className="fas fa-check me-2" />
          )}
          Store Document
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={discard}
          disabled={loading}
        >
          Discard Edits
        </button>
      </div>
    </div>
  );
};

ProvisioningEditor.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  document: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
};

export default ProvisioningEditor;
