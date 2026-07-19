import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <aside className="flex-grow-1 w-100">
      {/* Direct mode has no Datacenter root to fold the Dashboard into — surface it here.
          The .hw-tree wrapper puts the entry under the tree's highlight system (the strong
          active selector lives on `.hw-tree .hw-tree-row.active`). */}
      {isDirect && (
        <div className="hw-tree">
          <DashEntry
            title={t('chrome.sidebar.dashboard')}
            link={'/ui/dashboard'}
            icon={'fas fa-solid fa-gauge'}
          />
        </div>
      )}

      <SidebarTree />
    </aside>
  );
};

export default Sidebar;
