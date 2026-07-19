import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const StoragePathEditModal = ({ server, storagePath, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
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
      newErrors.name = t('artifacts.storagePathEditModal.nameRequired');
    } else if (formData.name.length < 2) {
      newErrors.name = t('artifacts.storagePathEditModal.nameMinLength');
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
      title={t('artifacts.storagePathEditModal.title')}
      icon="fas fa-edit"
      submitText={t('artifacts.storagePathEditModal.submitButton')}
      submitVariant="is-primary"
      submitIcon="fas fa-save"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="edit-storage-path-name" className="form-label">
          {t('artifacts.storagePathEditModal.nameLabel')}
        </label>
        <input
          id="edit-storage-path-name"
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          type="text"
          placeholder={t('artifacts.storagePathEditModal.namePlaceholder')}
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          disabled={loading}
        />
        {errors.name && <p className="form-text text-danger">{errors.name}</p>}
        <p className="form-text text-muted">{t('artifacts.storagePathEditModal.nameHelper')}</p>
      </div>

      {/* Read-only fields */}
      <div className="mb-3">
        <label htmlFor="edit-storage-path-path" className="form-label">
          {t('artifacts.storagePathEditModal.pathLabel')}
        </label>
        <input
          id="edit-storage-path-path"
          className="form-control"
          type="text"
          value={storagePath.path}
          disabled
          readOnly
        />
        <p className="form-text text-muted">{t('artifacts.storagePathEditModal.pathHelper')}</p>
      </div>

      <div className="mb-3">
        <label htmlFor="edit-storage-path-type" className="form-label">
          {t('artifacts.storagePathEditModal.typeLabel')}
        </label>
        <select
          id="edit-storage-path-type"
          className="form-select"
          value={storagePath.type}
          disabled
        >
          <option value="iso">{t('artifacts.storagePathEditModal.isoFiles')}</option>
          <option value="image">{t('artifacts.storagePathEditModal.vmImages')}</option>
        </select>
        <p className="form-text text-muted">{t('artifacts.storagePathEditModal.typeHelper')}</p>
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
            {t('artifacts.storagePathEditModal.enableLabel')}
          </label>
        </div>
        <p className="form-text text-muted">
          {formData.enabled
            ? t('artifacts.storagePathEditModal.enabledDescription')
            : t('artifacts.storagePathEditModal.disabledDescription')}
        </p>
      </div>

      {/* Storage location statistics */}
      <div className="alert alert-secondary">
        <div>
          <p>
            <strong>{t('artifacts.storagePathEditModal.storageStatisticsHeading')}</strong>
          </p>
          <div className="row">
            <div className="col">
              <div className="text-center">
                <p className="text-uppercase small fw-semibold text-muted">
                  {t('artifacts.storagePathEditModal.filesLabel')}
                </p>
                <p className="fs-6 fw-bold">{storagePath.file_count || 0}</p>
              </div>
            </div>
            <div className="col">
              <div className="text-center">
                <p className="text-uppercase small fw-semibold text-muted">
                  {t('artifacts.storagePathEditModal.totalSizeLabel')}
                </p>
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
                  <p className="text-uppercase small fw-semibold text-muted">
                    {t('artifacts.storagePathEditModal.diskUsageLabel')}
                  </p>
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
            <strong>{t('artifacts.storagePathEditModal.disableWarningHeading')}</strong>{' '}
            {t('artifacts.storagePathEditModal.disableWarningMessage', {
              count: storagePath.file_count,
            })}
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
