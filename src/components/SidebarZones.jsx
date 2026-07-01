import DashEntry from './DashEntry';

const SidebarZones = () => (
  <div>
    <DashEntry title={'Manage'} link={'/ui/zone-manage'} icon={'fas fa-solid fa-gear'} isSubmenu />
    <DashEntry
      title={'Register'}
      link={'/ui/zone-register'}
      icon={'fas fa-solid fa-plus'}
      isSubmenu
    />
    <DashEntry
      title={'Status'}
      link={'/ui/zone-status'}
      icon={'fas fa-solid fa-heart-pulse'}
      isSubmenu
    />
  </div>
);

export default SidebarZones;
