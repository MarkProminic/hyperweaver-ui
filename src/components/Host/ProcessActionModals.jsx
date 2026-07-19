import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../common';

// Kill Process Confirmation Modal
const KillProcessModal = ({ process, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await onConfirm(process.pid, 'kill', { force });
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Error killing process:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.killProcessModal.title')}
      icon="fas fa-times"
      submitText={loading ? t('host.killProcessModal.killing') : t('host.killProcessModal.title')}
      submitVariant="is-danger"
      loading={loading}
      showCancelButton
    >
      {/* Process Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.killProcessModal.processInformation')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.killProcessModal.pid')}</strong>
                  </td>
                  <td className="font-monospace">{process.pid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.killProcessModal.user')}</strong>
                  </td>
                  <td>{process.username}</td>
                </tr>
                {process.zone && (
                  <tr>
                    <td>
                      <strong>{t('host.killProcessModal.zone')}</strong>
                    </td>
                    <td>{process.zone}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    <strong>{t('host.killProcessModal.command')}</strong>
                  </td>
                  <td className="font-monospace small">{process.command}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="alert alert-danger">
        <p>
          <strong>{t('host.killProcessModal.warningLabel')}</strong>{' '}
          {t('host.killProcessModal.warningText')}
        </p>
        <p className="mt-2">{t('host.killProcessModal.warningDetail')}</p>
      </div>

      {/* Options */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.killProcessModal.killOptions')}</h3>

          <div className="mb-3">
            <div className="form-check">
              <input
                id="kill-force"
                className="form-check-input"
                type="checkbox"
                checked={force}
                onChange={e => setForce(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="kill-force">
                <strong>{t('host.killProcessModal.forceKillLabel')}</strong>{' '}
                {t('host.killProcessModal.forceKillHelp')}
              </label>
            </div>
            <p className="form-text text-muted">{t('host.killProcessModal.forceKillNote')}</p>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

KillProcessModal.propTypes = {
  process: PropTypes.shape({
    pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string,
    zone: PropTypes.string,
    command: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

// Send Signal Modal
const SendSignalModal = ({ process, onClose, onConfirm, limitedSignals }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState('TERM');

  const allSignals = [
    { value: 'TERM', label: t('host.sendSignalModal.signalTerm') },
    { value: 'KILL', label: t('host.sendSignalModal.signalKill') },
    { value: 'HUP', label: t('host.sendSignalModal.signalHup') },
    { value: 'INT', label: t('host.sendSignalModal.signalInt') },
    { value: 'QUIT', label: t('host.sendSignalModal.signalQuit') },
    { value: 'USR1', label: t('host.sendSignalModal.signalUsr1') },
    { value: 'USR2', label: t('host.sendSignalModal.signalUsr2') },
    { value: 'STOP', label: t('host.sendSignalModal.signalStop') },
    { value: 'CONT', label: t('host.sendSignalModal.signalCont') },
  ];
  // A Windows-host agent delivers only TERM/KILL — anything else 400s.
  const signals = limitedSignals
    ? allSignals.filter(sig => sig.value === 'TERM' || sig.value === 'KILL')
    : allSignals;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await onConfirm(process.pid, 'signal', { signal });
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.sendSignalModal.title')}
      icon="fas fa-bolt"
      submitText={
        loading ? t('host.sendSignalModal.sending') : t('host.sendSignalModal.sendSignal')
      }
      submitVariant="is-warning"
      loading={loading}
      showCancelButton
    >
      {/* Process Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.sendSignalModal.processInformation')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.sendSignalModal.pid')}</strong>
                  </td>
                  <td className="font-monospace">{process.pid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.sendSignalModal.user')}</strong>
                  </td>
                  <td>{process.username}</td>
                </tr>
                {process.zone && (
                  <tr>
                    <td>
                      <strong>{t('host.sendSignalModal.zone')}</strong>
                    </td>
                    <td>{process.zone}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    <strong>{t('host.sendSignalModal.command')}</strong>
                  </td>
                  <td className="font-monospace small">{process.command}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signal Selection */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.sendSignalModal.signalSelection')}</h3>

          <div className="mb-3">
            <label className="form-label" htmlFor="signal-select">
              {t('host.sendSignalModal.signalToSend')}
            </label>
            <select
              id="signal-select"
              className="form-select"
              value={signal}
              onChange={e => setSignal(e.target.value)}
            >
              {signals.map(sig => (
                <option key={sig.value} value={sig.value}>
                  {sig.label}
                </option>
              ))}
            </select>
            <p className="form-text text-muted">{t('host.sendSignalModal.signalToSendHelp')}</p>
          </div>
        </div>
      </div>

      {/* Signal Information */}
      <div className="alert alert-info">
        <p>
          <strong>{t('host.sendSignalModal.noteLabel')}</strong>{' '}
          {t('host.sendSignalModal.noteText')}
        </p>
        <ul className="mt-2">
          <li>
            • <strong>SIGTERM:</strong> {t('host.sendSignalModal.sigtermDesc')}
          </li>
          <li>
            • <strong>SIGKILL:</strong> {t('host.sendSignalModal.sigkillDesc')}
          </li>
          <li>
            • <strong>SIGHUP:</strong> {t('host.sendSignalModal.sighupDesc')}
          </li>
          <li>
            • <strong>SIGSTOP/SIGCONT:</strong> {t('host.sendSignalModal.sigstopContDesc')}
          </li>
        </ul>
      </div>
    </FormModal>
  );
};

SendSignalModal.propTypes = {
  process: PropTypes.shape({
    pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    username: PropTypes.string,
    zone: PropTypes.string,
    command: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  limitedSignals: PropTypes.bool,
};

// Batch Kill Modal
const BatchKillModal = ({ onClose, onConfirm, availableZones, limitedSignals }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState('');
  const [zone, setZone] = useState('');
  const [signal, setSignal] = useState('TERM');

  const signals = limitedSignals ? ['TERM', 'KILL'] : ['TERM', 'KILL', 'HUP', 'INT', 'QUIT'];

  const handleSubmit = async e => {
    e.preventDefault();
    if (!pattern.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await onConfirm(pattern, signal, zone);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Error performing batch kill:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('host.batchKillModal.title')}
      icon="fas fa-stop-circle"
      submitText={
        loading ? t('host.batchKillModal.processing') : t('host.batchKillModal.killProcesses')
      }
      submitVariant="is-danger"
      loading={loading}
      disabled={!pattern.trim()}
      showCancelButton
    >
      {/* Warning */}
      <div className="alert alert-danger mb-4">
        <p>
          <strong>{t('host.batchKillModal.warningLabel')}</strong>{' '}
          {t('host.batchKillModal.warningText')}
        </p>
        <p className="mt-2">{t('host.batchKillModal.warningDetail')}</p>
      </div>

      {/* Pattern Selection */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.batchKillModal.processSelection')}</h3>

          <div className="mb-3">
            <label className="form-label" htmlFor="batch-kill-pattern">
              {t('host.batchKillModal.commandPatternLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="batch-kill-pattern"
              className="form-control"
              type="text"
              placeholder={t('host.batchKillModal.commandPatternPlaceholder')}
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              required
            />
            <p className="form-text text-muted">{t('host.batchKillModal.commandPatternHelp')}</p>
          </div>

          {availableZones.length > 0 && (
            <div className="mb-3">
              <label className="form-label" htmlFor="batch-kill-zone-filter">
                {t('host.batchKillModal.zoneFilterLabel')}
              </label>
              <select
                id="batch-kill-zone-filter"
                className="form-select"
                value={zone}
                onChange={e => setZone(e.target.value)}
              >
                <option value="">{t('host.batchKillModal.allZones')}</option>
                {availableZones.map(zoneName => (
                  <option key={zoneName} value={zoneName}>
                    {zoneName}
                  </option>
                ))}
              </select>
              <p className="form-text text-muted">{t('host.batchKillModal.zoneFilterHelp')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Signal Selection */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.batchKillModal.signalOptions')}</h3>

          <div className="mb-3">
            <label className="form-label" htmlFor="batch-kill-signal">
              {t('host.batchKillModal.signalToSend')}
            </label>
            <select
              id="batch-kill-signal"
              className="form-select"
              value={signal}
              onChange={e => setSignal(e.target.value)}
            >
              {signals.map(sig => (
                <option key={sig} value={sig}>
                  SIG{sig} {sig === 'TERM' && t('host.batchKillModal.graceful')}
                  {sig === 'KILL' && t('host.batchKillModal.force')}
                </option>
              ))}
            </select>
            <p className="form-text text-muted">{t('host.batchKillModal.signalHelp')}</p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="alert alert-info">
        <p>
          <strong>{t('host.batchKillModal.patternExamples')}</strong>
        </p>
        <ul className="mt-2">
          <li>
            • <code>apache</code> - {t('host.batchKillModal.exampleApache')}
          </li>
          <li>
            • <code>bhyve</code> - {t('host.batchKillModal.exampleBhyve')}
          </li>
          <li>
            • <code>java</code> - {t('host.batchKillModal.exampleJava')}
          </li>
          <li>
            • <code>python</code> - {t('host.batchKillModal.examplePython')}
          </li>
        </ul>
      </div>
    </FormModal>
  );
};

BatchKillModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  availableZones: PropTypes.array.isRequired,
  limitedSignals: PropTypes.bool,
};

// Main component that renders the appropriate modal
const ProcessActionModals = ({
  selectedProcess,
  showKillModal,
  showSignalModal,
  showBatchKillModal,
  availableZones,
  limitedSignals,
  onCloseKillModal,
  onCloseSignalModal,
  onCloseBatchKillModal,
  onProcessAction,
  onBatchKill,
}) => (
  <>
    {showKillModal && selectedProcess && (
      <KillProcessModal
        process={selectedProcess}
        onClose={onCloseKillModal}
        onConfirm={onProcessAction}
      />
    )}

    {showSignalModal && selectedProcess && (
      <SendSignalModal
        process={selectedProcess}
        onClose={onCloseSignalModal}
        onConfirm={onProcessAction}
        limitedSignals={limitedSignals}
      />
    )}

    {showBatchKillModal && (
      <BatchKillModal
        onClose={onCloseBatchKillModal}
        onConfirm={onBatchKill}
        availableZones={availableZones}
        limitedSignals={limitedSignals}
      />
    )}
  </>
);

ProcessActionModals.propTypes = {
  selectedProcess: PropTypes.object,
  showKillModal: PropTypes.bool.isRequired,
  showSignalModal: PropTypes.bool.isRequired,
  showBatchKillModal: PropTypes.bool.isRequired,
  availableZones: PropTypes.array.isRequired,
  limitedSignals: PropTypes.bool,
  onCloseKillModal: PropTypes.func.isRequired,
  onCloseSignalModal: PropTypes.func.isRequired,
  onCloseBatchKillModal: PropTypes.func.isRequired,
  onProcessAction: PropTypes.func.isRequired,
  onBatchKill: PropTypes.func.isRequired,
};

export default ProcessActionModals;
