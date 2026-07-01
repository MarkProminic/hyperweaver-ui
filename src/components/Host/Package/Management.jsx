import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../../contexts/ServerContext';
import RepositorySection from '../RepositorySection';
import SystemUpdatesSection from '../SystemUpdatesSection';

import PackageSection from './Section';

const PackageManagement = ({ server }) => {
  const [activeSection, setActiveSection] = useState('packages');
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>Please select a server to manage packages and repositories.</p>
      </div>
    );
  }

  const sections = [
    { key: 'packages', label: 'Packages', icon: 'fa-cube' },
    { key: 'repositories', label: 'Repositories', icon: 'fa-database' },
    { key: 'updates', label: 'Updates', icon: 'fa-download' },
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
              onClick={() => setActiveSection(section.key)}
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
        {activeSection === 'packages' && <PackageSection server={server} onError={setError} />}

        {activeSection === 'repositories' && (
          <RepositorySection server={server} onError={setError} />
        )}

        {activeSection === 'updates' && <SystemUpdatesSection server={server} onError={setError} />}
      </div>
    </div>
  );
};

PackageManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default PackageManagement;
