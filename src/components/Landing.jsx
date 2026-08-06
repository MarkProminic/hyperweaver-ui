import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';

// BoxVault's "Deploy to Hyperweaver" deep link lands here as
// /?create=machine&box=<org/name>&box_version=&box_arch=&box_url= — translate
// it into the machines page's own create intent URL. Unknown params are
// ignored; only the four box keys the create wizard's settings carry ride.
const boxVaultDeepLinkTarget = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('create') !== 'machine') {
    return null;
  }
  const target = new URLSearchParams({ create: 'machine' });
  ['box', 'box_version', 'box_arch', 'box_url'].forEach(key => {
    const value = params.get(key);
    if (value) {
      target.set(key, value);
    }
  });
  return `/ui/machines?${target.toString()}`;
};

/**
 * Landing component that handles first-time setup flow
 * @returns {JSX.Element} Landing component
 */
const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { isDirect, ready: modeReady } = useMode();
  const [setupStatus, setSetupStatus] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  /**
   * Check if system needs initial setup
   */
  useEffect(() => {
    // Aggregated only — Direct mode has no BoxVault integration, so its
    // redirects below stay untouched and the params are simply ignored.
    const deepLink = isDirect ? null : boxVaultDeepLinkTarget();

    const checkSetupStatus = async () => {
      try {
        const response = await axios.get('/api/auth/setup-status');
        setSetupStatus(response.data);

        if (response.data.needsSetup) {
          // System needs setup - redirect to registration
          navigate('/register');
        } else if (isAuthenticated) {
          // User is logged in - go to dashboard (or straight into the
          // deep-linked machine-create intent).
          navigate(deepLink || '/ui');
        } else {
          // System is set up but user not logged in - go to login. A deep
          // link rides the intended-url rail: the password login and the
          // OIDC callback both restore it after auth.
          if (deepLink) {
            localStorage.setItem('hyperweaver_intended_url', deepLink);
          }
          navigate('/login');
        }
      } catch (setupErr) {
        console.error('Error checking setup status:', setupErr);
        // If we can't check setup status, assume we need to register
        navigate('/register');
      } finally {
        setCheckingSetup(false);
      }
    };

    if (loading || !modeReady) {
      return;
    }

    // Direct mode: agents have no user setup flow (/api/auth/setup-status is
    // Server-only) — first boot is handled by the Login screen's bootstrap.
    if (isDirect) {
      navigate(isAuthenticated ? '/ui' : '/login');
      setCheckingSetup(false);
      return;
    }

    checkSetupStatus();
  }, [navigate, isAuthenticated, loading, modeReady, isDirect]);

  // Show loading while checking authentication and setup status
  if (loading || checkingSetup) {
    return (
      <section className="min-vh-100 d-flex align-items-center justify-content-center py-4 text-center">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('chrome.landing.loadingTitle')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div>
          <div className="fs-3">
            <i className="fas fa-spinner fa-spin" />
          </div>
          <p className="mt-3 mb-0">{t('chrome.landing.checkingStatus')}</p>
        </div>
      </section>
    );
  }

  // This should rarely be shown as we redirect based on setup status
  return (
    <section className="min-vh-100 d-flex align-items-center justify-content-center py-4 text-center">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t('chrome.landing.title')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container">
        <h1 className="display-4 fw-semibold">{t('chrome.landing.welcome')}</h1>
        <p className="fs-4 text-muted">{t('chrome.landing.tagline')}</p>

        {setupStatus && (
          <div className="mt-5">
            {setupStatus.needsSetup ? (
              <div>
                <p>{t('chrome.landing.needsSetup')}</p>
                <a href="/register" className="btn btn-primary btn-lg mt-3">
                  {t('chrome.landing.getStarted')}
                </a>
              </div>
            ) : (
              <div>
                <p>
                  {t(
                    'chrome.landing.systemConfigured',
                    { userCount: setupStatus.userCount },
                    { count: setupStatus.userCount }
                  )}
                </p>
                <a href="/login" className="btn btn-primary btn-lg mt-3">
                  {t('chrome.landing.login')}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Landing;
