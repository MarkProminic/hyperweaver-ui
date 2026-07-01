import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const StoragePathEditModal = ({ server, storagePath, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { makeAgentRequest } = useServers();

  // Initialize form with storage path data
  useEffect(() => {
    if (storagePath) {
      setFormData({
        name: storagePath.name || '',
        enabled: storagePath.enabled ?? true,
      });
    }
  }, [storagePath]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
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
        `artifacts/storage/paths/${storagePath.id}`,
        'PUT',
        {
          name: formData.name.trim(),
          enabled: formData.enabled,
        }
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Failed to update storage path');
      }
    } catch (err) {
      onError(`Error updating storage path: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!storagePath) {
    return null;
  }

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Edit Storage Path"
      icon="fas fa-edit"
      submitText="Update"
      submitVariant="is-primary"
      submitIcon="fas fa-save"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="edit-storage-path-name" className="form-label">
          Name
        </label>
        <input
          id="edit-storage-path-name"
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

      {/* Read-only fields */}
      <div className="mb-3">
        <label htmlFor="edit-storage-path-path" className="form-label">
          Path
        </label>
        <input
          id="edit-storage-path-path"
          className="form-control"
          type="text"
          value={storagePath.path}
          disabled
          readOnly
        />
        <p className="form-text text-muted">Path cannot be changed after creation</p>
      </div>

      <div className="mb-3">
        <label htmlFor="edit-storage-path-type" className="form-label">
          Type
        </label>
        <select
          id="edit-storage-path-type"
          className="form-select"
          value={storagePath.type}
          disabled
        >
          <option value="iso">ISO Files</option>
          <option value="image">VM Images</option>
        </select>
        <p className="form-text text-muted">Type cannot be changed after creation</p>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="edit-storage-path-enabled"
            className="form-check-input"
            type="checkbox"
            checked={formData.enabled}
            onChange={e => handleInputChange('enabled', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="edit-storage-path-enabled">
            Enable storage location
          </label>
        </div>
        <p className="form-text text-muted">
          {formData.enabled
            ? 'This storage location can be used for uploads and downloads'
            : 'This storage location is read-only when disabled'}
        </p>
      </div>

      {/* Storage location statistics */}
      <div className="alert alert-secondary">
        <div>
          <p>
            <strong>Storage Statistics:</strong>
          </p>
          <div className="row">
            <div className="col">
              <div className="text-center">
                <p className="text-uppercase small fw-semibold text-muted">Files</p>
                <p className="fs-6 fw-bold">{storagePath.file_count || 0}</p>
              </div>
            </div>
            <div className="col">
              <div className="text-center">
                <p className="text-uppercase small fw-semibold text-muted">Total Size</p>
                <p className="fs-6 fw-bold">
                  {storagePath.total_size
                    ? `${(storagePath.total_size / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : '0 GB'}
                </p>
              </div>
            </div>
            {storagePath.disk_usage && (
              <div className="col">
                <div className="text-center">
                  <p className="text-uppercase small fw-semibold text-muted">Disk Usage</p>
                  <p className="fs-6 fw-bold">{storagePath.disk_usage.use_percent}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!formData.enabled && storagePath.file_count > 0 && (
        <div className="alert alert-warning">
          <p>
            <strong>Warning:</strong> This storage location contains {storagePath.file_count}{' '}
            file(s). Disabling it will make these artifacts read-only and prevent new uploads or
            downloads to this location.
          </p>
        </div>
      )}
    </FormModal>
  );
};

StoragePathEditModal.propTypes = {
  server: PropTypes.object.isRequired,
  storagePath: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default StoragePathEditModal;
