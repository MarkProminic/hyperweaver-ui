import PropTypes from 'prop-types';

const ServerHelpPanel = ({ useExistingApiKey }) => (
  <div>
    <h3 className="fs-6 fw-bold mb-3">Setup Guide</h3>
    <div className="small">
      <p>
        <strong>Steps:</strong>
      </p>
      <ol>
        <li>Enter your Server details</li>
        <li>Choose bootstrap or existing API key</li>
        <li>Click &quot;Test Connection&quot; to verify connectivity</li>
        <li>
          Click &quot;{useExistingApiKey ? 'Add Server' : 'Bootstrap Server'}
          &quot; to complete setup
        </li>
        <li>Start managing machines!</li>
      </ol>

      <p className="mt-4">
        <strong>Requirements:</strong>
      </p>
      <ul>
        <li>Server must be running</li>
        {!useExistingApiKey && <li>Bootstrap endpoint must be enabled</li>}
        <li>Network connectivity to server</li>
        {useExistingApiKey && <li>Valid API key from Server</li>}
      </ul>

      <p className="mt-4">
        <strong>Security:</strong>
      </p>
      <ul>
        <li>API keys are securely stored</li>
        {!useExistingApiKey && <li>Bootstrap endpoint auto-disables after first use</li>}
        <li>All communications are authenticated</li>
      </ul>
    </div>
  </div>
);

ServerHelpPanel.propTypes = {
  useExistingApiKey: PropTypes.bool.isRequired,
};

export default ServerHelpPanel;
