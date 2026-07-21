import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { ContentModal } from '../common';

const ProcessDetailsModal = ({ process, server, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalData, setAdditionalData] = useState({
    files: null,
    limits: null,
    stack: null,
  });

  const { makeAgentRequest } = useServers();

  const loadAdditionalData = useCallback(
    async type => {
      if (!server || !makeAgentRequest || additionalData[type] !== null) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          `system/processes/${process.pid}/${type}`,
          'GET'
        );

        if (result.success) {
          setAdditionalData(prev => ({
            ...prev,
            [type]: result.data,
          }));
        } else {
          setError(result.message || t('host.processDetailsModal.errors.loadTypeFailed', { type }));
        }
      } catch (err) {
        setError(
          t('host.processDetailsModal.errors.loadTypeError', { type, message: err.message })
        );
      } finally {
        setLoading(false);
      }
    },
    [server, makeAgentRequest, process.pid, additionalData, t]
  );

  useEffect(() => {
    if (activeTab === 'files' && additionalData.files === null) {
      loadAdditionalData('files');
    } else if (activeTab === 'limits' && additionalData.limits === null) {
      loadAdditionalData('limits');
    } else if (activeTab === 'stack' && additionalData.stack === null) {
      loadAdditionalData('stack');
    }
  }, [activeTab, additionalData, loadAdditionalData]);

  const formatMemory = bytes => {
    if (!bytes) {
      return 'N/A';
    }
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB (${bytes} bytes)`;
    }
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB (${bytes} bytes)`;
    }
    if (kb >= 1) {
      return `${kb.toFixed(2)} KB (${bytes} bytes)`;
    }
    return `${bytes} bytes`;
  };

  const formatBasicDetails = details => {
    if (!details) {
      return [];
    }

    return [
      { label: t('host.processDetailsModal.labelProcessId'), value: details.pid },
      { label: t('host.processDetailsModal.labelParentPid'), value: details.ppid || 'N/A' },
      { label: t('host.processDetailsModal.labelZone'), value: details.zone || 'N/A' },
      { label: t('host.processDetailsModal.labelUserId'), value: details.uid || 'N/A' },
      { label: t('host.processDetailsModal.labelVirtualSize'), value: formatMemory(details.vsz) },
      { label: t('host.processDetailsModal.labelResidentSize'), value: formatMemory(details.rss) },
      { label: t('host.processDetailsModal.labelCommand'), value: details.command || 'N/A' },
    ];
  };

  const renderBasicTab = () => {
    const basicDetails = formatBasicDetails(process.details);

    return (
      <div>
        <div className="card mb-4">
          <div className="card-body">
            <h4 className="fs-6 fw-bold">{t('host.processDetailsModal.processInformation')}</h4>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {basicDetails.map(detail => (
                    <tr key={detail.label}>
                      <td>
                        <strong>{detail.label}</strong>
                      </td>
                      <td className="font-monospace">{detail.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {Array.isArray(process.details?.open_files_sample) &&
          process.details.open_files_sample.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h4 className="fs-6 fw-bold">{t('host.processDetailsModal.openFilesSample')}</h4>
                <pre className="small p-3 bg-body-tertiary">
                  {process.details.open_files_sample.join('\n')}
                </pre>
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderFilesTab = () => {
    if (loading && !additionalData.files) {
      return (
        <div className="text-center p-4">
          <i className="fas fa-spinner fa-spin fa-2x" />
          <p className="mt-2">{t('host.processDetailsModal.loadingOpenFiles')}</p>
        </div>
      );
    }

    if (!additionalData.files || additionalData.files.length === 0) {
      return (
        <div className="alert alert-info">
          <p>{t('host.processDetailsModal.noOpenFiles')}</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">{t('host.processDetailsModal.openFileDescriptors')}</h4>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('host.processDetailsModal.thFd')}</th>
                  <th>{t('host.processDetailsModal.thDescription')}</th>
                  <th>{t('host.processDetailsModal.thDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {additionalData.files.map(file => (
                  <tr key={file.fd}>
                    <td className="font-monospace">{file.fd}</td>
                    <td className="font-monospace small">{file.description}</td>
                    <td className="font-monospace small">{file.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderLimitsTab = () => {
    if (loading && !additionalData.limits) {
      return (
        <div className="text-center p-4">
          <i className="fas fa-spinner fa-spin fa-2x" />
          <p className="mt-2">{t('host.processDetailsModal.loadingResourceLimits')}</p>
        </div>
      );
    }

    if (!additionalData.limits) {
      return (
        <div className="alert alert-info">
          <p>{t('host.processDetailsModal.noResourceLimits')}</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">{t('host.processDetailsModal.resourceLimits')}</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('host.processDetailsModal.thResource')}</th>
                  <th>{t('host.processDetailsModal.thLimit')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(additionalData.limits).map(([resource, limit]) => (
                  <tr key={resource}>
                    <td>
                      <strong>{resource}</strong>
                    </td>
                    <td className="font-monospace">{limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStackTab = () => {
    if (loading && !additionalData.stack) {
      return (
        <div className="text-center p-4">
          <i className="fas fa-spinner fa-spin fa-2x" />
          <p className="mt-2">{t('host.processDetailsModal.loadingStackTrace')}</p>
        </div>
      );
    }

    if (!additionalData.stack) {
      return (
        <div className="alert alert-info">
          <p>{t('host.processDetailsModal.noStackTrace')}</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">{t('host.processDetailsModal.processStackTrace')}</h4>
          <pre
            className="small p-3 bg-body-tertiary"
            style={{ maxHeight: '400px', overflow: 'auto' }}
          >
            {typeof additionalData.stack === 'string'
              ? additionalData.stack
              : JSON.stringify(additionalData.stack, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  const tabs = [
    { key: 'basic', label: t('host.processDetailsModal.tabBasicInfo'), icon: 'fa-info-circle' },
    { key: 'files', label: t('host.processDetailsModal.tabOpenFiles'), icon: 'fa-folder-open' },
    { key: 'limits', label: t('host.processDetailsModal.tabResourceLimits'), icon: 'fa-chart-bar' },
    { key: 'stack', label: t('host.processDetailsModal.tabStackTrace'), icon: 'fa-layer-group' },
  ];

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.processDetailsModal.title', { pid: process.pid })}
      icon="fas fa-tasks"
    >
      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-0">
        {tabs.map(tab => (
          <li key={tab.key} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fas ${tab.icon} me-2`} />
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'basic' && renderBasicTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'limits' && renderLimitsTab()}
        {activeTab === 'stack' && renderStackTab()}
      </div>
    </ContentModal>
  );
};

ProcessDetailsModal.propTypes = {
  process: PropTypes.shape({
    pid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    details: PropTypes.shape({
      open_files_sample: PropTypes.arrayOf(PropTypes.string),
    }),
  }).isRequired,
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ProcessDetailsModal;
