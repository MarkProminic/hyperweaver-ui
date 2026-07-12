import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { setSecureBoot } from '../../api/machineAPI';

const SecureBootPanel = ({ currentServer, machineName, isRunning, bootrom, disabled }) => {
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
        result.data?.message || `Secure Boot ${enabled ? 'enabled' : 'disabled'} on ${machineName}.`
      );
      setMsgVariant('success');
      setInitVarStore(false);
    } else {
      setMsg(
        bootrom && bootrom !== 'efi'
          ? `${result.message} — Secure Boot needs EFI firmware; switch Boot ROM to efi first.`
          : result.message
      );
      setMsgVariant('danger');
    }
  };

  return (
    <div className="border rounded p-3">
      <h6 className="fw-bold mb-2">
        <i className="fas fa-shield-halved me-2" />
        Secure Boot (EFI)
      </h6>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {isRunning && (
        <p className="form-text text-warning mt-0">
          {machineName} is running — Secure Boot changes need it powered off.
        </p>
      )}
      {bootrom && bootrom !== 'efi' && (
        <p className="form-text text-warning mt-0">
          Boot ROM is <code>{bootrom}</code> — Secure Boot needs EFI firmware; switch Boot ROM to{' '}
          <code>efi</code> first.
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
              Secure Boot
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
              title="Oracle PK + Microsoft DB/KEK — what stock Windows and shim-Linux validate against"
            >
              Enroll standard keys
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
              Reinitialize variable store
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
            Apply Secure Boot
          </button>
        </div>
      </div>
      {initVarStore && (
        <p className="form-text text-danger mb-0">
          Reinitializing WIPES every enrolled key and boot entry — first-time setup for machines
          whose variable store never existed.
        </p>
      )}
      <p className="form-text text-muted mb-0">
        Applies immediately on a powered-off EFI machine — separate from the Apply button above.
      </p>
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
