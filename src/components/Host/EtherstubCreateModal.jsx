import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

const EtherstubCreateModal = ({ server, existingEtherstubs, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    temporary: false,
  });
  const [creating, setCreating] = useState(false);

  const { makeAgentRequest } = useServers();

  // Generate next available etherstub name
  const generateNextEtherstubName = useCallback(() => {
    if (!existingEtherstubs) {
      return 'stub0';
    }

    // Extract numeric suffixes from existing etherstub names
    // Handle both .name and .link fields from JSON response
    const existingNumbers = existingEtherstubs
      .map(eth => eth.name || eth.link)
      .filter(name => name && name.startsWith('stub'))
      .map(name => {
        const match = name.match(/^stub(?:\d+)$/);
        return match ? parseInt(name.slice(4), 10) : -1;
      })
      .filter(num => num >= 0)
      .sort((a, b) => a - b);

    // Find the next available number
    let nextNumber = 0;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    return `stub${nextNumber}`;
  }, [existingEtherstubs]);

  // Set default etherstub name when modal opens
  useEffect(() => {
    const defaultName = generateNextEtherstubName();
    setFormData(prev => ({
      ...prev,
      name: defaultName,
    }));
  }, [existingEtherstubs, generateNextEtherstubName]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      onError(t('host.etherstubCreateModal.errors.nameRequired'));
      return false;
    }

    // Validate etherstub name format
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!nameRegex.test(formData.name)) {
      onError(t('host.etherstubCreateModal.errors.nameFormat'));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      onError('');

      const requestData = {
        name: formData.name.trim(),
        temporary: formData.temporary,
      };

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/etherstubs',
        'POST',
        requestData
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || t('host.etherstubCreateModal.errors.createFailed'));
      }
    } catch (err) {
      onError(t('host.etherstubCreateModal.errors.createError', { message: err.message }));
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.etherstubCreateModal.title')}
      icon="fas fa-plus-circle"
      submitText={t('host.etherstubCreateModal.title')}
      submitVariant="is-primary"
      loading={creating}
    >
      <div className="mb-3">
        <label htmlFor="etherstub-name" className="form-label">
          {t('host.etherstubCreateModal.etherstubNameLabel')} *
        </label>
        <input
          id="etherstub-name"
          className="form-control"
          type="text"
          placeholder="e.g., stub0"
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          disabled={creating}
          required
        />
        <p className="form-text text-muted">{t('host.etherstubCreateModal.nameHelp')}</p>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="etherstub-temporary"
            className="form-check-input"
            type="checkbox"
            checked={formData.temporary}
            onChange={e => handleInputChange('temporary', e.target.checked)}
            disabled={creating}
          />
          <label className="form-check-label" htmlFor="etherstub-temporary">
            {t('host.etherstubCreateModal.temporary')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.etherstubCreateModal.temporaryHelp')}</p>
      </div>

      <div className="alert alert-info mt-4">
        <p>
          <strong>{t('host.etherstubCreateModal.aboutTitle')}</strong>
        </p>
        <p>{t('host.etherstubCreateModal.aboutBody')}</p>
      </div>
    </FormModal>
  );
};

EtherstubCreateModal.propTypes = {
  server: PropTypes.object.isRequired,
  existingEtherstubs: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default EtherstubCreateModal;
