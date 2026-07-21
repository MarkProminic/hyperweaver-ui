import axios from 'axios';
import PropTypes from 'prop-types';
import { forwardRef, useContext, useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import CountryFlag from 'react-country-flag';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import { useServers } from '../contexts/ServerContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { UserSettings } from '../contexts/UserSettingsContext.jsx';
import { supportedLanguages } from '../i18n';

import { ContentModal } from './common';
import GravatarImage from './GravatarImage.jsx';
import OrgSwitcherModal, { OrgSwitcherMenuItem } from './OrgSwitcherModal.jsx';

// Language identity helpers (the BoxVault navbar pattern): the flag comes from
// the locale's region via Intl.Locale (maximize() infers e.g. en → US), the
// display name from Intl.DisplayNames in the language's OWN locale.
const getLanguageFlag = languageCode => {
  const code = languageCode || 'en';
  try {
    const locale = new Intl.Locale(code);
    const region = locale.region || locale.maximize().region;
    if (region) {
      return <CountryFlag countryCode={region} svg title={region} />;
    }
  } catch {
    return '🌐';
  }
  return '🌐';
};

const getLanguageDisplayName = languageCode => {
  const code = languageCode || 'en';
  try {
    const displayNames = new Intl.DisplayNames([code], { type: 'language' });
    const name = displayNames.of(code);
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return code.toUpperCase();
  }
};

// Custom dropdown toggle: the profile avatar (plus username when expanded) opens the menu,
// with no Bootstrap caret/button chrome. react-bootstrap supplies onClick + ref. When the
// sidebar is minimized the row centers icon-only with no side padding — the default button
// padding would squeeze the 32px avatar inside the 38px rail (same rule as SidebarHeader).
const ProfileToggle = forwardRef(({ children, onClick, minimized }, ref) => {
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      className={`btn d-flex align-items-center gap-2 ${minimized ? 'justify-content-center px-0 w-100' : ''}`}
    >
      {children}
    </div>
  );
});

ProfileToggle.displayName = 'ProfileToggle';

ProfileToggle.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  minimized: PropTypes.bool,
};

// One logout row (BoxVault-style). For OIDC the ICON is a toggle (globe = everywhere / house =
// this app only) that flips scope WITHOUT logging out (stopPropagation in onToggle keeps the menu
// open); clicking the row body logs out in the shown scope. Non-OIDC → plain "Log Out" (the
// Server treats it as local — there is no IdP session to end).
const LogoutItem = ({
  isOidc,
  providerLabel,
  logoutEverywhere,
  onToggle,
  onToggleKey,
  onLogout,
}) => {
  const { t } = useTranslation();
  let label = t('chrome.sidebarFooter.logOut');
  if (isOidc) {
    label = logoutEverywhere
      ? t('chrome.sidebarFooter.logOutEverywhere', {
          providerLabel: providerLabel || t('chrome.sidebarFooter.logOutProviderDefault'),
        })
      : t('chrome.sidebarFooter.logOutLocalOnly');
  }
  return (
    <Dropdown.Item
      as="button"
      type="button"
      onClick={() => onLogout(!(isOidc && logoutEverywhere))}
      className="d-flex align-items-center gap-2"
    >
      {isOidc ? (
        <span
          role="button"
          tabIndex={0}
          className="cursor-pointer d-inline-flex"
          title={
            logoutEverywhere
              ? t('chrome.sidebarFooter.logOutEverywhereTitle')
              : t('chrome.sidebarFooter.logOutLocalOnlyTitle', {
                  providerLabel: providerLabel || t('chrome.sidebarFooter.logOutProviderDefault'),
                })
          }
          onClick={onToggle}
          onKeyDown={onToggleKey}
        >
          <i className={`fas ${logoutEverywhere ? 'fa-globe' : 'fa-house'} text-danger`} />
        </span>
      ) : (
        <i className="fas fa-sign-out-alt text-danger" />
      )}
      <span className="text-danger">{label}</span>
    </Dropdown.Item>
  );
};

LogoutItem.propTypes = {
  isOidc: PropTypes.bool,
  providerLabel: PropTypes.string,
  logoutEverywhere: PropTypes.bool,
  onToggle: PropTypes.func,
  onToggleKey: PropTypes.func,
  onLogout: PropTypes.func,
};

