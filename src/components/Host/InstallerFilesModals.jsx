import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  prepareArtifactUpload,
  uploadArtifactFile,
  registerArtifact,
  downloadArtifact,
  hclDownloadArtifact,
} from '../../api/provisioningAPI';
import { FormModal, PathInput } from '../common';

// The ways a file enters a storage location: browser upload (prepare →
// bytes), agent-host path registration, URL download, and the HCL portal
// download. Installer-family locations require a role; iso/image do not.

const ROLE_TYPES = ['installer', 'fixpack', 'hotfix'];

const locationType = (locations, id) => locations.find(entry => entry.id === id)?.type || '';

/** Location select + role input (role only for installer-family locations). */
const LocationRoleFields = ({
  idPrefix,
  locations,
  locationId,
  setLocationId,
  role,
  setRole,
  roleOptions,
}) => {
  const { t } = useTranslation();
  const needsRole = ROLE_TYPES.includes(locationType(locations, locationId));
  return (
    <div className="row g-3 mb-3">
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor={`${idPrefix}-location`}>
          {t('host.installerFilesModals.storageLocation')}
        </label>
        <select
          id={`${idPrefix}-location`}
          className="form-select"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          required
        >
          <option value="">{t('host.installerFilesModals.select')}</option>
          {locations
            .filter(entry => entry.enabled !== false)
            .map(entry => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.type})
              </option>
            ))}
        </select>
      </div>
      {needsRole && (
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor={`${idPrefix}-role`}>
            {t('host.installerFilesModals.role')}
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
      )}
    </div>
  );
};

LocationRoleFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  locations: PropTypes.array.isRequired,
  locationId: PropTypes.string.isRequired,
  setLocationId: PropTypes.func.isRequired,
  role: PropTypes.string.isRequired,
  setRole: PropTypes.func.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const validTarget = (locations, locationId, role, t) => {
  if (!locationId) {
    return t('host.installerFilesModals.pickStorageLocation');
  }
  if (ROLE_TYPES.includes(locationType(locations, locationId)) && !role.trim()) {
    return t('host.installerFilesModals.roleRequired');
  }
  return '';
};

