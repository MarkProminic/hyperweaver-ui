import PropTypes from 'prop-types';

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
  const serviceType = getServiceType(config);

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-4">
          <i className="fas fa-plus me-2" />
          <span>Syslog Rule Builder</span>
        </h4>

        <div className="row g-3">
          <div className="col-lg-3">
            <div className="mb-3">
              <label className="form-label" htmlFor="rule-facility">
                Facility
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
                Level
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
                    emerg - Emergency
                  </option>,
                  <option key="alert" value="alert">
                    alert - Alert
                  </option>,
                  <option key="crit" value="crit">
                    crit - Critical
                  </option>,
                  <option key="err" value="err">
                    err - Error
                  </option>,
                  <option key="warning" value="warning">
                    warning - Warning
                  </option>,
                  <option key="notice" value="notice">
                    notice - Notice
                  </option>,
                  <option key="info" value="info">
                    info - Info
                  </option>,
                  <option key="debug" value="debug">
                    debug - Debug
                  </option>,
                ]}
              </select>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="mb-3">
              <label className="form-label" htmlFor="rule-action-type">
                Action Type
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
                <option value="file">Log to File</option>
                <option value="remote_host">Send to Remote Host</option>
                <option value="all_users">Broadcast to All Users (*)</option>
                <option value="user">Send to Specific User(s)</option>
              </select>
              <p className="form-text text-muted small">
                {ruleBuilder.action_type === 'file' && 'Log messages to a local file'}
                {ruleBuilder.action_type === 'remote_host' &&
                  'Forward messages to a remote syslog server'}
                {ruleBuilder.action_type === 'all_users' &&
                  'Send messages to all logged-in users (emergency only)'}
                {ruleBuilder.action_type === 'user' && 'Send messages to specific user(s)'}
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
                  Log File Path
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
                    placeholder="/var/log/custom.log"
                  />
                </div>
                <p className="form-text text-muted small">
                  Full path to the log file. Directory must exist or be writable by syslog daemon.
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
                  Remote Hostname
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
                    placeholder="loghost.company.com"
                  />
                </div>
                <p className="form-text text-muted small">
                  Hostname or IP address of remote syslog server.
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-remote-protocol">
                  Protocol
                </label>
                <select
                  id="rule-remote-protocol"
                  className="form-select"
                  value={ruleBuilder.remote_protocol}
                  onChange={e => handleRuleBuilderChange('remote_protocol', e.target.value)}
                >
                  <option value="udp">UDP (Standard)</option>
                  <option value="tcp">TCP (Reliable)</option>
                </select>
                <p className="form-text text-muted small">
                  UDP is standard syslog protocol. TCP provides reliable delivery.
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-remote-port">
                  Port (Optional)
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
                    placeholder="514 (default)"
                  />
                </div>
                <p className="form-text text-muted small">
                  Leave empty for default port 514. Use custom port if required.
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
                  Username(s)
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
                    placeholder="root,operator"
                  />
                </div>
                <p className="form-text text-muted small">
                  Single user (e.g., &quot;root&quot;) or multiple users separated by commas (e.g.,
                  &quot;root,operator&quot;).
                </p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="rule-multiple-users">
                  Multiple Users
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
                    Multiple
                  </label>
                </div>
                <p className="form-text text-muted small">
                  Enable to send to multiple users (comma-separated).
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
                  <p className="fw-semibold">Emergency Broadcast Mode</p>
                  <p className="small mb-0">
                    This will send messages to all logged-in users&apos; terminals. Use only for
                    emergency situations as it interrupts all users.
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
            <span>Add Rule to Configuration</span>
          </button>
        </div>

        {/* Preview of generated rule */}
        <div className="alert alert-secondary mt-4">
          <h5 className="fs-6 fw-bold mb-2">Rule Preview ({serviceType.display} Format)</h5>
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
