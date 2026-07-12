import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

import VnicBasicFields from './VNIC/VnicBasicFields';
import VnicOptionalFields from './VNIC/VnicOptionalFields';
import VnicOptionsFields from './VNIC/VnicOptionsFields';
import VnicPropertiesFields from './VNIC/VnicPropertiesFields';

const VnicCreateModal = ({ server, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    vlan_id: '',
    mac_address: '',
    temporary: false,
    properties: {},
  });
  const [creating, setCreating] = useState(false);
  const [availableLinks, setAvailableLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadAvailableLinks = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoadingLinks(true);

      // Load different types of links that VNICs can attach to
      const [linksResult, etherstubsResult, aggregatesResult, bridgesResult] = await Promise.all([
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'monitoring/network/interfaces',
          'GET'
        ),
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'network/etherstubs',
          'GET'
        ),
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'network/aggregates',
          'GET'
        ),
        makeAgentRequest(server.hostname, server.port, server.protocol, 'network/bridges', 'GET'),
      ]);

      console.log('VNIC Link Loading Debug:', {
        linksResult: linksResult.success ? linksResult.data : linksResult,
        etherstubsResult: etherstubsResult.success ? etherstubsResult.data : etherstubsResult,
        aggregatesResult: aggregatesResult.success ? aggregatesResult.data : aggregatesResult,
        bridgesResult: bridgesResult.success ? bridgesResult.data : bridgesResult,
      });

      const availableOptions = [];

      // Add ALL physical links from monitoring/network/interfaces
      if (linksResult.success && linksResult.data?.interfaces) {
        linksResult.data.interfaces.forEach(link => {
          // Include all physical interfaces
          if (link.class === 'phys' || link.link) {
            availableOptions.push({
              name: link.link,
              type: 'Physical',
              state: link.state || 'unknown',
              speed: link.speed || 'unknown',
            });
          }
        });
      }

      // Add etherstubs
      if (etherstubsResult.success && etherstubsResult.data?.etherstubs) {
        etherstubsResult.data.etherstubs.forEach(etherstub => {
          availableOptions.push({
            name: etherstub.name,
            type: 'Etherstub',
            state: 'up',
          });
        });
      }

      // Add aggregates
      if (aggregatesResult.success && aggregatesResult.data?.aggregates) {
        aggregatesResult.data.aggregates.forEach(aggregate => {
          availableOptions.push({
            name: aggregate.name,
            type: 'Aggregate',
            state: aggregate.state || 'unknown',
            policy: aggregate.policy,
          });
        });
      }

      // Add bridges
      if (bridgesResult.success && bridgesResult.data?.bridges) {
        bridgesResult.data.bridges.forEach(bridge => {
          availableOptions.push({
            name: bridge.name,
            type: 'Bridge',
            state: bridge.state || 'unknown',
            protection: bridge.protection,
          });
        });
      }

      // Deduplicate by name and filter out empty names
      const uniqueOptions = availableOptions
        .filter(option => option.name && option.name.trim())
        .filter((option, index, self) => index === self.findIndex(o => o.name === option.name));

      console.log('VNIC Available Links:', uniqueOptions);
      setAvailableLinks(uniqueOptions);
    } catch (err) {
      console.error('Error loading available links:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, [server, makeAgentRequest]);

  const generateVnicName = useCallback(async () => {
    if (!formData.link) {
      return;
    }

    try {
      // Get existing VNICs to check for conflicts
      const vnicsResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/vnics',
        'GET'
      );

      const existingVnics = vnicsResult.success ? vnicsResult.data?.vnics || [] : [];
      const existingNames = new Set(existingVnics.map(vnic => vnic.link).filter(Boolean));

      // Generate unique name following your convention: vnic_<random_4digit>_<sequence>
      let attempts = 0;
      let suggestedName = '';

      do {
        // Generate random 4-digit number (1000-9999)
        const random4Digit = Math.floor(Math.random() * 9000) + 1000;

        // Build base pattern with random 4-digit number
        const basePattern = `vnic_${random4Digit}_`;

        // Find next available sequence number for this 4-digit number
        let sequence = 0;
        const existingWithPattern = existingVnics.filter(
          vnic => vnic.link && vnic.link.startsWith(basePattern)
        );

        if (existingWithPattern.length > 0) {
          const sequences = existingWithPattern.map(vnic => {
            const parts = vnic.link.split('_');
            const lastPart = parts[parts.length - 1];
            return parseInt(lastPart) || 0;
          });
          sequence = Math.max(...sequences) + 1;
        }

        suggestedName = `${basePattern}${sequence}`;
        attempts++;

        // Safety valve to prevent infinite loop
      } while (existingNames.has(suggestedName) && attempts < 100);

      setFormData(prev => ({
        ...prev,
        name: suggestedName,
      }));
    } catch (err) {
      console.error('Error generating VNIC name:', err);
      // Fallback to simple naming with random 4-digit
      const random4Digit = Math.floor(Math.random() * 9000) + 1000;
      const fallbackName = `vnic_${random4Digit}_0`;
      setFormData(prev => ({
        ...prev,
        name: fallbackName,
      }));
    }
  }, [formData.link, server, makeAgentRequest]);

  // Load available links when modal opens
  useEffect(() => {
    loadAvailableLinks();
  }, [loadAvailableLinks]);

  // Auto-generate VNIC name when link or VLAN changes
  useEffect(() => {
    if (formData.link) {
      generateVnicName();
    }
  }, [formData.link, formData.vlan_id, generateVnicName]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addProperty = (key, value) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [key]: value,
      },
    }));
  };

  const removeProperty = key => {
    setFormData(prev => {
      const newProperties = { ...prev.properties };
      delete newProperties[key];
      return {
        ...prev,
        properties: newProperties,
      };
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      onError('VNIC name is required');
      return false;
    }

    if (!formData.link.trim()) {
      onError('Physical link is required');
      return false;
    }

    // Validate VNIC name format
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!nameRegex.test(formData.name)) {
      onError(
        'VNIC name must start with a letter and contain only letters, numbers, and underscores'
      );
      return false;
    }

    // Validate VLAN ID if provided
    if (formData.vlan_id) {
      const vlanId = parseInt(formData.vlan_id);
      if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
        onError('VLAN ID must be between 1 and 4094');
        return false;
      }
    }

    // Validate MAC address if provided
    if (formData.mac_address) {
      const macRegex = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
      if (!macRegex.test(formData.mac_address)) {
        onError('Invalid MAC address format (must be XX:XX:XX:XX:XX:XX)');
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
        name: formData.name.trim(),
        link: formData.link.trim(),
        temporary: formData.temporary,
      };

      // Add optional fields
      if (formData.vlan_id) {
        requestData.vlan_id = parseInt(formData.vlan_id);
      }

      if (formData.mac_address) {
        requestData.mac_address = formData.mac_address.trim();
      }

      // Add properties
      if (Object.keys(formData.properties).length > 0) {
        requestData.properties = formData.properties;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/vnics',
        'POST',
        requestData
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Failed to create VNIC');
      }
    } catch (err) {
      onError(`Error creating VNIC: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create VNIC"
      icon="fas fa-plus-circle"
      submitText="Create VNIC"
      submitVariant="is-primary"
      loading={creating}
    >
      <VnicBasicFields
        name={formData.name}
        link={formData.link}
        availableLinks={availableLinks}
        loadingLinks={loadingLinks}
        onChange={handleInputChange}
        disabled={creating}
      />

      <VnicOptionalFields
        vlanId={formData.vlan_id}
        macAddress={formData.mac_address}
        onChange={handleInputChange}
        disabled={creating}
      />

      <VnicPropertiesFields
        properties={formData.properties}
        onAddProperty={addProperty}
        onRemoveProperty={removeProperty}
        disabled={creating}
      />

      <VnicOptionsFields
        temporary={formData.temporary}
        onChange={handleInputChange}
        disabled={creating}
      />
    </FormModal>
  );
};

VnicCreateModal.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default VnicCreateModal;
