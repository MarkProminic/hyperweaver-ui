import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';

/**
 * Landing component that handles first-time setup flow
 * @returns {JSX.Element} Landing component
 */
const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const { isDirect, ready: modeReady } = useMode();
  const [setupStatus, setSetupStatus] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  /**
   * Check if system needs initial setup
   */
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get('/api/auth/setup-status');
        setSetupStatus(response.data);

        if (response.data.needsSetup) {
          // System needs setup - redirect to registration
          navigate('/register');
        } else if (isAuthenticated) {
          // User is logged in - go to dashboard
          navigate('/ui');
        } else {
          // System is set up but user not logged in - go to login
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
          <title>Hyperweaver - Loading</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div>
          <div className="fs-3">
            <i className="fas fa-spinner fa-spin" />
          </div>
          <p className="mt-3 mb-0">Checking system status...</p>
        </div>
      </section>
    );
  }

  // This should rarely be shown as we redirect based on setup status
  return (
    <section className="min-vh-100 d-flex align-items-center justify-content-center py-4 text-center">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container">
        <h1 className="display-4 fw-semibold">Welcome to Hyperweaver</h1>
        <p className="fs-4 text-muted">Machine Management Made Simple</p>

        {setupStatus && (
          <div className="mt-5">
            {setupStatus.needsSetup ? (
              <div>
                <p>System needs initial setup.</p>
                <a href="/register" className="btn btn-primary btn-lg mt-3">
                  Get Started
                </a>
              </div>
            ) : (
              <div>
                <p>System is configured with {setupStatus.userCount} user(s).</p>
                <a href="/login" className="btn btn-primary btn-lg mt-3">
                  Login
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
