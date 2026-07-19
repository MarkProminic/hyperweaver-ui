import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasFeature } from '../../utils/capabilities';

import FaultList from './FaultList';
import FaultManagerConfig from './FaultManagerConfig';
import SyslogConfiguration from './SyslogConfiguration';
import SystemLogs from './SystemLogs';

const FaultManagement = ({ server }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('faults');

  if (!server) {
    return (
      <div className="alert alert-info">
        <p>{t('host.faultManagement.noServerSelected')}</p>
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
            <span>{t('host.faultManagement.tabCurrentFaults')}</span>
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
              <span>{t('host.faultManagement.tabSystemLogs')}</span>
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
            <span>{t('host.faultManagement.tabConfiguration')}</span>
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
              <span>{t('host.faultManagement.tabSyslogConfig')}</span>
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
                <span>{t('host.faultManagement.currentSystemFaults')}</span>
              </h3>
              <p>
                {t('host.faultManagement.faultsDescBefore')} <strong>{server.hostname}</strong>.{' '}
                {t('host.faultManagement.faultsDescAfter')}
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
                <span>{t('host.faultManagement.systemLogs')}</span>
              </h3>
              <p>
                {t('host.faultManagement.logsDescBefore')} <strong>{server.hostname}</strong>.{' '}
                {t('host.faultManagement.logsDescAfter')}
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
                <span>{t('host.faultManagement.faultManagerConfiguration')}</span>
              </h3>
              <p>
                {t('host.faultManagement.configDescBefore')} <strong>{server.hostname}</strong>.{' '}
                {t('host.faultManagement.configDescAfter')}
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
                <span>{t('host.faultManagement.syslogConfiguration')}</span>
              </h3>
              <p>
                {t('host.faultManagement.syslogDescBefore')} <strong>{server.hostname}</strong>.{' '}
                {t('host.faultManagement.syslogDescAfter')}
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
