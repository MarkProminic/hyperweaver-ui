import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { importMachine } from '../../api/machineAPI';
import { FormModal, PathInput } from '../common';

const ImportMachineModal = ({ isOpen, onClose, currentServer, onDone }) => {
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
      setError('Enter the .ova/.ovf path on the agent host.');
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
      text: `${result.data?.message || 'Import queued'}${taskId ? ` (task ${taskId})` : ''} — the machine row appears via discovery when the import completes.`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Import Machine (.ova / .ovf)"
      icon="fas fa-file-import"
      submitText="Import"
      submitIcon="fas fa-file-import"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="mb-3">
        <label className="form-label" htmlFor="import-machine-path">
          Appliance path (on the agent host) <span className="text-danger">*</span>
        </label>
        <PathInput
          id="import-machine-path"
          value={path}
          onChange={setPath}
          server={currentServer}
          mode="file"
          pickTitle="Pick the .ova/.ovf"
          disabled={loading}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="import-machine-name">
          Name
        </label>
        <input
          id="import-machine-name"
          className="form-control"
          type="text"
          placeholder="(blank = the appliance's own name)"
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
