import { NavLink, useLocation } from 'react-router-dom';

import { useServers } from '../../contexts/ServerContext';
import { hasFeature, hasManageSurface } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';

/**
 * ContextTabs — navbar row 2 (contract §2). The horizontal tab strip for the focused node,
 * chosen by the current route:
 *   - a host-context route  → the host tabs below
 *   - the machine route (/ui/machines) → machine Overview (sub-tabs deferred; Machines.jsx
 *                                        sections are already modular, so they split into tabs later)
 *   - anything else (dashboard/accounts/settings pages) → no context tabs
 *
 * `HOST_TABS` is the SINGLE SOURCE OF TRUTH: it both renders the tabs AND defines what counts
 * as "host context" (below). Add/rename a host route here once — nothing else to keep in sync.
 * These are fixed app route paths (Layout.jsx), NOT host names; the selected host lives in
 * ServerContext state, never in the URL. `feature` gates a tab on the agent's capability
 * tokens (vnics/zfs) — hidden on agents that don't advertise them (e.g. a VirtualBox agent).
 */
const HOST_TABS = [
  { to: '/ui/hosts', label: 'Overview', icon: 'fas fa-gauge', end: true },
  { to: '/ui/host-manage', label: 'Manage', icon: 'fas fa-gear' },
  { to: '/ui/host-networking', label: 'Networking', icon: 'fas fa-sitemap', feature: 'vnics' },
  { to: '/ui/host-devices', label: 'Devices', icon: 'fab fa-usb', feature: 'devices' },
  { to: '/ui/host-storage', label: 'Storage', icon: 'fas fa-hard-drive', feature: 'zfs' },
  { to: '/ui/settings/agent', label: 'Agent', icon: 'fas fa-database' },
];

const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

const ContextTabs = () => {
  const { pathname } = useLocation();
  const { currentServer } = useServers();

  if (pathname === '/ui/machines') {
    const machineLabel = resourceLabel(currentServer, { plural: false });
    return (
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <NavLink to="/ui/machines" className={linkClass} end>
            <i className="fas fa-circle-info me-1" />
            {machineLabel} Overview
          </NavLink>
        </li>
      </ul>
    );
  }

  // Host context = we're on one of the host-tab routes (the list is its own source of truth).
  const inHostContext = HOST_TABS.some(tab => tab.to === pathname);
  if (!inHostContext) {
    return null;
  }

  return (
    <ul className="nav nav-tabs">
      {HOST_TABS.filter(tab => {
        // Manage aggregates ten token-gated sub-tabs — hide it when the agent
        // advertises none of them (hasManageSurface), instead of an empty page.
        if (tab.to === '/ui/host-manage') {
          return hasManageSurface(currentServer);
        }
        return !tab.feature || hasFeature(currentServer, tab.feature);
      }).map(tab => (
        <li className="nav-item" key={tab.to}>
          <NavLink to={tab.to} className={linkClass} end={tab.end}>
            <i className={`${tab.icon} me-1`} />
            {tab.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};

export default ContextTabs;
