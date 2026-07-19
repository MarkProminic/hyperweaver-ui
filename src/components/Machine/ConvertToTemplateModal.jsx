import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getMachineSnapshots } from '../../api/machineAPI';
import { exportTemplate } from '../../api/provisioningAPI';
import { hasFeature } from '../../utils/capabilities';
import { FormModal } from '../common';

/**
 * Convert this machine to a template — POST /templates/export
 * {machine_name, filename?, snapshot_name?} (202 task; the .box path and
 * sha256 land in the task output). Publishing to a registry lives on the
 * host Templates page; this is the per-machine entry point.
 */
const ConvertToTemplateModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  isRunning,
  onDone,
}) => {
  const { t } = useTranslation();
  const [filename, setFilename] = useState('');
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setFilename('');
    setSnapshotName('');
    setError('');
    setSnapshots([]);
    if (hasFeature(currentServer, 'machine-snapshots')) {
      getMachineSnapshots(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName
      ).then(result => {
        setSnapshots(
          result.success && Array.isArray(result.data?.snapshots) ? result.data.snapshots : []
        );
      });
    }
  }, [isOpen, currentServer, machineName]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const body = {
      machine_name: machineName,
      ...(filename.trim() && { filename: filename.trim() }),
      ...(snapshotName && { snapshot_name: snapshotName }),
    };
    const result = await exportTemplate(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      body
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const taskId = result.data?.task_id;
    onDone({
      text: `${result.data?.message || t('machine.convertToTemplateModal.queuedFallback', { machineName })}${
        taskId ? ` ${t('machine.convertToTemplateModal.taskSuffix', { taskId })}` : ''
      } ${t('machine.convertToTemplateModal.outputNote')}`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machine.convertToTemplateModal.title', { machineName: machineName || '' })}
      icon="fas fa-box-archive"
      submitText={t('machine.convertToTemplateModal.submit')}
      submitIcon="fas fa-file-export"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {isRunning && !snapshotName && (
        <div className="alert alert-warning py-2">
          {t('machine.convertToTemplateModal.runningWarning')}
        </div>
      )}
      <div className="mb-3">
        <label className="form-label" htmlFor="totemplate-filename">
          {t('machine.convertToTemplateModal.filenameLabel')}
        </label>
        <input
          id="totemplate-filename"
          className="form-control"
          type="text"
          placeholder={t('machine.convertToTemplateModal.filenamePlaceholder', {
            machineName: machineName || t('machine.convertToTemplateModal.theMachine'),
          })}
          value={filename}
          onChange={e => setFilename(e.target.value)}
          disabled={loading}
        />
      </div>
      {snapshots.length > 0 && (
        <div className="mb-3">
          <label className="form-label" htmlFor="totemplate-snapshot">
            {t('machine.convertToTemplateModal.snapshotLabel')}
          </label>
          <select
            id="totemplate-snapshot"
            className="form-select"
            value={snapshotName}
            onChange={e => setSnapshotName(e.target.value)}
            disabled={loading}
          >
            <option value="">{t('machine.convertToTemplateModal.currentStateOption')}</option>
            {snapshots.map(snap => (
              <option key={snap.name} value={snap.name}>
                {snap.name}
                {snap.current ? ` ${t('machine.convertToTemplateModal.currentSuffix')}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="form-text text-muted mb-0">{t('machine.convertToTemplateModal.publishNote')}</p>
    </FormModal>
  );
};

ConvertToTemplateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default ConvertToTemplateModal;
