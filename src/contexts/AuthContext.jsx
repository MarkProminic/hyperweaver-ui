import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useState, useContext, useEffect, useCallback } from 'react';

/**
 * Authentication context for Hyperweaver local user management
 */
const AuthContext = createContext();

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchGravatarData = useCallback(async userData => {
    if (!userData || !userData.email) {
      return userData;
    }
    try {
      console.log('Fetching Gravatar data for:', userData.email);
      const response = await axios.get(`/api/profile/${userData.email}`);
      console.log('Gravatar data response:', response.data);
      return { ...userData, gravatar: response.data };
    } catch (gravatarErr) {
      console.error('Failed to fetch Gravatar data:', gravatarErr);
      return userData;
    }
  }, []);

  /**
   * Clear authentication state
   */
  const clearAuth = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common.Authorization;
  }, []);

  /**
   * Initialize authentication by checking stored token
   */
  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');

    if (storedToken) {
      try {
        // Verify token with server
        const response = await axios.get('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.data.success && response.data.user) {
          const userWithGravatar = await fetchGravatarData(response.data.user);
          setUser(userWithGravatar);
          setToken(storedToken);
          setIsAuthenticated(true);

          // Set default authorization header for future requests
          axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        } else {
          // Invalid token, clear it
          clearAuth();
        }
      } catch (verifyErr) {
        console.error('Token verification failed:', verifyErr);
        clearAuth();
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  }, [clearAuth, fetchGravatarData]);

  /**
   * Initialize authentication state on component mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Login user with credentials
   * @param {string} identifier - Username or email
   * @param {string} password - Password
   * @param {string} authMethod - Authentication method ('local' or 'ldap')
   * @returns {Promise<Object>} Login result
   */
  const login = async (identifier, password, authMethod = 'local') => {
    try {
      console.log(`🔐 Attempting ${authMethod.toUpperCase()} authentication for:`, identifier);

      // Route to appropriate endpoint based on auth method
      const endpoint = authMethod === 'ldap' ? '/api/auth/ldap' : '/api/auth/login';
      const payload =
        authMethod === 'ldap' ? { username: identifier, password } : { identifier, password };

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data;

        console.log(
          `✅ ${authMethod.toUpperCase()} authentication successful for:`,
          userData.username
        );

        // Store token and user data
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        const userWithGravatar = await fetchGravatarData(userData);
        setUser(userWithGravatar);
        setIsAuthenticated(true);

        // Set default authorization header
        axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        return { success: true, message: response.data.message };
      }
      console.log(`❌ ${authMethod.toUpperCase()} authentication failed:`, response.data.message);
      return { success: false, message: response.data.message };
    } catch (loginErr) {
      console.error(`${authMethod.toUpperCase()} login error:`, loginErr);
      return {
        success: false,
        message: loginErr.response?.data?.message || `${authMethod.toUpperCase()} login failed`,
      };
    }
  };

  /**
   * Get available authentication methods
   * @returns {Promise<Object>} Available auth methods result
   */
  const getAuthMethods = async () => {
    try {
      const response = await axios.get('/api/auth/methods');
      return {
        success: true,
        methods: response.data.methods || [],
      };
    } catch (methodsErr) {
      console.error('Get auth methods error:', methodsErr);
      return {
        success: false,
        methods: [{ id: 'local', name: 'Local Account', enabled: true }], // Fallback
        message: methodsErr.response?.data?.message || 'Failed to load authentication methods',
      };
    }
  };

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password
   * @param {string} userData.confirmPassword - Password confirmation
   * @returns {Promise<Object>} Registration result
   */
  const register = async userData => {
    try {
      const response = await axios.post('/api/auth/register', userData);

      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (registerErr) {
      console.error('Registration error:', registerErr);
      return {
        success: false,
        message: registerErr.response?.data?.message || 'Registration failed',
      };
    }
  };

  /**
   * Logout user and clear authentication state
   */
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (logoutErr) {
      console.error('Logout error:', logoutErr);
    } finally {
      clearAuth();
    }
  };

  /**
   * Set authentication data from external provider (OIDC, etc.)
   * @param {string} authToken - JWT token from external auth
   */
  const setAuthData = async authToken => {
    try {
      // Store token with consistent key name
      localStorage.setItem('authToken', authToken);
      setToken(authToken);

      // Set default authorization header
      axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;

      // Verify token and get user data
      const response = await axios.get('/api/auth/verify');

      if (response.data.success && response.data.user) {
        const userWithGravatar = await fetchGravatarData(response.data.user);
        setUser(userWithGravatar);
        setIsAuthenticated(true);
        console.log('✅ External authentication processed successfully');
      } else {
        throw new Error('Invalid token received from external provider');
      }
    } catch (authErr) {
      console.error('Failed to process external authentication:', authErr);
      clearAuth();
      throw authErr;
    }
  };

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Promise<Object>} Change password result
   */
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (changeErr) {
      console.error('Change password error:', changeErr);
      return {
        success: false,
        message: changeErr.response?.data?.message || 'Password change failed',
      };
    }
  };

  /**
   * Get current user profile
   * @returns {Promise<Object>} Profile result
   */
  const getProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile');

      if (response.data.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      return { success: false, message: response.data.message };
    } catch (profileErr) {
      console.error('Get profile error:', profileErr);
      return {
        success: false,
        message: profileErr.response?.data?.message || 'Failed to get profile',
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    changePassword,
    getProfile,
    getAuthMethods,
    clearAuth,
    setAuthData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export default AuthContext;
