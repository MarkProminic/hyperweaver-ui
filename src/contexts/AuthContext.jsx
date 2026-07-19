import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useMode } from './ModeContext';

/**
 * Authentication context for Hyperweaver user management.
 *
 * Dual-mode (plan §6/§7): in Aggregated mode this is the Server's user-account JWT flow
 * (/api/auth/*). In Direct mode the agent has no users — auth is the agent's API key,
 * stored in the same localStorage slot and sent as the same Bearer header (the agent
 * accepts Bearer or X-API-Key), validated via GET /api-keys/info.
 */
const AuthContext = createContext();

// Module scope: survives React StrictMode's double effect invocation — the
// tray token is single-use, so only the first attempt may consume it.
let trayClaimStarted = false;

// One id per tab: BroadcastChannel delivers to OTHER channel instances in the
// SAME tab too, so every message carries its sender and handlers drop their
// own echoes.
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const AUTH_CHANNEL = 'hw-auth';

/**
 * Tray/hwa:// handoff epilogue (Mark's design, 2026-07-07): tell every other
 * open tab the session is live — they reload into it, since localStorage
 * already carries the key — then close THIS agent-spawned tab, but ONLY when
 * a sibling actually answered the ping. The same handoff serves the
 * tray-icon open where this tab is the only one and must stay. A browser
 * that refuses window.close() just leaves a working logged-in tab.
 */
