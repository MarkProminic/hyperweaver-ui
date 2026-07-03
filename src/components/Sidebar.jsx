import { useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useServers } from '../contexts/ServerContext';
import { UserSettings } from '../contexts/UserSettingsContext';

import DashEntry from './DashEntry';
import DashEntryDropDown from './DashEntryDropDown';
import SidebarHosts from './SidebarHosts';
import SidebarZones from './SidebarZones';

const Sidebar = () => {
  const { user } = useAuth();
  const { isDirect } = useMode();
  const { currentServer } = useServers();
  const location = useLocation();
  const userSettings = useContext(UserSettings);

  const {
    hostsExpanded,
    setHostsExpanded,
    zonesExpanded,
    setZonesExpanded,
    settingsExpanded,
    setSettingsExpanded,
  } = userSettings;

  useEffect(() => {
    const isHostRoute =
      location.pathname.startsWith('/ui/host') || location.pathname === '/ui/hosts';
    const isZoneRoute =
      location.pathname.startsWith('/ui/zone') || location.pathname === '/ui/zones';
    const isSettingsRoute = location.pathname.startsWith('/ui/settings');

    if (isHostRoute) {
      setHostsExpanded(true);
      setZonesExpanded(false);
      setSettingsExpanded(false);
    } else if (isZoneRoute) {
      setZonesExpanded(true);
      setHostsExpanded(false);
      setSettingsExpanded(false);
    } else if (isSettingsRoute) {
      setSettingsExpanded(true);
      setHostsExpanded(false);
      setZonesExpanded(false);
    }
  }, [location.pathname, setHostsExpanded, setZonesExpanded, setSettingsExpanded]);

  return (
    <aside className="flex-grow-1 w-100">
      <DashEntry title={'Dashboard'} link={'/ui/dashboard'} icon={'fas fa-solid fa-gauge'} />

      <div>
        <DashEntryDropDown title={'Hosts'} icon={'fas fa-solid fa-server'} />
        {hostsExpanded && (
          <div className="sidebar-submenu">
            <SidebarHosts />
          </div>
        )}

        <DashEntryDropDown title={'Zones'} icon={'fab fa-brands fa-hive'} />
        {zonesExpanded && (
          <div className="sidebar-submenu">
            <SidebarZones />
          </div>
        )}
      </div>

      {/* API Reference — live, dark-themed Swagger. Direct: this agent's own API at
          /api-docs. Aggregated: the Server's own API, plus the selected host's agent API
          which the Server relays at /agent/api-docs. Opens in a new tab (backend route,
          not an SPA route); the Agent entry needs a selected host to resolve its id. */}
      {isDirect ? (
        <DashEntry title={'API Reference'} link={'/api-docs'} icon={'fas fa-code'} external />
      ) : (
        <>
          <DashEntry title={'Server API'} link={'/api-docs'} icon={'fas fa-code'} external />
          {currentServer?.id && (
            <DashEntry
              title={'Agent API'}
              link={`/agent/api-docs?server=${currentServer.id}`}
              icon={'fas fa-code'}
              external
            />
          )}
        </>
      )}

      {/* Accounts (users/orgs) live on the Hyperweaver Server — no such thing in Direct mode */}
      {!isDirect && (user?.role === 'admin' || user?.role === 'super-admin') && (
        <DashEntry title={'Accounts'} link={'/ui/accounts'} icon={'fas fa-solid fa-id-card'} />
      )}
      {user?.role === 'super-admin' && (
        <div>
          <DashEntryDropDown title={'Settings'} icon={'fas fa-solid fa-sliders'} />
          {settingsExpanded && (
            <div className="sidebar-submenu">
              {/* Hyperweaver Server settings — Aggregated only */}
              {!isDirect && (
                <DashEntry
                  title={'Hyperweaver'}
                  link={'/ui/settings/hyperweaver'}
                  icon={'fas fa-cogs'}
                  isSubmenu
                />
              )}
              <DashEntry
                title={'Agent'}
                link={'/ui/settings/agent'}
                icon={'fas fa-database'}
                isSubmenu
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