export const UploadModal = ({ isOpen, onClose, server, locations, roleOptions, onDone }) => {
  const { t } = useTranslation();
  const [locationId, setLocationId] = useState('');
  const [role, setRole] = useState('');
  const [file, setFile] = useState(null);
  const [checksum, setChecksum] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const targetError = validTarget(locations, locationId, role, t);
    if (targetError || !file) {
      setError(targetError || t('host.installerFilesModals.fileRequired'));
      return;
    }
    setLoading(true);
    setError('');
    const body = {
      filename: file.name,
      size: file.size,
      storage_path_id: locationId,
      overwrite_existing: overwrite,
    };
    if (checksum.trim()) {
      body.checksum = checksum.trim();
    }
    if (role.trim()) {
      body.role = role.trim();
    }
    const prepared = await prepareArtifactUpload(
      server.hostname,
      server.port,
      server.protocol,
      body
    );
    if (!prepared.success || !prepared.data?.task_id) {
      setLoading(false);
      setError(prepared.message || 'Upload prepare failed.');
      return;
    }
    setProgress(0);
    const result = await uploadArtifactFile(
      server.hostname,
      server.port,
      server.protocol,
      prepared.data.task_id,
      file,
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
        t('host.installerFilesModals.uploadQueuedFull', {
          message: result.data?.message || t('host.installerFilesModals.uploadQueuedDefault'),
          taskId: prepared.data.task_id,
        })
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
      title={t('host.installerFilesModals.uploadFile')}
      icon="fas fa-upload"
      submitText={t('host.installerFilesModals.upload')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <LocationRoleFields
        idPrefix="artifact-upload"
        locations={locations}
        locationId={locationId}
        setLocationId={setLocationId}
        role={role}
        setRole={setRole}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-upload-file">
          {t('host.installerFilesModals.file')}
        </label>
        <input
          id="artifact-upload-file"
          className="form-control"
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          disabled={loading}
        />
      </div>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="artifact-upload-checksum">
            {t('host.installerFilesModals.expectedSha256Upload')}
          </label>
          <input
            id="artifact-upload-checksum"
            className="form-control font-monospace"
            type="text"
            value={checksum}
            onChange={e => setChecksum(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-4">
          <div className="form-check form-switch mt-4">
            <input
              id="artifact-upload-overwrite"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={overwrite}
              onChange={e => setOverwrite(e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="artifact-upload-overwrite">
              {t('host.installerFilesModals.overwriteExisting')}
            </label>
          </div>
        </div>
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
  locations: PropTypes.array.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onDone: PropTypes.func.isRequired,
};

export const RegisterModal = ({ isOpen, onClose, server, locations, roleOptions, onDone }) => {
  const { t } = useTranslation();
  const [locationId, setLocationId] = useState('');
  const [role, setRole] = useState('');
  const [path, setPath] = useState('');
  const [move, setMove] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const targetError = validTarget(locations, locationId, role, t);
    if (targetError || !path.trim()) {
      setError(targetError || t('host.installerFilesModals.filePathRequired'));
      return;
    }
    setLoading(true);
    setError('');
    const body = { path: path.trim(), storage_path_id: locationId, move };
    if (role.trim()) {
      body.role = role.trim();
    }
    const result = await registerArtifact(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      onDone(result.data?.message || t('host.installerFilesModals.registered'));
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
      title={t('host.installerFilesModals.registerLocalFile')}
      icon="fas fa-file-import"
      submitText={t('host.installerFilesModals.register')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <LocationRoleFields
        idPrefix="artifact-register"
        locations={locations}
        locationId={locationId}
        setLocationId={setLocationId}
        role={role}
        setRole={setRole}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-register-path">
          {t('host.installerFilesModals.pathOnAgentHost')}
        </label>
        <PathInput
          id="artifact-register-path"
          value={path}
          onChange={setPath}
          server={server}
          mode="file"
          pickTitle={t('host.installerFilesModals.pickFileToRegister')}
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
          {t('host.installerFilesModals.moveRegister')}
        </label>
      </div>
    </FormModal>
  );
};

RegisterModal.propTypes = UploadModal.propTypes;

export const DownloadModal = ({
  isOpen,
  onClose,
  server,
  locations,
  roleOptions,
  resourceNames,
  onDone,
}) => {
  const { t } = useTranslation();
  const [locationId, setLocationId] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [checksum, setChecksum] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const targetError = validTarget(locations, locationId, role, t);
    if (targetError || !url.trim()) {
      setError(targetError || t('host.installerFilesModals.urlRequired'));
      return;
    }
    setLoading(true);
    setError('');
    const body = { url: url.trim(), storage_path_id: locationId, overwrite_existing: overwrite };
    if (filename.trim()) {
      body.filename = filename.trim();
    }
    if (checksum.trim()) {
      body.checksum = checksum.trim();
    }
    if (role.trim()) {
      body.role = role.trim();
    }
    if (resourceName.trim()) {
      body.resource_name = resourceName.trim();
    }
    const result = await downloadArtifact(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (result.success) {
      onDone(
        t('host.installerFilesModals.messageWithTask', {
          message: result.data?.message || t('host.installerFilesModals.downloadQueuedDefault'),
          taskId: result.data?.task_id,
        })
      );
      setUrl('');
      setFilename('');
      setChecksum('');
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
      title={t('host.installerFilesModals.downloadFromUrl')}
      icon="fas fa-cloud-arrow-down"
      submitText={t('host.installerFilesModals.queueDownload')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <LocationRoleFields
        idPrefix="artifact-download"
        locations={locations}
        locationId={locationId}
        setLocationId={setLocationId}
        role={role}
        setRole={setRole}
        roleOptions={roleOptions}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-url">
          {t('host.installerFilesModals.url')}
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
        <div className="col-12 col-md-5">
          <label className="form-label" htmlFor="artifact-download-filename">
            {t('host.installerFilesModals.filenameBlankFromUrl')}
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
        <div className="col-12 col-md-5">
          <label className="form-label" htmlFor="artifact-download-sha">
            {t('host.installerFilesModals.expectedSha256Download')}
          </label>
          <input
            id="artifact-download-sha"
            className="form-control font-monospace"
            type="text"
            value={checksum}
            onChange={e => setChecksum(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-2">
          <div className="form-check form-switch mt-4">
            <input
              id="artifact-download-overwrite"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={overwrite}
              onChange={e => setOverwrite(e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="artifact-download-overwrite">
              {t('host.installerFilesModals.overwrite')}
            </label>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-resource">
          {t('host.installerFilesModals.mirrorCredentials')}
        </label>
        {resourceNames ? (
          <select
            id="artifact-download-resource"
            className="form-select"
            value={resourceName}
            onChange={e => setResourceName(e.target.value)}
          >
            <option value="">{t('host.installerFilesModals.nonePublicUrl')}</option>
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
            placeholder={t('host.installerFilesModals.resourceNamePlaceholder')}
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

// The HCL portal download keeps the SHI body verbatim ({key_name, filename,
// role, kind}); the catalog's sha256 is authoritative.
const HCL_KINDS = ['installer', 'fixpack', 'hotfix'];

export const HclDownloadModal = ({ isOpen, onClose, server, roleOptions, hclKeyNames, onDone }) => {
  const { t } = useTranslation();
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('installer');
  const [filename, setFilename] = useState('');
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!role.trim() || !filename.trim() || !keyName.trim()) {
      setError(t('host.installerFilesModals.hclFieldsRequired'));
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
      onDone(
        t('host.installerFilesModals.messageWithTask', {
          message: result.data?.message || t('host.installerFilesModals.hclDownloadQueuedDefault'),
          taskId: result.data?.task_id,
        })
      );
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
      title={t('host.installerFilesModals.downloadFromHclPortal')}
      icon="fas fa-cloud-arrow-down"
      submitText={t('host.installerFilesModals.queueDownload')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-hcl-role">
            {t('host.installerFilesModals.role')}
          </label>
          <input
            id="artifact-hcl-role"
            className="form-control"
            type="text"
            list="artifact-hcl-role-options"
            value={role}
            onChange={e => setRole(e.target.value)}
            required
          />
          <datalist id="artifact-hcl-role-options">
            {roleOptions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-hcl-kind">
            {t('host.installerFilesModals.kind')}
          </label>
          <select
            id="artifact-hcl-kind"
            className="form-select"
            value={kind}
            onChange={e => setKind(e.target.value)}
          >
            {HCL_KINDS.map(k => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-hcl-filename">
          {t('host.installerFilesModals.hclFilename')}
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
          {t('host.installerFilesModals.hclPortalKey')}
        </label>
        {hclKeyNames ? (
          <select
            id="artifact-hcl-key"
            className="form-select"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
          >
            <option value="">{t('host.installerFilesModals.select')}</option>
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
            placeholder={t('host.installerFilesModals.hclKeyPlaceholder')}
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
          />
        )}
        <p className="form-text text-muted mb-0">{t('host.installerFilesModals.hclKeyHelp')}</p>
      </div>
    </FormModal>
  );
};

HclDownloadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  hclKeyNames: PropTypes.arrayOf(PropTypes.string),
  onDone: PropTypes.func.isRequired,
};
