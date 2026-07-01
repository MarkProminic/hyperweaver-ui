import PropTypes from 'prop-types';

import { useSyslogData } from '../../../hooks/useSyslogData';
import ConfirmModal from '../../common/ConfirmModal';

import ConfigEditorView from './ConfigEditorView';
import CurrentRulesView from './CurrentRulesView';
import HelpSection from './HelpSection';
import RuleBuilderView from './RuleBuilderView';
import { getServiceStatusColor, getServiceType } from './syslogUtils';

const SyslogConfiguration = ({ server }) => {
  const data = useSyslogData(server);

  const {
    config,
    loading,
    message,
    setMessage,
    messageType,
    activeView,
    setActiveView,
    requestSwitchService,
    confirmSwitchService,
    cancelSwitchService,
    pendingSwitchTarget,
  } = data;

  if (loading && !config) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center">
            <span className="spinner-border" role="status" aria-hidden="true" />
            <p className="mt-3">Loading syslog configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Status Messages */}
      {message && (
        <div
          className={`alert ${messageType} mb-4 d-flex justify-content-between align-items-start`}
        >
          <p className="mb-0">{message}</p>
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Configuration Overview */}
      {config && (
        <div className="card mb-4">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-info-circle me-2" />
              <span>Configuration Status</span>
            </h4>

            <div className="row g-3">
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">Service Type</p>
                  <p>
                    <span className="badge text-bg-primary d-inline-flex align-items-center gap-1">
                      <i className={`fas ${getServiceType(config).icon}`} />
                      <span>{getServiceType(config).display}</span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">Service Status</p>
                  <p>
                    <span
                      className={`badge ${getServiceStatusColor(config.service_status)} d-inline-flex align-items-center gap-1`}
                    >
                      <i
                        className={`fas ${config.service_status?.state === 'online' ? 'fa-check-circle' : 'fa-times-circle'}`}
                      />
                      <span>{config.service_status?.state || 'Unknown'}</span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">Configuration File</p>
                  <p>
                    <span className="badge text-bg-info">
                      {config.config_file || '/etc/syslog.conf'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">Active Rules</p>
                  <p>
                    <span className="badge text-bg-secondary">
                      {config.parsed_rules?.length || 0} rules
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Service Switching Controls */}
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="d-flex align-items-center gap-2">
                <p className="small text-muted mb-0">
                  Switch between traditional syslog and modern rsyslog service
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="input-group">
                  <button
                    type="button"
                    className={`btn btn-sm ${getServiceType(config).name === 'syslog' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => requestSwitchService('syslog')}
                    disabled={loading || getServiceType(config).name === 'syslog'}
                  >
                    <i className="fas fa-file-alt me-2" />
                    <span>Traditional Syslog</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${getServiceType(config).name === 'rsyslog' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => requestSwitchService('rsyslog')}
                    disabled={loading || getServiceType(config).name === 'rsyslog'}
                  >
                    <i className="fas fa-cogs me-2" />
                    <span>Modern Rsyslog</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeView === 'current' ? 'active' : ''}`}
            onClick={() => setActiveView('current')}
          >
            <i className="fas fa-list me-2" />
            <span>Current Rules</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            <i className="fas fa-edit me-2" />
            <span>Config Editor</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeView === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveView('builder')}
          >
            <i className="fas fa-plus me-2" />
            <span>Rule Builder</span>
          </button>
        </li>
      </ul>

      {/* View Content */}
      {activeView === 'current' && <CurrentRulesView config={config} />}

      {activeView === 'editor' && (
        <ConfigEditorView
          configContent={data.configContent}
          setConfigContent={data.setConfigContent}
          validation={data.validation}
          loading={loading}
          validationLoading={data.validationLoading}
          validateConfiguration={data.validateConfiguration}
          applyConfiguration={data.applyConfiguration}
          reloadSyslog={data.reloadSyslog}
        />
      )}

      {activeView === 'builder' && (
        <RuleBuilderView
          config={config}
          facilities={data.facilities}
          ruleBuilder={data.ruleBuilder}
          handleRuleBuilderChange={data.handleRuleBuilderChange}
          addRule={data.addRule}
        />
      )}

      <HelpSection config={config} />

      <ConfirmModal
        isOpen={pendingSwitchTarget !== null}
        onClose={cancelSwitchService}
        onConfirm={confirmSwitchService}
        title="Switch Syslog Service"
        message={`Are you sure you want to switch to ${pendingSwitchTarget || ''}? This will restart the logging service.`}
        confirmText="Switch Service"
        confirmVariant="is-warning"
        icon="fas fa-exchange-alt"
        loading={loading}
      />
    </div>
  );
};

SyslogConfiguration.propTypes = {
  server: PropTypes.object,
};

export default SyslogConfiguration;
