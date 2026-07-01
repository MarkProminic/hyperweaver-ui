import { useState, useEffect, useCallback } from 'react';

import { getServiceType } from '../components/Host/SyslogConfiguration/syslogUtils';
import { useServers } from '../contexts/ServerContext';

/**
 * Custom hook for syslog configuration state management and API handlers
 * @param {object} server - The server object to manage syslog for
 * @returns {object} All state and handler functions
 */
export const useSyslogData = server => {
  const [config, setConfig] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [configContent, setConfigContent] = useState('');
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [activeView, setActiveView] = useState('current');
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState(null);

  // Rule builder state
  const [ruleBuilder, setRuleBuilder] = useState({
    facility: '*',
    level: 'info',
    action_type: 'file',
    action_target: '/var/log/custom.log',
    remote_protocol: 'udp',
    remote_port: '',
    multiple_users: false,
    user_list: '',
  });

  const { makeAgentRequest } = useServers();

  /**
   * Load syslog configuration from the API
   * @param {boolean} clearMessage - Whether to clear existing messages
   */
  const loadSyslogConfig = useCallback(
    async (clearMessage = true) => {
      if (!server || !makeAgentRequest) {
        return;
      }

      try {
        setLoading(true);
        if (clearMessage) {
          setMessage('');
        }

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'system/syslog/config',
          'GET'
        );

        if (result.success) {
          setConfig(result.data);
          setConfigContent(result.data?.config_content || '');
        } else {
          setMessage(result.message || 'Failed to load syslog configuration');
          setMessageType('alert-danger');
          setConfig(null);
          setConfigContent('');
        }
      } catch (err) {
        setMessage(`Error loading syslog configuration: ${err.message}`);
        setMessageType('alert-danger');
        setConfig(null);
        setConfigContent('');
      } finally {
        setLoading(false);
      }
    },
    [server, makeAgentRequest]
  );

  /**
   * Load available syslog facilities from the API
   */
  const loadFacilities = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/syslog/facilities',
        'GET'
      );

      if (result.success) {
        setFacilities(result.data);
      }
    } catch (err) {
      console.error('Error loading facilities:', err);
    }
  }, [server, makeAgentRequest]);

  // Load configuration on component mount
  useEffect(() => {
    if (server) {
      loadSyslogConfig();
      loadFacilities();
    }
  }, [server, loadSyslogConfig, loadFacilities]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (message && (messageType === 'alert-success' || messageType === 'alert-warning')) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, messageType]);

  /**
   * Validate the current configuration content
   */
  const validateConfiguration = async () => {
    if (!server || !configContent.trim()) {
      setMessage('Please enter configuration content to validate.');
      setMessageType('alert-warning');
      return;
    }

    try {
      setValidationLoading(true);
      setMessage('Validating syslog configuration...');
      setMessageType('alert-info');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/syslog/validate',
        'POST',
        { config_content: configContent }
      );

      setValidation(result.data);

      if (result.data?.valid) {
        setMessage('Configuration validation passed! No syntax errors found.');
        setMessageType('alert-success');
      } else {
        setMessage(
          `Configuration validation found ${result.data?.errors?.length || 0} error(s) and ${result.data?.warnings?.length || 0} warning(s).`
        );
        setMessageType('alert-warning');
      }
    } catch (error) {
      console.error('Error validating syslog configuration:', error);
      setMessage(`Validation failed: ${error.response?.data?.message || error.message}`);
      setMessageType('alert-danger');
      setValidation(null);
    } finally {
      setValidationLoading(false);
    }
  };

  /**
   * Apply the current configuration content to the server
   */
  const applyConfiguration = async () => {
    if (!server || !configContent.trim()) {
      setMessage('Please enter configuration content to apply.');
      setMessageType('alert-warning');
      return;
    }

    try {
      setLoading(true);
      setMessage('Applying syslog configuration...');
      setMessageType('alert-info');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/syslog/config',
        'PUT',
        {
          config_content: configContent,
          backup_existing: true,
          reload_service: true,
        }
      );

      if (result.success) {
        setMessage(`Syslog configuration updated successfully! ${result.data?.message || ''}`);
        setMessageType('alert-success');

        // Reload current configuration without clearing success message
        await loadSyslogConfig(false);
      } else {
        setMessage(`Failed to apply configuration: ${result.message}`);
        setMessageType('alert-danger');
      }
    } catch (error) {
      console.error('Error applying syslog configuration:', error);
      setMessage(
        `Failed to apply configuration: ${error.response?.data?.message || error.message}`
      );
      setMessageType('alert-danger');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reload the syslog service
   */
  const reloadSyslog = async () => {
    if (!server) {
      return;
    }

    try {
      setLoading(true);
      setMessage('Reloading syslog service...');
      setMessageType('alert-info');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/syslog/reload',
        'POST'
      );

      if (result.success) {
        setMessage(`Syslog service reloaded successfully! ${result.data?.message || ''}`);
        setMessageType('alert-success');

        // Reload configuration to get updated service status
        await loadSyslogConfig(false);
      } else {
        setMessage(`Failed to reload syslog service: ${result.message}`);
        setMessageType('alert-danger');
      }
    } catch (error) {
      console.error('Error reloading syslog service:', error);
      setMessage(
        `Failed to reload syslog service: ${error.response?.data?.message || error.message}`
      );
      setMessageType('alert-danger');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request switching between syslog and rsyslog services (opens confirmation)
   * @param {string} targetService - Target service name
   */
  const requestSwitchService = targetService => {
    if (!server) {
      return;
    }
    setPendingSwitchTarget(targetService);
  };

  /**
   * Confirm and execute the service switch
   */
  const confirmSwitchService = async () => {
    const targetService = pendingSwitchTarget;
    setPendingSwitchTarget(null);

    if (!targetService) {
      return;
    }

    try {
      setLoading(true);
      setMessage(`Switching to ${targetService}...`);
      setMessageType('alert-info');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/syslog/switch',
        'POST',
        { target: targetService }
      );

      if (result.success) {
        setMessage(
          `Successfully switched to ${targetService}! Logging service has been restarted.`
        );
        setMessageType('alert-success');

        // Reload configuration to show new service
        await loadSyslogConfig(false);
      } else {
        setMessage(`Failed to switch service: ${result.message}`);
        setMessageType('alert-danger');
      }
    } catch (error) {
      console.error('Error switching syslog service:', error);
      setMessage(`Failed to switch service: ${error.response?.data?.message || error.message}`);
      setMessageType('alert-danger');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel the pending service switch
   */
  const cancelSwitchService = () => {
    setPendingSwitchTarget(null);
  };

  /**
   * Add a rule from the rule builder to the configuration content
   */
  const addRule = () => {
    const serviceType = getServiceType(config);

    let action;
    if (ruleBuilder.action_type === 'file') {
      action = ruleBuilder.action_target;
    } else if (ruleBuilder.action_type === 'remote_host') {
      action = `@${ruleBuilder.action_target}`;
    } else if (ruleBuilder.action_type === 'all_users') {
      action = serviceType.name === 'rsyslog' ? ':omusrmsg:*' : '*';
    } else if (ruleBuilder.action_type === 'user') {
      action =
        serviceType.name === 'rsyslog'
          ? `:omusrmsg:${ruleBuilder.action_target}`
          : ruleBuilder.action_target;
    } else {
      action = ruleBuilder.action_target;
    }

    const rule = `${ruleBuilder.facility}.${ruleBuilder.level}\t\t\t${action}`;

    setConfigContent(prev => `${prev}\n${rule}`);

    // Reset rule builder
    setRuleBuilder({
      facility: '*',
      level: 'info',
      action_type: 'file',
      action_target: '/var/log/custom.log',
    });
  };

  /**
   * Update a field in the rule builder state
   * @param {string} field - Field name to update
   * @param {*} value - New value
   */
  const handleRuleBuilderChange = (field, value) => {
    setRuleBuilder(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return {
    // State
    config,
    facilities,
    configContent,
    setConfigContent,
    validation,
    loading,
    validationLoading,
    message,
    setMessage,
    messageType,
    activeView,
    setActiveView,
    ruleBuilder,
    pendingSwitchTarget,
    // Handlers
    loadSyslogConfig,
    validateConfiguration,
    applyConfiguration,
    reloadSyslog,
    requestSwitchService,
    confirmSwitchService,
    cancelSwitchService,
    addRule,
    handleRuleBuilderChange,
  };
};
