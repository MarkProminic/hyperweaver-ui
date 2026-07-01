import PropTypes from 'prop-types';
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';

import { UserSettings } from '../contexts/UserSettingsContext';

const DashEntry = ({ link, title, icon, isSubmenu }) => {
  const userContext = useContext(UserSettings);

  if (!userContext.sidebarMinimized) {
    return (
      <NavLink
        className={`btn w-100 d-flex align-items-center justify-content-start gap-2 ${isSubmenu ? 'ps-5' : ''}`}
        to={link}
      >
        <i className={icon} />
        <span>{title}</span>
      </NavLink>
    );
  }
  return (
    <NavLink
      className={`btn w-100 d-flex justify-content-center ${isSubmenu ? 'is-submenu-collapsed' : ''}`}
      to={link}
    >
      <i className={icon} />
    </NavLink>
  );
};

DashEntry.propTypes = {
  link: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  isSubmenu: PropTypes.bool,
};

export default DashEntry;
