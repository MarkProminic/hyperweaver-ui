import PropTypes from 'prop-types';
import { forwardRef, useContext } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { UserSettings } from '../contexts/UserSettingsContext.jsx';

import GravatarImage from './GravatarImage.jsx';

// Custom dropdown toggle: the profile avatar (plus username when expanded) opens the menu,
// with no Bootstrap caret/button chrome. react-bootstrap supplies onClick + ref.
const ProfileToggle = forwardRef(({ children, onClick }, ref) => {
  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      className="btn d-flex align-items-center gap-2"
    >
      {children}
    </div>
  );
});

ProfileToggle.displayName = 'ProfileToggle';

ProfileToggle.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
};

const SidebarFooter = () => {
  const navigate = useNavigate();
  const userContext = useContext(UserSettings);
  const { user, logout } = useAuth();
  const { toggleTheme, getThemeDisplay } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const isMinimized = userContext.sidebarMinimized;

  return (
    <div className="has-z-index-sidebar">
      <Dropdown drop="up">
        <Dropdown.Toggle as={ProfileToggle}>
          <GravatarImage />
          {!isMinimized && (
            <span className="fw-semibold text-truncate ms-1">{user?.username || 'User'}</span>
          )}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-book" />
            <span>Documentation</span>
          </Dropdown.Item>
          <Dropdown.Item
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-code" />
            <span>API Reference</span>
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            onClick={toggleTheme}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-palette" />
            <span>Theme: {getThemeDisplay().replace(/\s*\([^)]*\)/g, '')}</span>
          </Dropdown.Item>
          <Dropdown.Item
            as={Link}
            to="/ui/notifications"
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-bell" />
            <span>Notifications</span>
          </Dropdown.Item>
          <Dropdown.Item as={Link} to="/ui/profile" className="d-flex align-items-center gap-2">
            <i className="fas fa-user" />
            <span>Profile</span>
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            as="button"
            type="button"
            onClick={handleLogout}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-sign-out-alt text-danger" />
            <span>Log Out</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default SidebarFooter;
