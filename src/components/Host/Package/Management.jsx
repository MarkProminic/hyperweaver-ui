import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../contexts/ServerContext';
import { hasFeature } from '../../../utils/capabilities';
import RepositorySection from '../RepositorySection';
import SystemUpdatesSection from '../SystemUpdatesSection';

import PackageSection from './Section';

const PackageManagement = ({ server }) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('packages');
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>{t('host.packageManagement.pleaseSelectServer')}</p>
      </div>
    );
  }

  // Repositories rides its own token — /system/repositories is a separate
  // surface from /system/packages on the agents.
  const sections = [
    { key: 'packages', label: t('host.packageManagement.packages'), icon: 'fa-cube' },
    ...(hasFeature(server, 'repositories')
      ? [
          {
            key: 'repositories',
            label: t('host.packageManagement.repositories'),
            icon: 'fa-database',
          },
        ]
      : []),
    { key: 'updates', label: t('host.packageManagement.updates'), icon: 'fa-download' },
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

        {activeSection === 'repositories' && hasFeature(server, 'repositories') && (
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
