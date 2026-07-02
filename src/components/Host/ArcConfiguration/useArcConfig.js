import { useCallback, useEffect, useState } from 'react';

import { makeAgentRequest } from '../../../api/serverUtils';

import { bytesToGb } from './arcUtils';

export const useArcConfig = server => {
  const [currentConfig, setCurrentConfig] = useState(null);
  const [formData, setFormData] = useState({
    arc_max_gb: '',
    arc_min_gb: '',
    arc_max_percent: '',
    user_reserve_hint_pct: '',
    arc_meta_limit_gb: '',
    arc_meta_min_gb: '',
    vdev_max_pending: '',
    prefetch_disable: false,
    apply_method: 'persistent',
  });
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadArcConfig = useCallback(
    async (clearMessage = true) => {
      if (!server) {
        return;
      }

      try {
        setLoading(true);
        if (clearMessage) {
          setMessage('');
        }

        const response = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'system/zfs/arc/config'
        );

        if (!response.success) {
          throw new Error(response.message);
        }

        if (response.data) {
          setCurrentConfig(response.data);

          if (response.data.available_tunables) {
            const tunables = response.data.available_tunables;

            setFormData({
              arc_max_gb: tunables.zfs_arc_max?.effective_value
                ? bytesToGb(tunables.zfs_arc_max.effective_value)
                : '',
              arc_min_gb: tunables.zfs_arc_min?.effective_value
                ? bytesToGb(tunables.zfs_arc_min.effective_value)
                : '',
              arc_max_percent: tunables.zfs_arc_max_percent?.effective_value || '',
              user_reserve_hint_pct: tunables.user_reserve_hint_pct?.effective_value || '',
              arc_meta_limit_gb: tunables.zfs_arc_meta_limit?.effective_value
                ? bytesToGb(tunables.zfs_arc_meta_limit.effective_value)
                : '',
              arc_meta_min_gb: tunables.zfs_arc_meta_min?.effective_value
                ? bytesToGb(tunables.zfs_arc_meta_min.effective_value)
                : '',
              vdev_max_pending: tunables.zfs_vdev_max_pending?.effective_value || '',
              prefetch_disable: tunables.zfs_prefetch_disable?.effective_value === 1,
              apply_method: 'persistent',
            });
          }
        }
      } catch (error) {
        console.error('Error loading ARC configuration:', error);
        setMessage(
          `Failed to load ARC configuration: ${error.response?.data?.message || error.message}`
        );
        setMessageType('alert-danger');
      } finally {
        setLoading(false);
      }
    },
    [server]
  );

  // Load current ARC configuration
  useEffect(() => {
    if (server) {
      loadArcConfig();
    }
  }, [server, loadArcConfig]);

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

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setValidation(null);
  };

  const validateConfiguration = async () => {
    if (!server || (!formData.arc_max_gb && !formData.arc_min_gb)) {
      setMessage('Please enter ARC max or min values to validate.');
      setMessageType('alert-warning');
      return;
    }

    try {
      setValidationLoading(true);
      setMessage('Validating configuration...');
      setMessageType('alert-info');

      const payload = {};
      if (formData.arc_max_gb) {
        payload.arc_max_gb = parseFloat(formData.arc_max_gb);
      }
      if (formData.arc_min_gb) {
        payload.arc_min_gb = parseFloat(formData.arc_min_gb);
      }

      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/zfs/arc/validate',
        'POST',
        payload
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      setValidation(response.data);

      if (response.data.valid) {
        setMessage('Configuration validation passed! Settings are within safe limits.');
        setMessageType('alert-success');
      } else {
        setMessage('Configuration validation found issues. Please review the warnings below.');
        setMessageType('alert-warning');
      }
    } catch (error) {
      console.error('Error validating ARC configuration:', error);
      setMessage(`Validation failed: ${error.response?.data?.message || error.message}`);
      setMessageType('alert-danger');
      setValidation(null);
    } finally {
      setValidationLoading(false);
    }
  };

  const applyConfiguration = async () => {
    const hasAnySettings =
      formData.arc_max_gb ||
      formData.arc_min_gb ||
      formData.arc_max_percent ||
      formData.user_reserve_hint_pct ||
      formData.vdev_max_pending ||
      formData.prefetch_disable;

    if (!server || !hasAnySettings) {
      setMessage('Please configure at least one ZFS parameter to apply changes.');
      setMessageType('alert-warning');
      return;
    }

    try {
      setLoading(true);
      setMessage('Applying ZFS configuration...');
      setMessageType('alert-info');

      const payload = {
        apply_method: formData.apply_method,
      };

      if (formData.arc_max_gb) {
        payload.arc_max_gb = parseFloat(formData.arc_max_gb);
      }
      if (formData.arc_min_gb) {
        payload.arc_min_gb = parseFloat(formData.arc_min_gb);
      }
      if (formData.arc_max_percent) {
        payload.arc_max_percent = parseInt(formData.arc_max_percent);
      }
      if (formData.user_reserve_hint_pct) {
        payload.user_reserve_hint_pct = parseInt(formData.user_reserve_hint_pct);
      }
      if (formData.arc_meta_limit_gb) {
        payload.arc_meta_limit_gb = parseFloat(formData.arc_meta_limit_gb);
      }
      if (formData.arc_meta_min_gb) {
        payload.arc_meta_min_gb = parseFloat(formData.arc_meta_min_gb);
      }

      if (formData.vdev_max_pending) {
        payload.vdev_max_pending = parseInt(formData.vdev_max_pending);
      }
      payload.prefetch_disable = formData.prefetch_disable;

      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/zfs/arc/config',
        'PUT',
        payload
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      if (response.data.success) {
        setMessage(`ZFS configuration updated successfully! ${response.data.message}`);
        setMessageType('alert-success');

        if (response.data.results?.reboot_required) {
          setMessage(
            prev => `${prev} Note: System reboot required for persistent changes to take effect.`
          );
          setMessageType('alert-warning');
        }

        await loadArcConfig(false);
      } else {
        setMessage(`Failed to apply configuration: ${response.data.message}`);
        setMessageType('alert-danger');
      }
    } catch (error) {
      console.error('Error applying ZFS configuration:', error);
      setMessage(
        `Failed to apply configuration: ${error.response?.data?.message || error.message}`
      );
      setMessageType('alert-danger');
    } finally {
      setLoading(false);
    }
  };

  const requestResetToDefaults = () => {
    if (server) {
      setShowResetConfirm(true);
    }
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  const confirmResetToDefaults = async () => {
    setShowResetConfirm(false);

    if (!server) {
      return;
    }

    try {
      setLoading(true);
      setMessage('Resetting ARC configuration to defaults...');
      setMessageType('alert-info');

      const response = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/zfs/arc/reset',
        'POST',
        { apply_method: formData.apply_method }
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      if (response.data.success) {
        setMessage(`ARC configuration reset to defaults successfully! ${response.data.message}`);
        setMessageType('alert-success');

        setFormData({
          arc_max_gb: '',
          arc_min_gb: '',
          arc_max_percent: '',
          user_reserve_hint_pct: '',
          arc_meta_limit_gb: '',
          arc_meta_min_gb: '',
          vdev_max_pending: '',
          prefetch_disable: false,
          apply_method: 'persistent',
        });
        setValidation(null);
        await loadArcConfig();
      } else {
        setMessage(`Failed to reset configuration: ${response.data.message}`);
        setMessageType('alert-danger');
      }
    } catch (error) {
      console.error('Error resetting ARC configuration:', error);
      setMessage(
        `Failed to reset configuration: ${error.response?.data?.message || error.message}`
      );
      setMessageType('alert-danger');
    } finally {
      setLoading(false);
    }
  };

  return {
    currentConfig,
    formData,
    validation,
    loading,
    validationLoading,
    message,
    setMessage,
    messageType,
    handleFormChange,
    validateConfiguration,
    applyConfiguration,
    showResetConfirm,
    requestResetToDefaults,
    cancelReset,
    confirmResetToDefaults,
  };
};
