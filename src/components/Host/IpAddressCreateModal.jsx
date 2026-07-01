import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

const IpAddressCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    interface: '',
    type: 'static',
    addrobj: '',
    address: '',
    netmask: '24',
    primary: false,
    wait: 30,
    temporary: false,
    down: false,
  });
  const [creating, setCreating] = useState(false);
  const [interfaces, setInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadInterfaces = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoadingInterfaces(true);

      // Load VNICs and physical interfaces
      const [vnicsResult, interfacesResult] = await Promise.all([
        makeAgentRequest(server.hostname, server.port, server.protocol, 'network/vnics', 'GET'),
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'monitoring/network/interfaces',
          'GET'
        ),
      ]);

      const availableInterfaces = [];

      // Add VNICs
      if (vnicsResult.success && vnicsResult.data?.vnics) {
        vnicsResult.data.vnics.forEach(vnic => {
          availableInterfaces.push({
            name: vnic.link,
            type: 'VNIC',
            over: vnic.over,
          });
        });
      }

      // Add physical interfaces
      if (interfacesResult.success && interfacesResult.data?.interfaces) {
        interfacesResult.data.interfaces.forEach(iface => {
          if (iface.class === 'phys') {
            availableInterfaces.push({
              name: iface.link,
              type: 'Physical',
              state: iface.state,
            });
          }
        });
      }

      // Deduplicate interfaces by name
      const uniqueInterfaces = availableInterfaces.filter(
        (iface, index, self) => index === self.findIndex(i => i.name === iface.name)
      );

      setInterfaces(uniqueInterfaces);
    } catch (err) {
      console.error('Error loading interfaces:', err);
    } finally {
      setLoadingInterfaces(false);
    }
  }, [makeAgentRequest, server]);

  // Load available interfaces when modal opens
  useEffect(() => {
    loadInterfaces();
  }, [loadInterfaces]);

  // Auto-generate address object name when interface or type changes
  useEffect(() => {
    if (formData.interface && formData.type) {
      const suffix = formData.type === 'static' ? 'static' : formData.type;
      const version = formData.address?.includes(':') ? 'v6' : 'v4';
      const autoName = `${formData.interface}/${version}${suffix}`;
      setFormData(prev => ({ ...prev, addrobj: autoName }));
    }
  }, [formData.interface, formData.type, formData.address]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.interface.trim()) {
      onError('Interface name is required');
      return false;
    }

    if (!formData.addrobj.trim()) {
      onError('Address object name is required');
      return false;
    }

    if (formData.type === 'static' && !formData.address.trim()) {
      onError('IP address is required for static addresses');
      return false;
    }

    // Validate address object format
    const addrobjRegex = /^[a-zA-Z][a-zA-Z0-9_/]*$/;
    if (!addrobjRegex.test(formData.addrobj)) {
      onError(
        'Address object name must start with a letter and contain only letters, numbers, underscores, and slashes'
      );
      return false;
    }

    // Validate IP address format for static addresses
    if (formData.type === 'static' && formData.address) {
      // Check if address contains CIDR notation (shouldn't when using separate fields)
      if (formData.address.includes('/')) {
        onError('Please enter IP address without CIDR notation - use the separate netmask field');
        return false;
      }

      // Validate IPv4 address format
      const ipv4Regex = /^(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})$/;
      const ipv6Regex = /^(?:[0-9a-fA-F:]+)$/;

      if (!ipv4Regex.test(formData.address) && !ipv6Regex.test(formData.address)) {
        onError('Invalid IP address format');
        return false;
      }

      // Validate IPv4 octets
      if (ipv4Regex.test(formData.address)) {
        const octets = formData.address.split('.').map(Number);
        if (octets.some(octet => octet < 0 || octet > 255)) {
          onError('IPv4 address octets must be between 0 and 255');
          return false;
        }
      }
    }

    // Validate netmask for static addresses
    if (formData.type === 'static') {
      const netmask = parseInt(formData.netmask);
      if (isNaN(netmask) || netmask < 1 || netmask > 30) {
        onError('Netmask must be between 1 and 30 (maximum /30)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      onError('');

      const requestData = {
        interface: formData.interface.trim(),
        type: formData.type,
        addrobj: formData.addrobj.trim(),
        primary: formData.primary,
        wait: parseInt(formData.wait),
        temporary: formData.temporary,
        down: formData.down,
        created_by: 'api',
      };

      if (formData.type === 'static' && formData.address) {
        // Combine IP address and netmask into CIDR format
        requestData.address = `${formData.address.trim()}/${formData.netmask}`;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/addresses',
        'POST',
        requestData
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Failed to create IP address');
      }
    } catch (err) {
      onError(`Error creating IP address: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create IP Address"
      icon="fas fa-plus-circle"
      submitText="Create Address"
      submitVariant="is-primary"
      loading={creating}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="interface-select">
          Interface *
        </label>
        <select
          id="interface-select"
          className="form-select"
          value={formData.interface}
          onChange={e => handleInputChange('interface', e.target.value)}
          disabled={creating || loadingInterfaces}
          required
        >
          <option value="">
            {loadingInterfaces ? 'Loading interfaces...' : 'Select an interface'}
          </option>
          {interfaces.map(iface => (
            <option key={iface.name} value={iface.name}>
              {iface.name} ({iface.type}
              {iface.over ? ` over ${iface.over}` : ''})
            </option>
          ))}
        </select>
        <p className="form-text text-muted">The network interface to assign the address to</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="addrobj-input">
          Address Object Name *
        </label>
        <input
          id="addrobj-input"
          className="form-control"
          type="text"
          placeholder="e.g., vnic0/v4static"
          value={formData.addrobj}
          onChange={e => handleInputChange('addrobj', e.target.value)}
          disabled={creating}
          required
        />
        <p className="form-text text-muted">Unique name for this address object</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="type-select">
          Address Type
        </label>
        <select
          id="type-select"
          className="form-select"
          value={formData.type}
          onChange={e => handleInputChange('type', e.target.value)}
          disabled={creating}
        >
          <option value="static">Static</option>
          <option value="dhcp">DHCP</option>
          <option value="addrconf">Auto Configuration</option>
        </select>
      </div>

      {formData.type === 'static' && (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="mb-3">
                <label className="form-label" htmlFor="address-input">
                  IP Address *
                </label>
                <input
                  id="address-input"
                  className="form-control"
                  type="text"
                  placeholder="192.168.1.100 or 2001:db8::1"
                  value={formData.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  disabled={creating}
                  required
                />
                <p className="form-text text-muted">IP address without CIDR notation</p>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="netmask-select">
                  Netmask *
                </label>
                <select
                  id="netmask-select"
                  className="form-select"
                  value={formData.netmask}
                  onChange={e => handleInputChange('netmask', e.target.value)}
                  disabled={creating}
                  required
                >
                  <option value="8">/8 (255.0.0.0)</option>
                  <option value="16">/16 (255.255.0.0)</option>
                  <option value="24">/24 (255.255.255.0)</option>
                  <option value="25">/25 (255.255.255.128)</option>
                  <option value="26">/26 (255.255.255.192)</option>
                  <option value="27">/27 (255.255.255.224)</option>
                  <option value="28">/28 (255.255.255.240)</option>
                  <option value="29">/29 (255.255.255.248)</option>
                  <option value="30">/30 (255.255.255.252)</option>
                </select>
                <p className="form-text text-muted">Maximum /30</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="wait-input">
              Wait Timeout (seconds)
            </label>
            <input
              id="wait-input"
              className="form-control"
              type="number"
              min="1"
              max="300"
              value={formData.wait}
              onChange={e => handleInputChange('wait', e.target.value)}
              disabled={creating}
            />
            <p className="form-text text-muted">Timeout for address configuration</p>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="primary-checkbox"
            className="form-check-input"
            type="checkbox"
            checked={formData.primary}
            onChange={e => handleInputChange('primary', e.target.checked)}
            disabled={creating}
          />
          <label className="form-check-label" htmlFor="primary-checkbox">
            Primary address
          </label>
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="temporary-checkbox"
            className="form-check-input"
            type="checkbox"
            checked={formData.temporary}
            onChange={e => handleInputChange('temporary', e.target.checked)}
            disabled={creating}
          />
          <label className="form-check-label" htmlFor="temporary-checkbox">
            Temporary (not persistent across reboots)
          </label>
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="down-checkbox"
            className="form-check-input"
            type="checkbox"
            checked={formData.down}
            onChange={e => handleInputChange('down', e.target.checked)}
            disabled={creating}
          />
          <label className="form-check-label" htmlFor="down-checkbox">
            Create in down state
          </label>
        </div>
      </div>
    </FormModal>
  );
};

IpAddressCreateModal.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default IpAddressCreateModal;
