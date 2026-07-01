import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

import Logo from './Logo';

/**
 * Login component for Hyperweaver authentication
 * @returns {JSX.Element} Login component
 */
const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('local');
  const [authMethods, setAuthMethods] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const navigate = useNavigate();
  const { login, isAuthenticated, getAuthMethods } = useAuth();

  /**
   * Redirect to dashboard if already authenticated
   */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/ui');
    }
  }, [isAuthenticated, navigate]);

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
   * Load available authentication methods on component mount
   */
  useEffect(() => {
    loadAuthMethods();
  }, [loadAuthMethods]);

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

  const getAuthMethodHelpText = () => {
    if (authMethod === 'ldap') {
      return 'Use your directory credentials';
    }
    if (authMethod.startsWith('oidc-')) {
      return 'Sign in through your identity provider';
    }
    return 'Use your local account credentials';
  };

  const isError = msg.includes('error') || msg.includes('failed');

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

                {/* Show username/password fields only for local/LDAP authentication */}
                {!authMethod.startsWith('oidc-') && (
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
                <div className="mt-3">
                  <p className="mb-0">
                    Don&apos;t have an account? <a href="/register">Register here</a>
                  </p>
                </div>
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
