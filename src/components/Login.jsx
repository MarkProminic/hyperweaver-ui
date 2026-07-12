import { Helmet } from '@dr.pogodin/react-helmet';
import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { copyText } from '../utils/clipboard';

import Logo from './Logo';

/**
 * Direct-mode auth fields. First boot (no keys yet) shows the setup-token bootstrap
 * action; otherwise the API-key entry. Extracted from Login to keep its complexity down.
 */
const DirectModeFields = ({
  directFirstBoot,
  serverInfo,
  setupToken,
  setSetupToken,
  onBootstrap,
  onShowKeyEntry,
  apiKey,
  setApiKey,
  loading,
}) => {
  if (directFirstBoot) {
    return (
      <div className="alert alert-info text-start">
        <p className="mb-2">
          <strong>First boot?</strong> This host has no API keys yet. Read its setup token from the
          host (<code>setup.token</code> beside the config file, or the agent startup log) to create
          the first key.
        </p>
        <label className="form-label" htmlFor="setupToken">
          Setup token
        </label>
        <input
          id="setupToken"
          type="text"
          className="form-control font-monospace mb-2"
          autoComplete="off"
          placeholder="64-character token"
          value={setupToken}
          onChange={e => setSetupToken(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          className="btn btn-sm btn-success w-100"
          onClick={onBootstrap}
          disabled={loading || !setupToken.trim()}
        >
          {loading && (
            <span
              className="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
          )}
          Generate first API key
        </button>
        <button
          type="button"
          className="btn btn-link btn-sm w-100 mt-1"
          onClick={onShowKeyEntry}
          disabled={loading}
        >
          I already have a key
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 text-start">
      <label className="form-label" htmlFor="apiKey">
        API Key
      </label>
      {/* Companion username field gives password managers an account label to file the
          key under (current-password below makes them offer to save/autofill it). */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={serverInfo?.hostname || window.location.hostname}
        readOnly
        className="d-none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        id="apiKey"
        type="password"
        className="form-control font-monospace"
        name="apiKey"
        autoComplete="current-password"
        placeholder="hw_..."
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        disabled={loading}
      />
      <div className="form-text text-muted">Generate keys under Settings once signed in</div>
    </div>
  );
};

DirectModeFields.propTypes = {
  directFirstBoot: PropTypes.bool,
  serverInfo: PropTypes.shape({ hostname: PropTypes.string }),
  setupToken: PropTypes.string,
  setSetupToken: PropTypes.func,
  onBootstrap: PropTypes.func,
  onShowKeyEntry: PropTypes.func,
  apiKey: PropTypes.string,
  setApiKey: PropTypes.func,
  loading: PropTypes.bool,
};

// Seconds to wait after a provider is chosen before auto-handing off to the IdP.
const OIDC_REDIRECT_DELAY = 3;

// Loopback origin: the hwa:// handler reaches the agent on THIS machine.
const IS_LOOPBACK = ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname);

// Seconds an idle loopback login page waits before auto-firing the desktop
// sign-in. Fires ONCE per page load (never retried — no hammering).
const DESKTOP_HANDOFF_DELAY = 7;

// OIDC redirect helper — module scope so it is NOT a hook dependency. Stashes the intended URL
// (unless already on the login page) then hard-navigates to the Server's provider-start endpoint.
// `register:true` adds ?register (C10) → the Server sends prompt=create → IdP registration page.
const redirectToOidc = (provider, { register = false } = {}) => {
  if (window.location.pathname !== '/ui/login') {
    localStorage.setItem('hyperweaver_intended_url', window.location.pathname);
  }
  const query = register ? '?register' : '';
  window.location.href = `/api/auth/oidc/${encodeURIComponent(provider)}${query}`;
};

/**
 * Notice shown while an OIDC provider is selected: the auto-redirect countdown (the parent
 * effect owns the timer) with immediate-go / cancel controls, or the static redirect copy.
 */
const OidcRedirectNotice = ({ authMethod, oidcCountdown, onCancel }) => (
  <div className="alert alert-info mb-3">
    <i className="fas fa-external-link-alt me-1" />
    {oidcCountdown !== null && oidcCountdown > 0
      ? `Redirecting you to sign in in ${oidcCountdown}…`
      : 'You will be redirected to your identity provider to sign in.'}
    {oidcCountdown !== null && (
      <div className="mt-2 d-flex gap-2 justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => redirectToOidc(authMethod.replace('oidc-', ''))}
        >
          Sign in now
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    )}
  </div>
);

OidcRedirectNotice.propTypes = {
  authMethod: PropTypes.string,
  oidcCountdown: PropTypes.number,
  onCancel: PropTypes.func,
};

/**
 * Register affordance (C9). Local registration ON → the local form link. OFF → route "Register"
 * to the IdP (?register → prompt=create) via the selected (or first enabled) OIDC provider;
 * OFF with no OIDC provider → no self-registration path, render nothing.
 */
const RegisterPrompt = ({ authMethods, authMethod, registrationEnabled }) => {
  if (registrationEnabled) {
    return (
      <div className="mt-3">
        <p className="mb-0">
          Don&apos;t have an account? <a href="/register">Register here</a>
        </p>
      </div>
    );
  }
  const method =
    authMethods.find(m => m.id === authMethod && m.id.startsWith('oidc-')) ||
    authMethods.find(m => m.id.startsWith('oidc-') && m.enabled);
  if (!method) {
    return null;
  }
  return (
    <div className="mt-3">
      <p className="mb-0">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          className="btn btn-link p-0 align-baseline"
          onClick={() => redirectToOidc(method.id.slice('oidc-'.length), { register: true })}
        >
          Create one with {method.name}
        </button>
      </p>
    </div>
  );
};

RegisterPrompt.propTypes = {
  authMethods: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      enabled: PropTypes.bool,
    })
  ),
  authMethod: PropTypes.string,
  registrationEnabled: PropTypes.bool,
};

