import PropTypes from 'prop-types';

const ServerForm = ({
  hostname,
  setHostname,
  port,
  setPort,
  protocol,
  setProtocol,
  entityName,
  setEntityName,
  apiKey,
  setApiKey,
  useExistingApiKey,
  setUseExistingApiKey,
  allowInsecure,
  setAllowInsecure,
  loading,
}) => (
  <>
    <h3 className="fs-6 fw-bold mb-3">Server Configuration</h3>

    <div className="row g-3">
      <div className="col-12 col-lg-3">
        <div className="mb-3">
          <label className="form-label" htmlFor="server-protocol">
            Protocol
          </label>
          <select
            id="server-protocol"
            className="form-select"
            value={protocol}
            onChange={e => setProtocol(e.target.value)}
            disabled={loading}
          >
            <option value="https">HTTPS</option>
            <option value="http">HTTP</option>
          </select>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="mb-3">
          <label className="form-label" htmlFor="server-hostname">
            Server Hostname
          </label>
          <input
            type="text"
            id="server-hostname"
            className="form-control"
            placeholder="agent.example.com"
            value={hostname}
            onChange={e => setHostname(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>
      <div className="col-12 col-lg-3">
        <div className="mb-3">
          <label className="form-label" htmlFor="server-port">
            Port
          </label>
          <input
            type="number"
            id="server-port"
            className="form-control"
            placeholder="5001"
            value={port}
            onChange={e => setPort(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>
    </div>

    <div className="mb-3">
      <div className="form-check">
        <input
          type="checkbox"
          id="use-existing-api-key-checkbox"
          className="form-check-input"
          checked={useExistingApiKey}
          onChange={e => setUseExistingApiKey(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="use-existing-api-key-checkbox">
          I have an existing API key
        </label>
      </div>
      <p className="form-text text-muted">
        Check this if you already have an API key and don&apos;t need to bootstrap
      </p>
    </div>

    {protocol === 'https' && (
      <div className="mb-3">
        <div className="form-check">
          <input
            type="checkbox"
            id="allow-insecure-checkbox"
            className="form-check-input"
            checked={allowInsecure}
            onChange={e => setAllowInsecure(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="allow-insecure-checkbox">
            Allow self-signed TLS certificate
          </label>
        </div>
        <p className="form-text text-muted">
          Check this if the agent uses a self-signed certificate (bootstrap and all requests will
          skip certificate verification for this server)
        </p>
      </div>
    )}

    {useExistingApiKey && (
      <div className="mb-3">
        <label className="form-label" htmlFor="api-key-input">
          API Key
        </label>
        <input
          type="password"
          id="api-key-input"
          className="form-control"
          placeholder="Enter your existing API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          disabled={loading}
          required
        />
        <p className="form-text text-muted">Enter the API key you received from your Server</p>
      </div>
    )}

    {!useExistingApiKey && (
      <div className="mb-3">
        <label className="form-label" htmlFor="entity-name-input">
          Entity Name
        </label>
        <input
          type="text"
          id="entity-name-input"
          className="form-control"
          placeholder="Hyperweaver-Production"
          value={entityName}
          onChange={e => setEntityName(e.target.value)}
          disabled={loading}
          required
        />
        <p className="form-text text-muted">
          This name will identify this Hyperweaver instance on the Server
        </p>
      </div>
    )}

    <div className="mb-3">
      <label className="form-label" htmlFor="connection-url-display">
        Connection URL
      </label>
      <input
        id="connection-url-display"
        type="text"
        className="form-control-plaintext"
        value={hostname ? `${protocol}://${hostname}:${port}` : 'Enter hostname to see URL'}
        readOnly
      />
    </div>
  </>
);

ServerForm.propTypes = {
  hostname: PropTypes.string.isRequired,
  setHostname: PropTypes.func.isRequired,
  port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setPort: PropTypes.func.isRequired,
  protocol: PropTypes.string.isRequired,
  setProtocol: PropTypes.func.isRequired,
  entityName: PropTypes.string.isRequired,
  setEntityName: PropTypes.func.isRequired,
  apiKey: PropTypes.string.isRequired,
  setApiKey: PropTypes.func.isRequired,
  useExistingApiKey: PropTypes.bool.isRequired,
  setUseExistingApiKey: PropTypes.func.isRequired,
  allowInsecure: PropTypes.bool.isRequired,
  setAllowInsecure: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ServerForm;
