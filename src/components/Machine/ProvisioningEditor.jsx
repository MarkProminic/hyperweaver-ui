import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

import {
  getProvisioners,
  getProvisionerVersion,
  updateProvisionerDocument,
} from '../../api/provisioningAPI';

import ProvisioningFoldersTab from './ProvisioningFoldersTab';
import ProvisioningHooksTab from './ProvisioningHooksTab';
import ProvisioningPlaybooksTab from './ProvisioningPlaybooksTab';
import ProvisioningRolesTab from './ProvisioningRolesTab';
import ProvisioningScriptsTab from './ProvisioningScriptsTab';
import ProvisioningTransportTab from './ProvisioningTransportTab';
import { VarRowList, VAR_NAME_PATTERN, ROLE_NAME_PATTERN } from './ProvisioningVarRows';

/**
 * The provisioner-document editor, INLINE on the machine's Provisioning tab
 * (it replaced the Edit Provisioning modal — the tab IS the editor). PUT
 * /machines/{name} stores the document verbatim — a Hosts.yml host entry,
 * edited structured. Keys the tabs don't cover survive untouched; Raw JSON
 * is the escape hatch. Playbooks live at provisioning.ansible.playbooks —
 * sometimes an ARRAY wrapping {local:[], remote:[]} groups, sometimes one
 * group directly; reads tolerate both, writes keep the shape they found and
 * edit the FIRST group only (later groups ride untouched). Storing a FIRST
 * document on a bare machine enables the pipeline.
 */

// Variables sits before Playbooks (Mark's tab-order ruling, 2026-07-13).
// Scripts sits between them. Hooks wrap the whole run, so they sit past
// Roles. WHEN anything runs is the document's own order — no slots.
const TABS = [
  { id: 'folders', label: 'Folders' },
  { id: 'vars', label: 'Variables' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'playbooks', label: 'Playbooks' },
  { id: 'roles', label: 'Roles' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'transport', label: 'Transport' },
  { id: 'json', label: 'Raw JSON' },
];

/**
 * The FIRST playbook group's local[]/remote[] lists, whichever wrapping the
 * document uses. Execution order is the group's local[] then its remote[],
 * each in list order — the tab renders in exactly that order.
 */
const playbookListsOf = doc => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  const group = (Array.isArray(playbooks) ? playbooks[0] : playbooks) || {};
  return {
    local: Array.isArray(group.local) ? group.local : [],
    remote: Array.isArray(group.remote) ? group.remote : [],
  };
};

/**
 * Write the first group's lists back in the SAME wrapping. A list key is
 * written only when it has entries or already existed — an edit never grows
 * an empty key the document didn't carry.
 */
