import axios from 'axios';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        setMsg({
          text: t('settings.settingsApi.loadFailed', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMsg({
        text: t('settings.settingsApi.loadError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setValues, setSections, setMsg, t]);

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/backups');

      if (response.data.success) {
        setBackups(response.data.backups);
      } else {
        setMsg({
          text: t('settings.settingsApi.backupsLoadFailed', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      setMsg({
        text: t('settings.settingsApi.backupsLoadError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setBackups, setMsg, t]);

  const handleSaveSettings = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    setRequiresRestart(false);

    try {
      const response = await axios.put('/api/settings', values);

      if (response.data.success) {
        setMsg({
          text: response.data.message || t('settings.settingsApi.saved'),
          variant: 'success',
        });
        setRequiresRestart(response.data.requiresRestart);
        await loadSettings();
      } else {
        setMsg({
          text: t('settings.settingsApi.saveFailed', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMsg({
        text: t('settings.settingsApi.saveError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMsg, setRequiresRestart, values, loadSettings, t]);

  const monitorServerRestart = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 3000;

    const checkHealth = async () => {
      attempts++;

      try {
        setMsg({
          text: t('settings.settingsApi.checkingHealth', { attempts, max: maxAttempts }),
          variant: 'info',
        });

        const response = await axios.get('/api/health', {
          timeout: 5000,
        });

        if (response.data.success && response.data.status === 'healthy') {
          setMsg({ text: t('settings.settingsApi.restartComplete'), variant: 'success' });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      } catch (error) {
        console.log(`Health check attempt ${attempts} failed:`, error.message);
      }

      if (attempts >= maxAttempts) {
        setMsg({ text: t('settings.settingsApi.restartTimeout'), variant: 'danger' });
        setLoading(false);
        return;
      }

      setTimeout(checkHealth, checkInterval);
    };

    await checkHealth();
  }, [setMsg, setLoading, t]);

  const executeServerRestart = useCallback(async () => {
    try {
      setLoading(true);
      setMsg({ text: t('settings.settingsApi.restartInitiating'), variant: 'info' });

      const response = await axios.post('/api/settings/restart');

      if (response.data.success) {
        setMsg({ text: t('settings.settingsApi.restartMonitoring'), variant: 'info' });
        setTimeout(() => {
          monitorServerRestart();
        }, 3000);
      } else {
        setMsg({
          text: t('settings.settingsApi.restartFailed', { message: response.data.message }),
          variant: 'danger',
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error restarting server:', error);
      setMsg({
        text: t('settings.settingsApi.restartError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
      setLoading(false);
    }
  }, [setLoading, setMsg, monitorServerRestart, t]);

  const createBackup = useCallback(async () => {
    try {
      setLoading(true);
      setMsg({ text: t('settings.settingsApi.backupCreating'), variant: 'info' });

      await handleSaveSettings();
      await loadBackups();
      setMsg({ text: t('settings.settingsApi.backupCreated'), variant: 'success' });
    } catch (error) {
      console.error('Error creating backup:', error);
      setMsg({
        text: t('settings.settingsApi.backupError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, setMsg, handleSaveSettings, loadBackups, t]);

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
          setMsg({
            text: t('settings.settingsApi.sslUploaded', { name: file.name }),
            variant: 'success',
          });
        } else {
          setMsg({
            text: t('settings.settingsApi.sslUploadFailed', { message: response.data.message }),
            variant: 'danger',
          });
        }
      } catch (error) {
        console.error('SSL file upload error:', error);
        setMsg({
          text: t('settings.settingsApi.sslUploadError', {
            error: error.response?.data?.message || error.message,
          }),
          variant: 'danger',
        });
      } finally {
        setUploadingFiles(prev => ({ ...prev, [fieldPath]: false }));
      }
    },
    [setUploadingFiles, handleFieldChange, setSslFiles, setMsg, t]
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
