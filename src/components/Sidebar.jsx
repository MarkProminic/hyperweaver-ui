import { useMode } from '../contexts/ModeContext';

import DashEntry from './DashEntry';
import SidebarTree from './SidebarTree';

/**
 * Sidebar — the navigation column (contract §2): essentially just the SidebarTree
 * (Datacenter → hosts → machines), single-select.
 *
 * - Aggregated: the tree's Datacenter root IS the Dashboard — no separate entry.
 * - Direct: no root, so a standalone Dashboard entry sits above the single-host tree.
 *
 * Everything non-tree (API Reference, Accounts, Server Settings, Docs, Theme, Logout) lives in
 * the profile drop-up (SidebarFooter); Agent Settings is the host "Settings" navbar tab.
 */
const Sidebar = () => {
  const { isDirect } = useMode();

  return (
    <aside className="flex-grow-1 w-100">
      {/* Direct mode has no Datacenter root to fold the Dashboard into — surface it here. */}
      {isDirect && (
        <DashEntry title={'Dashboard'} link={'/ui/dashboard'} icon={'fas fa-solid fa-gauge'} />
      )}

      <SidebarTree />
    </aside>
  );
};

export default Sidebar;
