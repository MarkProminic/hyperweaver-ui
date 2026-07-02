import { useServers } from '../contexts/ServerContext';
import { hasFeature } from '../utils/capabilities';

import DashEntry from './DashEntry';

/**
 * Host sub-navigation, gated by the selected agent's capability tokens
 * (dual-mode plan §3.1): entries whose backing panels an agent doesn't
 * advertise are hidden for that host. Legacy agents (no capabilities yet)
 * show everything.
 */
const SidebarHosts = () => {
  const { currentServer } = useServers();

  return (
    <div>
      <DashEntry
        title={'Manage'}
        link={'/ui/host-manage'}
        icon={'fas fa-solid fa-gear'}
        isSubmenu
      />
      {hasFeature(currentServer, 'vnics') && (
        <DashEntry
          title={'Networking'}
          link={'/ui/host-networking'}
          icon={'fas fa-solid fa-sitemap'}
          isSubmenu
        />
      )}
      <DashEntry
        title={'Devices'}
        link={'/ui/host-devices'}
        icon={'fab fa-brands fa-usb'}
        isSubmenu
      />
      {hasFeature(currentServer, 'zfs') && (
        <DashEntry
          title={'Storage'}
          link={'/ui/host-storage'}
          icon={'fas fa-solid fa-hard-drive'}
          isSubmenu
        />
      )}
      {hasFeature(currentServer, 'zfs') && (
        <DashEntry
          title={'Network Storage'}
          link={'/ui/host-network-storage'}
          icon={'fas fa-solid fa-network-wired'}
          isSubmenu
        />
      )}
    </div>
  );
};

export default SidebarHosts;
