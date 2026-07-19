import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
}) => {
  const { t } = useTranslation();

  return (
    <>
      <h3 className="fs-6 fw-bold mb-3">{t('host.serverForm.title')}</h3>

      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <div className="mb-3">
            <label className="form-label" htmlFor="server-protocol">
              {t('host.serverForm.protocol')}
            </label>
            <select
              id="server-protocol"
              className="form-select"
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              disabled={loading}
            >
              <option value="https">{t('host.serverForm.httpsOption')}</option>
              <option value="http">{t('host.serverForm.httpOption')}</option>
            </select>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <label className="form-label" htmlFor="server-hostname">
              {t('host.serverForm.hostname')}
            </label>
            <input
              type="text"
              id="server-hostname"
              className="form-control"
              placeholder={t('host.serverForm.hostnamePlaceholder')}
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
              {t('host.serverForm.port')}
            </label>
            <input
              type="number"
              id="server-port"
              className="form-control"
              placeholder={t('host.serverForm.portPlaceholder')}
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
            {t('host.serverForm.hasApiKey')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.serverForm.hasApiKeyHelp')}</p>
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
              {t('host.serverForm.allowSelfSigned')}
            </label>
          </div>
          <p className="form-text text-muted">{t('host.serverForm.allowSelfSignedHelp')}</p>
        </div>
      )}

      {useExistingApiKey && (
        <div className="mb-3">
          <label className="form-label" htmlFor="api-key-input">
            {t('host.serverForm.apiKey')}
          </label>
          <input
            type="password"
            id="api-key-input"
            className="form-control"
            placeholder={t('host.serverForm.apiKeyPlaceholder')}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={loading}
            required
          />
          <p className="form-text text-muted">{t('host.serverForm.apiKeyHelp')}</p>
        </div>
      )}

      {!useExistingApiKey && (
        <div className="mb-3">
          <label className="form-label" htmlFor="entity-name-input">
            {t('host.serverForm.entityName')}
          </label>
          <input
            type="text"
            id="entity-name-input"
            className="form-control"
            placeholder={t('host.serverForm.entityNamePlaceholder')}
            value={entityName}
            onChange={e => setEntityName(e.target.value)}
            disabled={loading}
            required
          />
          <p className="form-text text-muted">{t('host.serverForm.entityNameHelp')}</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="connection-url-display">
          {t('host.serverForm.connectionUrl')}
        </label>
        <input
          id="connection-url-display"
          type="text"
          className="form-control-plaintext"
          value={
            hostname
              ? `${protocol}://${hostname}:${port}`
              : t('host.serverForm.connectionUrlPlaceholder')
          }
          readOnly
        />
      </div>
    </>
  );
};

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
