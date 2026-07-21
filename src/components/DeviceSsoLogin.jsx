import axios from 'axios';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

const POLL_MS = 3000;
const STORAGE_KEY = 'hyperweaver_device_sso';

const forgetPending = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

/**
 * Device-flow SSO login (RFC 8628, Go agent only — gate on auth[] containing
 * 'oidc', never on Direct mode alone). Start mints a device grant on the agent;
 * the verification tab opens (verification_uri_complete — approve at the IdP);
 * this component polls the agent's device-status until approved, then closes
 * the approval tab and signs in with the minted key. A PENDING flow survives
 * page refresh via sessionStorage — the poll resumes and the desktop-handoff
 * timer stays dead until the flow finishes or expires, so the tray auto-login
 * can never steal a login mid-approval. The device_code never reaches the
 * browser; after one-shot delivery the handle answers 404 (treated as
 * expired). The agent honors the IdP's interval/slow_down — UI polling is
 * free.
 */
const DeviceSsoLogin = ({ disabled, onStart = null }) => {
  const { t } = useTranslation();
  const { loginWithApiKey } = useAuth();
  const [phase, setPhase] = useState('idle');
  const [grant, setGrant] = useState(null);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const approvalTabRef = useRef(null);
  const resumedRef = useRef(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const closeApprovalTab = () => {
    if (approvalTabRef.current && !approvalTabRef.current.closed) {
      approvalTabRef.current.close();
    }
    approvalTabRef.current = null;
  };

  const openApprovalTab = url => {
    approvalTabRef.current = window.open(url, '_blank');
  };

  const failFlow = message => {
    forgetPending();
    setPhase('error');
    setError(message);
  };

  /** Latest-ref polling loop — stable identity for the resume effect's deps. */
  const pollRef = useRef(() => {});
  pollRef.current = handle => {
    timerRef.current = setTimeout(async () => {
      try {
        const response = await axios.get('/auth/oidc/device-status', { params: { handle } });
        const status = response.data?.status;
        if (status === 'approved' && response.data.api_key) {
          forgetPending();
          closeApprovalTab();
          const result = await loginWithApiKey(response.data.api_key);
          if (!result.success) {
            setPhase('error');
            setError(result.message);
          }
          return;
        }
        if (status === 'denied') {
          failFlow(t('auth.deviceSso.denied'));
          return;
        }
        if (status === 'failed') {
          failFlow(t('auth.deviceSso.failed'));
          return;
        }
        if (status === 'expired') {
          failFlow(t('auth.deviceSso.expired'));
          return;
        }
        pollRef.current(handle);
      } catch (pollErr) {
        if (pollErr.response?.status === 404) {
          failFlow(t('auth.deviceSso.expired'));
          return;
        }
        pollRef.current(handle);
      }
    }, POLL_MS);
  };

  /** Resume a pending flow after a page refresh — one shot, no-op re-runs. */
  useEffect(() => {
    if (resumedRef.current) {
      return;
    }
    resumedRef.current = true;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const saved = JSON.parse(raw);
      if (saved?.handle && saved.expiresAt > Date.now()) {
        if (onStart) {
          onStart();
        }
        setGrant(saved.grant);
        setPhase('waiting');
        pollRef.current(saved.handle);
      } else {
        forgetPending();
      }
    } catch {
      forgetPending();
    }
  }, [onStart]);

  const start = async () => {
    if (onStart) {
      onStart();
    }
    setPhase('starting');
    setError('');
    try {
      const response = await axios.post('/auth/oidc/device-start');
      const data = response.data || {};
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          handle: data.handle,
          grant: data,
          expiresAt: Date.now() + (Number(data.expires_in) || 600) * 1000,
        })
      );
      setGrant(data);
      setPhase('waiting');
      if (data.verification_uri_complete) {
        openApprovalTab(data.verification_uri_complete);
      }
      pollRef.current(data.handle);
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
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() =>
              openApprovalTab(grant.verification_uri_complete || grant.verification_uri)
            }
          >
            <i className="fas fa-external-link-alt me-2" />
            {t('auth.deviceSso.openVerification')}
          </button>
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
        className="btn btn-primary w-100"
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
  onStart: PropTypes.func,
};

export default DeviceSsoLogin;
