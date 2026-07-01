import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../contexts/ServerContext';
import FormModal from '../common/FormModal';

const GroupCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    groupname: '',
    gid: '',
  });

  const { makeAgentRequest } = useServers();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const pollTask = async taskId => {
    const checkTaskStatus = async pollCount => {
      if (pollCount >= 30) {
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

        // Schedule next poll
        await new Promise(resolve => {
          setTimeout(() => {
            resolve(checkTaskStatus(pollCount + 1));
          }, 1000);
        });
      } catch (err) {
        console.error('Error polling task:', err);
      }
    };

    await checkTaskStatus(0);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.groupname.trim()) {
      onError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      onError('');

      const payload = {
        groupname: formData.groupname.trim(),
      };

      if (formData.gid) {
        payload.gid = parseInt(formData.gid);
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/groups',
        'POST',
        payload
      );

      if (result.success) {
        // Poll task if task_id is returned
        if (result.data?.task_id) {
          await pollTask(result.data.task_id);
        }
        onSuccess();
      } else {
        onError(result.message || 'Failed to create group');
      }
    } catch (err) {
      onError(`Error creating group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create Group"
      icon="fas fa-users-plus"
      submitText="Create Group"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
      aria-label="Create new group"
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="group-name-input">
          Group Name <span className="text-danger">*</span>
        </label>
        <input
          id="group-name-input"
          className="form-control"
          type="text"
          value={formData.groupname}
          onChange={e => handleInputChange('groupname', e.target.value)}
          required
          disabled={loading}
          placeholder="Enter group name"
        />
        <p className="form-text text-muted">
          Group name must be unique and contain only valid characters
        </p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="group-gid-input">
          Group ID (GID)
        </label>
        <input
          id="group-gid-input"
          className="form-control"
          type="number"
          value={formData.gid}
          onChange={e => handleInputChange('gid', e.target.value)}
          disabled={loading}
          placeholder="Auto-assign if empty"
          min="100"
        />
        <p className="form-text text-muted">
          Leave empty to auto-assign. System groups use GID &lt; 100
        </p>
      </div>

      <div className="alert alert-info">
        <p className="mb-0">
          <strong>Note:</strong> Group members can be managed after creation through user management
          or by editing individual user accounts.
        </p>
      </div>
    </FormModal>
  );
};

GroupCreateModal.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default GroupCreateModal;
