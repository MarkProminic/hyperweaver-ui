import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../contexts/ServerContext';

import GroupSection from './GroupSection';
import RBACDiscoverySection from './RBAC/DiscoverySection';
import RoleSection from './RoleSection';
import UserSection from './UserSection';

const UserGroupManagement = ({ server }) => {
  const [activeSection, setActiveSection] = useState('users');
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>Please select a server to manage users and groups.</p>
      </div>
    );
  }

  const sections = [
    { key: 'users', label: 'Users', icon: 'fa-user' },
    { key: 'groups', label: 'Groups', icon: 'fa-users' },
    { key: 'roles', label: 'Roles', icon: 'fa-user-shield' },
    { key: 'rbac', label: 'RBAC Discovery', icon: 'fa-search' },
  ];

  return (
    <div>
      {/* Section Navigation */}
      <ul className="nav nav-tabs mb-0">
        {sections.map(section => (
          <li key={section.key} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeSection === section.key ? 'active' : ''}`}
              onClick={e => {
                e.preventDefault();
                setActiveSection(section.key);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveSection(section.key);
                }
              }}
            >
              <i className={`fas ${section.icon} me-2`} />
              <span>{section.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Section Content */}
      <div className="section-content">
        {activeSection === 'users' && <UserSection server={server} onError={setError} />}

        {activeSection === 'groups' && <GroupSection server={server} onError={setError} />}

        {activeSection === 'roles' && <RoleSection server={server} onError={setError} />}

        {activeSection === 'rbac' && <RBACDiscoverySection server={server} onError={setError} />}
      </div>
    </div>
  );
};

UserGroupManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
};

export default UserGroupManagement;
