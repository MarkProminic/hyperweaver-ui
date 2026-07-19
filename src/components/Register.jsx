import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';

/**
 * Register component for Hyperweaver user registration with organization support
 * @returns {JSX.Element} Register component
 */
const Register = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [invitation, setInvitation] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isAuthenticated, getAuthMethods } = useAuth();
  const { isDirect, ready: modeReady } = useMode();

  /**
   * Redirect to dashboard if already authenticated.
   * Direct mode has no user registration at all — send to the API-key login.
   */
  useEffect(() => {
    if (modeReady && isDirect) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) {
      navigate('/ui');
    }
  }, [modeReady, isDirect, isAuthenticated, navigate]);

  /**
   * Validate invitation code
   */
  const validateInvitation = async code => {
    try {
      const response = await axios.get(`/api/invitations/validate/${code}`);
      if (response.data.success && response.data.valid) {
        setInvitation(response.data.invitation);
        setEmail(response.data.invitation.email); // Pre-fill email
        setMsg(`You've been invited to join ${response.data.invitation.organizationName}!`);
      } else {
        setMsg(`Invalid invitation: ${response.data.reason}`);
      }
    } catch (validateErr) {
      console.error('Error validating invitation:', validateErr);
      setMsg('Error validating invitation code');
    }
  };

  /**
   * Check setup status and invitation on component mount
   */
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get('/api/auth/setup-status');
        const setupNeeded = response.data.success ? response.data.needsSetup : false;
        setNeedsSetup(setupNeeded);
        // C9: local registration disabled + not the first-user bootstrap → there is no local form
        // to show; send them to the login page, which offers registration through the IdP.
        if (!setupNeeded) {
          const methods = await getAuthMethods();
          if (methods.localRegistrationEnabled === false) {
            navigate('/ui/login');
          }
        }
      } catch (setupErr) {
        console.error('Error checking setup status:', setupErr);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetupStatus();

    // Check for invitation code in URL
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      setInviteCode(inviteParam);
      validateInvitation(inviteParam);
    }
  }, [searchParams, getAuthMethods, navigate]);

  /**
   * Handle registration form submission
   * @param {Event} e - Form submit event
   */
  const handleRegister = async e => {
    e.preventDefault();

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setMsg(t('auth.register.allFieldsRequired'));
      return;
    }

    if (password !== confirmPassword) {
      setMsg(t('auth.register.passwordsNotMatch'));
      return;
    }

    if (password.length < 8) {
      setMsg(t('auth.register.passwordMinLength'));
      return;
    }

    // Organization validation for non-first users
    if (!needsSetup && !inviteCode && !organizationName) {
      setMsg(t('auth.register.organizationRequired'));
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      const registrationData = {
        username,
        email,
        password,
        confirmPassword,
      };

      // Add organization data if not first user
      if (!needsSetup) {
        if (inviteCode) {
          registrationData.inviteCode = inviteCode;
        } else if (organizationName) {
          registrationData.organizationName = organizationName;
        }
      }

      const result = await register(registrationData);

      if (result.success) {
        setMsg(t('auth.register.successMsg'));
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMsg(result.message);
      }
    } catch (registerErr) {
      console.error('Registration error:', registerErr);
      setMsg(t('auth.register.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (needsSetup) {
      return t('auth.register.setupAdminTitle');
    }
    if (invitation) {
      return t('auth.register.joinOrgTitle', { orgName: invitation.organizationName });
    }
    return t('auth.register.createAccountTitle');
  };

  const getSubmitButtonText = () => {
    if (needsSetup) {
      return t('auth.register.createAdminBtn');
    }
    if (invitation) {
      return t('auth.register.joinOrgBtn', { orgName: invitation.organizationName });
    }
    return t('auth.register.createAccountOrgBtn');
  };

  const getNotificationClass = () => {
    if (msg.includes('successful') || msg.includes('invited')) {
      return 'alert-success';
    }
    if (msg.includes('error') || msg.includes('failed') || msg.includes('Invalid')) {
      return 'alert-danger';
    }
    return 'alert-warning';
  };

  const renderHelpContent = () => {
    if (needsSetup) {
      return (
        <>
          <p>
            <strong>{t('auth.register.setupHelpTitle')}</strong>
          </p>
          <ul>
            <li>{t('auth.register.setupHelpItem1')}</li>
            <li>{t('auth.register.setupHelpItem2')}</li>
            <li>{t('auth.register.setupHelpItem3')}</li>
            <li>{t('auth.register.setupHelpItem4')}</li>
          </ul>
        </>
      );
    }
    if (invitation) {
      return (
        <>
          <p>
            <strong>{t('auth.register.joinHelpTitle')}</strong>
          </p>
          <ul>
            <li>{t('auth.register.joinHelpItem1', { orgName: invitation.organizationName })}</li>
            <li>{t('auth.register.joinHelpItem2')}</li>
            <li>{t('auth.register.joinHelpItem3')}</li>
            <li>{t('auth.register.joinHelpItem4')}</li>
          </ul>
        </>
      );
    }
    return (
      <>
        <p>
          <strong>{t('auth.register.createHelpTitle')}</strong>
        </p>
        <ul>
          <li>{t('auth.register.createHelpItem1')}</li>
          <li>{t('auth.register.createHelpItem2')}</li>
          <li>{t('auth.register.createHelpItem3')}</li>
          <li>{t('auth.register.createHelpItem4')}</li>
        </ul>
      </>
    );
  };

  if (checkingSetup) {
    return (
      <section className="min-vh-100 d-flex align-items-center py-4">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Register - Hyperweaver</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-4">
              <div className="card">
                <div className="card-body text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">{t('auth.register.loading')}</span>
                  </div>
                  <p className="mt-3 mb-0">{t('auth.register.checkingSystemStatus')}</p>
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
        <title>Register - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-4">
            <form onSubmit={handleRegister} className="card">
              <div className="card-body p-4">
                <h1 className="h3 text-center mb-4">{getPageTitle()}</h1>

                {/* Invitation Info */}
                {invitation && (
                  <div className="alert alert-info">
                    <p className="mb-0">
                      <strong>{t('auth.register.invitedAlert')}</strong>
                      <br />
                      {t('auth.register.invitedToJoin')}{' '}
                      <strong>{invitation.organizationName}</strong>
                    </p>
                  </div>
                )}

                {/* Super Admin Notice */}
                {needsSetup && (
                  <div className="alert alert-warning">
                    <p className="mb-0">
                      <strong>{t('auth.register.systemSetupAlert')}</strong>
                      <br />
                      {t('auth.register.firstUserDesc')}
                    </p>
                  </div>
                )}

                {msg && (
                  <div className={`alert ${getNotificationClass()}`}>
                    <p className="mb-0">{msg}</p>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label" htmlFor="username">
                    {t('auth.register.usernameLabel')}
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="form-control"
                    autoComplete="username"
                    placeholder={t('auth.register.usernamePlaceholder')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="email">
                    {t('auth.register.emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    autoComplete="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading || !!invitation}
                    required
                  />
                  {invitation && (
                    <div className="form-text text-muted">
                      {t('auth.register.emailPrefilledMsg')}
                    </div>
                  )}
                </div>

                {/* Organization field - only show if not first user and no invitation */}
                {!needsSetup && !invitation && (
                  <div className="mb-3">
                    <label className="form-label" htmlFor="organizationName">
                      {t('auth.register.organizationLabel')}
                    </label>
                    <input
                      id="organizationName"
                      type="text"
                      className="form-control"
                      placeholder={t('auth.register.organizationPlaceholder')}
                      value={organizationName}
                      onChange={e => setOrganizationName(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <div className="form-text text-muted">
                      {t('auth.register.organizationHelpText')}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label" htmlFor="password">
                    {t('auth.register.passwordLabel')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="form-control"
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="confirmPassword">
                    {t('auth.register.confirmPasswordLabel')}
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="form-control"
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-3">
                  <button type="submit" className="btn btn-success w-100" disabled={loading}>
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    {getSubmitButtonText()}
                  </button>
                </div>

                <div className="text-center mt-3">
                  <p className="mb-0">
                    {t('auth.register.alreadyHaveAccount')}{' '}
                    <a href="/login">{t('auth.register.loginLink')}</a>
                  </p>
                </div>

                {/* Help section */}
                <div className="text-center mt-4">
                  <details>
                    <summary className="text-muted small cursor-pointer">
                      {t('auth.register.needHelpMsg')}
                    </summary>
                    <div className="small text-start mt-2 p-3">{renderHelpContent()}</div>
                  </details>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
