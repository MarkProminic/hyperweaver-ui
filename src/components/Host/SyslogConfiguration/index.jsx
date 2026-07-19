import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useSyslogData } from '../../../hooks/useSyslogData';
import ConfirmModal from '../../common/ConfirmModal';

import ConfigEditorView from './ConfigEditorView';
import CurrentRulesView from './CurrentRulesView';
import HelpSection from './HelpSection';
import RuleBuilderView from './RuleBuilderView';
import { getServiceStatusColor, getServiceType } from './syslogUtils';

const SyslogConfiguration = ({ server }) => {
  const { t } = useTranslation();
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
            <p className="mt-3">{t('hostTime.syslogConfiguration.loading')}</p>
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
              <span>{t('hostTime.syslogConfiguration.statusHeading')}</span>
            </h4>

            <div className="row g-3">
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">{t('hostTime.syslogConfiguration.serviceTypeLabel')}</p>
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
                  <p className="form-label">
                    {t('hostTime.syslogConfiguration.serviceStatusLabel')}
                  </p>
                  <p>
                    <span
                      className={`badge ${getServiceStatusColor(config.service_status)} d-inline-flex align-items-center gap-1`}
                    >
                      <i
                        className={`fas ${config.service_status?.state === 'online' ? 'fa-check-circle' : 'fa-times-circle'}`}
                      />
                      <span>
                        {config.service_status?.state ||
                          t('hostTime.syslogConfiguration.unknownStatus')}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">{t('hostTime.syslogConfiguration.configFileLabel')}</p>
                  <p>
                    <span className="badge text-bg-info">
                      {config.config_file || '/etc/syslog.conf'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="col">
                <div className="mb-3">
                  <p className="form-label">{t('hostTime.syslogConfiguration.activeRulesLabel')}</p>
                  <p>
                    <span className="badge text-bg-secondary">
                      {t('hostTime.syslogConfiguration.rulesCount', {
                        count: config.parsed_rules?.length || 0,
                      })}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Service Switching Controls */}
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="d-flex align-items-center gap-2">
                <p className="small text-muted mb-0">
                  {t('hostTime.syslogConfiguration.switchServiceText')}
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
                    <span>{t('hostTime.syslogConfiguration.traditionalSyslogButton')}</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${getServiceType(config).name === 'rsyslog' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => requestSwitchService('rsyslog')}
                    disabled={loading || getServiceType(config).name === 'rsyslog'}
                  >
                    <i className="fas fa-cogs me-2" />
                    <span>{t('hostTime.syslogConfiguration.modernRsyslogButton')}</span>
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
            <span>{t('hostTime.syslogConfiguration.tabCurrentRules')}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            <i className="fas fa-edit me-2" />
            <span>{t('hostTime.syslogConfiguration.tabConfigEditor')}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeView === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveView('builder')}
          >
            <i className="fas fa-plus me-2" />
            <span>{t('hostTime.syslogConfiguration.tabRuleBuilder')}</span>
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
        title={t('hostTime.syslogConfiguration.switchModalTitle')}
        message={t('hostTime.syslogConfiguration.switchModalMessage', {
          target: pendingSwitchTarget || '',
        })}
        confirmText={t('hostTime.syslogConfiguration.switchModalConfirm')}
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
