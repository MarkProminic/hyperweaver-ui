import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../contexts/ServerContext';

import AggregateManagement from './AggregateManagement';
import BridgeManagement from './BridgeManagement';
import EtherstubManagement from './EtherstubManagement';
import HostnameSettings from './HostnameSettings';
import IpAddressManagement from './IpAddressManagement';
import VlanManagement from './VlanManagement';
import VnicManagement from './VnicManagement';

const NetworkHostnameManagement = ({ server }) => {
  const [activeSection, setActiveSection] = useState('hostname');
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  if (!server || !makeAgentRequest) {
    return (
      <div className="alert alert-info">
        <p>Please select a server to manage network configuration.</p>
      </div>
    );
  }

  const sections = [
    { key: 'hostname', label: 'Hostname', icon: 'fa-server' },
    { key: 'vnics', label: 'VNICs', icon: 'fa-network-wired' },
    { key: 'vlans', label: 'VLANs', icon: 'fa-tags' },
    { key: 'addresses', label: 'IP Addresses', icon: 'fa-globe' },
    { key: 'aggregates', label: 'Link Aggregates', icon: 'fa-link' },
    { key: 'bridges', label: 'Bridges', icon: 'fa-bridge-water' },
    { key: 'etherstubs', label: 'Etherstubs', icon: 'fa-ethernet' },
  ];

  return (
    <div>
      {/* Section Navigation */}
      <ul className="nav nav-tabs mb-0">
        {sections.map(section => (
          <li className="nav-item" key={section.key}>
            <button
              type="button"
              className={`nav-link ${activeSection === section.key ? 'active' : ''}`}
              onClick={() => setActiveSection(section.key)}
            >
              <i className={`fas ${section.icon} me-2`} />
              {section.label}
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
        {activeSection === 'hostname' && <HostnameSettings server={server} onError={setError} />}

        {activeSection === 'vnics' && <VnicManagement server={server} onError={setError} />}

        {activeSection === 'vlans' && <VlanManagement server={server} onError={setError} />}

        {activeSection === 'addresses' && (
          <IpAddressManagement server={server} onError={setError} />
        )}

        {activeSection === 'aggregates' && (
          <AggregateManagement server={server} onError={setError} />
        )}

        {activeSection === 'bridges' && <BridgeManagement server={server} onError={setError} />}

        {activeSection === 'etherstubs' && (
          <EtherstubManagement server={server} onError={setError} />
        )}
      </div>
    </div>
  );
};

NetworkHostnameManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.number,
    protocol: PropTypes.string,
  }).isRequired,
};

export default NetworkHostnameManagement;