const withPlaybookLists = (doc, lists) => {
  const playbooks = doc?.provisioning?.ansible?.playbooks;
  const base = (Array.isArray(playbooks) ? playbooks[0] : playbooks) || {};
  const group = { ...base };
  ['local', 'remote'].forEach(key => {
    if (lists[key].length > 0 || Array.isArray(base[key])) {
      group[key] = lists[key];
    }
  });
  return {
    ...doc,
    provisioning: {
      ...(doc.provisioning || {}),
      ansible: {
        ...(doc.provisioning?.ansible || {}),
        playbooks: Array.isArray(playbooks) ? [group, ...playbooks.slice(1)] : group,
      },
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
/** Map a row transform over both hook lists when they exist. */
const mapHooks = (doc, transform) => {
  const { provisioning } = doc;
  if (!provisioning || (!Array.isArray(provisioning.pre) && !Array.isArray(provisioning.post))) {
    return doc;
  }
  return {
    ...doc,
    provisioning: {
      ...provisioning,
      ...(Array.isArray(provisioning.pre) && { pre: provisioning.pre.map(transform) }),
      ...(Array.isArray(provisioning.post) && { post: provisioning.post.map(transform) }),
    },
  };
};
/**
 * Shell scripts are bare STRINGS on the wire; the card list needs row
 * identity — wrap into {script, _ui_id} objects in editor state, unwrap
 * back to the original values on clean.
 */
const mapShellScripts = (doc, transform) => {
  const scripts = doc.provisioning?.shell?.scripts;
  if (!Array.isArray(scripts)) {
    return doc;
  }
  return {
    ...doc,
    provisioning: {
      ...doc.provisioning,
      shell: { ...doc.provisioning.shell, scripts: transform(scripts) },
    },
  };
};
const tagRows = doc => {
  let next = { ...doc };
  if (Array.isArray(next.folders)) {
    next.folders = next.folders.map(tagRow);
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.map(tagRow);
  }
  const lists = playbookListsOf(next);
  if (lists.local.length > 0 || lists.remote.length > 0) {
    next = withPlaybookLists(next, {
      local: lists.local.map(tagRow),
      remote: lists.remote.map(tagRow),
    });
  }
  next = mapShellScripts(next, list => list.map(entry => tagRow({ script: entry })));
  return mapHooks(next, tagRow);
};
const clean = doc => {
  let next = { ...doc };
  if (Array.isArray(next.folders)) {
    next.folders = next.folders.map(stripTag);
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.map(stripTag);
  }
  const lists = playbookListsOf(next);
  if (lists.local.length > 0 || lists.remote.length > 0) {
    next = withPlaybookLists(next, {
      local: lists.local.map(stripTag),
      remote: lists.remote.map(stripTag),
    });
  }
  next = mapShellScripts(next, list => list.map(row => row.script));
  return mapHooks(next, stripTag);
};

/**
 * Names that would break the Ansible run — invalid variable identifiers or
 * role names. Store refuses these (Mark's ruling); everything else is free.
 */
const invalidNameProblems = doc => {
  const problems = [];
  const checkKeys = (map, label) => {
    Object.keys(map || {}).forEach(key => {
      if (!VAR_NAME_PATTERN.test(key)) {
        problems.push(`${label} "${key}"`);
      }
    });
  };
  checkKeys(doc.vars, 'variable');
  (Array.isArray(doc.roles) ? doc.roles : []).forEach(role => {
    const name = String(role.name || '').trim();
    if (name === '' || !ROLE_NAME_PATTERN.test(name)) {
      problems.push(`role name "${name || '(empty)'}"`);
    }
    checkKeys(role.vars, `variable on ${name || 'role'}`);
    checkKeys(role.environment, `env var on ${name || 'role'}`);
  });
  return problems;
};

const ProvisioningEditor = ({ currentServer, machineName, document, onSaved }) => {
  const [doc, setDoc] = useState({});
  const [tab, setTab] = useState('folders');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleSpecs, setRoleSpecs] = useState(null);
  // provisioner.yml metadata.roles[] ordering hints — bare name → depends_on.
  const [roleHints, setRoleHints] = useState(null);
  // Registry playbook candidates (design D16) — `ansible/<file>` paths the
  // version detail lists; feeds the Playbooks tab's datalist. Advisory only;
  // agents that don't serve them yet leave this null and free text stands.
  const [playbookCandidates, setPlaybookCandidates] = useState(null);
  // The registry list feeding the catalog picker (the attach, Mark's ruling
  // 2026-07-14). null = the registry surface didn't answer (older agent
  // build / no provisioner-registry); [] = it answered EMPTY (nothing
  // imported yet) — the picker renders either way and says which.
  const [packages, setPackages] = useState(null);

  useEffect(() => {
    setPackages(null);
    if (!currentServer) {
      return;
    }
    getProvisioners(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setPackages(result.success ? result.data?.provisioners || [] : null);
      }
    );
  }, [currentServer]);

  // The catalog follows the EDITED document's attached package, so picking
  // one in the Roles tab loads its specs immediately — legacy documents
  // (Hosts.yml carried these only as header comments) arrive without the
  // keys and start blank.
  const provName = doc?.provisioner_name;
  const provVersion = doc?.provisioner_version;
  useEffect(() => {
    setRoleSpecs(null);
    setRoleHints(null);
    setPlaybookCandidates(null);
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
      const candidates = result.success ? result.data?.playbook_candidates : null;
      setPlaybookCandidates(Array.isArray(candidates) ? candidates : null);
      const hintRows = result.success ? result.data?.metadata?.roles : null;
      setRoleHints(
        Array.isArray(hintRows)
          ? Object.fromEntries(
              hintRows
                .filter(row => row && typeof row.name === 'string')
                .map(row => [row.name, Array.isArray(row.depends_on) ? row.depends_on : []])
            )
          : null
      );
    });
  }, [currentServer, provName, provVersion]);

  // Reseed from the stored document — on machine switch and whenever the
  // stored CONTENT changes (after a store, the parent reloads details). The
  // 30s detail poll hands a fresh but identical object every pass — comparing
  // content keeps it from clobbering in-progress edits, and only a machine
  // switch resets the selected tab.
  const lastSeedRef = useRef({ machine: null, json: null });
  useEffect(() => {
    const seedJson = JSON.stringify(document ?? {});
    const machineChanged = lastSeedRef.current.machine !== machineName;
    if (!machineChanged && lastSeedRef.current.json === seedJson) {
      return;
    }
    lastSeedRef.current = { machine: machineName, json: seedJson };
    const initial = tagRows(document ?? {});
    setDoc(initial);
    setJsonText(JSON.stringify(clean(initial), null, 2));
    if (machineChanged) {
      setTab('folders');
    }
    setError('');
  }, [machineName, document]);

  // Keep the JSON tab in sync with structured edits (structured wins until
  // the user applies raw JSON explicitly).
  const updateDoc = next => {
    setDoc(next);
    setJsonText(JSON.stringify(clean(next), null, 2));
  };

  const folders = Array.isArray(doc.folders) ? doc.folders : [];
  const playbookLists = playbookListsOf(doc);
  const roles = Array.isArray(doc.roles) ? doc.roles : [];
  const preHooks = Array.isArray(doc.provisioning?.pre) ? doc.provisioning.pre : [];
  const postHooks = Array.isArray(doc.provisioning?.post) ? doc.provisioning.post : [];

  /** Patch a provisioning.* key; undefined deletes it (unset). */
  const patchProvisioning = (key, value) => {
    const provisioning = { ...(doc.provisioning || {}) };
    if (value === undefined) {
      delete provisioning[key];
    } else {
      provisioning[key] = value;
    }
    updateDoc({ ...doc, provisioning });
  };

  /** Patch a settings.* key (the document's settings section); undefined deletes. */
  const patchSettings = (key, value) => {
    const nextSettings = { ...(doc.settings || {}) };
    if (value === undefined) {
      delete nextSettings[key];
    } else {
      nextSettings[key] = value;
    }
    updateDoc({ ...doc, settings: nextSettings });
  };

  // The attach: stamp (or clear) the document's package reference — the
  // catalog reloads via the effect above; the keys ride the next Store.
  const handlePackagePicked = (name, version) => {
    const next = { ...doc };
    if (name) {
      next.provisioner_name = name;
      next.provisioner_version = version;
    } else {
      delete next.provisioner_name;
      delete next.provisioner_version;
    }
    updateDoc(next);
  };

  const applyJson = () => {
    try {
      // Through updateDoc so jsonText re-canonicalizes — otherwise any
      // formatting difference deadlocks Store's unapplied-JSON guard.
      updateDoc(tagRows(JSON.parse(jsonText)));
      setError('');
    } catch (parseErr) {
      setError(`Not valid JSON: ${parseErr.message}`);
    }
  };

  const discard = () => {
    const initial = tagRows(document ?? {});
    setDoc(initial);
    setJsonText(JSON.stringify(clean(initial), null, 2));
    setError('');
  };

  const handleStore = async () => {
    // The JSON tab may hold unapplied text — refuse rather than silently
    // saving something other than what the user sees.
    if (tab === 'json' && jsonText !== JSON.stringify(clean(doc), null, 2)) {
      setError('Apply the JSON first (button below the editor) — it differs from the stored form.');
      return;
    }
    // Invalid NAMES are guaranteed Ansible run failures — refuse those and
    // nothing else (Mark's ruling).
    const problems = invalidNameProblems(clean(doc));
    if (problems.length > 0) {
      setError(`Fix invalid names before storing: ${problems.join(', ')}.`);
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
        <ProvisioningFoldersTab
          folders={folders}
          disabled={loading}
          onChange={next => updateDoc({ ...doc, folders: next })}
          makeRow={() => tagRow({ map: '', to: '', type: 'rsync' })}
        />
      )}

      {tab === 'scripts' && (
        <ProvisioningScriptsTab
          shell={doc.provisioning?.shell}
          disabled={loading}
          onChange={next => patchProvisioning('shell', next)}
          makeRow={() => tagRow({ script: '' })}
        />
      )}

      {tab === 'playbooks' && (
        <ProvisioningPlaybooksTab
          playbookLists={playbookLists}
          pathOptions={playbookCandidates}
          disabled={loading}
          onChange={next => updateDoc(withPlaybookLists(doc, next))}
          makeRow={() => tagRow({ playbook: '', run: 'once' })}
        />
      )}

      {tab === 'hooks' && (
        <ProvisioningHooksTab
          preHooks={preHooks}
          postHooks={postHooks}
          onPreChange={next => patchProvisioning('pre', next.length > 0 ? next : undefined)}
          onPostChange={next => patchProvisioning('post', next.length > 0 ? next : undefined)}
          makeRow={() =>
            tagRow({ script: '', target: 'guest', on_failure: 'abort', run: 'always' })
          }
          disabled={loading}
        />
      )}

      {tab === 'roles' && (
        <ProvisioningRolesTab
          roles={roles}
          specs={roleSpecs}
          hints={roleHints}
          disabled={loading}
          onChange={next => updateDoc({ ...doc, roles: next })}
          makeRow={(name, copyFrom) =>
            copyFrom ? tagRow(stripTag(copyFrom)) : tagRow({ name: name || '' })
          }
          packages={packages}
          packageName={typeof provName === 'string' ? provName : undefined}
          packageVersion={typeof provVersion === 'string' ? provVersion : undefined}
          onPackagePicked={handlePackagePicked}
        />
      )}

      {tab === 'transport' && (
        <ProvisioningTransportTab
          settings={doc.settings}
          disabled={loading}
          onChange={patchSettings}
        />
      )}

      {tab === 'vars' && (
        <div>
          <p className="form-text text-muted mt-0 mb-2">
            Global variables — every role and script sees them. Values keep their JSON types; lists
            and dicts edit behind the <code>{'{ }'}</code> button as YAML.
          </p>
          <VarRowList
            idPrefix="doc-vars"
            entries={doc.vars || {}}
            disabled={loading}
            onChange={next => updateDoc({ ...doc, vars: next })}
            addLabel="Add Variable"
          />
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
