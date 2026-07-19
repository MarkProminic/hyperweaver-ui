import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getGuestExecStatus, runGuestControl, runGuestExec } from '../../api/machineAPI';
import { FormModal, RevealInput } from '../common';

/**
 * Two transports, one modal: `additions` runs through VirtualBox Guest
 * Additions (guest credentials required), `qga` through the QEMU guest
 * agent channel (the channel authorizes — no credentials, but a long
 * command may outlive the wait window and gets polled by pid).
 */

const GuestExecModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  isRunning,
  flavor = 'additions',
}) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [args, setArgs] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState('');
  const [output, setOutput] = useState(null);
  const [pendingPid, setPendingPid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const qga = flavor === 'qga';

  useEffect(() => {
    if (isOpen) {
      setPath('');
      setArgs('');
      setUsername('');
      setPassword('');
      setTimeoutSeconds('');
      setOutput(null);
      setPendingPid(null);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || pendingPid === null) {
      return undefined;
    }
    const timer = setInterval(async () => {
      const result = await getGuestExecStatus(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        pendingPid
      );
      if (!result.success) {
        setPendingPid(null);
        setError(result.message);
        return;
      }
      if (result.data?.exited) {
        setPendingPid(null);
        setOutput(result.data);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [isOpen, pendingPid, currentServer, machineName]);

  const handleSubmit = async () => {
    if (!path.trim()) {
      setError(t('machine.guestExecModal.pathRequired'));
      return;
    }
    const argList = args
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const body = {
      path: path.trim(),
      ...(argList.length > 0 && { args: argList }),
      ...(timeoutSeconds !== '' && { timeout_seconds: Number(timeoutSeconds) }),
    };
    setLoading(true);
    setError('');
    setOutput(null);
    setPendingPid(null);
    const result = qga
      ? await runGuestExec(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          machineName,
          body
        )
      : await runGuestControl(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          machineName,
          {
            ...body,
            ...(username.trim() && { username: username.trim() }),
            ...(password && { password }),
          }
        );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const data = result.data || {};
    if (qga && !data.exited) {
      setPendingPid(data.pid);
      return;
    }
    setOutput(data);
  };

  let exitCode = null;
  if (output) {
    exitCode = qga ? output.exitcode : output.exit_code;
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machine.guestExecModal.title', { machineName })}
      icon="fas fa-terminal"
      submitText={t('machine.guestExecModal.submit')}
      submitIcon="fas fa-play"
      loading={loading || pendingPid !== null}
      showCancelButton
    >
      {!isRunning && (
        <div className="alert alert-warning py-2">
          {t('machine.guestExecModal.notRunningPrefix', { machineName })}{' '}
          {qga
            ? t('machine.guestExecModal.qgaNeedsRunning')
            : t('machine.guestExecModal.additionsNeedsRunning')}
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="guest-exec-path">
            {t('machine.guestExecModal.pathLabel')} <span className="text-danger">*</span>
          </label>
          <input
            id="guest-exec-path"
            className="form-control"
            type="text"
            placeholder={t('machine.guestExecModal.pathPlaceholder')}
            value={path}
            onChange={e => setPath(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="guest-exec-timeout">
            {t('machine.guestExecModal.timeoutLabel')}
          </label>
          <input
            id="guest-exec-timeout"
            className="form-control"
            type="number"
            min="1"
            {...(qga && { max: 600 })}
            placeholder={
              qga
                ? t('machine.guestExecModal.timeoutPlaceholderQga')
                : t('machine.guestExecModal.timeoutPlaceholderNa')
            }
            value={timeoutSeconds}
            onChange={e => setTimeoutSeconds(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="guest-exec-args">
            {t('machine.guestExecModal.argsLabel')}
          </label>
          <textarea
            id="guest-exec-args"
            className="form-control font-monospace"
            rows={2}
            value={args}
            onChange={e => setArgs(e.target.value)}
            disabled={loading}
          />
        </div>
        {!qga && (
          <>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="guest-exec-username">
                {t('machine.guestExecModal.usernameLabel')}
              </label>
              <input
                id="guest-exec-username"
                className="form-control"
                type="text"
                placeholder={t('machine.guestExecModal.usernamePlaceholder')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="guest-exec-password">
                {t('machine.guestExecModal.passwordLabel')}
              </label>
              <RevealInput
                id="guest-exec-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('machine.guestExecModal.passwordPlaceholder')}
                disabled={loading}
              />
            </div>
          </>
        )}
        {qga && (
          <div className="col-12">
            <span className="form-text">{t('machine.guestExecModal.qgaNoCredentialsNote')}</span>
          </div>
        )}
      </div>

      {pendingPid !== null && (
        <div className="alert alert-info py-2 mt-3 mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          {t('machine.guestExecModal.pollingNote', { pid: pendingPid })}
        </div>
      )}

      {output && (
        <div className="mt-3">
          <span className={`badge ${exitCode === 0 ? 'text-bg-success' : 'text-bg-danger'}`}>
            {t('machine.guestExecModal.exitBadge', { code: exitCode ?? '?' })}
          </span>
          {output.signal !== undefined && output.signal !== null && (
            <span className="badge text-bg-warning ms-1">
              {t('machine.guestExecModal.signalBadge', { signal: output.signal })}
            </span>
          )}
          {output.stdout && (
            <pre className="small border rounded p-2 mt-2 mb-0">{output.stdout}</pre>
          )}
          {output.stderr && (
            <pre className="small border border-danger rounded p-2 mt-2 mb-0 text-danger">
              {output.stderr}
            </pre>
          )}
        </div>
      )}
    </FormModal>
  );
};

GuestExecModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  flavor: PropTypes.oneOf(['additions', 'qga']),
};

export default GuestExecModal;
