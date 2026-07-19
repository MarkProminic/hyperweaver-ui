import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { getServiceType } from './syslogUtils';

/**
 * Get the preview action text for the rule builder
 * @param {object} ruleBuilder - Rule builder state
 * @param {object} serviceType - Service type info from getServiceType
 * @returns {string} Preview action text
 */
const getRulePreviewAction = (ruleBuilder, serviceType) => {
  if (ruleBuilder.action_type === 'file') {
    return ruleBuilder.action_target;
  } else if (ruleBuilder.action_type === 'remote_host') {
    return `@${ruleBuilder.action_target}`;
  } else if (ruleBuilder.action_type === 'all_users') {
    return serviceType.name === 'rsyslog' ? ':omusrmsg:*' : '*';
  } else if (ruleBuilder.action_type === 'user') {
    return serviceType.name === 'rsyslog'
      ? `:omusrmsg:${ruleBuilder.action_target}`
      : ruleBuilder.action_target;
  }
  return ruleBuilder.action_target;
};

/**
 * Interactive rule builder form with conditional fields
 */
const RuleBuilderView = ({ config, facilities, ruleBuilder, handleRuleBuilderChange, addRule }) => {
  const { t } = useTranslation();
  const serviceType = getServiceType(config);

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-4">
          <i className="fas fa-plus me-2" />
          <span>{t('hostTime.syslogRuleBuilder.heading')}</span>
        </h4>

        <div className="row g-3">
          <div className="col-lg-3">
            <div className="mb-3">
              <label className="form-label" htmlFor="rule-facility">
                {t('hostTime.syslogRuleBuilder.facilityLabel')}
              </label>
              <select
                id="rule-facility"
                className="form-select"
                value={ruleBuilder.facility}
                onChange={e => handleRuleBuilderChange('facility', e.target.value)}
              >
                {facilities?.facilities?.map(facility => (
                  <option key={facility.name} value={facility.name}>
                    {facility.name} - {facility.description}
                  </option>
                )) || [
                  <option key="*" value="*">
                    * - All facilities
                  </option>,
                  <option key="kern" value="kern">
                    kern - Kernel messages
                  </option>,
                  <option key="mail" value="mail">
                    mail - Mail system
                  </option>,
                  <option key="auth" value="auth">
                    auth - Authentication
                  </option>,
                  <option key="daemon" value="daemon">
                    daemon - System daemons
                  </option>,
                  <option key="local0" value="local0">
                    local0 - Local use 0
                  </option>,
                  <option key="local1" value="local1">
                    local1 - Local use 1
                  </option>,
                ]}
              </select>
            </div>
          </div>

          <div className="col-lg-3">
            <div className="mb-3">
              <label className="form-label" htmlFor="rule-level">
                {t('hostTime.syslogRuleBuilder.levelLabel')}
              </label>
              <select
                id="rule-level"
                className="form-select"
                value={ruleBuilder.level}
                onChange={e => handleRuleBuilderChange('level', e.target.value)}
              >
                {facilities?.levels?.map(level => (
                  <option key={level.name} value={level.name}>
                    {level.name} - {level.description}
                  </option>
                )) || [
                  <option key="emerg" value="emerg">
                    emerg - {t('hostTime.syslogRuleBuilder.levelEmerg')}
                  </option>,
                  <option key="alert" value="alert">
                    alert - {t('hostTime.syslogRuleBuilder.levelAlert')}
                  </option>,
                  <option key="crit" value="crit">
                    crit - {t('hostTime.syslogRuleBuilder.levelCrit')}
                  </option>,
                  <option key="err" value="err">
                    err - {t('hostTime.syslogRuleBuilder.levelErr')}
                  </option>,
                  <option key="warning" value="warning">
                    warning - {t('hostTime.syslogRuleBuilder.levelWarning')}
                  </option>,
                  <option key="notice" value="notice">
                    notice - {t('hostTime.syslogRuleBuilder.levelNotice')}
                  </option>,
                  <option key="info" value="info">
                    info - {t('hostTime.syslogRuleBuilder.levelInfo')}
                  </option>,
                  <option key="debug" value="debug">
                    debug - {t('hostTime.syslogRuleBuilder.levelDebug')}
                  </option>,
                ]}
              </select>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="mb-3">
              <label className="form-label" htmlFor="rule-action-type">
                {t('hostTime.syslogRuleBuilder.actionTypeLabel')}
              </label>
              <select
                id="rule-action-type"
                className="form-select"
                value={ruleBuilder.action_type}
                onChange={e => {
                  handleRuleBuilderChange('action_type', e.target.value);
                  // Reset target when action type changes
                  const defaultTargets = {
                    file: '/var/log/custom.log',
                    remote_host: 'loghost',
                    all_users: '*',
                    user: 'root',
                  };
                  handleRuleBuilderChange('action_target', defaultTargets[e.target.value] || '');
                }}
              >
                <option value="file">{t('hostTime.syslogRuleBuilder.actionLogToFile')}</option>
                <option value="remote_host">
                  {t('hostTime.syslogRuleBuilder.actionSendRemote')}
                </option>
                <option value="all_users">
                  {t('hostTime.syslogRuleBuilder.actionBroadcastAll')}
                </option>
                <option value="user">{t('hostTime.syslogRuleBuilder.actionSendUser')}</option>
              </select>
              <p className="form-text text-muted small">
                {ruleBuilder.action_type === 'file' && t('hostTime.syslogRuleBuilder.helpFile')}
                {ruleBuilder.action_type === 'remote_host' &&
                  t('hostTime.syslogRuleBuilder.helpRemote')}
                {ruleBuilder.action_type === 'all_users' &&
                  t('hostTime.syslogRuleBuilder.helpAllUsers')}
                {ruleBuilder.action_type === 'user' && t('hostTime.syslogRuleBuilder.helpUser')}
              </p>
            </div>
          </div>
        </div>

        {/* Conditional Configuration Fields Based on Action Type */}
        {ruleBuilder.action_type === 'file' && (
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-file-path">
                  {t('hostTime.syslogRuleBuilder.filePathLabel')}
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-file" />
                  </span>
                  <input
                    id="rule-file-path"
                    className="form-control"
                    type="text"
                    value={ruleBuilder.action_target}
                    onChange={e => handleRuleBuilderChange('action_target', e.target.value)}
                    placeholder={t('hostTime.syslogRuleBuilder.filePathPlaceholder')}
                  />
                </div>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.filePathHelp')}
                </p>
              </div>
            </div>
          </div>
        )}

        {ruleBuilder.action_type === 'remote_host' && (
          <div className="row g-3">
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-remote-host">
                  {t('hostTime.syslogRuleBuilder.remoteHostLabel')}
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-server" />
                  </span>
                  <input
                    id="rule-remote-host"
                    className="form-control"
                    type="text"
                    value={ruleBuilder.action_target}
                    onChange={e => handleRuleBuilderChange('action_target', e.target.value)}
                    placeholder={t('hostTime.syslogRuleBuilder.remoteHostPlaceholder')}
                  />
                </div>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.remoteHostHelp')}
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-remote-protocol">
                  {t('hostTime.syslogRuleBuilder.protocolLabel')}
                </label>
                <select
                  id="rule-remote-protocol"
                  className="form-select"
                  value={ruleBuilder.remote_protocol}
                  onChange={e => handleRuleBuilderChange('remote_protocol', e.target.value)}
                >
                  <option value="udp">{t('hostTime.syslogRuleBuilder.protocolUdp')}</option>
                  <option value="tcp">{t('hostTime.syslogRuleBuilder.protocolTcp')}</option>
                </select>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.protocolHelp')}
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-remote-port">
                  {t('hostTime.syslogRuleBuilder.portLabel')}
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-hashtag" />
                  </span>
                  <input
                    id="rule-remote-port"
                    className="form-control"
                    type="number"
                    min="1"
                    max="65535"
                    value={ruleBuilder.remote_port}
                    onChange={e => handleRuleBuilderChange('remote_port', e.target.value)}
                    placeholder={t('hostTime.syslogRuleBuilder.portPlaceholder')}
                  />
                </div>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.portHelp')}
                </p>
              </div>
            </div>
          </div>
        )}

        {ruleBuilder.action_type === 'user' && (
          <div className="row g-3">
            <div className="col-lg-8">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-username">
                  {t('hostTime.syslogRuleBuilder.usernameLabel')}
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-user" />
                  </span>
                  <input
                    id="rule-username"
                    className="form-control"
                    type="text"
                    value={ruleBuilder.action_target}
                    onChange={e => handleRuleBuilderChange('action_target', e.target.value)}
                    placeholder={t('hostTime.syslogRuleBuilder.usernamePlaceholder')}
                  />
                </div>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.usernameHelp')}
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-multiple-users">
                  {t('hostTime.syslogRuleBuilder.multipleUsersLabel')}
                </label>
                <div className="form-check form-switch">
                  <input
                    id="rule-multiple-users"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={ruleBuilder.multiple_users}
                    onChange={e => handleRuleBuilderChange('multiple_users', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rule-multiple-users">
                    {t('hostTime.syslogRuleBuilder.multipleUsersCheckbox')}
                  </label>
                </div>
                <p className="form-text text-muted small">
                  {t('hostTime.syslogRuleBuilder.multipleUsersHelp')}
                </p>
              </div>
            </div>
          </div>
        )}

        {ruleBuilder.action_type === 'all_users' && (
          <div className="alert alert-warning">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div>
                  <p className="fw-semibold">
                    {t('hostTime.syslogRuleBuilder.emergencyBroadcastTitle')}
                  </p>
                  <p className="small mb-0">
                    {t('hostTime.syslogRuleBuilder.emergencyBroadcastMessage')}
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-warning">
                  <i className="fas fa-exclamation-triangle fa-2x" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={addRule}
            disabled={!ruleBuilder.facility || !ruleBuilder.level || !ruleBuilder.action_target}
          >
            <i className="fas fa-plus me-2" />
            <span>{t('hostTime.syslogRuleBuilder.addRuleButton')}</span>
          </button>
        </div>

        {/* Preview of generated rule */}
        <div className="alert alert-secondary mt-4">
          <h5 className="fs-6 fw-bold mb-2">
            {t('hostTime.syslogRuleBuilder.rulePreviewHeading', { service: serviceType.display })}
          </h5>
          <code className="small">
            {ruleBuilder.facility}.{ruleBuilder.level}\t\t\t
            {getRulePreviewAction(ruleBuilder, serviceType)}
          </code>
        </div>
      </div>
    </div>
  );
};

RuleBuilderView.propTypes = {
  config: PropTypes.object,
  facilities: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  ruleBuilder: PropTypes.shape({
    facility: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    action_type: PropTypes.string.isRequired,
    action_target: PropTypes.string.isRequired,
    remote_protocol: PropTypes.string,
    remote_port: PropTypes.string,
    multiple_users: PropTypes.bool,
    user_list: PropTypes.string,
  }).isRequired,
  handleRuleBuilderChange: PropTypes.func.isRequired,
  addRule: PropTypes.func.isRequired,
};

export default RuleBuilderView;
