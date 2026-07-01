import PropTypes from 'prop-types';
import React, { useState } from 'react';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const ArtifactDownloadModal = ({ server, storagePaths, onClose, onSuccess, onError }) => {
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
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url.trim());
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    if (!formData.storage_path_id) {
      newErrors.storage_path_id = 'Storage location is required';
    }

    if (formData.checksum.trim() && !formData.checksum_algorithm) {
      newErrors.checksum_algorithm = 'Checksum algorithm is required when checksum is provided';
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
        title="Download from URL"
        icon="fas fa-download"
        submitText="Close"
        submitVariant="is-info"
      >
        <div className="alert alert-warning">
          <p>
            <strong>No enabled storage locations available.</strong>
          </p>
          <p>
            You need at least one enabled storage location before you can download artifacts. Please
            create or enable a storage location first.
          </p>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Download from URL"
      icon="fas fa-download"
      submitText="Start Download"
      submitVariant="is-success"
      submitIcon="fas fa-download"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="download-url" className="form-label">
          URL
        </label>
        <input
          id="download-url"
          className={`form-control ${errors.url ? 'is-invalid' : ''}`}
          type="url"
          placeholder="https://example.com/file.iso"
          value={formData.url}
          onChange={e => handleUrlChange(e.target.value)}
          disabled={loading}
        />
        {errors.url && <p className="form-text text-danger">{errors.url}</p>}
        <p className="form-text text-muted">URL of the file to download</p>
      </div>

      <div className="mb-3">
        <label htmlFor="download-storage-location" className="form-label">
          Storage Location
        </label>
        <select
          id="download-storage-location"
          value={formData.storage_path_id}
          onChange={e => handleInputChange('storage_path_id', e.target.value)}
          disabled={loading}
          className={`form-select ${errors.storage_path_id ? 'is-invalid' : ''}`}
        >
          <option value="">Select storage location...</option>
          {enabledStoragePaths.map(path => (
            <option key={path.id} value={path.id}>
              {path.name} ({path.type}) - {path.path}
            </option>
          ))}
        </select>
        {errors.storage_path_id && (
          <p className="form-text text-danger">{errors.storage_path_id}</p>
        )}
        <p className="form-text text-muted">Where to store the downloaded file</p>
      </div>

      <div className="mb-3">
        <label htmlFor="download-filename" className="form-label">
          Filename (Optional)
        </label>
        <input
          id="download-filename"
          className="form-control"
          type="text"
          placeholder="Leave blank to use original filename"
          value={formData.filename}
          onChange={e => handleInputChange('filename', e.target.value)}
          disabled={loading}
        />
        <p className="form-text text-muted">Custom filename for the downloaded file</p>
      </div>

      <div className="mb-3">
        <span className="form-label">Checksum (Optional)</span>
        <div className="input-group">
          <input
            className="form-control"
            type="text"
            placeholder="Expected checksum for verification"
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
        <p className="form-text text-muted">Optional checksum for file integrity verification</p>
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
            Overwrite existing files
          </label>
        </div>
        <p className="form-text text-muted">
          Replace existing files with the same name in the storage location
        </p>
      </div>

      {selectedStoragePath && (
        <div className="alert alert-info">
          <div>
            <p>
              <strong>Selected Storage Location:</strong>
            </p>
            <ul>
              <li>
                <strong>Name:</strong> {selectedStoragePath.name}
              </li>
              <li>
                <strong>Path:</strong> {selectedStoragePath.path}
              </li>
              <li>
                <strong>Type:</strong> {selectedStoragePath.type.toUpperCase()}
              </li>
              <li>
                <strong>Available Files:</strong> {selectedStoragePath.file_count || 0}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className="alert alert-secondary">
        <div>
          <p>
            <strong>Download Process:</strong>
          </p>
          <ol>
            <li>Download task will be created and queued</li>
            <li>File will be downloaded to the selected storage location</li>
            <li>Checksum verification will be performed if provided</li>
            <li>The artifact will be registered in the system upon completion</li>
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
