import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import FormModal from '../common/FormModal';

const UserEditModal = ({ server, user, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [formData, setFormData] = useState({
    new_comment: user.comment || '',
    new_shell: user.shell || '/bin/bash',
    new_groups: [],
    new_authorizations: [],
    new_profiles: [],
  });

  const { makeAgentRequest } = useServers();

  const loadEditOptions = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      // Load available groups for selection
      const groupsResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/groups',
        'GET',
        null,
        { include_system: false, limit: 100 }
      );

      if (groupsResult.success) {
        setAvailableGroups(groupsResult.data?.groups || []);
      }

      // Load current user attributes to populate form
      const userResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/users/${encodeURIComponent(user.username)}/attributes`,
        'GET'
      );

      if (userResult.success && userResult.data) {
        setFormData(prev => ({
          ...prev,
          new_groups: userResult.data.groups || [],
          new_authorizations: userResult.data.authorizations || [],
          new_profiles: userResult.data.profiles || [],
        }));
      }
    } catch (err) {
      console.error('Error loading edit options:', err);
    }
  }, [server, user.username, makeAgentRequest]);

  useEffect(() => {
    loadEditOptions();
  }, [loadEditOptions]);

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

    try {
      setLoading(true);
      onError('');

      // Build payload with only changed fields
      const payload = {};

      if (formData.new_comment !== user.comment) {
        payload.new_comment = formData.new_comment.trim() || undefined;
      }

      if (formData.new_shell !== user.shell) {
        payload.new_shell = formData.new_shell;
      }

      // Always include arrays if they have values
      if (formData.new_groups.length > 0) {
        payload.new_groups = formData.new_groups;
      }

      if (formData.new_authorizations.length > 0) {
        payload.new_authorizations = formData.new_authorizations;
      }

      if (formData.new_profiles.length > 0) {
        payload.new_profiles = formData.new_profiles;
      }

      // Only proceed if we have changes to make
      if (Object.keys(payload).length === 0) {
        onError(t('host.userEditModal.noChangesDetected'));
        return;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/users/${encodeURIComponent(user.username)}`,
        'PUT',
        payload
      );

      if (result.success) {
        // Poll task if task_id is returned
        if (result.data?.task_id) {
          pollTask(result.data.task_id);
        }
        onSuccess();
      } else {
        onError(result.message || t('host.userEditModal.failedToUpdateUser'));
      }
    } catch (err) {
      onError(t('host.userEditModal.errorUpdatingUser', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const shells = ['/bin/bash', '/bin/sh', '/bin/zsh', '/bin/ksh', '/bin/tcsh', '/bin/false'];

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.userEditModal.editUserTitle', { username: user.username })}
      icon="fas fa-user-edit"
      submitText={t('host.userEditModal.updateUser')}
      submitIcon="fas fa-save"
      loading={loading}
      showCancelButton
      aria-label={t('host.userEditModal.editUserAriaLabel', { username: user.username })}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-username">
          {t('host.userEditModal.username')}
        </label>
        <input
          id="user-edit-username"
          className="form-control"
          type="text"
          value={user.username}
          disabled
          readOnly
        />
        <p className="form-text text-muted">{t('host.userEditModal.usernameCannotBeChanged')}</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-comment">
          {t('host.userEditModal.comment')}
        </label>
        <input
          id="user-edit-comment"
          className="form-control"
          type="text"
          value={formData.new_comment}
          onChange={e => handleInputChange('new_comment', e.target.value)}
          disabled={loading}
          placeholder={t('host.userEditModal.userDescriptionOrFullName')}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-shell">
          {t('host.userEditModal.shell')}
        </label>
        <select
          id="user-edit-shell"
          className="form-select"
          value={formData.new_shell}
          onChange={e => handleInputChange('new_shell', e.target.value)}
          disabled={loading}
        >
          {shells.map(shell => (
            <option key={shell} value={shell}>
              {shell}
            </option>
          ))}
        </select>
      </div>

      <hr />

      <h5 className="fs-6 fw-bold">{t('host.userEditModal.rbacConfiguration')}</h5>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-groups">
          {t('host.userEditModal.secondaryGroups')}
        </label>
        <input
          id="user-edit-groups"
          className="form-control"
          type="text"
          value={formData.new_groups.join(', ')}
          onChange={e => handleArrayInputChange('new_groups', e.target.value)}
          disabled={loading}
          placeholder={t('host.userEditModal.groupsPlaceholder')}
        />
        <p className="form-text text-muted">
          {t('host.userEditModal.availableGroups', {
            groups: availableGroups.map(g => g.groupname).join(', '),
          })}
        </p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-authorizations">
          {t('host.userEditModal.authorizations')}
        </label>
        <textarea
          id="user-edit-authorizations"
          className="form-control"
          rows="2"
          value={formData.new_authorizations.join(', ')}
          onChange={e => handleArrayInputChange('new_authorizations', e.target.value)}
          disabled={loading}
          placeholder={t('host.userEditModal.authorizationsPlaceholder')}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-edit-profiles">
          {t('host.userEditModal.profiles')}
        </label>
        <input
          id="user-edit-profiles"
          className="form-control"
          type="text"
          value={formData.new_profiles.join(', ')}
          onChange={e => handleArrayInputChange('new_profiles', e.target.value)}
          disabled={loading}
          placeholder={t('host.userEditModal.profilesPlaceholder')}
        />
      </div>

      <div className="alert alert-info">
        <p className="mb-0">
          <strong>{t('host.userEditModal.noteLabel')}</strong>{' '}
          {t('host.userEditModal.editNoteText')}
        </p>
      </div>
    </FormModal>
  );
};

UserEditModal.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  user: PropTypes.shape({
    username: PropTypes.string,
    comment: PropTypes.string,
    shell: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default UserEditModal;
