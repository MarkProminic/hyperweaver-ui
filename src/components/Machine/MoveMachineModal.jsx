import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { moveMachine } from '../../api/machineAPI';
import { FormModal, PathInput } from '../common';

const MoveMachineModal = ({ isOpen, onClose, currentServer, machineName, isRunning, onDone }) => {
  const { t } = useTranslation();
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
      setError(t('machine.moveMachineModal.pathRequired'));
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
      text: `${result.data?.message || t('machine.moveMachineModal.queuedFallback', { machineName })}${taskId ? ` ${t('machine.moveMachineModal.taskSuffix', { taskId })}` : ''}`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machine.moveMachineModal.title', { machineName })}
      icon="fas fa-truck-arrow-right"
      submitText={t('machine.moveMachineModal.submit')}
      submitIcon="fas fa-truck-arrow-right"
      loading={loading}
      showCancelButton
    >
      {isRunning && (
        <div className="alert alert-warning py-2">
          {t('machine.moveMachineModal.runningWarning', { machineName })}
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="move-machine-target">
          {t('machine.moveMachineModal.destinationLabel')} <span className="text-danger">*</span>
        </label>
        <PathInput
          id="move-machine-target"
          value={targetPath}
          onChange={setTargetPath}
          server={currentServer}
          mode="directory"
          pickTitle={t('machine.moveMachineModal.pickTitle')}
          disabled={loading}
        />
        <p className="form-text text-muted mb-0">{t('machine.moveMachineModal.relocateNote')}</p>
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
