import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { hasFeature } from '../../utils/capabilities';

import AggregateManagement from './AggregateManagement';
import BridgeManagement from './BridgeManagement';
import DnsSettings from './DnsSettings';
import EtherstubManagement from './EtherstubManagement';
import HostnameSettings from './HostnameSettings';
import HostsFileEditor from './HostsFileEditor';
import IpAddressManagement from './IpAddressManagement';
import VlanManagement from './VlanManagement';
import VnicManagement from './VnicManagement';

// ONE Network component for every agent (Mark's ruling: same components
// everywhere) — each SECTION gates on capability tokens (any-of). The
// `vnics` family token also carries hostname/dns/addresses today (those
// surfaces exist wherever it does); their own tokens light them up on
// agents that ship the surfaces individually (sync ask 2026-07-17).
const SECTIONS = [
  { key: 'hostname', label: 'Hostname', icon: 'fa-server', features: ['hostname', 'vnics'] },
  { key: 'hosts', label: 'Hosts File', icon: 'fa-address-book', features: ['hosts-file'] },
  { key: 'dns', label: 'DNS', icon: 'fa-route', features: ['dns', 'vnics'] },
  { key: 'vnics', label: 'VNICs', icon: 'fa-network-wired', features: ['vnics'] },
  { key: 'vlans', label: 'VLANs', icon: 'fa-tags', features: ['vnics'] },
  {
    key: 'addresses',
    label: 'IP Addresses',
    icon: 'fa-globe',
    features: ['ip-addresses', 'vnics'],
  },
  { key: 'aggregates', label: 'Link Aggregates', icon: 'fa-link', features: ['vnics'] },
  { key: 'bridges', label: 'Bridges', icon: 'fa-bridge-water', features: ['vnics'] },
  { key: 'etherstubs', label: 'Etherstubs', icon: 'fa-ethernet', features: ['vnics'] },
];

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

  const sections = SECTIONS.filter(section =>
    section.features.some(token => hasFeature(server, token))
  );
  // An agent switch can hide the selected section — fall back to the first
  // visible one without touching state.
  const effectiveSection = sections.some(section => section.key === activeSection)
    ? activeSection
    : sections[0]?.key;

  return (
    <div>
      {/* Section Navigation */}
      <ul className="nav nav-tabs mb-0">
        {sections.map(section => (
          <li className="nav-item" key={section.key}>
            <button
              type="button"
              className={`nav-link ${effectiveSection === section.key ? 'active' : ''}`}
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
        {effectiveSection === 'hostname' && <HostnameSettings server={server} onError={setError} />}

        {effectiveSection === 'hosts' && <HostsFileEditor server={server} onError={setError} />}

        {effectiveSection === 'dns' && <DnsSettings server={server} onError={setError} />}

        {effectiveSection === 'vnics' && <VnicManagement server={server} onError={setError} />}

        {effectiveSection === 'vlans' && <VlanManagement server={server} onError={setError} />}

        {effectiveSection === 'addresses' && (
          <IpAddressManagement server={server} onError={setError} />
        )}

        {effectiveSection === 'aggregates' && (
          <AggregateManagement server={server} onError={setError} />
        )}

        {effectiveSection === 'bridges' && <BridgeManagement server={server} onError={setError} />}

        {effectiveSection === 'etherstubs' && (
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
