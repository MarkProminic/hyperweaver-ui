import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import FormModal from '../common/FormModal';

const RoleCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rolename: '',
    comment: '',
    shell: '/bin/pfsh',
    authorizations: [],
    profiles: [],
    create_home: false,
  });

  const { makeAgentRequest } = useServers();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayInputChange = (field, value) => {
    const items = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    setFormData(prev => ({
      ...prev,
      [field]: items,
    }));
  };

  const pollTask = useCallback(
    taskId => {
      const checkTaskStatus = async pollCount => {
        const maxPolls = 30;

        if (pollCount >= maxPolls) {
          return;
        }

        try {
          const taskResult = await makeAgentRequest(
            server.hostname,
            server.port,
            server.protocol,
            `tasks/${taskId}`,
            'GET'
          );

          if (taskResult.success) {
            const status = taskResult.data?.status;
            if (status === 'completed' || status === 'failed') {
              if (status === 'failed' && taskResult.data?.error_message) {
                onError(taskResult.data.error_message);
              }
              return;
            }
          }

          // Schedule next poll after delay
          setTimeout(() => {
            void checkTaskStatus(pollCount + 1);
          }, 1000);
        } catch (err) {
          console.error('Error polling task:', err);
        }
      };

      void checkTaskStatus(0);
    },
    [server, makeAgentRequest, onError]
  );

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.rolename.trim()) {
      onError(t('host.roleCreateModal.errors.nameRequired'));
      return;
    }

    try {
      setLoading(true);
      onError('');

      const payload = {
        rolename: formData.rolename.trim(),
        comment: formData.comment.trim() || 'RBAC Role',
        shell: formData.shell || '/bin/pfsh',
        create_home: formData.create_home,
      };

      if (formData.authorizations.length > 0) {
        payload.authorizations = formData.authorizations;
      }

      if (formData.profiles.length > 0) {
        payload.profiles = formData.profiles;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/roles',
        'POST',
        payload
      );

      if (result.success) {
        // Poll task if task_id is returned
        if (result.data?.task_id) {
          pollTask(result.data.task_id);
        }
        onSuccess();
      } else {
        onError(result.message || t('host.roleCreateModal.errors.createFailed'));
      }
    } catch (err) {
      onError(t('host.roleCreateModal.errors.createError', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const shells = ['/bin/pfsh', '/bin/bash', '/bin/sh', '/bin/zsh', '/bin/ksh'];

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.roleCreateModal.title')}
      icon="fas fa-user-shield-plus"
      submitText={t('host.roleCreateModal.title')}
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
      aria-label={t('host.roleCreateModal.ariaLabel')}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="rolename">
          {t('host.roleCreateModal.roleNameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="rolename"
          className="form-control"
          type="text"
          value={formData.rolename}
          onChange={e => handleInputChange('rolename', e.target.value)}
          required
          disabled={loading}
          placeholder={t('host.roleCreateModal.roleNamePlaceholder')}
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.roleNameHelp')}</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="comment">
          {t('host.roleCreateModal.commentLabel')}
        </label>
        <input
          id="comment"
          className="form-control"
          type="text"
          value={formData.comment}
          onChange={e => handleInputChange('comment', e.target.value)}
          disabled={loading}
          placeholder={t('host.roleCreateModal.commentPlaceholder')}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="shell">
          {t('host.roleCreateModal.shellLabel')}
        </label>
        <select
          id="shell"
          className="form-select"
          value={formData.shell}
          onChange={e => handleInputChange('shell', e.target.value)}
          disabled={loading}
        >
          {shells.map(shell => (
            <option key={shell} value={shell}>
              {shell}
            </option>
          ))}
        </select>
        <p className="form-text text-muted">{t('host.roleCreateModal.shellHelp')}</p>
      </div>

      <hr />

      <h5 className="fs-6 fw-bold">{t('host.roleCreateModal.rbacConfiguration')}</h5>

      <div className="mb-3">
        <label className="form-label" htmlFor="authorizations">
          {t('host.roleCreateModal.authorizationsLabel')}
        </label>
        <textarea
          id="authorizations"
          className="form-control"
          rows="3"
          value={formData.authorizations.join(', ')}
          onChange={e => handleArrayInputChange('authorizations', e.target.value)}
          disabled={loading}
          placeholder={t('host.roleCreateModal.authorizationsPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.authorizationsHelp')}</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="profiles">
          {t('host.roleCreateModal.profilesLabel')}
        </label>
        <input
          id="profiles"
          className="form-control"
          type="text"
          value={formData.profiles.join(', ')}
          onChange={e => handleArrayInputChange('profiles', e.target.value)}
          disabled={loading}
          placeholder={t('host.roleCreateModal.profilesPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.roleCreateModal.profilesHelp')}</p>
      </div>

      <hr />

      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="create_home"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={formData.create_home}
            onChange={e => handleInputChange('create_home', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="create_home">
            {t('host.roleCreateModal.createHomeLabel')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.roleCreateModal.createHomeHelp')}</p>
      </div>

      <div className="alert alert-info">
        <p className="mb-0">
          <strong>{t('host.roleCreateModal.noteLabel')}</strong>{' '}
          {t('host.roleCreateModal.noteText')}
        </p>
      </div>
    </FormModal>
  );
};

RoleCreateModal.propTypes = {
  server: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default RoleCreateModal;