const SidebarFooter = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const changeLanguage = async lang => {
    await i18n.changeLanguage(lang);
    setShowLanguageModal(false);
  };
  const userContext = useContext(UserSettings);
  const { user, logout } = useAuth();
  const { isDirect } = useMode();
  const { currentServer } = useServers();
  const { toggleTheme, getThemeDisplay } = useTheme();

  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
  const isOidc = user?.auth_provider?.startsWith('oidc-') ?? false;

  // OIDC session (phase E): the user's favorite apps, their IdP profile URL, the provider's display
  // name (for the logout label), and customer_id (for the ticket link) — all gated on an OIDC
  // provider. For local/LDAP/apikey sessions these stay empty and nothing extra renders.
  const [favoriteApps, setFavoriteApps] = useState([]);
  const [oidcProfileUrl, setOidcProfileUrl] = useState(null);
  const [providerLabel, setProviderLabel] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  useEffect(() => {
    if (!isOidc) {
      setFavoriteApps([]);
      setOidcProfileUrl(null);
      setProviderLabel(null);
      setCustomerId(null);
      return undefined;
    }
    let mounted = true;
    // Favorites + customer_id (ticket) proxied from the IdP userinfo; OIDC token read server-side (C2).
    axios
      .get('/api/userinfo/claims')
      .then(res => {
        if (mounted) {
          setFavoriteApps(res.data?.favorite_apps || []);
          setCustomerId(res.data?.customer_id || null);
        }
      })
      .catch(() => {});
    // Map this user's provider (auth_provider = "oidc-<name>") to its issuer → IdP profile URL (C5).
    fetch(`${window.location.origin}/api/auth/oidc/issuers`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!mounted) {
          return;
        }
        const name = user.auth_provider.slice('oidc-'.length);
        const match = (data?.issuers || []).find(issuer => issuer.provider === name);
        setOidcProfileUrl(match ? `${match.issuer.replace(/\/$/, '')}/user/profile` : null);
      })
      .catch(() => {});
    // Map this user's provider to its human display_name (e.g. "STARTcloud SSO") for the federated
    // logout label — /api/auth/methods lists enabled providers as { id:"oidc-<name>", name }.
    fetch(`${window.location.origin}/api/auth/methods`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!mounted) {
          return;
        }
        const method = (data?.methods || []).find(m => m.id === user.auth_provider);
        setProviderLabel(method?.name || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isOidc, user]);

  // Help-ticket link (contract C4 / phase D). Public GET /api/config/ticket returns the
  // ticket_system config; the link ONLY appears when `ticket_system.enabled` is true AND a
  // base_url is set (both live in config.yaml). customer_id rides from the OIDC claims (above).
  const [ticketUrl, setTicketUrl] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetch(`${window.location.origin}/api/config/ticket`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const ts = data?.ticket_system;
        if (!mounted || !ts || !ts.enabled?.value || !ts.base_url?.value) {
          return;
        }
        const params = new URLSearchParams({
          req: ts.req_type?.value || 'sso',
          customerId: customerId || '',
          user: user?.username || '',
          email: user?.email || '',
          context: ts.context?.value || '',
        });
        setTicketUrl(`${ts.base_url?.value || ''}&${params.toString()}`);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user, customerId]);

  // Two logout scopes (the Server supports both; SidebarFooter picks which to invoke):
  //   federated (localOnly=false) → revoke app JWT + follow the RP-initiated end-session URL to
  //     end the IdP SSO session too ("log out of <provider>").
  //   local    (localOnly=true)  → revoke app JWT only; the IdP SSO session survives for a
  //     seamless re-login. Returns no redirect, so fall through to the SPA login.
  const handleLogout = async (localOnly = false) => {
    try {
      const redirectUrl = await logout(localOnly);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate('/ui/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/ui/login');
    }
  };

  // Logout scope state (LogoutItem renders the row): defaults to "everywhere" for an OIDC user.
  // The icon toggle flips this without logging out (stopPropagation keeps the menu open).
  const [logoutEverywhere, setLogoutEverywhere] = useState(true);
  const handleLogoutToggle = e => {
    e.preventDefault();
    e.stopPropagation();
    setLogoutEverywhere(prev => !prev);
  };
  const handleLogoutToggleKey = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleLogoutToggle(e);
    }
  };

  const isMinimized = userContext.sidebarMinimized;

  return (
    <div className="has-z-index-sidebar">
      <Dropdown drop="up">
        <Dropdown.Toggle as={ProfileToggle} minimized={isMinimized}>
          <GravatarImage />
          {!isMinimized && (
            <span className="d-flex flex-column text-start lh-sm ms-1 hw-profile-id">
              <span className="fw-semibold text-truncate">
                {user?.username || t('chrome.sidebarFooter.userDefault')}
              </span>
              {user?.email && (
                <span className="small text-body-secondary text-truncate">{user.email}</span>
              )}
            </span>
          )}
        </Dropdown.Toggle>
        <Dropdown.Menu className="hw-profile-menu">
          <Dropdown.Item
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-book" />
            <span>{t('chrome.sidebarFooter.documentation')}</span>
          </Dropdown.Item>

          {/* API Reference — mode-aware (relocated from the sidebar, contract §2). Direct: this
              agent's own API; Aggregated: the Server's API + the selected agent's, via the proxy. */}
          {isDirect ? (
            <Dropdown.Item
              href="/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="d-flex align-items-center gap-2"
            >
              <i className="fas fa-code" />
              <span>{t('chrome.sidebarFooter.apiReference')}</span>
            </Dropdown.Item>
          ) : (
            <>
              <Dropdown.Item
                href="/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center gap-2"
              >
                <i className="fas fa-code" />
                <span>{t('chrome.sidebarFooter.serverApi')}</span>
              </Dropdown.Item>
              {currentServer?.id && (
                <Dropdown.Item
                  href={`/agent/api-docs?server=${currentServer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex align-items-center gap-2"
                >
                  <i className="fas fa-code" />
                  <span>{t('chrome.sidebarFooter.agentApi')}</span>
                </Dropdown.Item>
              )}
            </>
          )}

          <Dropdown.Item
            as="button"
            type="button"
            onClick={toggleTheme}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-palette" />
            <span>
              {t('chrome.sidebarFooter.theme')}: {getThemeDisplay().replace(/\s*\([^)]*\)/g, '')}
            </span>
          </Dropdown.Item>

          <Dropdown.Item
            as="button"
            type="button"
            onClick={() => setShowLanguageModal(true)}
            className="d-flex align-items-center gap-2"
          >
            <span className="d-inline-flex">{getLanguageFlag(i18n.language)}</span>
            <span>{getLanguageDisplayName(i18n.language)}</span>
          </Dropdown.Item>

          <OrgSwitcherMenuItem onOpen={() => setShowOrgModal(true)} />

          {/* Profile — a Server user concept (not in Direct). OIDC users go to their IdP profile
              (contract §2 / phase E); local/LDAP users to the local profile page. */}
          {!isDirect &&
            (isOidc && oidcProfileUrl ? (
              <Dropdown.Item
                href={oidcProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center gap-2"
              >
                <i className="fas fa-id-badge" />
                <span>{t('chrome.sidebarFooter.profile')}</span>
              </Dropdown.Item>
            ) : (
              <Dropdown.Item as={Link} to="/ui/profile" className="d-flex align-items-center gap-2">
                <i className="fas fa-user" />
                <span>{t('chrome.sidebarFooter.profile')}</span>
              </Dropdown.Item>
            ))}

          {/* Server-wide admin, relocated from the sidebar (contract §2) — Aggregated only. */}
          {!isDirect && isAdmin && (
            <Dropdown.Item as={Link} to="/ui/accounts" className="d-flex align-items-center gap-2">
              <i className="fas fa-id-card" />
              <span>{t('chrome.sidebarFooter.accounts')}</span>
            </Dropdown.Item>
          )}
          {!isDirect && user?.role === 'super-admin' && (
            <Dropdown.Item
              as={Link}
              to="/ui/settings/hyperweaver"
              className="d-flex align-items-center gap-2"
            >
              <i className="fas fa-cogs" />
              <span>{t('chrome.sidebarFooter.hyperweaverSettings')}</span>
            </Dropdown.Item>
          )}

          {/* Direct-mode enrollment slot — inert; wired in roadmap items 7/8 (contract §2). */}
          {isDirect && (
            <Dropdown.Item
              as="button"
              type="button"
              disabled
              title={t('chrome.sidebarFooter.enrollNode')}
              className="d-flex align-items-center gap-2"
            >
              <i className="fas fa-link" />
              <span>{t('chrome.sidebarFooter.joinServer')}</span>
            </Dropdown.Item>
          )}

          {/* Favorite apps from the IdP userinfo (phase E) — OIDC only, empty otherwise. */}
          {favoriteApps.length > 0 && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>{t('chrome.sidebarFooter.favorites')}</Dropdown.Header>
              {[...favoriteApps]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(app => (
                  <Dropdown.Item
                    key={app.clientId}
                    href={app.homeUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-flex align-items-center gap-2"
                  >
                    <i className="fas fa-star text-warning" />
                    <span className="text-truncate">
                      {app.customLabel || app.clientName || app.clientId}
                    </span>
                  </Dropdown.Item>
                ))}
            </>
          )}

          {ticketUrl && (
            <Dropdown.Item
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d-flex align-items-center gap-2"
            >
              <i className="fas fa-ticket" />
              <span>{t('chrome.sidebarFooter.helpSupport')}</span>
            </Dropdown.Item>
          )}

          <Dropdown.Divider />
          <LogoutItem
            isOidc={isOidc}
            providerLabel={providerLabel}
            logoutEverywhere={logoutEverywhere}
            onToggle={handleLogoutToggle}
            onToggleKey={handleLogoutToggleKey}
            onLogout={handleLogout}
          />
        </Dropdown.Menu>
      </Dropdown>

      <OrgSwitcherModal isOpen={showOrgModal} onClose={() => setShowOrgModal(false)} />

      <ContentModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t('chrome.languageModal.title')}
        icon="fas fa-globe"
      >
        <div className="list-group">
          {supportedLanguages.map(lang => (
            <button
              key={lang}
              type="button"
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                i18n.language === lang ? 'border-primary border-2' : ''
              }`}
              onClick={() => changeLanguage(lang)}
            >
              <span className="d-inline-flex align-items-center gap-2">
                <span className="d-inline-flex fs-5">{getLanguageFlag(lang)}</span>
                <span>{getLanguageDisplayName(lang)}</span>
              </span>
              {i18n.language === lang && <i className="fas fa-check-circle text-success" />}
            </button>
          ))}
        </div>
      </ContentModal>
    </div>
  );
};

export default SidebarFooter;
