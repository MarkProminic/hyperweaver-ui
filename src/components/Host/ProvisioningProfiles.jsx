import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { getAllMachines, getMachineDetails } from '../../api/machineAPI';
import {
  getProvisioningProfiles,
  createProvisioningProfile,
  updateProvisioningProfile,
  deleteProvisioningProfile,
  updateProvisionerDocument,
  provisionMachine,
} from '../../api/provisioningAPI';
import { ConfirmModal, FormModal } from '../common';

/**
 * Provisioning profiles (catalog §9): reusable credentials/folders/
 * provisioners/variables bundles — compose provisioning WITHOUT a
 * provisioner package (Mark's intent). CRUD against /provisioning/profiles;
 * APPLY is UI-side: merge the profile's pieces into the machine's stored
 * provisioner document (PUT — DB-immediate), then optionally kick
 * /provision. The editor is STRUCTURED (Mark's ruling — no raw-JSON walls):
 * credentials fields, folder rows, playbook rows, variable rows; unknown
 * keys on rows survive round-trips untouched.
 */

const FOLDER_TYPES = ['rsync', 'scp'];
const RUN_MODES = ['always', 'once', 'not_first'];

let rowSeq = 0;
const rowId = () => {
  rowSeq += 1;
  return rowSeq;
};

const varToText = value => (typeof value === 'string' ? value : JSON.stringify(value));
const textToVar = text => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const emptyForm = () => ({
  name: '',
  description: '',
  creds: { username: '', password: '', ssh_key_path: '' },
  folders: [],
  provisioners: [],
  vars: [],
});

const toForm = profile => ({
  name: profile.name || '',
  description: profile.description || '',
  creds: {
    username: profile.default_credentials?.username || '',
    password: profile.default_credentials?.password || '',
    ssh_key_path: profile.default_credentials?.ssh_key_path || '',
  },
  folders: (profile.default_sync_folders || []).map(folder => ({ ...folder, _id: rowId() })),
  provisioners: (profile.default_provisioners || []).map(playbook => ({
    ...playbook,
    _id: rowId(),
  })),
  vars: Object.entries(profile.default_variables || {}).map(([key, value]) => ({
    _id: rowId(),
    key,
    value: varToText(value),
  })),
});

const stripId = row => {
  const { _id, ...rest } = row;
  void _id;
  return rest;
};

/** The wire body from the structured form — empty sections stay absent. */
const buildBody = form => {
  const body = { name: form.name.trim() };
  if (form.description.trim()) {
    body.description = form.description.trim();
  }
  const creds = {};
  if (form.creds.username.trim()) {
    creds.username = form.creds.username.trim();
  }
  if (form.creds.password) {
    creds.password = form.creds.password;
  }
  if (form.creds.ssh_key_path.trim()) {
    creds.ssh_key_path = form.creds.ssh_key_path.trim();
  }
  if (Object.keys(creds).length > 0) {
    body.default_credentials = creds;
  }
  const folders = form.folders.map(stripId).filter(folder => folder.map || folder.to);
  if (folders.length > 0) {
    body.default_sync_folders = folders;
  }
  const provisioners = form.provisioners.map(stripId).filter(playbook => playbook.playbook);
  if (provisioners.length > 0) {
    body.default_provisioners = provisioners;
  }
  const vars = {};
  form.vars.forEach(row => {
    if (row.key.trim()) {
      vars[row.key.trim()] = textToVar(row.value);
    }
  });
  if (Object.keys(vars).length > 0) {
    body.default_variables = vars;
  }
  return body;
};

/**
 * Merge a profile into a stored provisioner document (a Hosts.yml host
 * entry): credentials → settings.vagrant_*, folders → folders[],
 * provisioners → provisioning.ansible.playbooks.local[], variables →
 * vars{}. Profile pieces win over the document's existing values.
 */
const mergeProfileIntoDocument = (document, profile) => {
  const doc = { ...(document || {}) };
  if (profile.default_credentials && typeof profile.default_credentials === 'object') {
    const creds = profile.default_credentials;
    doc.settings = { ...(doc.settings || {}) };
    if (creds.username) {
      doc.settings.vagrant_user = creds.username;
    }
    if (creds.password) {
      doc.settings.vagrant_user_pass = creds.password;
    }
    if (creds.ssh_key_path) {
      doc.settings.vagrant_user_private_key_path = creds.ssh_key_path;
    }
  }
  if (Array.isArray(profile.default_sync_folders) && profile.default_sync_folders.length > 0) {
    doc.folders = profile.default_sync_folders;
  }
  if (Array.isArray(profile.default_provisioners) && profile.default_provisioners.length > 0) {
    doc.provisioning = {
      ...(doc.provisioning || {}),
      ansible: {
        ...(doc.provisioning?.ansible || {}),
        playbooks: {
          ...(doc.provisioning?.ansible?.playbooks || {}),
          local: profile.default_provisioners,
        },
      },
    };
  }
  if (profile.default_variables && typeof profile.default_variables === 'object') {
    doc.vars = { ...(doc.vars || {}), ...profile.default_variables };
  }
  return doc;
};

