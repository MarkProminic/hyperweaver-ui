import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const StoragePathCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    type: 'iso',
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { makeAgentRequest } = useServers();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.path.trim()) {
      newErrors.path = 'Path is required';
    } else if (!formData.path.startsWith('/')) {
      newErrors.path = 'Path must be an absolute path starting with /';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
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

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/storage/paths',
        'POST',
        {
          name: formData.name.trim(),
          path: formData.path.trim(),
          type: formData.type,
          enabled: formData.enabled,
        }
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Failed to create storage path');
      }
    } catch (err) {
      onError(`Error creating storage path: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create Storage Path"
      icon="fas fa-plus"
      submitText="Create"
      submitVariant="is-primary"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="storage-path-name" className="form-label">
          Name
        </label>
        <input
          id="storage-path-name"
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          type="text"
          placeholder="e.g., Primary ISO Storage"
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          disabled={loading}
        />
        {errors.name && <p className="form-text text-danger">{errors.name}</p>}
        <p className="form-text text-muted">A descriptive name for this storage location</p>
      </div>

      <div className="mb-3">
        <label htmlFor="storage-path-path" className="form-label">
          Path
        </label>
        <input
          id="storage-path-path"
          className={`form-control ${errors.path ? 'is-invalid' : ''}`}
          type="text"
          placeholder="e.g., /data/isos"
          value={formData.path}
          onChange={e => handleInputChange('path', e.target.value)}
          disabled={loading}
        />
        {errors.path && <p className="form-text text-danger">{errors.path}</p>}
        <p className="form-text text-muted">
          Absolute path to the storage directory on the host system
        </p>
      </div>

      <div className="mb-3">
        <label htmlFor="storage-path-type" className="form-label">
          Type
        </label>
        <select
          id="storage-path-type"
          className="form-select"
          value={formData.type}
          onChange={e => handleInputChange('type', e.target.value)}
          disabled={loading}
        >
          <option value="iso">ISO Files</option>
          <option value="image">VM Images</option>
        </select>
        {errors.type && <p className="form-text text-danger">{errors.type}</p>}
        <p className="form-text text-muted">Type of artifacts this storage location will contain</p>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="storage-path-enabled"
            className="form-check-input"
            type="checkbox"
            checked={formData.enabled}
            onChange={e => handleInputChange('enabled', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="storage-path-enabled">
            Enable storage location
          </label>
        </div>
        <p className="form-text text-muted">
          Enabled storage locations can be used for uploads and downloads. Disabled locations are
          read-only.
        </p>
      </div>

      <div className="alert alert-info">
        <div>
          <p>
            <strong>Important:</strong>
          </p>
          <ul>
            <li>The specified path must exist and be writable by the OmniOS system</li>
            <li>Ensure adequate disk space is available for artifact storage</li>
            <li>Path validation will be performed when creating the storage location</li>
          </ul>
        </div>
      </div>
    </FormModal>
  );
};

StoragePathCreateModal.propTypes = {
  server: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default StoragePathCreateModal;
