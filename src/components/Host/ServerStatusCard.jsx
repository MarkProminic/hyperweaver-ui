import PropTypes from 'prop-types';

const ServerStatusCard = ({ testResult, useExistingApiKey }) => {
  if (!testResult) {
    return null;
  }

  return (
    <div className="mt-3">
      <h3 className="fs-6 fw-bold mb-2">Connection Status</h3>
      {testResult === 'success' && (
        <div className="alert alert-success">
          <p>
            <strong>✓ Connection Successful</strong>
          </p>
          <p>Server is reachable and ready for {useExistingApiKey ? 'setup' : 'bootstrap'}.</p>
        </div>
      )}
      {testResult === 'error' && (
        <div className="alert alert-danger">
          <p>
            <strong>✗ Connection Failed</strong>
          </p>
          <p>Please check your server details and try again.</p>
        </div>
      )}
      {testResult === 'warning' && (
        <div className="alert alert-warning">
          <p>
            <strong>⚠ Partial Success</strong>
          </p>
          <p>Server added but connection test failed.</p>
        </div>
      )}
    </div>
  );
};

ServerStatusCard.propTypes = {
  testResult: PropTypes.string,
  useExistingApiKey: PropTypes.bool.isRequired,
};

export default ServerStatusCard;
