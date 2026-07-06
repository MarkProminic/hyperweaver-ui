import PropTypes from 'prop-types';
import { useState } from 'react';

import {
  uploadArtifact,
  registerArtifact,
  downloadArtifact,
  hclDownloadArtifact,
} from '../../api/provisioningAPI';
import { FormModal } from '../common';

/**
 * Installer Files modals (sync item 12): the four ways a file enters the
 * cache — browser upload, agent-host path registration, URL download
 * (optionally through a custom_resource_url secret's Basic auth), and the
 * HCL portal download (key_name = an hcl_download_portal_api_keys secret;
 * the filename must match the HCL catalog EXACTLY). Every entry point hashes
 * on the agent; downloads are tasks with live progress in the footer.
 */

const KINDS = ['installer', 'fixpack', 'hotfix'];

// Role + kind selects shared by all four modals. Roles are suggestions from
// the current cache (datalist) — new role directories are legal.
const RoleKindFields = ({ idPrefix, role, setRole, kind, setKind, roleOptions }) => (
  <div className="row g-3 mb-3">
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={`${idPrefix}-role`}>
        Role
      </label>
      <input
        id={`${idPrefix}-role`}
        className="form-control"
        type="text"
        list={`${idPrefix}-role-options`}
        value={role}
        onChange={e => setRole(e.target.value)}
        required
      />
      <datalist id={`${idPrefix}-role-options`}>
        {roleOptions.map(option => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={`${idPrefix}-kind`}>
        Kind
      </label>
      <select
        id={`${idPrefix}-kind`}
        className="form-select"
        value={kind}
        onChange={e => setKind(e.target.value)}
      >
        {KINDS.map(k => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </div>
  </div>
);

RoleKindFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  setRole: PropTypes.func.isRequired,
  kind: PropTypes.string.isRequired,
  setKind: PropTypes.func.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export const UploadModal = ({ isOpen, onClose, server, roleOptions, onDone }) => {
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('installer');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!role.trim() || !file) {
      setError('A role and a file are required.');
      return;
    }
    setLoading(true);
    setError('');
    setProgress(0);
    const result = await uploadArtifact(
      server.hostname,
      server.port,
      server.protocol,
      { role: role.trim(), kind, file },
      event => {
        if (event.total) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      }
    );
    setLoading(false);
    setProgress(null);
    if (result.success) {
      onDone(
        `${result.data?.message || 'Uploaded'} — ${result.data?.verified ? 'verified' : 'hashed (no expectation on record)'}`
      );
      setFile(null);
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Upload File"
      icon="fas fa-upload"
      submitText="Upload"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <RoleKindFields
        idPrefix="artifact-upload"
        role={role}
        setRole={setRole}
        kind={kind}
        setKind={setKind}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-upload-file">
          File
        </label>
        <input
          id="artifact-upload-file"
          className="form-control"
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          disabled={loading}
        />
      </div>
      {progress !== null && (
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar bg-primary" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}
    </FormModal>
  );
};

UploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onDone: PropTypes.func.isRequired,
};

export const RegisterModal = ({ isOpen, onClose, server, roleOptions, onDone }) => {
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('installer');
  const [path, setPath] = useState('');
  const [move, setMove] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!role.trim() || !path.trim()) {
      setError('A role and an agent-host file path are required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await registerArtifact(server.hostname, server.port, server.protocol, {
      path: path.trim(),
      role: role.trim(),
      kind,
      move,
    });
    setLoading(false);
    if (result.success) {
      onDone(
        `${result.data?.message || 'Registered'} — ${result.data?.verified ? 'verified' : 'hashed (no expectation on record)'}`
      );
      setPath('');
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Register Local File"
      icon="fas fa-file-import"
      submitText="Register"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <RoleKindFields
        idPrefix="artifact-register"
        role={role}
        setRole={setRole}
        kind={kind}
        setKind={setKind}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-register-path">
          Path (on the agent host)
        </label>
        <input
          id="artifact-register-path"
          className="form-control"
          type="text"
          value={path}
          onChange={e => setPath(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="form-check form-switch">
        <input
          id="artifact-register-move"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={move}
          onChange={e => setMove(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="artifact-register-move">
          Move (delete the source after copying into the cache)
        </label>
      </div>
    </FormModal>
  );
};

RegisterModal.propTypes = UploadModal.propTypes;

export const DownloadModal = ({ isOpen, onClose, server, roleOptions, resourceNames, onDone }) => {
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('installer');
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [expected, setExpected] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!role.trim() || !url.trim()) {
      setError('A role and a URL are required.');
      return;
    }
    setLoading(true);
    setError('');
    const body = { url: url.trim(), role: role.trim(), kind };
    if (filename.trim()) {
      body.filename = filename.trim();
    }
    if (expected.trim()) {
      body.expected_sha256 = expected.trim();
    }
    if (resourceName.trim()) {
      body.resource_name = resourceName.trim();
    }
    const result = await downloadArtifact(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      onDone(`${result.data?.message || 'Download queued'} (task ${result.data?.task_id})`);
      setUrl('');
      setFilename('');
      setExpected('');
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Download From URL"
      icon="fas fa-cloud-arrow-down"
      submitText="Queue Download"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <RoleKindFields
        idPrefix="artifact-download"
        role={role}
        setRole={setRole}
        kind={kind}
        setKind={setKind}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-url">
          URL
        </label>
        <input
          id="artifact-download-url"
          className="form-control"
          type="text"
          placeholder="https://…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-download-filename">
            Filename (blank = from URL)
          </label>
          <input
            id="artifact-download-filename"
            className="form-control"
            type="text"
            value={filename}
            onChange={e => setFilename(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-download-sha">
            Expected SHA-256 (optional — mismatches are discarded)
          </label>
          <input
            id="artifact-download-sha"
            className="form-control font-monospace"
            type="text"
            value={expected}
            onChange={e => setExpected(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-resource">
          Mirror Credentials (custom_resource_url secret)
        </label>
        {resourceNames ? (
          <select
            id="artifact-download-resource"
            className="form-select"
            value={resourceName}
            onChange={e => setResourceName(e.target.value)}
          >
            <option value="">None (public URL)</option>
            {resourceNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="artifact-download-resource"
            className="form-control"
            type="text"
            placeholder="custom_resource_url secret name (blank = public)"
            value={resourceName}
            onChange={e => setResourceName(e.target.value)}
          />
        )}
      </div>
    </FormModal>
  );
};

DownloadModal.propTypes = {
  ...UploadModal.propTypes,
  resourceNames: PropTypes.arrayOf(PropTypes.string),
};

export const HclDownloadModal = ({ isOpen, onClose, server, roleOptions, hclKeyNames, onDone }) => {
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('installer');
  const [filename, setFilename] = useState('');
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!role.trim() || !filename.trim() || !keyName.trim()) {
      setError('A role, the exact catalog filename, and an HCL portal key are required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await hclDownloadArtifact(server.hostname, server.port, server.protocol, {
      key_name: keyName.trim(),
      filename: filename.trim(),
      role: role.trim(),
      kind,
    });
    setLoading(false);
    if (result.success) {
      onDone(`${result.data?.message || 'HCL download queued'} (task ${result.data?.task_id})`);
      setFilename('');
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Download From HCL Portal"
      icon="fas fa-cloud-arrow-down"
      submitText="Queue Download"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <RoleKindFields
        idPrefix="artifact-hcl"
        role={role}
        setRole={setRole}
        kind={kind}
        setKind={setKind}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-hcl-filename">
          Filename (must match the HCL catalog EXACTLY)
        </label>
        <input
          id="artifact-hcl-filename"
          className="form-control font-monospace"
          type="text"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-hcl-key">
          HCL Portal Key
        </label>
        {hclKeyNames ? (
          <select
            id="artifact-hcl-key"
            className="form-select"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
          >
            <option value="">Select…</option>
            {hclKeyNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="artifact-hcl-key"
            className="form-control"
            type="text"
            placeholder="hcl_download_portal_api_keys secret name"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
          />
        )}
        <p className="form-text text-muted mb-0">
          The catalog&apos;s sha256 is authoritative — it becomes the entry&apos;s expectation and
          the download must reproduce it. The portal refresh token rotates on use; the agent
          persists the rotation automatically.
        </p>
      </div>
    </FormModal>
  );
};

HclDownloadModal.propTypes = {
  ...UploadModal.propTypes,
  hclKeyNames: PropTypes.arrayOf(PropTypes.string),
};