/** One-line summary chips so the list says what a profile carries. */
const profileSummary = profile =>
  [
    profile.default_credentials?.username && `user ${profile.default_credentials.username}`,
    profile.default_sync_folders?.length && `${profile.default_sync_folders.length} folders`,
    profile.default_provisioners?.length && `${profile.default_provisioners.length} playbooks`,
    profile.default_variables &&
      Object.keys(profile.default_variables).length > 0 &&
      `${Object.keys(profile.default_variables).length} vars`,
  ]
    .filter(Boolean)
    .join(' · ');

const ProvisioningProfiles = ({ server }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);
  const [machineRows, setMachineRows] = useState([]);
  const [applyMachine, setApplyMachine] = useState('');
  const [applyProvision, setApplyProvision] = useState(false);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await getProvisioningProfiles(server.hostname, server.port, server.protocol);
    if (result.success) {
      setProfiles(result.data?.profiles || []);
      setMsg('');
    } else {
      report(`Profiles unavailable: ${result.message}`, 'warning');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    load();
  }, [load]);

  const setFolder = (id, patch) =>
    setForm(prev => ({
      ...prev,
      folders: prev.folders.map(row => (row._id === id ? { ...row, ...patch } : row)),
    }));
  const setProv = (id, patch) =>
    setForm(prev => ({
      ...prev,
      provisioners: prev.provisioners.map(row => (row._id === id ? { ...row, ...patch } : row)),
    }));
  const setVar = (id, patch) =>
    setForm(prev => ({
      ...prev,
      vars: prev.vars.map(row => (row._id === id ? { ...row, ...patch } : row)),
    }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      report('A profile needs a unique name.', 'danger');
      return;
    }
    setLoading(true);
    const body = buildBody(form);
    const result = editingId
      ? await updateProvisioningProfile(
          server.hostname,
          server.port,
          server.protocol,
          editingId,
          body
        )
      : await createProvisioningProfile(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      setEditorOpen(false);
      report(`Profile ${editingId ? 'updated' : 'created'}.`, 'success');
      load();
    } else {
      report(`Save failed: ${result.message}`, 'danger');
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteProvisioningProfile(
      server.hostname,
      server.port,
      server.protocol,
      deleteTarget.id
    );
    setLoading(false);
    setDeleteTarget(null);
    if (result.success) {
      report('Profile deleted.', 'success');
      load();
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
    }
  };

  const openApply = profile => {
    setApplyTarget(profile);
    setApplyMachine('');
    setApplyProvision(false);
    getAllMachines(server.hostname, server.port, server.protocol).then(result => {
      setMachineRows(result.success ? result.data?.machines || [] : []);
    });
  };

  const handleApply = async () => {
    if (!applyMachine) {
      report('Pick a machine to apply the profile to.', 'danger');
      return;
    }
    setLoading(true);
    const details = await getMachineDetails(
      server.hostname,
      server.port,
      server.protocol,
      applyMachine
    );
    if (!details.success) {
      setLoading(false);
      report(`Could not read ${applyMachine}: ${details.message}`, 'danger');
      return;
    }
    let configuration = details.data?.configuration;
    if (typeof configuration === 'string') {
      try {
        configuration = JSON.parse(configuration);
      } catch {
        configuration = {};
      }
    }
    const merged = mergeProfileIntoDocument(configuration?.provisioner, applyTarget);
    const putResult = await updateProvisionerDocument(
      server.hostname,
      server.port,
      server.protocol,
      applyMachine,
      merged
    );
    if (!putResult.success) {
      setLoading(false);
      report(`Storing the document failed: ${putResult.message}`, 'danger');
      return;
    }
    let text = `Profile "${applyTarget.name}" merged into ${applyMachine}'s provisioner document.`;
    if (applyProvision) {
      const provisionResult = await provisionMachine(
        server.hostname,
        server.port,
        server.protocol,
        applyMachine
      );
      text += provisionResult.success
        ? ` Provisioning queued (task ${provisionResult.data?.parent_task_id || '?'}).`
        : ` Provisioning failed to queue: ${provisionResult.message}`;
    }
    setLoading(false);
    setApplyTarget(null);
    report(text, 'success');
  };

  return (
    <div>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="d-flex gap-2 mb-3">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm());
            setEditorOpen(true);
          }}
          disabled={loading}
        >
          <i className="fas fa-plus me-2" />
          New Profile
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={load}
          disabled={loading}
        >
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {!loading && profiles.length === 0 && (
        <div className="alert alert-info">
          No profiles yet — a profile bundles credentials, sync folders, playbooks, and variables so
          machines can be provisioned without a provisioner package.
        </div>
      )}

      <div className="d-flex flex-column gap-2">
        {profiles.map(profile => (
          <div
            className="d-flex justify-content-between align-items-center border rounded p-2"
            key={profile.id || profile.name}
          >
            <div>
              <span className="fw-semibold">{profile.name}</span>
              {profile.description && <div className="small text-muted">{profile.description}</div>}
              {profileSummary(profile) && (
                <div className="small text-muted">{profileSummary(profile)}</div>
              )}
            </div>
            <div className="d-flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                title="Apply to a machine"
                onClick={() => openApply(profile)}
                disabled={loading}
              >
                <i className="fas fa-arrow-right-to-bracket" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                title="Edit"
                onClick={() => {
                  setEditingId(profile.id);
                  setForm(toForm(profile));
                  setEditorOpen(true);
                }}
                disabled={loading}
              >
                <i className="fas fa-pen-to-square" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                title="Delete"
                onClick={() => setDeleteTarget(profile)}
                disabled={loading}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <FormModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSave}
        title={editingId ? `Edit Profile: ${form.name}` : 'New Provisioning Profile'}
        icon="fas fa-layer-group"
        submitText={editingId ? 'Save' : 'Create'}
        loading={loading}
        showCancelButton
      >
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="profile-name">
              Name (unique)
            </label>
            <input
              id="profile-name"
              className="form-control"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="profile-description">
              Description
            </label>
            <input
              id="profile-description"
              className="form-control"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <h6 className="fw-bold">Credentials</h6>
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="profile-cred-user">
              Username
            </label>
            <input
              id="profile-cred-user"
              className="form-control"
              value={form.creds.username}
              onChange={e =>
                setForm({ ...form, creds: { ...form.creds, username: e.target.value } })
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="profile-cred-pass">
              Password (optional)
            </label>
            <input
              id="profile-cred-pass"
              className="form-control"
              type="text"
              value={form.creds.password}
              onChange={e =>
                setForm({ ...form, creds: { ...form.creds, password: e.target.value } })
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="profile-cred-key">
              SSH key path (optional, agent host)
            </label>
            <input
              id="profile-cred-key"
              className="form-control"
              value={form.creds.ssh_key_path}
              onChange={e =>
                setForm({ ...form, creds: { ...form.creds, ssh_key_path: e.target.value } })
              }
            />
          </div>
        </div>

        <h6 className="fw-bold">Sync Folders</h6>
        <div className="d-flex flex-column gap-2 mb-2">
          {form.folders.map(row => (
            <div className="row g-2 align-items-end" key={row._id}>
              <div className="col-4 col-md-4">
                <label className="form-label small mb-1" htmlFor={`profile-folder-map-${row._id}`}>
                  From (host)
                </label>
                <input
                  id={`profile-folder-map-${row._id}`}
                  className="form-control form-control-sm"
                  value={row.map ?? ''}
                  onChange={e => setFolder(row._id, { map: e.target.value })}
                />
              </div>
              <div className="col-4 col-md-4">
                <label className="form-label small mb-1" htmlFor={`profile-folder-to-${row._id}`}>
                  To (guest)
                </label>
                <input
                  id={`profile-folder-to-${row._id}`}
                  className="form-control form-control-sm"
                  value={row.to ?? ''}
                  onChange={e => setFolder(row._id, { to: e.target.value })}
                />
              </div>
              <div className="col-3 col-md-2">
                <label className="form-label small mb-1" htmlFor={`profile-folder-type-${row._id}`}>
                  Type
                </label>
                <select
                  id={`profile-folder-type-${row._id}`}
                  className="form-select form-select-sm"
                  value={row.type ?? 'rsync'}
                  onChange={e => setFolder(row._id, { type: e.target.value })}
                >
                  {FOLDER_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove folder"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      folders: prev.folders.filter(entry => entry._id !== row._id),
                    }))
                  }
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mb-3"
          onClick={() =>
            setForm(prev => ({
              ...prev,
              folders: [...prev.folders, { _id: rowId(), map: '', to: '', type: 'rsync' }],
            }))
          }
        >
          <i className="fas fa-plus me-2" />
          Add Folder
        </button>

        <h6 className="fw-bold">Playbooks</h6>
        <div className="d-flex flex-column gap-2 mb-2">
          {form.provisioners.map(row => (
            <div className="row g-2 align-items-end" key={row._id}>
              <div className="col-6 col-md-6">
                <label
                  className="form-label small mb-1"
                  htmlFor={`profile-prov-playbook-${row._id}`}
                >
                  Playbook (guest path)
                </label>
                <input
                  id={`profile-prov-playbook-${row._id}`}
                  className="form-control form-control-sm"
                  value={row.playbook ?? ''}
                  onChange={e => setProv(row._id, { playbook: e.target.value })}
                />
              </div>
              <div className="col-4 col-md-3">
                <label className="form-label small mb-1" htmlFor={`profile-prov-run-${row._id}`}>
                  Run
                </label>
                <select
                  id={`profile-prov-run-${row._id}`}
                  className="form-select form-select-sm"
                  value={row.run ?? 'once'}
                  onChange={e => setProv(row._id, { run: e.target.value })}
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
                    setForm(prev => ({
                      ...prev,
                      provisioners: prev.provisioners.filter(entry => entry._id !== row._id),
                    }))
                  }
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mb-3"
          onClick={() =>
            setForm(prev => ({
              ...prev,
              provisioners: [...prev.provisioners, { _id: rowId(), playbook: '', run: 'once' }],
            }))
          }
        >
          <i className="fas fa-plus me-2" />
          Add Playbook
        </button>

        <h6 className="fw-bold">Variables</h6>
        <p className="form-text text-muted mt-0 mb-2">
          JSON-typed values — <code>true</code>/<code>false</code>/numbers parse as such, anything
          else stays a string.
        </p>
        <div className="d-flex flex-column gap-2 mb-2">
          {form.vars.map(row => (
            <div className="row g-2 align-items-center" key={row._id}>
              <div className="col-5 col-md-4">
                <input
                  className="form-control form-control-sm"
                  aria-label="Variable name"
                  value={row.key}
                  onChange={e => setVar(row._id, { key: e.target.value })}
                />
              </div>
              <div className="col-5 col-md-5">
                <input
                  className="form-control form-control-sm font-monospace"
                  aria-label="Variable value"
                  value={row.value}
                  onChange={e => setVar(row._id, { value: e.target.value })}
                />
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove variable"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      vars: prev.vars.filter(entry => entry._id !== row._id),
                    }))
                  }
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            setForm(prev => ({
              ...prev,
              vars: [...prev.vars, { _id: rowId(), key: '', value: '' }],
            }))
          }
        >
          <i className="fas fa-plus me-2" />
          Add Variable
        </button>
      </FormModal>

      {deleteTarget && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Profile"
          message={`Delete profile "${deleteTarget.name}"? Machines it was applied to keep their documents — only the reusable bundle goes away.`}
          confirmText="Delete"
          loading={loading}
        />
      )}

      {applyTarget && (
        <FormModal
          isOpen
          onClose={() => setApplyTarget(null)}
          onSubmit={handleApply}
          title={`Apply Profile: ${applyTarget.name}`}
          icon="fas fa-arrow-right-to-bracket"
          submitText="Apply"
          loading={loading}
          showCancelButton
        >
          <div className="mb-3">
            <label className="form-label" htmlFor="profile-apply-machine">
              Machine
            </label>
            <select
              id="profile-apply-machine"
              className="form-select"
              value={applyMachine}
              onChange={e => setApplyMachine(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {machineRows.map(row => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="profile-apply-provision"
              checked={applyProvision}
              onChange={e => setApplyProvision(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="profile-apply-provision">
              Run provisioning right after applying
            </label>
          </div>
          <p className="form-text text-muted mb-0">
            The profile&apos;s credentials, folders, playbooks, and variables merge into the
            machine&apos;s stored provisioner document (its existing values lose where the profile
            says something). Storing the document is immediate; provisioning is optional.
          </p>
        </FormModal>
      )}
    </div>
  );
};

ProvisioningProfiles.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default ProvisioningProfiles;