const announceHandoffAndMaybeClose = () => {
  let channel;
  try {
    channel = new BroadcastChannel(AUTH_CHANNEL);
  } catch {
    return; // no BroadcastChannel — the storage event still refreshes siblings
  }
  let sibling = false;
  channel.onmessage = event => {
    if (event.data?.type === 'auth-pong' && event.data.senderId !== TAB_ID) {
      sibling = true;
    }
  };
  channel.postMessage({ type: 'auth-ping', senderId: TAB_ID });
  setTimeout(() => {
    channel.postMessage({ type: 'auth-updated', senderId: TAB_ID });
    // A beat for the update to leave before the channel (and maybe tab) dies.
    setTimeout(() => {
      channel.close();
      if (sibling) {
        window.close();
      }
    }, 100);
  }, 400);
};

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
  const { t } = useTranslation();
  const { isDirect, ready: modeReady } = useMode();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Aggregate-root display label (contract C6). The Server returns it as a top-level
  // sibling of `user` on /api/auth/verify, ALWAYS (independent of the pre-auth
  // public_datacenter_label toggle). Direct-mode agents don't send it (no root node).
  const [datacenterLabel, setDatacenterLabel] = useState(null);

  const fetchGravatarData = useCallback(
    async userData => {
      // Gravatar rides the Server's /api/profile — agents don't have it (or users/emails).
      if (isDirect || !userData || !userData.email) {
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
    },
    [isDirect]
  );

  /**
   * Direct mode: validate an API key against the agent and build the local "user".
   * The agent is single-operator — a valid key is treated as admin (plan §7.5/§10).
   * @param {string} apiKey - Agent API key
   * @returns {Promise<Object|null>} User object or null if invalid
   */
  const validateApiKey = useCallback(async apiKey => {
    const response = await axios.get('/api-keys/info', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const entity = response.data;
    if (!entity || !entity.name) {
      return null;
    }
    return {
      username: entity.name,
      // The API key IS the highest credential on this host; Server-only surfaces
      // (users/orgs/server settings) are hidden in Direct mode regardless.
      role: 'super-admin',
      email: null,
      entity,
    };
  }, []);

  /**
   * Direct-mode tray handoff: the agent's tray "Open" click mints a single-use
   * 60s token and puts it in the URL fragment (#tray=...) — fragments never hit
   * server logs or Referer headers. Exchange it for a fresh API key so the
   * local user is signed in without any login screen (local presence IS the
   * credential). Returns the API key, or null when there is no token / the
   * claim fails (expired, reused, agent restarted) — callers fall through to
   * the normal stored-key / login flow.
   */
  const claimTrayToken = useCallback(async () => {
    const match = window.location.hash.match(/[#&]tray=(?<token>[A-Za-z0-9_-]+)/);
    if (!match || trayClaimStarted) {
      return null;
    }
    trayClaimStarted = true;
    // Strip the fragment immediately so the single-use token never lingers in
    // the address bar, browser history, or a copied link.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    try {
      const response = await axios.post('/auth/tray-claim', { token: match.groups.token });
      return response.data?.api_key || null;
    } catch (claimErr) {
      console.error('Tray token claim failed:', claimErr);
      return null;
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
    setDatacenterLabel(null);
    delete axios.defaults.headers.common.Authorization;
  }, []);

  /**
   * Initialize authentication by checking the stored token against the origin:
   * Direct → the token IS the agent API key, verified via /api-keys/info.
   * Aggregated → JWT verified via the Server's /api/auth/verify.
   */
  const initializeAuth = useCallback(async () => {
    // Tray/protocol handoff (Direct mode). Every tray claim mints a PERMANENT key on the
    // agent, so a still-valid stored key outranks claiming: validate it first, strip the
    // fragment UNCLAIMED (the single-use token just expires server-side), and reuse the
    // session. Claim only when no key is stored or the stored one no longer validates —
    // otherwise the agent's key list grows by one per tray/hwa:// open.
    if (isDirect) {
      const hasTrayToken = /[#&]tray=[A-Za-z0-9_-]+/.test(window.location.hash);
      const storedKey = localStorage.getItem('authToken');

      if (hasTrayToken && storedKey) {
        try {
          const storedUser = await validateApiKey(storedKey);
          if (storedUser) {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search
            );
            setUser(storedUser);
            setToken(storedKey);
            setIsAuthenticated(true);
            axios.defaults.headers.common.Authorization = `Bearer ${storedKey}`;
            setLoading(false);
            announceHandoffAndMaybeClose();
            return;
          }
        } catch (storedErr) {
          console.error('Stored key validation failed, falling back to tray claim:', storedErr);
        }
      }

      const trayKey = await claimTrayToken();
      if (trayKey) {
        try {
          const trayUser = await validateApiKey(trayKey);
          if (trayUser) {
            localStorage.setItem('authToken', trayKey);
            setToken(trayKey);
            setUser(trayUser);
            setIsAuthenticated(true);
            axios.defaults.headers.common.Authorization = `Bearer ${trayKey}`;
            setLoading(false);
            announceHandoffAndMaybeClose();
            return;
          }
        } catch (trayErr) {
          console.error('Tray key validation failed:', trayErr);
        }
      }
    }

    const storedToken = localStorage.getItem('authToken');

    if (storedToken) {
      try {
        if (isDirect) {
          const directUser = await validateApiKey(storedToken);
          if (directUser) {
            setUser(directUser);
            setToken(storedToken);
            setIsAuthenticated(true);
            axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
          } else {
            clearAuth();
          }
        } else {
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
            setDatacenterLabel(response.data.datacenter_label ?? null);

            // Set default authorization header for future requests
            axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
          } else {
            // Invalid token, clear it
            clearAuth();
          }
        }
      } catch (verifyErr) {
        console.error('Token verification failed:', verifyErr);
        // Only a definitive rejection invalidates the stored credential. A transient
        // failure (agent restarting, network blip) must NOT wipe it — especially in
        // Direct mode, where the API key doesn't expire and the user may not have
        // another copy. Leave it stored; the next load restores the session.
        const status = verifyErr.response?.status;
        if (status === 401 || status === 403) {
          clearAuth();
        }
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  }, [isDirect, claimTrayToken, validateApiKey, clearAuth, fetchGravatarData]);

  /**
   * Initialize authentication state once the serving mode is known
   * (verification target differs per mode).
   */
  useEffect(() => {
    if (!modeReady) {
      return;
    }
    initializeAuth();
  }, [modeReady, initializeAuth]);

  /**
   * Global 401/403 handler. A mid-session token that stops verifying — e.g. server-side
   * revocation on back-channel logout (T9), or expiry — clears auth so Layout's guard bounces
   * to /login. This is what makes server-initiated logout UI-transparent. Excludes the auth
   * probes themselves so a bad-password login 401 stays an inline error, not a forced logout.
   * Also excludes proxied agent responses (/api/agents/{id}/…): their 401/403 speaks about
   * the Server↔agent API key, never this user's session — a de-paired agent must not log the
   * user out (and with the Navbar auto-selecting a host, it locked users out of the UI
   * entirely). Direct mode is unaffected: agent paths there are origin-root, and a rejected
   * key IS the session dying.
   */
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      response => response,
      error => {
        const status = error.response?.status;
        const url = error.config?.url || '';
        const isAuthProbe = /\/api\/auth\/(?:login|ldap|verify)|\/api-keys\/info/.test(url);
        const isProxiedAgent = url.startsWith('/api/agents/');
        if (
          (status === 401 || status === 403) &&
          isAuthenticated &&
          !isAuthProbe &&
          !isProxiedAgent
        ) {
          clearAuth();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, [isAuthenticated, clearAuth]);

  /**
   * Multi-tab session handoff (Mark's design, 2026-07-07): when ANOTHER tab
   * completes the tray/hwa:// handoff, this tab reloads into the session —
   * localStorage already carries the key, so the reload comes up signed in.
   * auth-ping is answered so the handoff tab knows a sibling exists before
   * self-closing. The storage event (fires only in OTHER tabs) is the
   * no-BroadcastChannel fallback. One-to-many by nature: every open tab
   * hears the broadcast and refreshes.
   */
  useEffect(() => {
    const stale = () => !isAuthenticated || localStorage.getItem('authToken') !== token;

    let channel = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = event => {
        const { type, senderId } = event.data || {};
        if (senderId === TAB_ID) {
          return;
        }
        if (type === 'auth-ping') {
          channel.postMessage({ type: 'auth-pong', senderId: TAB_ID });
        } else if (type === 'auth-updated' && stale()) {
          window.location.reload();
        }
      };
    } catch {
      // BroadcastChannel unavailable — the storage listener below covers it.
    }

    const onStorage = event => {
      if (event.key === 'authToken' && event.newValue && stale()) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthenticated, token]);

  /**
   * Login user with credentials
   * @param {string} identifier - Username or email
   * @param {string} password - Password
   * @param {string} authMethod - Authentication method ('local' or 'ldap')
   * @returns {Promise<Object>} Login result
   */
  const login = async (identifier, password, authMethod = 'local') => {
    if (isDirect) {
      return { success: false, message: t('app.authContext.apiKeyLoginRequired') };
    }
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
        message:
          loginErr.response?.data?.message ||
          t('app.authContext.authMethodLoginFailed', { method: authMethod.toUpperCase() }),
      };
    }
  };

  /**
   * Direct mode: sign in with an agent API key.
   * Stores the key in the same slot/header the JWT flow uses (transport-identical).
   * @param {string} apiKey - Agent API key
   * @returns {Promise<Object>} Login result
   */
  const loginWithApiKey = async apiKey => {
    if (!isDirect) {
      return { success: false, message: t('app.authContext.apiKeyLoginDirectOnly') };
    }
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: t('app.authContext.enterApiKey') };
    }
    try {
      const directUser = await validateApiKey(apiKey.trim());
      if (!directUser) {
        return { success: false, message: t('app.authContext.invalidApiKey') };
      }

      localStorage.setItem('authToken', apiKey.trim());
      setToken(apiKey.trim());
      setUser(directUser);
      setIsAuthenticated(true);
      axios.defaults.headers.common.Authorization = `Bearer ${apiKey.trim()}`;

      return {
        success: true,
        message: t('app.authContext.signedInAs', { username: directUser.username }),
      };
    } catch (keyErr) {
      console.error('API key login failed:', keyErr);
      const status = keyErr.response?.status;
      return {
        success: false,
        message:
          status === 401 || status === 403
            ? t('app.authContext.invalidApiKey')
            : keyErr.response?.data?.msg || t('app.authContext.apiKeyValidationFailed'),
      };
    }
  };

  /**
   * Direct mode first boot: generate the host's first API key via the agent's
   * public bootstrap endpoint (auto-disables after first use — plan F21),
   * then sign in with it. The key is returned so the UI can show it ONCE.
   * @returns {Promise<Object>} { success, apiKey?, message }
   */
  const bootstrapFirstKey = async setupToken => {
    if (!isDirect) {
      return { success: false, message: t('app.authContext.bootstrapDirectOnly') };
    }
    try {
      const response = await axios.post('/api-keys/bootstrap', {
        name: 'Direct-Login',
        description: 'Generated from the Hyperweaver UI first-boot screen',
        setupToken,
      });

      const apiKey = response.data?.api_key;
      if (!apiKey) {
        return { success: false, message: t('app.authContext.bootstrapNoKeyReturned') };
      }

      const result = await loginWithApiKey(apiKey);
      return { ...result, apiKey };
    } catch (bootstrapErr) {
      console.error('Bootstrap failed:', bootstrapErr);
      return {
        success: false,
        message: bootstrapErr.response?.data?.msg || t('app.authContext.bootstrapFailed'),
      };
    }
  };

  /**
   * Get available authentication methods
   * @returns {Promise<Object>} Available auth methods result
   */
  const getAuthMethods = async () => {
    if (isDirect) {
      return {
        success: true,
        methods: [{ id: 'apikey', name: t('app.authContext.apiKeyMethodName'), enabled: true }],
        localRegistrationEnabled: false, // agents have no user registration at all
      };
    }
    try {
      const response = await axios.get('/api/auth/methods');
      return {
        success: true,
        methods: response.data.methods || [],
        // C9: sibling of `methods`; when false the UI hides the local register form and routes
        // "Register" to the IdP (?register). Defaults true when the server omits it.
        localRegistrationEnabled: response.data.local_registration_enabled !== false,
      };
    } catch (methodsErr) {
      console.error('Get auth methods error:', methodsErr);
      return {
        success: false,
        // Fallback
        methods: [
          { id: 'local', name: t('app.authContext.localAccountMethodName'), enabled: true },
        ],
        localRegistrationEnabled: true,
        message: methodsErr.response?.data?.message || t('app.authContext.loadAuthMethodsFailed'),
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
    if (isDirect) {
      return { success: false, message: t('app.authContext.registrationDirectOnly') };
    }
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
        message: registerErr.response?.data?.message || t('app.authContext.registrationFailed'),
      };
    }
  };

  /**
   * Logout user and clear authentication state.
   * @param {boolean} localOnly - FEDERATED (default): the Server revokes the app JWT AND returns an
   *   RP-initiated end-session URL (T9), so the caller can redirect the browser to the IdP and end
   *   the SSO session too ("log out everywhere"). LOCAL (`true`): the Server revokes only the app
   *   JWT and leaves the IdP SSO session intact — returns no redirect (seamless re-login). The
   *   Server reads this off the POST body (`local`). Non-OIDC sessions return no redirect either way.
   * @returns {Promise<string|null>} RP-initiated end-session URL, or null.
   */
  const logout = async (localOnly = false) => {
    let redirectUrl = null;
    try {
      // Agents have no logout endpoint — the key is simply forgotten client-side.
      if (!isDirect) {
        const response = await axios.post('/api/auth/logout', { local: localOnly });
        redirectUrl = response.data?.redirect_url || null;
      }
    } catch (logoutErr) {
      console.error('Logout error:', logoutErr);
    } finally {
      clearAuth();
    }
    return redirectUrl;
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
        setDatacenterLabel(response.data.datacenter_label ?? null);
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
        message: changeErr.response?.data?.message || t('app.authContext.passwordChangeFailed'),
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
        message: profileErr.response?.data?.message || t('app.authContext.getProfileFailed'),
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    datacenterLabel,
    login,
    loginWithApiKey,
    bootstrapFirstKey,
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
