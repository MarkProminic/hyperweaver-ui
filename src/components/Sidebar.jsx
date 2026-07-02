import { useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { UserSettings } from '../contexts/UserSettingsContext';

import DashEntry from './DashEntry';
import DashEntryDropDown from './DashEntryDropDown';
import SidebarHosts from './SidebarHosts';
import SidebarZones from './SidebarZones';

const Sidebar = () => {
  const { user } = useAuth();
  const { isDirect } = useMode();
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
                link={'/ui/settings/zapi'}
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
