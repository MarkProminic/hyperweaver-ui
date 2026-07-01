import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ContentModal } from '../common';

const ProcessDetailsModal = ({ process, server, onClose }) => {
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
          setError(result.message || `Failed to load ${type} data`);
        }
      } catch (err) {
        setError(`Error loading ${type} data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [server, makeAgentRequest, process.pid, additionalData]
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
      { label: 'Process ID', value: details.pid },
      { label: 'Parent PID', value: details.ppid || 'N/A' },
      { label: 'Zone', value: details.zone || 'N/A' },
      { label: 'User ID', value: details.uid || 'N/A' },
      { label: 'Virtual Size', value: formatMemory(details.vsz) },
      { label: 'Resident Size', value: formatMemory(details.rss) },
      { label: 'Command', value: details.command || 'N/A' },
    ];
  };

  const renderBasicTab = () => {
    const basicDetails = formatBasicDetails(process.details);

    return (
      <div>
        <div className="card mb-4">
          <div className="card-body">
            <h4 className="fs-6 fw-bold">Process Information</h4>
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

        {process.details?.open_files_sample && (
          <div className="card">
            <div className="card-body">
              <h4 className="fs-6 fw-bold">Open Files Sample</h4>
              <pre className="small p-3 bg-body-tertiary">{process.details.open_files_sample}</pre>
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
          <p className="mt-2">Loading open files...</p>
        </div>
      );
    }

    if (!additionalData.files || additionalData.files.length === 0) {
      return (
        <div className="alert alert-info">
          <p>No open files information available or no files found.</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">Open File Descriptors</h4>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>FD</th>
                  <th>Description</th>
                  <th>Details</th>
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
          <p className="mt-2">Loading resource limits...</p>
        </div>
      );
    }

    if (!additionalData.limits) {
      return (
        <div className="alert alert-info">
          <p>No resource limits information available.</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">Resource Limits</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Limit</th>
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
          <p className="mt-2">Loading stack trace...</p>
        </div>
      );
    }

    if (!additionalData.stack) {
      return (
        <div className="alert alert-info">
          <p>No stack trace information available.</p>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold">Process Stack Trace</h4>
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
    { key: 'basic', label: 'Basic Info', icon: 'fa-info-circle' },
    { key: 'files', label: 'Open Files', icon: 'fa-folder-open' },
    { key: 'limits', label: 'Resource Limits', icon: 'fa-chart-bar' },
    { key: 'stack', label: 'Stack Trace', icon: 'fa-layer-group' },
  ];

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={`Process Details - PID ${process.pid}`}
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
      open_files_sample: PropTypes.string,
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