/**
 * Local/LDAP credential fields. Extracted from Login (the DirectModeFields
 * pattern) to keep its complexity down.
 */
const CredentialFields = ({
  authMethod,
  identifier,
  setIdentifier,
  password,
  setPassword,
  loading,
  methodsLoading,
}) => (
  <>
    <div className="mb-3 text-start">
      <label className="form-label" htmlFor="identifier">
        {authMethod === 'ldap' ? 'Username' : 'Email or Username'}
      </label>
      <input
        id="identifier"
        type="text"
        className="form-control"
        name="identifier"
        autoComplete="username"
        placeholder={authMethod === 'ldap' ? 'Username' : 'Username or Email'}
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
        disabled={loading || methodsLoading}
      />
    </div>
    <div className="mb-3 text-start">
      <label className="form-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        name="password"
        autoComplete="current-password"
        className="form-control"
        placeholder="******"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />
    </div>
  </>
);

CredentialFields.propTypes = {
  authMethod: PropTypes.string,
  identifier: PropTypes.string,
  setIdentifier: PropTypes.func,
  password: PropTypes.string,
  setPassword: PropTypes.func,
  loading: PropTypes.bool,
  methodsLoading: PropTypes.bool,
};

/**
 * The form's submit button: spinner while a login is in flight, the provider
 * name when an OIDC method is selected. Extracted from Login for complexity.
 */
const LoginSubmitButton = ({ loading, authMethod, authMethods }) => (
  <div className="mb-3">
    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
      {loading && (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      )}
      {authMethod.startsWith('oidc-')
        ? authMethods.find(m => m.id === authMethod)?.name || 'Continue with OpenID Connect'
        : 'Login'}
    </button>
  </div>
);

LoginSubmitButton.propTypes = {
  loading: PropTypes.bool,
  authMethod: PropTypes.string,
  authMethods: PropTypes.array,
};

/**
 * Login component for Hyperweaver authentication
 * @returns {JSX.Element} Login component
 */
