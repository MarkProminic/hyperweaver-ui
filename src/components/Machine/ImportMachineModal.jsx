import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importMachine } from '../../api/machineAPI';
import { FormModal, PathInput } from '../common';

const ImportMachineModal = ({ isOpen, onClose, currentServer, onDone }) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPath('');
      setName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!path.trim()) {
      setError(t('machine.importMachineModal.pathRequired'));
      return;
    }
    setLoading(true);
    setError('');
    const result = await importMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      {
        path: path.trim(),
        ...(name.trim() && { name: name.trim() }),
      }
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const taskId = result.data?.task_id || result.data?.parent_task_id;
    onDone({
      text: `${result.data?.message || t('machine.importMachineModal.importQueuedFallback')}${taskId ? ` ${t('machine.importMachineModal.taskSuffix', { taskId })}` : ''} ${t('machine.importMachineModal.discoveryNote')}`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machine.importMachineModal.title')}
      icon="fas fa-file-import"
      submitText={t('machine.importMachineModal.submit')}
      submitIcon="fas fa-file-import"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="import-machine-path">
          {t('machine.importMachineModal.pathLabel')} <span className="text-danger">*</span>
        </label>
        <PathInput
          id="import-machine-path"
          value={path}
          onChange={setPath}
          server={currentServer}
          mode="file"
          pickTitle={t('machine.importMachineModal.pickTitle')}
          disabled={loading}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="import-machine-name">
          {t('machine.importMachineModal.nameLabel')}
        </label>
        <input
          id="import-machine-name"
          className="form-control"
          type="text"
          placeholder={t('machine.importMachineModal.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
        />
      </div>
    </FormModal>
  );
};

ImportMachineModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  onDone: PropTypes.func.isRequired,
};

export default ImportMachineModal;
