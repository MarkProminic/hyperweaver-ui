import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { setSecureBoot } from '../../api/machineAPI';

const SecureBootPanel = ({ currentServer, machineName, isRunning, bootrom, disabled }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [enrollKeys, setEnrollKeys] = useState(true);
  const [initVarStore, setInitVarStore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');

  useEffect(() => {
    setEnabled(true);
    setEnrollKeys(true);
    setInitVarStore(false);
    setMsg('');
  }, [machineName]);

  const handleToggle = value => {
    setEnabled(value);
    setEnrollKeys(value);
  };

  const handleApply = async () => {
    setLoading(true);
    setMsg('');
    const result = await setSecureBoot(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      {
        enabled,
        enroll_default_keys: enrollKeys,
        ...(initVarStore && { init_var_store: true }),
      }
    );
    setLoading(false);
    if (result.success) {
      setMsg(
        result.data?.message ||
          t('machine.secureBootPanel.appliedFallback', {
            state: enabled
              ? t('machine.secureBootPanel.enabledWord')
              : t('machine.secureBootPanel.disabledWord'),
            machineName,
          })
      );
      setMsgVariant('success');
      setInitVarStore(false);
    } else {
      setMsg(
        bootrom && bootrom !== 'efi'
          ? `${result.message} ${t('machine.secureBootPanel.efiRequiredSuffix')}`
          : result.message
      );
      setMsgVariant('danger');
    }
  };

  return (
    <div className="border rounded p-3">
      <h6 className="fw-bold mb-2">
        <i className="fas fa-shield-halved me-2" />
        {t('machine.secureBootPanel.heading')}
      </h6>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {isRunning && (
        <p className="form-text text-warning mt-0">
          {t('machine.secureBootPanel.runningWarning', { machineName })}
        </p>
      )}
      {bootrom && bootrom !== 'efi' && (
        <p className="form-text text-warning mt-0">
          {t('machine.secureBootPanel.bootromMismatchPrefix')} <code>{bootrom}</code>{' '}
          {t('machine.secureBootPanel.bootromMismatchSuffix')} <code>efi</code>{' '}
          {t('machine.secureBootPanel.bootromMismatchTail')}
        </p>
      )}
      <div className="row g-3 align-items-end">
        <div className="col-auto">
          <div className="form-check form-switch">
            <input
              id="secureboot-enabled"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={e => handleToggle(e.target.checked)}
              disabled={disabled || loading}
            />
            <label className="form-check-label" htmlFor="secureboot-enabled">
              {t('machine.secureBootPanel.secureBootLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <div className="form-check">
            <input
              id="secureboot-enroll"
              className="form-check-input"
              type="checkbox"
              checked={enrollKeys}
              onChange={e => setEnrollKeys(e.target.checked)}
              disabled={disabled || loading}
            />
            <label
              className="form-check-label"
              htmlFor="secureboot-enroll"
              title={t('machine.secureBootPanel.enrollKeysTooltip')}
            >
              {t('machine.secureBootPanel.enrollKeysLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <div className="form-check">
            <input
              id="secureboot-init"
              className="form-check-input"
              type="checkbox"
              checked={initVarStore}
              onChange={e => setInitVarStore(e.target.checked)}
              disabled={disabled || loading}
            />
            <label className="form-check-label text-danger" htmlFor="secureboot-init">
              {t('machine.secureBootPanel.reinitLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApply}
            disabled={disabled || loading || isRunning}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-pulse' : 'fa-check'} me-2`} />
            {t('machine.secureBootPanel.applyButton')}
          </button>
        </div>
      </div>
      {initVarStore && (
        <p className="form-text text-danger mb-0">{t('machine.secureBootPanel.reinitWarning')}</p>
      )}
      <p className="form-text text-muted mb-0">{t('machine.secureBootPanel.applyNote')}</p>
    </div>
  );
};

SecureBootPanel.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  bootrom: PropTypes.string,
  disabled: PropTypes.bool,
};

export default SecureBootPanel;
