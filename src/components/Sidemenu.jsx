import { useContext } from 'react';

import { UserSettings } from '../contexts/UserSettingsContext';

import Sidebar from './Sidebar';
import SidebarFooter from './SidebarFooter';
import SidebarHeader from './SidebarHeader';

const SideMenu = () => {
  const { sidebarMinimized } = useContext(UserSettings);

  return (
    <section className={`d-flex flex-column min-vh-100 ${sidebarMinimized ? 'is-minimized' : ''}`}>
      <div className="has-z-index-sidebar">
        <SidebarHeader />
      </div>
      <div className="flex-grow-1 p-0 d-flex align-items-start">
        <Sidebar />
      </div>
      <SidebarFooter />
    </section>
  );
};

export default SideMenu;
