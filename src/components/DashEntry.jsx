import PropTypes from 'prop-types';
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';

import { UserSettings } from '../contexts/UserSettingsContext';

const DashEntry = ({ link, title, icon, isSubmenu, external }) => {
  const userContext = useContext(UserSettings);
  const minimized = userContext.sidebarMinimized;

  const className = minimized
    ? `btn w-100 d-flex justify-content-center ${isSubmenu ? 'is-submenu-collapsed' : ''}`
    : `btn w-100 d-flex align-items-center justify-content-start gap-2 ${isSubmenu ? 'ps-5' : ''}`;

  // External targets (e.g. the backend-served /api-docs) are real navigations, not SPA
  // routes — render an anchor that opens in a new tab so the app stays put.
  if (external) {
    return (
      <a className={className} href={link} target="_blank" rel="noopener noreferrer">
        <i className={icon} />
        {!minimized && <span>{title}</span>}
      </a>
    );
  }

  return (
    <NavLink className={className} to={link}>
      <i className={icon} />
      {!minimized && <span>{title}</span>}
    </NavLink>
  );
};

DashEntry.propTypes = {
  link: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  isSubmenu: PropTypes.bool,
  external: PropTypes.bool,
};

export default DashEntry;
