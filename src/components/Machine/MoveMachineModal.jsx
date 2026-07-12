import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { moveMachine } from '../../api/machineAPI';
import { FormModal, PathInput } from '../common';

const MoveMachineModal = ({ isOpen, onClose, currentServer, machineName, isRunning, onDone }) => {
  const [targetPath, setTargetPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTargetPath('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!targetPath.trim()) {
      setError('Enter the destination directory on the agent host.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await moveMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      targetPath.trim()
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const taskId = result.data?.task_id || result.data?.parent_task_id;
    onDone({
      text: `${result.data?.message || `Move queued for ${machineName}`}${taskId ? ` (task ${taskId})` : ''}`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Move ${machineName}`}
      icon="fas fa-truck-arrow-right"
      submitText="Move"
      submitIcon="fas fa-truck-arrow-right"
      loading={loading}
      showCancelButton
    >
      {isRunning && (
        <div className="alert alert-warning py-2">
          {machineName} is running — moving needs it powered off; the agent will refuse.
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="move-machine-target">
          Destination directory (on the agent host) <span className="text-danger">*</span>
        </label>
        <PathInput
          id="move-machine-target"
          value={targetPath}
          onChange={setTargetPath}
          server={currentServer}
          mode="directory"
          pickTitle="Pick the destination"
          disabled={loading}
        />
        <p className="form-text text-muted mb-0">
          The machine&apos;s files (disks included) relocate beneath this directory.
        </p>
      </div>
    </FormModal>
  );
};

MoveMachineModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default MoveMachineModal;
