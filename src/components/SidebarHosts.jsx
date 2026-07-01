import DashEntry from './DashEntry';

const SidebarHosts = () => (
  <div>
    <DashEntry title={'Manage'} link={'/ui/host-manage'} icon={'fas fa-solid fa-gear'} isSubmenu />
    <DashEntry
      title={'Networking'}
      link={'/ui/host-networking'}
      icon={'fas fa-solid fa-sitemap'}
      isSubmenu
    />
    <DashEntry
      title={'Devices'}
      link={'/ui/host-devices'}
      icon={'fab fa-brands fa-usb'}
      isSubmenu
    />
    <DashEntry
      title={'Storage'}
      link={'/ui/host-storage'}
      icon={'fas fa-solid fa-hard-drive'}
      isSubmenu
    />
    <DashEntry
      title={'Network Storage'}
      link={'/ui/host-network-storage'}
      icon={'fas fa-solid fa-network-wired'}
      isSubmenu
    />
  </div>
);

export default SidebarHosts;
