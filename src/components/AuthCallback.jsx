import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

/**
 * AuthCallback Component
 *
 * Handles authentication callbacks from external providers (OIDC, etc.)
 * Processes the token and redirects to the appropriate page
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthData } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // Handle authentication errors
      let errorMessage = 'Authentication failed';

      switch (error) {
        case 'oidc_failed':
          errorMessage = 'OIDC authentication failed';
          break;
        case 'oidc_not_enabled':
          errorMessage = 'OIDC authentication is not enabled';
          break;
        case 'access_denied':
          errorMessage = 'Access denied - you may not have permission to access this system';
          break;
        case 'token_generation_failed':
          errorMessage = 'Failed to generate authentication token';
          break;
        case 'no_token':
          errorMessage = 'No authentication token received';
          break;
        default:
          errorMessage = `Authentication error: ${error}`;
      }

      console.error('Authentication error:', error);
      navigate('/ui/login', {
        state: { error: errorMessage },
        replace: true,
      });
      return;
    }

    if (token) {
      try {
        // Update auth context (this will also store the token with correct key)
        setAuthData(token);

        console.log('✅ Authentication successful, token stored');

        // Check for intended URL (where user was trying to go before authentication)
        const intendedUrl = localStorage.getItem('hyperweaver_intended_url');
        if (intendedUrl) {
          localStorage.removeItem('hyperweaver_intended_url');
          console.log('🔄 Redirecting to intended URL:', intendedUrl);
          navigate(intendedUrl, { replace: true });
        } else {
          // Default redirect to dashboard
          navigate('/ui', { replace: true });
        }
      } catch (authError) {
        console.error('Error processing authentication callback:', authError);
        navigate('/ui/login', {
          state: { error: 'Failed to process authentication' },
          replace: true,
        });
      }
    } else {
      // No token and no error - shouldn't happen
      console.error('Auth callback received with no token or error');
      navigate('/ui/login', {
        state: { error: 'Invalid authentication response' },
        replace: true,
      });
    }
  }, [searchParams, navigate, setAuthData]);

  // Show loading while processing
  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