const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [showKeyEntry, setShowKeyEntry] = useState(false);
  const [bootstrappedKey, setBootstrappedKey] = useState(null);
  const [authMethod, setAuthMethod] = useState('local');
  const [authMethods, setAuthMethods] = useState([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [oidcCountdown, setOidcCountdown] = useState(null);
  const [desktopCountdown, setDesktopCountdown] = useState(null);
  // One attempt per page load, ever — even across effect re-runs.
  const desktopHandoffFired = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithApiKey, bootstrapFirstKey, isAuthenticated, getAuthMethods } = useAuth();
  const { isDirect, ready: modeReady, serverInfo, error: modeError, refresh } = useMode();

  /**
   * Redirect to dashboard if already authenticated — unless we're showing a
   * freshly bootstrapped API key, which the user must save first (shown once).
   */
  useEffect(() => {
    if (isAuthenticated && !bootstrappedKey) {
      navigate('/ui');
    }
  }, [isAuthenticated, bootstrappedKey, navigate]);

  /**
   * Load available authentication methods
   */
  const loadAuthMethods = useCallback(async () => {
    try {
      setMethodsLoading(true);
      const result = await getAuthMethods();
      setRegistrationEnabled(result.localRegistrationEnabled !== false);

      if (result.success && result.methods.length > 0) {
        setAuthMethods(result.methods);

        // Set default method from localStorage or first available method
        const savedMethod = localStorage.getItem('hyperweaver_auth_method');
        const validSavedMethod = result.methods.find(m => m.id === savedMethod && m.enabled);

        if (validSavedMethod) {
          setAuthMethod(savedMethod);
        } else {
          // Use first enabled method
          const firstMethod = result.methods.find(m => m.enabled);
          if (firstMethod) {
            setAuthMethod(firstMethod.id);
          }
        }
      } else {
        // Fallback to local authentication only
        console.warn('Failed to load auth methods, using local fallback');
        setAuthMethods([{ id: 'local', name: 'Local Account', enabled: true }]);
        setAuthMethod('local');
      }
    } catch (methodsErr) {
      console.error('Error loading auth methods:', methodsErr);
      // Fallback to local authentication
      setAuthMethods([{ id: 'local', name: 'Local Account', enabled: true }]);
      setAuthMethod('local');
    } finally {
      setMethodsLoading(false);
    }
  }, [getAuthMethods]);

  /**
   * Load available authentication methods once the serving mode is known
   * (Direct mode answers locally with the API-key method).
   */
  useEffect(() => {
    if (!modeReady) {
      return;
    }
    loadAuthMethods();
  }, [modeReady, loadAuthMethods]);

  // Auto-redirect countdown: once a provider is chosen (dropdown or ?provider= URL), tick down then
  // hand off to the IdP. Cancellable from the alert. Runs only while active (oidcCountdown !== null).
  useEffect(() => {
    if (oidcCountdown === null) {
      return undefined;
    }
    if (oidcCountdown <= 0) {
      redirectToOidc(authMethod.replace('oidc-', ''));
      return undefined;
    }
    const timer = setTimeout(() => setOidcCountdown(count => count - 1), 1000);
    return () => clearTimeout(timer);
  }, [oidcCountdown, authMethod]);

  // Idle loopback login (Direct mode): arm the one-shot desktop handoff — the
  // user is sitting at their own machine, so after a short wait the hwa://
  // sign-in fires itself instead of waiting for the manual click.
  useEffect(() => {
    if (!modeReady || !isDirect || !IS_LOOPBACK || isAuthenticated || desktopHandoffFired.current) {
      return;
    }
    setDesktopCountdown(DESKTOP_HANDOFF_DELAY);
  }, [modeReady, isDirect, isAuthenticated]);

  // Tick the desktop-handoff countdown. Any user engagement (typing a key or
  // setup token, a login in flight) cancels it; at zero it fires exactly once.
  useEffect(() => {
    if (desktopCountdown === null) {
      return undefined;
    }
    if (apiKey || setupToken || loading) {
      setDesktopCountdown(null);
      return undefined;
    }
    if (desktopCountdown <= 0) {
      setDesktopCountdown(null);
      if (!desktopHandoffFired.current) {
        desktopHandoffFired.current = true;
        window.location.assign('hwa://open');
      }
      return undefined;
    }
    const timer = setTimeout(() => setDesktopCountdown(count => count - 1), 1000);
    return () => clearTimeout(timer);
  }, [desktopCountdown, apiKey, setupToken, loading]);

  // Provider-via-URL: /ui/login?provider=<name> pre-selects that OIDC provider and starts the
  // auto-redirect once. Lets a link (or the Server) deep-link straight to a specific IdP.
  const urlProviderHandled = useRef(false);
  useEffect(() => {
    if (urlProviderHandled.current || methodsLoading || isDirect) {
      return;
    }
    const requested = searchParams.get('provider');
    if (!requested) {
      return;
    }
    const methodId = `oidc-${requested}`;
    if (authMethods.some(method => method.id === methodId && method.enabled)) {
      urlProviderHandled.current = true;
      setAuthMethod(methodId);
      setOidcCountdown(OIDC_REDIRECT_DELAY);
    }
  }, [methodsLoading, isDirect, searchParams, authMethods]);

  /**
   * Handle auth method selection change
   */
  const handleAuthMethodChange = newMethod => {
    setAuthMethod(newMethod);
    localStorage.setItem('hyperweaver_auth_method', newMethod);
    setMsg(''); // Clear any previous error messages
    // Selecting an OIDC provider is explicit intent to use it — start a short countdown, then
    // auto-hand off to the IdP (matches the "you will be redirected" copy). Any other method cancels.
    setOidcCountdown(newMethod.startsWith('oidc-') ? OIDC_REDIRECT_DELAY : null);
  };

  /**
   * Handle OIDC login redirect for specific provider
   * @param {string} provider
   */
  const handleOidcLogin = provider => {
    setLoading(true);
    setMsg('');
    redirectToOidc(provider);
  };

  /**
   * Handle login form submission (for local/LDAP authentication)
   * @param {Event} e - Form submit event
   */
  const handleLogin = async e => {
    e.preventDefault();

    // Direct mode: the agent knows only API keys
    if (isDirect) {
      try {
        setLoading(true);
        setMsg('');
        const result = await loginWithApiKey(apiKey);
        if (!result.success) {
          setMsg(result.message);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle OIDC providers differently - redirect immediately
    if (authMethod.startsWith('oidc-')) {
      const provider = authMethod.replace('oidc-', '');
      handleOidcLogin(provider);
      return;
    }

    if (!identifier || !password) {
      setMsg('Please enter both username/email and password');
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      const result = await login(identifier, password, authMethod);

      if (result.success) {
        // Check for stored intended URL and redirect there
        const intendedUrl = localStorage.getItem('hyperweaver_intended_url');
        if (intendedUrl) {
          localStorage.removeItem('hyperweaver_intended_url');
          navigate(intendedUrl);
        } else {
          navigate('/ui');
        }
      } else {
        setMsg(result.message);
      }
    } catch (loginErr) {
      console.error('Login error:', loginErr);
      setMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Direct-mode first boot: generate the host's first API key. The key is shown
   * ONCE (bootstrappedKey holds the navigation until the user confirms saving it).
   */
  const handleBootstrap = async () => {
    try {
      setLoading(true);
      setMsg('');
      const result = await bootstrapFirstKey(setupToken);
      if (result.success && result.apiKey) {
        setBootstrappedKey(result.apiKey);
      } else {
        setMsg(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getAuthMethodHelpText = () => {
    if (authMethod === 'ldap') {
      return 'Use your directory credentials';
    }
    if (authMethod.startsWith('oidc-')) {
      return 'Sign in through your identity provider';
    }
    return 'Use your local account credentials';
  };

  const isError = msg.includes('error') || msg.includes('failed') || msg.includes('Invalid');

  // Direct-mode first boot: bootstrap is THE action — the key-paste form hides
  // behind "I already have a key" (covers bootstrap_auto_disable=false configs
  // where bootstrap stays open even though keys already exist).
  const directFirstBoot = isDirect && !!serverInfo?.bootstrapAvailable && !showKeyEntry;

  // The login form depends on the serving mode (user accounts vs API key), so wait
  // for the origin probe before rendering any fields.
  if (!modeReady) {
    return (
      <section className="min-vh-100 d-flex align-items-center py-4">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Login - Hyperweaver</title>
        </Helmet>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-4">
              <div className="card">
                <div className="card-body p-4 text-center">
                  {modeError ? (
                    <>
                      <div className="alert alert-danger">
                        <p className="mb-0">{modeError}</p>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={refresh}>
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-3 mb-0">Contacting host...</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Freshly bootstrapped key: shown exactly once; navigation is held until confirmed.
  if (bootstrappedKey) {
    return (
      <section className="min-vh-100 d-flex align-items-center py-4">
        <Helmet>
          <meta charSet="utf-8" />
          <title>API Key Generated - Hyperweaver</title>
        </Helmet>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-5">
              <div className="card">
                <div className="card-body p-4">
                  <h1 className="h4 text-center mb-3">Your API key</h1>
                  <div className="alert alert-warning">
                    <p className="mb-0">
                      <strong>Save this key now.</strong> It is shown only once — the host stores
                      only a hash, and the bootstrap endpoint has been disabled.
                    </p>
                  </div>
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={bootstrappedKey}
                      readOnly
                      onFocus={e => e.target.select()}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => copyText(bootstrappedKey)}
                      title="Copy to clipboard"
                    >
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={() => setBootstrappedKey(null)}
                  >
                    I saved it — continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-vh-100 d-flex align-items-center py-4">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Login - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-4">
            <form onSubmit={handleLogin} className="card">
              <div className="card-body p-4 text-center">
                <p className="fs-2 fw-semibold mb-2">Hyperweaver {__APP_VERSION__ || '1.0.0'}</p>
                <div className="d-flex justify-content-center my-2">
                  <Logo />
                </div>
                {msg && (
                  <div className={`alert ${isError ? 'alert-danger' : 'alert-info'}`}>
                    <p className="mb-0">{msg}</p>
                  </div>
                )}

                {/* Direct-mode auth (first-boot bootstrap or API-key entry) */}
                {isDirect && (
                  <DirectModeFields
                    directFirstBoot={directFirstBoot}
                    serverInfo={serverInfo}
                    setupToken={setupToken}
                    setSetupToken={setSetupToken}
                    onBootstrap={handleBootstrap}
                    onShowKeyEntry={() => setShowKeyEntry(true)}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    loading={loading}
                  />
                )}

                {/* Desktop sign-in via the agent's hwa:// handler — loopback only (the handler
                    reaches the agent on THIS machine). Renders in both Direct states (first-boot
                    and key entry): on a desktop install it skips the setup token entirely. If no
                    handler is installed, the browser shows its own notice — acceptable. */}
                {isDirect && IS_LOOPBACK && (
                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={() => {
                        desktopHandoffFired.current = true;
                        setDesktopCountdown(null);
                        window.location.assign('hwa://open');
                      }}
                      disabled={loading}
                    >
                      Sign in with the desktop agent
                    </button>
                    <div className="form-text text-muted">
                      Asks the Hyperweaver Agent running on this machine to open a signed-in session
                      — no key needed.
                    </div>
                    {desktopCountdown !== null && desktopCountdown > 0 && (
                      <div className="form-text">
                        Signing in automatically in {desktopCountdown}s…{' '}
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 align-baseline"
                          onClick={() => setDesktopCountdown(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show username/password fields only for local/LDAP authentication */}
                {!isDirect && !authMethod.startsWith('oidc-') && (
                  <CredentialFields
                    authMethod={authMethod}
                    identifier={identifier}
                    setIdentifier={setIdentifier}
                    password={password}
                    setPassword={setPassword}
                    loading={loading}
                    methodsLoading={methodsLoading}
                  />
                )}

                {/* OIDC provider selected: the (auto-)redirect notice + controls. Once a provider
                    is chosen we count down and hand off automatically; the user can go now or cancel. */}
                {authMethod.startsWith('oidc-') && (
                  <OidcRedirectNotice
                    authMethod={authMethod}
                    oidcCountdown={oidcCountdown}
                    onCancel={() => setOidcCountdown(null)}
                  />
                )}
                {/* Authentication Method Selector - Show only if multiple methods available */}
                {!methodsLoading && authMethods.length > 1 && (
                  <div className="mb-3 text-start">
                    <label className="form-label" htmlFor="authMethod">
                      Authentication Method
                    </label>
                    <select
                      id="authMethod"
                      className="form-select"
                      value={authMethod}
                      onChange={e => handleAuthMethodChange(e.target.value)}
                      disabled={loading}
                    >
                      {authMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                    <div className="form-text text-muted">{getAuthMethodHelpText()}</div>
                  </div>
                )}
                {!directFirstBoot && (
                  <LoginSubmitButton
                    loading={loading}
                    authMethod={authMethod}
                    authMethods={authMethods}
                  />
                )}
                {!isDirect && (
                  <RegisterPrompt
                    authMethods={authMethods}
                    authMethod={authMethod}
                    registrationEnabled={registrationEnabled}
                  />
                )}
                <div className="mt-3">
                  <a href="/docs" className="text-muted" target="_blank" rel="noopener noreferrer">
                    Documentation
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
