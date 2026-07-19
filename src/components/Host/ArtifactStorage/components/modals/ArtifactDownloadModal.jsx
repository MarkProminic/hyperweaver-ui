import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const ArtifactDownloadModal = ({ server, storagePaths, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    url: '',
    storage_path_id: '',
    filename: '',
    checksum: '',
    checksum_algorithm: 'sha256',
    overwrite_existing: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { makeAgentRequest } = useServers();

  const enabledStoragePaths = storagePaths.filter(path => path.enabled);

  // Set default storage path if only one is available
  React.useEffect(() => {
    if (enabledStoragePaths.length === 1 && !formData.storage_path_id) {
      setFormData(prev => ({
        ...prev,
        storage_path_id: enabledStoragePaths[0].id,
      }));
    }
  }, [enabledStoragePaths, formData.storage_path_id]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.url.trim()) {
      newErrors.url = t('artifacts.artifactDownloadModal.urlRequired');
    } else {
      try {
        new URL(formData.url.trim());
      } catch {
        newErrors.url = t('artifacts.artifactDownloadModal.invalidUrl');
      }
    }

    if (!formData.storage_path_id) {
      newErrors.storage_path_id = t('artifacts.artifactDownloadModal.storageLocationRequired');
    }

    if (formData.checksum.trim() && !formData.checksum_algorithm) {
      newErrors.checksum_algorithm = t('artifacts.artifactDownloadModal.checksumAlgorithmRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const extractFilenameFromUrl = url => {
    try {
      const urlObj = new URL(url);
      const { pathname } = urlObj;
      const filename = pathname.split('/').pop();
      return filename || '';
    } catch {
      return '';
    }
  };

  const handleUrlChange = url => {
    handleInputChange('url', url);

    // Auto-suggest filename from URL if no custom filename is set
    if (!formData.filename.trim()) {
      const suggestedFilename = extractFilenameFromUrl(url);
      if (suggestedFilename) {
        handleInputChange('filename', suggestedFilename);
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const requestBody = {
        url: formData.url.trim(),
        storage_path_id: formData.storage_path_id,
        overwrite_existing: formData.overwrite_existing,
      };

      // Add optional fields only if they have values
      if (formData.filename.trim()) {
        requestBody.filename = formData.filename.trim();
      }

      if (formData.checksum.trim()) {
        requestBody.checksum = formData.checksum.trim();
        requestBody.checksum_algorithm = formData.checksum_algorithm;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/download',
        'POST',
        requestBody
      );

      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.message || 'Failed to start download');
      }
    } catch (err) {
      onError(`Error starting download: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedStoragePath = enabledStoragePaths.find(p => p.id === formData.storage_path_id);

  if (enabledStoragePaths.length === 0) {
    return (
      <FormModal
        isOpen
        onClose={onClose}
        title={t('artifacts.artifactDownloadModal.title')}
        icon="fas fa-download"
        submitText={t('artifacts.artifactDownloadModal.closeButton')}
        submitVariant="is-info"
      >
        <div className="alert alert-warning">
          <p>{t('artifacts.artifactDownloadModal.noEnabledLocations')}</p>
          <p>{t('artifacts.artifactDownloadModal.enableLocationsFirstMessage')}</p>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('artifacts.artifactDownloadModal.title')}
      icon="fas fa-download"
      submitText={t('artifacts.artifactDownloadModal.startButton')}
      submitVariant="is-success"
      submitIcon="fas fa-download"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="download-url" className="form-label">
          {t('artifacts.artifactDownloadModal.urlLabel')}
        </label>
        <input
          id="download-url"
          className={`form-control ${errors.url ? 'is-invalid' : ''}`}
          type="url"
          placeholder={t('artifacts.artifactDownloadModal.urlPlaceholder')}
          value={formData.url}
          onChange={e => handleUrlChange(e.target.value)}
          disabled={loading}
        />
        {errors.url && <p className="form-text text-danger">{errors.url}</p>}
        <p className="form-text text-muted">{t('artifacts.artifactDownloadModal.urlHelper')}</p>
      </div>

      <div className="mb-3">
        <label htmlFor="download-storage-location" className="form-label">
          {t('artifacts.artifactDownloadModal.storageLocationLabel')}
        </label>
        <select
          id="download-storage-location"
          value={formData.storage_path_id}
          onChange={e => handleInputChange('storage_path_id', e.target.value)}
          disabled={loading}
          className={`form-select ${errors.storage_path_id ? 'is-invalid' : ''}`}
        >
          <option value="">{t('artifacts.artifactDownloadModal.selectStorageLocation')}</option>
          {enabledStoragePaths.map(path => (
            <option key={path.id} value={path.id}>
              {path.name} ({path.type}) - {path.path}
            </option>
          ))}
        </select>
        {errors.storage_path_id && (
          <p className="form-text text-danger">{errors.storage_path_id}</p>
        )}
        <p className="form-text text-muted">
          {t('artifacts.artifactDownloadModal.storageLocationHelper')}
        </p>
      </div>

      <div className="mb-3">
        <label htmlFor="download-filename" className="form-label">
          {t('artifacts.artifactDownloadModal.filenameLabel')}
        </label>
        <input
          id="download-filename"
          className="form-control"
          type="text"
          placeholder={t('artifacts.artifactDownloadModal.filenamePlaceholder')}
          value={formData.filename}
          onChange={e => handleInputChange('filename', e.target.value)}
          disabled={loading}
        />
        <p className="form-text text-muted">
          {t('artifacts.artifactDownloadModal.filenameHelper')}
        </p>
      </div>

      <div className="mb-3">
        <span className="form-label">{t('artifacts.artifactDownloadModal.checksumLabel')}</span>
        <div className="input-group">
          <input
            className="form-control"
            type="text"
            placeholder={t('artifacts.artifactDownloadModal.checksumPlaceholder')}
            value={formData.checksum}
            onChange={e => handleInputChange('checksum', e.target.value)}
            disabled={loading}
          />
          <select
            className="form-select"
            value={formData.checksum_algorithm}
            onChange={e => handleInputChange('checksum_algorithm', e.target.value)}
            disabled={loading || !formData.checksum.trim()}
          >
            <option value="md5">MD5</option>
            <option value="sha1">SHA1</option>
            <option value="sha256">SHA256</option>
          </select>
        </div>
        <p className="form-text text-muted">
          {t('artifacts.artifactDownloadModal.checksumHelper')}
        </p>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="download-overwrite-existing"
            className="form-check-input"
            type="checkbox"
            checked={formData.overwrite_existing}
            onChange={e => handleInputChange('overwrite_existing', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="download-overwrite-existing">
            {t('artifacts.artifactDownloadModal.overwriteLabel')}
          </label>
        </div>
        <p className="form-text text-muted">
          {t('artifacts.artifactDownloadModal.overwriteHelper')}
        </p>
      </div>

      {selectedStoragePath && (
        <div className="alert alert-info">
          <div>
            <p>{t('artifacts.artifactDownloadModal.selectedStorageLocationHeading')}</p>
            <ul>
              <li>
                {t('artifacts.artifactDownloadModal.nameField')}: {selectedStoragePath.name}
              </li>
              <li>
                {t('artifacts.artifactDownloadModal.pathField')}: {selectedStoragePath.path}
              </li>
              <li>
                {t('artifacts.artifactDownloadModal.typeField')}:{' '}
                {selectedStoragePath.type.toUpperCase()}
              </li>
              <li>
                {t('artifacts.artifactDownloadModal.availableFilesField')}:{' '}
                {selectedStoragePath.file_count || 0}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className="alert alert-secondary">
        <div>
          <p>{t('artifacts.artifactDownloadModal.downloadProcessHeading')}</p>
          <ol>
            <li>{t('artifacts.artifactDownloadModal.downloadProcessStep1')}</li>
            <li>{t('artifacts.artifactDownloadModal.downloadProcessStep2')}</li>
            <li>{t('artifacts.artifactDownloadModal.downloadProcessStep3')}</li>
            <li>{t('artifacts.artifactDownloadModal.downloadProcessStep4')}</li>
          </ol>
        </div>
      </div>
    </FormModal>
  );
};

ArtifactDownloadModal.propTypes = {
  server: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default ArtifactDownloadModal;
