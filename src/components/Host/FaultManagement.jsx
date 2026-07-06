import PropTypes from 'prop-types';
import { useState } from 'react';

import { hasFeature } from '../../utils/capabilities';

import FaultList from './FaultList';
import FaultManagerConfig from './FaultManagerConfig';
import SyslogConfiguration from './SyslogConfiguration';
import SystemLogs from './SystemLogs';

const FaultManagement = ({ server }) => {
  const [activeTab, setActiveTab] = useState('faults');

  if (!server) {
    return (
      <div className="alert alert-info">
        <p>No server selected for fault management.</p>
      </div>
    );
  }

  // The log sub-tabs ride their own tokens, not the parent fault-management
  // token: `log-streaming` gates /system/logs/* (viewer + WS streaming),
  // `syslog` gates /system/syslog/* (config family).
  const logsAvailable = hasFeature(server, 'log-streaming');
  const syslogAvailable = hasFeature(server, 'syslog');

  return (
    <div>
      {/* Sub-Tab Navigation */}
      <ul className="nav nav-tabs mb-0">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'faults' ? 'active' : ''}`}
            onClick={() => setActiveTab('faults')}
          >
            <i className="fas fa-exclamation-triangle me-2" />
            <span>Current Faults</span>
          </button>
        </li>
        {logsAvailable && (
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <i className="fas fa-file-alt me-2" />
              <span>System Logs</span>
            </button>
          </li>
        )}
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <i className="fas fa-cog me-2" />
            <span>Configuration</span>
          </button>
        </li>
        {syslogAvailable && (
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === 'syslog-config' ? 'active' : ''}`}
              onClick={() => setActiveTab('syslog-config')}
            >
              <i className="fas fa-edit me-2" />
              <span>Syslog Config</span>
            </button>
          </li>
        )}
      </ul>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'faults' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-exclamation-triangle me-2" />
                <span>Current System Faults</span>
              </h3>
              <p>
                Monitor and manage active system faults on <strong>{server.hostname}</strong>. View
                fault details, acquit resolved issues, and track fault resolution status.
              </p>
            </div>

            <FaultList server={server} />
          </div>
        )}

        {activeTab === 'logs' && logsAvailable && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-file-alt me-2" />
                <span>System Logs</span>
              </h3>
              <p>
                Browse and analyze system log files on <strong>{server.hostname}</strong>. View
                system messages, authentication logs, and fault manager logs with real-time
                filtering.
              </p>
            </div>

            <SystemLogs server={server} />
          </div>
        )}

        {activeTab === 'config' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-cog me-2" />
                <span>Fault Manager Configuration</span>
              </h3>
              <p>
                View fault manager configuration and module status on{' '}
                <strong>{server.hostname}</strong>. Monitor installed fault management modules and
                their current state.
              </p>
            </div>

            <FaultManagerConfig server={server} />
          </div>
        )}

        {activeTab === 'syslog-config' && syslogAvailable && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-edit me-2" />
                <span>Syslog Configuration</span>
              </h3>
              <p>
                Configure system logging on <strong>{server.hostname}</strong>. Manage syslog rules,
                facilities, and log destinations with validation and backup support.
              </p>
            </div>

            <SyslogConfiguration server={server} />
          </div>
        )}
      </div>
    </div>
  );
};

FaultManagement.propTypes = {
  server: PropTypes.object.isRequired,
};

export default FaultManagement;
