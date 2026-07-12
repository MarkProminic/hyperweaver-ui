import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

import AggregateCreateForm from './AggregateCreateForm';

const AggregateCreateModal = ({
  server,
  existingAggregates,
  cdpServiceRunning,
  onClose,
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    links: [],
    policy: 'L4',
    lacp_mode: 'off',
    lacp_timer: 'short',
    unicast_address: '',
    temporary: false,
    disableCdp: false,
  });
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [availableLinks, setAvailableLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const { makeAgentRequest } = useServers();

  const generateNextAggregateName = useCallback(() => {
    if (!existingAggregates) {
      return 'aggr0';
    }

    const existingNumbers = existingAggregates
      .map(agg => agg.name || agg.link)
      .filter(name => name && name.startsWith('aggr'))
      .map(name => {
        const match = name.match(/^aggr(?:\d+)$/);
        return match ? parseInt(name.slice(4), 10) : -1;
      })
      .filter(num => num >= 0)
      .sort((a, b) => a - b);

    let nextNumber = 0;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    return `aggr${nextNumber}`;
  }, [existingAggregates]);

  const loadAvailableLinks = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoadingLinks(true);

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'monitoring/network/interfaces',
        'GET'
      );

      if (result.success && result.data?.interfaces) {
        const physicalLinks = result.data.interfaces.filter(
          link => link.class === 'phys' || (link.link && link.class !== 'vnic')
        );

        const uniqueLinks = physicalLinks.filter(
          (link, index, self) => index === self.findIndex(l => l.link === link.link)
        );

        setAvailableLinks(uniqueLinks);
      }
    } catch (err) {
      void err;
    } finally {
      setLoadingLinks(false);
    }
  }, [server, makeAgentRequest]);

  useEffect(() => {
    loadAvailableLinks();

    const defaultName = generateNextAggregateName();
    setFormData(prev => ({
      ...prev,
      name: defaultName,
    }));
  }, [server, existingAggregates, loadAvailableLinks, generateNextAggregateName]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addLink = () => {
    if (newLink.trim() && !formData.links.includes(newLink.trim())) {
      setFormData(prev => ({
        ...prev,
        links: [...prev.links, newLink.trim()],
      }));
      setNewLink('');
    }
  };

  const removeLink = linkToRemove => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter(link => link !== linkToRemove),
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      onError('Aggregate name is required');
      return false;
    }

    if (formData.links.length === 0) {
      onError('At least one link is required');
      return false;
    }

    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!nameRegex.test(formData.name)) {
      onError(
        'Aggregate name must start with a letter and contain only letters, numbers, and underscores'
      );
      return false;
    }

    if (formData.unicast_address) {
      const macRegex = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
      if (!macRegex.test(formData.unicast_address)) {
        onError('Invalid MAC address format (must be XX:XX:XX:XX:XX:XX)');
        return false;
      }
    }

    return true;
  };

  const disableCdpService = async () => {
    setCurrentStep('Disabling CDP service...');

    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'services/action',
      'POST',
      {
        action: 'disable',
        fmri: 'svc:/network/cdp:default',
      }
    );

    if (!result.success) {
      throw new Error(result.message || 'Failed to disable CDP service');
    }

    return result;
  };

  const createAggregate = async () => {
    setCurrentStep('Creating link aggregate...');

    const requestData = {
      name: formData.name.trim(),
      links: formData.links,
      policy: formData.policy,
      lacp_mode: formData.lacp_mode,
      lacp_timer: formData.lacp_timer,
      temporary: formData.temporary,
    };

    if (formData.unicast_address.trim()) {
      requestData.unicast_address = formData.unicast_address.trim();
    }

    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'network/aggregates',
      'POST',
      requestData
    );

    if (!result.success) {
      throw new Error(result.message || 'Failed to create link aggregate');
    }

    return result;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (cdpServiceRunning && !formData.disableCdp) {
      onError('CDP service is running. Please check "Disable CDP service" to proceed.');
      return;
    }

    try {
      setCreating(true);
      onError('');
      setCurrentStep('');

      if (cdpServiceRunning && formData.disableCdp) {
        await disableCdpService();
      }

      await createAggregate();

      setCurrentStep('Aggregate created successfully!');
      onSuccess();
    } catch (err) {
      onError(`${currentStep ? `${currentStep.replace('...', '')}: ` : ''}${err.message}`);
    } finally {
      setCreating(false);
      setCurrentStep('');
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create Aggregate"
      icon="fas fa-plus-circle"
      submitText="Create Aggregate"
      submitVariant="is-primary"
      loading={creating}
      additionalActions={
        currentStep && (
          <div>
            <p className="text-info">
              <i className="fas fa-spinner fa-spin me-1" />
              {currentStep}
            </p>
          </div>
        )
      }
    >
      <AggregateCreateForm
        formData={formData}
        creating={creating}
        newLink={newLink}
        setNewLink={setNewLink}
        availableLinks={availableLinks}
        loadingLinks={loadingLinks}
        onInputChange={handleInputChange}
        onAddLink={addLink}
        onRemoveLink={removeLink}
        cdpServiceRunning={cdpServiceRunning}
      />
    </FormModal>
  );
};

AggregateCreateModal.propTypes = {
  server: PropTypes.object.isRequired,
  existingAggregates: PropTypes.array,
  cdpServiceRunning: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default AggregateCreateModal;
