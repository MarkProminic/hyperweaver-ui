import axios from 'axios';
import { useCallback } from 'react';

import { processConfig } from '../utils/settingsUtils';

const useSettingsAPI = ({
  setSections,
  setValues,
  setMsg,
  setLoading,
  setRequiresRestart,
  setServers,
  setBackups,
  setUploadingFiles,
  setSslFiles,
  handleFieldChange,
  values,
  serverContext,
}) => {
  const loadServers = useCallback(async () => {
    try {
      const response = await axios.get('/api/servers?includeApiKeys=true');
      if (response.data.success) {
        setServers(response.data.servers);
      } else {
        const serverList = serverContext.getServers();
        setServers(serverList);
      }
    } catch (error) {
      console.warn('Failed to load servers with API keys, using fallback:', error.message);
      const serverList = serverContext.getServers();
      setServers(serverList);
    }
  }, [serverContext, setServers]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings');

      if (response.data.success) {
        const { extractedValues, organizedSections } = processConfig(response.data.config);
        setValues(extractedValues);
        setSections(organizedSections);
      } else {
        setMsg(`Failed to load settings: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMsg(`Error loading settings: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setValues, setSections, setMsg]);

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/backups');

      if (response.data.success) {
        setBackups(response.data.backups);
      } else {
        setMsg(`Failed to load backups: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      setMsg(`Error loading backups: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setBackups, setMsg]);

  const handleSaveSettings = useCallback(async () => {
    setLoading(true);
    setMsg('');
    setRequiresRestart(false);

    try {
      const response = await axios.put('/api/settings', values);

      if (response.data.success) {
        setMsg(response.data.message);
        setRequiresRestart(response.data.requiresRestart);
        await loadSettings();
      } else {
        setMsg(`Failed to save settings: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMsg(`Error saving settings: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMsg, setRequiresRestart, values, loadSettings]);

  const monitorServerRestart = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 3000;

    const checkHealth = async () => {
      attempts++;

      try {
        setMsg(`Checking server health... (${attempts}/${maxAttempts})`);

        const response = await axios.get('/api/health', {
          timeout: 5000,
        });

        if (response.data.success && response.data.status === 'healthy') {
          setMsg('Server restart completed successfully! Reloading page...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (error) {
        console.log(`Health check attempt ${attempts} failed:`, error.message);
      }

      if (attempts >= maxAttempts) {
        setMsg('Server restart timeout. Please refresh the page manually.');
        setLoading(false);
        return;
      }

      setTimeout(checkHealth, checkInterval);
    };

    await checkHealth();
  }, [setMsg, setLoading]);

  const executeServerRestart = useCallback(async () => {
    try {
      setLoading(true);
      setMsg('Initiating server restart...');

      const response = await axios.post('/api/settings/restart');

      if (response.data.success) {
        setMsg('Server restart initiated. Monitoring server health...');
        setTimeout(() => {
          monitorServerRestart();
        }, 3000);
      } else {
        setMsg(`Failed to restart server: ${response.data.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error restarting server:', error);
      setMsg(`Error restarting server: ${error.response?.data?.message || error.message}`);
      setLoading(false);
    }
  }, [setLoading, setMsg, monitorServerRestart]);

  const createBackup = useCallback(async () => {
    try {
      setLoading(true);
      setMsg('Creating backup...');

      await handleSaveSettings();
      await loadBackups();
      setMsg('Backup created successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
      setMsg(`Error creating backup: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMsg, handleSaveSettings, loadBackups]);

  const handleSslFileUpload = useCallback(
    async (fieldPath, file) => {
      if (!file) {
        return;
      }

      setUploadingFiles(prev => ({ ...prev, [fieldPath]: true }));

      try {
        const formData = new FormData();
        formData.append('sslFile', file);
        formData.append('fieldPath', fieldPath);

        const response = await axios.post('/api/settings/ssl/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          handleFieldChange(fieldPath, response.data.filePath);
          setSslFiles(prev => ({
            ...prev,
            [fieldPath]: {
              name: file.name,
              size: file.size,
              uploadedPath: response.data.filePath,
            },
          }));
          setMsg(`SSL certificate uploaded successfully: ${file.name}`);
        } else {
          setMsg(`Failed to upload SSL certificate: ${response.data.message}`);
        }
      } catch (error) {
        console.error('SSL file upload error:', error);
        setMsg(
          `Error uploading SSL certificate: ${error.response?.data?.message || error.message}`
        );
      } finally {
        setUploadingFiles(prev => ({ ...prev, [fieldPath]: false }));
      }
    },
    [setUploadingFiles, handleFieldChange, setSslFiles, setMsg]
  );

  return {
    loadServers,
    loadSettings,
    loadBackups,
    handleSaveSettings,
    monitorServerRestart,
    executeServerRestart,
    createBackup,
    handleSslFileUpload,
  };
};

export default useSettingsAPI;
