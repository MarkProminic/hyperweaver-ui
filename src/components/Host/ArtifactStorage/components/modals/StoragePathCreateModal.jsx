import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const StoragePathCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
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
      newErrors.name = t('artifacts.storagePathCreateModal.nameRequired');
    } else if (formData.name.length < 2) {
      newErrors.name = t('artifacts.storagePathCreateModal.nameMinLength');
    }

    if (!formData.path.trim()) {
      newErrors.path = t('artifacts.storagePathCreateModal.pathRequired');
    } else if (!formData.path.startsWith('/')) {
      newErrors.path = t('artifacts.storagePathCreateModal.pathAbsoluteRequired');
    }

    if (!formData.type) {
      newErrors.type = t('artifacts.storagePathCreateModal.typeRequired');
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
      title={t('artifacts.storagePathCreateModal.title')}
      icon="fas fa-plus"
      submitText={t('artifacts.storagePathCreateModal.submitButton')}
      submitVariant="is-primary"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      <div className="mb-3">
        <label htmlFor="storage-path-name" className="form-label">
          {t('artifacts.storagePathCreateModal.nameLabel')}
        </label>
        <input
          id="storage-path-name"
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          type="text"
          placeholder={t('artifacts.storagePathCreateModal.namePlaceholder')}
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          disabled={loading}
        />
        {errors.name && <p className="form-text text-danger">{errors.name}</p>}
        <p className="form-text text-muted">{t('artifacts.storagePathCreateModal.nameHelper')}</p>
      </div>

      <div className="mb-3">
        <label htmlFor="storage-path-path" className="form-label">
          {t('artifacts.storagePathCreateModal.pathLabel')}
        </label>
        <input
          id="storage-path-path"
          className={`form-control ${errors.path ? 'is-invalid' : ''}`}
          type="text"
          placeholder={t('artifacts.storagePathCreateModal.pathPlaceholder')}
          value={formData.path}
          onChange={e => handleInputChange('path', e.target.value)}
          disabled={loading}
        />
        {errors.path && <p className="form-text text-danger">{errors.path}</p>}
        <p className="form-text text-muted">{t('artifacts.storagePathCreateModal.pathHelper')}</p>
      </div>

      <div className="mb-3">
        <label htmlFor="storage-path-type" className="form-label">
          {t('artifacts.storagePathCreateModal.typeLabel')}
        </label>
        <select
          id="storage-path-type"
          className="form-select"
          value={formData.type}
          onChange={e => handleInputChange('type', e.target.value)}
          disabled={loading}
        >
          <option value="iso">{t('artifacts.storagePathCreateModal.isoFiles')}</option>
          <option value="image">{t('artifacts.storagePathCreateModal.vmImages')}</option>
        </select>
        {errors.type && <p className="form-text text-danger">{errors.type}</p>}
        <p className="form-text text-muted">{t('artifacts.storagePathCreateModal.typeHelper')}</p>
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
            {t('artifacts.storagePathCreateModal.enableLabel')}
          </label>
        </div>
        <p className="form-text text-muted">{t('artifacts.storagePathCreateModal.enableHelper')}</p>
      </div>

      <div className="alert alert-info">
        <div>
          <p>
            <strong>{t('artifacts.storagePathCreateModal.importantHeading')}</strong>
          </p>
          <ul>
            <li>{t('artifacts.storagePathCreateModal.importantNote1')}</li>
            <li>{t('artifacts.storagePathCreateModal.importantNote2')}</li>
            <li>{t('artifacts.storagePathCreateModal.importantNote3')}</li>
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
