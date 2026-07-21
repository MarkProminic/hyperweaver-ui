import axios from 'axios';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

const POLL_MS = 3000;

/**
 * Device-flow SSO login (RFC 8628, Go agent only — gate on auth[] containing
 * 'oidc', never on Direct mode alone). Start mints a device grant on the agent;
 * the verification link opens in a new tab (verification_uri_complete — one
 * click, approve at the IdP); this component polls the agent's device-status
 * until approved, then signs in with the minted key. The device_code never
 * reaches the browser; after delivery the handle answers 404 (treated as
 * expired). The agent itself honors the IdP's interval/slow_down — UI polling
 * is free.
 */
const DeviceSsoLogin = ({ disabled }) => {
  const { t } = useTranslation();
  const { loginWithApiKey } = useAuth();
  const [phase, setPhase] = useState('idle');
  const [grant, setGrant] = useState(null);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const poll = handle => {
    timerRef.current = setTimeout(async () => {
      try {
        const response = await axios.get('/auth/oidc/device-status', { params: { handle } });
        const status = response.data?.status;
        if (status === 'approved' && response.data.api_key) {
          const result = await loginWithApiKey(response.data.api_key);
          if (!result.success) {
            setPhase('error');
            setError(result.message);
          }
          return;
        }
        if (status === 'denied') {
          setPhase('error');
          setError(t('auth.deviceSso.denied'));
          return;
        }
        if (status === 'expired') {
          setPhase('error');
          setError(t('auth.deviceSso.expired'));
          return;
        }
        poll(handle);
      } catch (pollErr) {
        if (pollErr.response?.status === 404) {
          setPhase('error');
          setError(t('auth.deviceSso.expired'));
          return;
        }
        poll(handle);
      }
    }, POLL_MS);
  };

  const start = async () => {
    setPhase('starting');
    setError('');
    try {
      const response = await axios.post('/auth/oidc/device-start');
      const data = response.data || {};
      setGrant(data);
      setPhase('waiting');
      if (data.verification_uri_complete) {
        window.open(data.verification_uri_complete, '_blank', 'noopener');
      }
      poll(data.handle);
    } catch (startErr) {
      setPhase('error');
      setError(startErr.response?.data?.error || startErr.message);
    }
  };

  if (phase === 'waiting' && grant) {
    return (
      <div className="alert alert-info text-start mb-3">
        <p className="mb-2">
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          {t('auth.deviceSso.waitingApproval')}
        </p>
        {grant.user_code && (
          <p className="mb-2">
            {t('auth.deviceSso.codeLabel')}{' '}
            <code className="fs-5 user-select-all">{grant.user_code}</code>
          </p>
        )}
        {(grant.verification_uri_complete || grant.verification_uri) && (
          <a
            href={grant.verification_uri_complete || grant.verification_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary"
          >
            <i className="fas fa-external-link-alt me-2" />
            {t('auth.deviceSso.openVerification')}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3">
      {phase === 'error' && (
        <div className="alert alert-warning text-start py-2">
          <p className="mb-0">{error}</p>
        </div>
      )}
      <button
        type="button"
        className="btn btn-outline-primary w-100"
        onClick={start}
        disabled={disabled || phase === 'starting'}
      >
        {phase === 'starting' ? (
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
        ) : (
          <i className="fas fa-right-to-bracket me-2" />
        )}
        {phase === 'error' ? t('auth.deviceSso.retry') : t('auth.deviceSso.signInWithSso')}
      </button>
      <div className="form-text text-muted">{t('auth.deviceSso.desc')}</div>
    </div>
  );
};

DeviceSsoLogin.propTypes = {
  disabled: PropTypes.bool,
};

export default DeviceSsoLogin;
