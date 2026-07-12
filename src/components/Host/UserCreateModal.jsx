import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import FormModal from '../common/FormModal';

const UserCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    uid: '',
    comment: '',
    shell: '/bin/bash',
    groups: [],
    authorizations: [],
    profiles: [],
    roles: [],
    project: '',
    create_home: true,
    force_zfs: false,
    create_personal_group: true,
  });

  const { makeAgentRequest } = useServers();

  const loadAdvancedOptions = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      // Load available groups and roles for selection
      const [groupsResult, rolesResult] = await Promise.all([
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'system/groups',
          'GET',
          null,
          { include_system: false, limit: 100 }
        ),
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'system/roles',
          'GET',
          null,
          { limit: 50 }
        ),
      ]);

      if (groupsResult.success) {
        setAvailableGroups(groupsResult.data?.groups || []);
      }

      if (rolesResult.success) {
        setAvailableRoles(rolesResult.data?.roles || []);
      }
    } catch (err) {
      console.error('Error loading advanced options:', err);
    }
  }, [server, makeAgentRequest]);

  useEffect(() => {
    if (isAdvanced) {
      loadAdvancedOptions();
    }
  }, [isAdvanced, loadAdvancedOptions]);

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

    if (!formData.username.trim()) {
      onError('Username is required');
      return;
    }

    try {
      setLoading(true);
      onError('');

      const payload = {
        username: formData.username.trim(),
        comment: formData.comment.trim() || undefined,
        shell: formData.shell || '/bin/bash',
        create_home: formData.create_home,
        create_personal_group: formData.create_personal_group,
      };

      // Add advanced options if in advanced mode
      if (isAdvanced) {
        if (formData.uid) {
          payload.uid = parseInt(formData.uid);
        }
        if (formData.groups.length > 0) {
          payload.groups = formData.groups;
        }
        if (formData.authorizations.length > 0) {
          payload.authorizations = formData.authorizations;
        }
        if (formData.profiles.length > 0) {
          payload.profiles = formData.profiles;
        }
        if (formData.roles.length > 0) {
          payload.roles = formData.roles;
        }
        if (formData.project.trim()) {
          payload.project = formData.project.trim();
        }
        if (formData.force_zfs) {
          payload.force_zfs = true;
        }
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/users',
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
        onError(result.message || 'Failed to create user');
      }
    } catch (err) {
      onError(`Error creating user: ${err.message}`);
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
      title="Create User"
      icon="fas fa-user-plus"
      submitText="Create User"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
      aria-label="Create new user account"
    >
      {/* Mode Toggle */}
      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="user-create-advanced"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={isAdvanced}
            onChange={e => setIsAdvanced(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="user-create-advanced">
            Advanced Mode (RBAC Configuration)
          </label>
        </div>
      </div>

      <hr />

      {/* Basic Fields */}
      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-username">
              Username <span className="text-danger">*</span>
            </label>
            <input
              id="user-create-username"
              className="form-control"
              type="text"
              value={formData.username}
              onChange={e => handleInputChange('username', e.target.value)}
              required
              disabled={loading}
              placeholder="Enter username"
            />
          </div>
        </div>
        {isAdvanced && (
          <div className="col">
            <div className="mb-3">
              <label className="form-label" htmlFor="user-create-uid">
                User ID (UID)
              </label>
              <input
                id="user-create-uid"
                className="form-control"
                type="number"
                value={formData.uid}
                onChange={e => handleInputChange('uid', e.target.value)}
                disabled={loading}
                placeholder="Auto-assign if empty"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-create-comment">
          Comment
        </label>
        <input
          id="user-create-comment"
          className="form-control"
          type="text"
          value={formData.comment}
          onChange={e => handleInputChange('comment', e.target.value)}
          disabled={loading}
          placeholder="User description or full name"
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="user-create-shell">
          Shell
        </label>
        <select
          id="user-create-shell"
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
      </div>

      {/* Advanced Fields */}
      {isAdvanced && (
        <>
          <hr />
          <h5 className="fs-6 fw-bold">RBAC Configuration</h5>

          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-groups">
              Groups
            </label>
            <input
              id="user-create-groups"
              className="form-control"
              type="text"
              value={formData.groups.join(', ')}
              onChange={e => handleArrayInputChange('groups', e.target.value)}
              disabled={loading}
              placeholder="staff, admin, developers (comma-separated)"
            />
            <p className="form-text text-muted">
              Available groups: {availableGroups.map(g => g.groupname).join(', ')}
            </p>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-authorizations">
              Authorizations
            </label>
            <textarea
              id="user-create-authorizations"
              className="form-control"
              rows="2"
              value={formData.authorizations.join(', ')}
              onChange={e => handleArrayInputChange('authorizations', e.target.value)}
              disabled={loading}
              placeholder="solaris.admin.usermgr.*, solaris.network.* (comma-separated)"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-profiles">
              Profiles
            </label>
            <input
              id="user-create-profiles"
              className="form-control"
              type="text"
              value={formData.profiles.join(', ')}
              onChange={e => handleArrayInputChange('profiles', e.target.value)}
              disabled={loading}
              placeholder="System Administrator, Network Management (comma-separated)"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-roles">
              Roles
            </label>
            <input
              id="user-create-roles"
              className="form-control"
              type="text"
              value={formData.roles.join(', ')}
              onChange={e => handleArrayInputChange('roles', e.target.value)}
              disabled={loading}
              placeholder="admin_role, backup_role (comma-separated)"
            />
            <p className="form-text text-muted">
              Available roles: {availableRoles.map(r => r.rolename).join(', ')}
            </p>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="user-create-project">
              Project
            </label>
            <input
              id="user-create-project"
              className="form-control"
              type="text"
              value={formData.project}
              onChange={e => handleInputChange('project', e.target.value)}
              disabled={loading}
              placeholder="admin_project"
            />
          </div>
        </>
      )}

      <hr />

      {/* Options */}
      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="user-create-home"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={formData.create_home}
            onChange={e => handleInputChange('create_home', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="user-create-home">
            Create Home Directory
          </label>
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="user-create-personal-group"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={formData.create_personal_group}
            onChange={e => handleInputChange('create_personal_group', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="user-create-personal-group">
            Create Personal Group
          </label>
        </div>
      </div>

      {isAdvanced && (
        <div className="mb-3">
          <div className="form-check form-switch">
            <input
              id="user-create-force-zfs"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={formData.force_zfs}
              onChange={e => handleInputChange('force_zfs', e.target.checked)}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="user-create-force-zfs">
              Force ZFS Home Directory
            </label>
          </div>
        </div>
      )}
    </FormModal>
  );
};

UserCreateModal.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default UserCreateModal;
