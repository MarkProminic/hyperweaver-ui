import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';

import Logo from './Logo';

/**
 * Login component for Hyperweaver authentication
 * @returns {JSX.Element} Login component
 */
const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [bootstrappedKey, setBootstrappedKey] = useState(null);
  const [authMethod, setAuthMethod] = useState('local');
  const [authMethods, setAuthMethods] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const navigate = useNavigate();
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

  /**
   * Handle auth method selection change
   */
  const handleAuthMethodChange = newMethod => {
    setAuthMethod(newMethod);
    localStorage.setItem('hyperweaver_auth_method', newMethod);
    setMsg(''); // Clear any previous error messages
  };

  /**
   * Handle OIDC login redirect for specific provider
   * @param {string} provider
   */
  const handleOidcLogin = provider => {
    // Store intended URL for after login
    if (window.location.pathname !== '/ui/login') {
      localStorage.setItem('hyperweaver_intended_url', window.location.pathname);
    }

    setLoading(true);
    setMsg('');

    // Direct redirect to provider-specific OIDC initiation endpoint
    window.location.href = `/api/auth/oidc/${provider}`;
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
      const result = await bootstrapFirstKey();
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
                      onClick={() => navigator.clipboard?.writeText(bootstrappedKey)}
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
                {isDirect && (
                  <p className="text-muted small mb-3">
                    Direct mode — managing{' '}
                    <strong>{serverInfo?.hostname || window.location.hostname}</strong>
                  </p>
                )}
                {msg && (
                  <div className={`alert ${isError ? 'alert-danger' : 'alert-info'}`}>
                    <p className="mb-0">{msg}</p>
                  </div>
                )}

                {/* Direct mode: the agent authenticates by API key */}
                {isDirect && (
                  <>
                    <div className="mb-3 text-start">
                      <label className="form-label" htmlFor="apiKey">
                        API Key
                      </label>
                      <input
                        id="apiKey"
                        type="password"
                        className="form-control font-monospace"
                        name="apiKey"
                        autoComplete="off"
                        placeholder="wh_..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        disabled={loading}
                      />
                      <div className="form-text text-muted">
                        Generate keys under Settings once signed in
                      </div>
                    </div>
                    {serverInfo?.bootstrapAvailable && (
                      <div className="alert alert-info text-start">
                        <p className="mb-2">
                          <strong>First boot?</strong> This host has no API keys yet.
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm btn-success w-100"
                          onClick={handleBootstrap}
                          disabled={loading}
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
                      </div>
                    )}
                  </>
                )}

                {/* Show username/password fields only for local/LDAP authentication */}
                {!isDirect && !authMethod.startsWith('oidc-') && (
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
                )}

                {/* Show OIDC information when an OIDC provider is selected */}
                {authMethod.startsWith('oidc-') && (
                  <div className="alert alert-info mb-3">
                    <i className="fas fa-external-link-alt" />
                    <br />
                    You will be redirected to your identity provider to sign in.
                  </div>
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
                <div className="mb-3">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    {authMethod.startsWith('oidc-')
                      ? authMethods.find(m => m.id === authMethod)?.name ||
                        'Continue with OpenID Connect'
                      : 'Login'}
                  </button>
                </div>
                {!isDirect && (
                  <div className="mt-3">
                    <p className="mb-0">
                      Don&apos;t have an account? <a href="/register">Register here</a>
                    </p>
                  </div>
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
