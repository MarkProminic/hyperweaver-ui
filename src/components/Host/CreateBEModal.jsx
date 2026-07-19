import PropTypes from 'prop-types';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

const CreateBEModal = ({ server, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceBE: '',
    snapshot: '',
    activate: false,
    zpool: '',
    properties: [],
  });
  const nextPropId = useRef(0);

  const { makeAgentRequest } = useServers();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePropertyKeyChange = (id, newKey) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.map(prop => (prop.id === id ? { ...prop, key: newKey } : prop)),
    }));
  };

  const handlePropertyValueChange = (id, newValue) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.map(prop =>
        prop.id === id ? { ...prop, value: newValue } : prop
      ),
    }));
  };

  const removeProperty = id => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.filter(prop => prop.id !== id),
    }));
  };

  const addProperty = () => {
    const id = nextPropId.current;
    nextPropId.current += 1;
    setFormData(prev => ({
      ...prev,
      properties: [...prev.properties, { id, key: '', value: '' }],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      onError(t('host.createBEModal.errors.nameRequired'));
      return;
    }

    // Validate BE name format
    const beNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!beNameRegex.test(formData.name.trim())) {
      onError(t('host.createBEModal.errors.nameInvalid'));
      return;
    }

    try {
      setLoading(true);
      onError('');

      const requestData = {
        name: formData.name.trim(),
      };

      // Add optional fields only if they have values
      if (formData.description.trim()) {
        requestData.description = formData.description.trim();
      }
      if (formData.sourceBE.trim()) {
        requestData.source_be = formData.sourceBE.trim();
      }
      if (formData.snapshot.trim()) {
        requestData.snapshot = formData.snapshot.trim();
      }
      if (formData.activate) {
        requestData.activate = true;
      }
      if (formData.zpool.trim()) {
        requestData.zpool = formData.zpool.trim();
      }

      // Add properties if any are defined
      const validProperties = formData.properties.reduce((acc, prop) => {
        if (prop.key.trim() && prop.value.trim()) {
          acc[prop.key.trim()] = prop.value.trim();
        }
        return acc;
      }, {});

      if (Object.keys(validProperties).length > 0) {
        requestData.properties = validProperties;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/boot-environments',
        'POST',
        requestData
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || t('host.createBEModal.errors.createFailed'));
      }
    } catch (err) {
      onError(t('host.createBEModal.errors.createError', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.createBEModal.title')}
      icon="fas fa-plus-circle"
      submitText={t('host.createBEModal.title')}
      submitIcon="fas fa-plus"
      submitVariant="success"
      loading={loading}
    >
      {/* Basic Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.createBEModal.basicInformation')}</h3>

          <div className="mb-3">
            <label htmlFor="be-name" className="form-label">
              {t('host.createBEModal.nameLabel')} *
            </label>
            <input
              id="be-name"
              className="form-control"
              type="text"
              placeholder={t('host.createBEModal.namePlaceholder')}
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              required
            />
            <p className="form-text text-muted">{t('host.createBEModal.nameHelp')}</p>
          </div>

          <div className="mb-3">
            <label htmlFor="be-description" className="form-label">
              {t('host.createBEModal.descriptionLabel')}
            </label>
            <textarea
              id="be-description"
              className="form-control"
              placeholder={t('host.createBEModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows="2"
            />
          </div>
        </div>
      </div>

      {/* Source Configuration */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.createBEModal.sourceConfiguration')}</h3>

          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="be-source" className="form-label">
                  {t('host.createBEModal.sourceBELabel')}
                </label>
                <input
                  id="be-source"
                  className="form-control"
                  type="text"
                  placeholder={t('host.createBEModal.sourceBEPlaceholder')}
                  value={formData.sourceBE}
                  onChange={e => handleInputChange('sourceBE', e.target.value)}
                />
                <p className="form-text text-muted">{t('host.createBEModal.sourceBEHelp')}</p>
              </div>
            </div>

            <div className="col">
              <div className="mb-3">
                <label htmlFor="be-snapshot" className="form-label">
                  {t('host.createBEModal.sourceSnapshotLabel')}
                </label>
                <input
                  id="be-snapshot"
                  className="form-control"
                  type="text"
                  placeholder={t('host.createBEModal.sourceSnapshotPlaceholder')}
                  value={formData.snapshot}
                  onChange={e => handleInputChange('snapshot', e.target.value)}
                />
                <p className="form-text text-muted">{t('host.createBEModal.sourceSnapshotHelp')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.createBEModal.advancedOptions')}</h3>

          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <div className="form-check">
                  <input
                    id="be-activate"
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.activate}
                    onChange={e => handleInputChange('activate', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="be-activate">
                    <strong>{t('host.createBEModal.activateTitle')}</strong>{' '}
                    {t('host.createBEModal.activateHelp')}
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="be-zpool" className="form-label">
                  {t('host.createBEModal.zpoolLabel')}
                </label>
                <input
                  id="be-zpool"
                  className="form-control"
                  type="text"
                  placeholder={t('host.createBEModal.zpoolPlaceholder')}
                  value={formData.zpool}
                  onChange={e => handleInputChange('zpool', e.target.value)}
                />
                <p className="form-text text-muted">{t('host.createBEModal.zpoolHelp')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Properties */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.createBEModal.customProperties')}</h3>

          {formData.properties.map(prop => (
            <div key={prop.id} className="input-group mb-3">
              <input
                className="form-control"
                type="text"
                placeholder={t('host.createBEModal.propertyNamePlaceholder')}
                value={prop.key}
                onChange={e => handlePropertyKeyChange(prop.id, e.target.value)}
              />
              <input
                className="form-control"
                type="text"
                placeholder={t('host.createBEModal.propertyValuePlaceholder')}
                value={prop.value}
                onChange={e => handlePropertyValueChange(prop.id, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeProperty(prop.id)}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-info" onClick={addProperty}>
            <i className="fas fa-plus me-2" />
            <span>{t('host.createBEModal.addProperty')}</span>
          </button>

          <p className="form-text text-muted mt-2">
            {t('host.createBEModal.customPropertiesHelp')}
          </p>
        </div>
      </div>
    </FormModal>
  );
};

CreateBEModal.propTypes = {
  server: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default CreateBEModal;
