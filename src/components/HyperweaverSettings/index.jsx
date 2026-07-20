import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useServers } from '../../contexts/ServerContext';
import useSettingsAPI from '../../hooks/useSettingsAPI';
import useSettingsState from '../../hooks/useSettingsState';
import { canManageSettings } from '../../utils/permissions';
import { ConfirmModal } from '../common';

import BackupManager from './BackupManager';
import ServerManagementTab from './ServerManagementTab';
import SettingsContent from './SettingsContent';
import TestingPanel from './TestingPanel';

/**
 * HyperweaverSettings - Main orchestrator for Hyperweaver system settings
 * Manages configuration, servers, backups, and testing functionality
 */
const HyperweaverSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const serverContext = useServers();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Get all state from the custom hook
  const state = useSettingsState();
  const {
    core: {
      activeTab,
      setActiveTab,
      sections,
      setSections,
      values,
      setValues,
      msg,
      setMsg,
      loading,
      setLoading,
      requiresRestart,
      setRequiresRestart,
    },
    ui: { collapsedSubsections, setCollapsedSubsections },
    ssl: { sslFiles, setSslFiles, uploadingFiles, setUploadingFiles },
    backup: { backups, setBackups, showBackupModal, setShowBackupModal },
    testing: {
      testResults,
      setTestResults,
      testLoading,
      setTestLoading,
      testEmail,
      setTestEmail,
      ldapTestCredentials,
      setLdapTestCredentials,
    },
    server: {
      servers,
      setServers,
      showAddForm,
      setShowAddForm,
      hostname,
      setHostname,
      port,
      setPort,
      protocol,
      setProtocol,
      entityName,
      setEntityName,
      apiKey,
      setApiKey,
      useExistingApiKey,
      setUseExistingApiKey,
      testResult,
      setTestResult,
    },
  } = state;

  // Handle field value changes
  const handleFieldChange = useCallback(
    (fieldPath, value) => {
      setValues(prev => ({
        ...prev,
        [fieldPath]: value,
      }));
    },
    [setValues]
  );

  // Get API handlers from custom hook
  const {
    loadServers,
    loadSettings,
    loadBackups,
    handleSaveSettings,
    executeServerRestart: executeRestart,
    createBackup,
    handleSslFileUpload,
  } = useSettingsAPI({
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
  });

  // Load settings and servers on mount
  useEffect(() => {
    if (user && canManageSettings(user.role)) {
      loadSettings();
      loadServers();
    }
  }, [user, loadSettings, loadServers]);

  // Load servers when allServers changes
  useEffect(() => {
    if (user && canManageSettings(user.role)) {
      loadServers();
    }
  }, [serverContext.servers, user, loadServers]);

  // Show restart confirmation dialog
  const handleRestartServer = useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  // Open backup modal handler
  const handleOpenBackupModal = useCallback(async () => {
    await loadBackups();
    setShowBackupModal(true);
  }, [loadBackups, setShowBackupModal]);

  // Handle URL parameter for direct tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      if (tab === 'servers') {
        setShowAddForm(true);
      }
      setSearchParams({});
    } else if (!activeTab && Object.keys(sections).length > 0) {
      setActiveTab(Object.keys(sections)[0]);
    }
  }, [searchParams, setSearchParams, sections, activeTab, setActiveTab, setShowAddForm]);

  // Check permissions
  if (!user || !canManageSettings(user.role)) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('settings.hyperweaverSettings.pageTitleDenied')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>{t('settings.hyperweaverSettings.accessDeniedTitle')}</strong>
            </div>
            <div className="card-body">
              <div className="alert alert-danger mb-0">
                <h2 className="fs-4 fw-bold">
                  {t('settings.hyperweaverSettings.superAdminRequired')}
                </h2>
                <p>{t('settings.hyperweaverSettings.superAdminOnly')}</p>
                <p className="mt-2">
                  {t('settings.hyperweaverSettings.yourCurrentRole')}{' '}
                  <span className="badge text-bg-warning">
                    {user?.role || t('settings.hyperweaverSettings.unknownRole')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t('settings.hyperweaverSettings.pageTitle')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          {/* Title bar with action buttons */}
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>{t('settings.hyperweaverSettings.systemSettings')}</strong>
            {activeTab !== 'servers' && Object.keys(sections).length > 0 && (
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveSettings}
                  disabled={loading || !Object.keys(values).length}
                >
                  <i className="fas fa-save me-2" />
                  {t('settings.hyperweaverSettings.save')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-info"
                  onClick={createBackup}
                  disabled={loading}
                >
                  <i className="fas fa-download me-2" />
                  {t('settings.hyperweaverSettings.backup')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-warning"
                  onClick={handleOpenBackupModal}
                  disabled={loading}
                >
                  <i className="fas fa-history me-2" />
                  {t('settings.hyperweaverSettings.restore')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleRestartServer}
                  disabled={loading}
                >
                  <i className="fas fa-redo me-2" />
                  {t('settings.hyperweaverSettings.restart')}
                </button>
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <ul className="nav nav-tabs pt-2 mb-0">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === 'servers' ? 'active' : ''}`}
                onClick={() => setActiveTab('servers')}
                role="tab"
                aria-selected={activeTab === 'servers'}
              >
                <i className="fas fa-server me-2" />
                {t('settings.hyperweaverSettings.apiServers')}
              </button>
            </li>
            {Object.entries(sections).map(([sectionName, section]) => (
              <li key={sectionName} className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === sectionName ? 'active' : ''}`}
                  onClick={() => setActiveTab(sectionName)}
                  role="tab"
                  aria-selected={activeTab === sectionName}
                >
                  <i className={`${section.icon} me-2`} />
                  {section.title}
                </button>
              </li>
            ))}
          </ul>

          {/* Message banner */}
          <div className="p-4">
            {msg && (
              <div className={`alert alert-${msg.variant || 'warning'} mb-4`}>
                <p className="mb-0">{msg.text}</p>
              </div>
            )}

            {/* Server Management Tab */}
            {activeTab === 'servers' && (
              <ServerManagementTab
                servers={servers}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                hostname={hostname}
                setHostname={setHostname}
                port={port}
                setPort={setPort}
                protocol={protocol}
                setProtocol={setProtocol}
                entityName={entityName}
                setEntityName={setEntityName}
                apiKey={apiKey}
                setApiKey={setApiKey}
                useExistingApiKey={useExistingApiKey}
                setUseExistingApiKey={setUseExistingApiKey}
                testResult={testResult}
                setTestResult={setTestResult}
                setMsg={setMsg}
                serverContext={serverContext}
              />
            )}

            {/* Dynamic Configuration Sections */}
            {Object.entries(sections).map(
              ([sectionName, section]) =>
                activeTab === sectionName && (
                  <div key={sectionName}>
                    <SettingsContent
                      activeTab={sectionName}
                      sections={{ [sectionName]: section }}
                      values={values}
                      collapsedSubsections={collapsedSubsections}
                      setCollapsedSubsections={setCollapsedSubsections}
                      sslFiles={sslFiles}
                      uploadingFiles={uploadingFiles}
                      loading={loading}
                      onFieldChange={handleFieldChange}
                      onSslFileUpload={handleSslFileUpload}
                      setMsg={setMsg}
                      setRequiresRestart={setRequiresRestart}
                    />

                    {/* Testing Panel for Authentication and Mail */}
                    {(sectionName === 'Authentication' || sectionName === 'Mail') && (
                      <TestingPanel
                        values={values}
                        testResults={testResults}
                        setTestResults={setTestResults}
                        testLoading={testLoading}
                        setTestLoading={setTestLoading}
                        testEmail={testEmail}
                        setTestEmail={setTestEmail}
                        ldapTestCredentials={ldapTestCredentials}
                        setLdapTestCredentials={setLdapTestCredentials}
                        setMsg={setMsg}
                        loading={loading}
                        sectionName={sectionName}
                      />
                    )}
                  </div>
                )
            )}

            {/* Restart Warning */}
            {requiresRestart && activeTab !== 'servers' && (
              <div className="alert alert-warning mt-4">
                <h3 className="h6">{t('settings.hyperweaverSettings.restartRequiredTitle')}</h3>
                <p>{t('settings.hyperweaverSettings.restartRequiredText')}</p>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRestartServer}
                    disabled={loading}
                  >
                    <i className="fas fa-power-off me-2" />
                    {t('settings.hyperweaverSettings.restartServerNow')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Backup Manager Modal */}
          <BackupManager
            backups={backups}
            setBackups={setBackups}
            showBackupModal={showBackupModal}
            setShowBackupModal={setShowBackupModal}
            setMsg={setMsg}
            onBackupRestore={loadSettings}
          />

          {/* Help Section */}
          {activeTab !== 'servers' && Object.keys(sections).length > 0 && (
            <div className="card mx-4 mb-4">
              <div className="card-body">
                <h2 className="h6">{t('settings.hyperweaverSettings.settingsInformation')}</h2>
                <div className="small">
                  <p>
                    <strong>{t('settings.hyperweaverSettings.importantLabel')}</strong>{' '}
                    {t('settings.hyperweaverSettings.importantText')}
                  </p>
                  <ul>
                    <li>{t('settings.hyperweaverSettings.changesRequireAdmin')}</li>
                    <li>{t('settings.hyperweaverSettings.refreshBrowsers')}</li>
                    <li>{t('settings.hyperweaverSettings.performanceSettings')}</li>
                    <li>{t('settings.hyperweaverSettings.securitySettings')}</li>
                  </ul>
                  <p className="mt-3">
                    <strong>{t('settings.hyperweaverSettings.currentUserLabel')}</strong>{' '}
                    {user.username}{' '}
                    <span className="badge text-bg-danger">
                      {t('settings.hyperweaverSettings.superAdmin')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restart Server Confirmation Modal */}
      <ConfirmModal
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        onConfirm={() => {
          setShowRestartConfirm(false);
          executeRestart();
        }}
        title={t('settings.hyperweaverSettings.restartServerTitle')}
        message={t('settings.hyperweaverSettings.restartConfirmMessage')}
        confirmText={t('settings.hyperweaverSettings.restartServerTitle')}
        confirmVariant="is-danger"
        icon="fas fa-redo"
        loading={loading}
      />
    </div>
  );
};

export default HyperweaverSettings;
