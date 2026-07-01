import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../contexts/ServerContext';

import TimeSyncConfig from './TimeSync/Config';
import TimeSyncStatus from './TimeSync/Status';
import TimezoneSettings from './TimezoneSettings';

const TimeNTPManagement = ({ server }) => {
  const [activeSection, setActiveSection] = useState('status');
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>Please select a server to manage time synchronization.</p>
      </div>
    );
  }

  const sections = [
    { key: 'status', label: 'Time Sync Status', icon: 'fa-clock' },
    { key: 'config', label: 'NTP Configuration', icon: 'fa-cog' },
    { key: 'timezone', label: 'Timezone', icon: 'fa-globe' },
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
        <div className="alert alert-danger mb-4 d-flex justify-content-between align-items-start">
          <p className="mb-0">{error}</p>
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      {/* Section Content */}
      <div className="section-content">
        {activeSection === 'status' && <TimeSyncStatus server={server} onError={setError} />}

        {activeSection === 'config' && <TimeSyncConfig server={server} onError={setError} />}

        {activeSection === 'timezone' && <TimezoneSettings server={server} onError={setError} />}
      </div>
    </div>
  );
};

TimeNTPManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
};

export default TimeNTPManagement;
