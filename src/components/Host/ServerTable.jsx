import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ServerTable = ({ servers, onEdit, onDelete, onToggleInsecure, onAssignOrgs, loading }) => {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState(null);

  const maskApiKey = apiKey => {
    if (!apiKey || apiKey.length < 10) {
      return t('host.serverTable.notSet');
    }
    const start = apiKey.substring(0, 6);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  };

  const copyApiKey = async (apiKey, serverId) => {
    if (!apiKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(serverId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };
  if (servers.length === 0) {
    return (
      <div className="text-center p-6">
        <i className="fas fa-server fa-3x mb-3 text-muted" />
        <h3 className="fs-4 text-muted">{t('host.serverTable.empty.title')}</h3>
        <p className="text-muted mb-4">{t('host.serverTable.empty.message')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>{t('host.serverTable.columns.no')}</th>
            <th>{t('host.serverTable.columns.hostname')}</th>
            <th>{t('host.serverTable.columns.protocol')}</th>
            <th>{t('host.serverTable.columns.port')}</th>
            <th>{t('host.serverTable.columns.entityName')}</th>
            <th>{t('host.serverTable.columns.apiKey')}</th>
            <th>{t('host.serverTable.columns.selfSignedTls')}</th>
            <th>{t('host.serverTable.columns.lastUsed')}</th>
            <th>{t('host.serverTable.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server, index) => (
            <tr key={`${server.hostname}:${server.port}`}>
              <td>{index + 1}</td>
              <td>
                <strong>
                  {server.hostname || server.serverHostname || t('host.serverTable.noHostname')}
                </strong>
                {!server.hostname && !server.serverHostname && (
                  <small className="text-danger d-block">
                    {t('host.serverTable.missingHostname')}
                  </small>
                )}
              </td>
              <td>{server.protocol}</td>
              <td>{server.port}</td>
              <td>{server.entityName}</td>
              <td>
                <div className="input-group">
                  {server.api_key && (
                    <button
                      type="button"
                      className={`btn btn-sm ${copiedKey === server.id ? 'btn-success' : 'btn-light'}`}
                      onClick={() => copyApiKey(server.api_key, server.id)}
                      title={
                        copiedKey === server.id
                          ? t('host.serverTable.copied')
                          : t('host.serverTable.copyApiKey')
                      }
                      disabled={loading}
                    >
                      <i className={`fas ${copiedKey === server.id ? 'fa-check' : 'fa-copy'}`} />
                    </button>
                  )}
                  <span className="badge text-bg-light">{maskApiKey(server.api_key)}</span>
                </div>
              </td>
              <td>
                <div className="form-check form-switch mb-0">
                  <input
                    type="checkbox"
                    role="switch"
                    className="form-check-input"
                    checked={!!server.allow_insecure}
                    onChange={() => onToggleInsecure(server)}
                    disabled={loading}
                    title={t('host.serverTable.allowSelfSignedTls')}
                    aria-label={t('host.serverTable.allowSelfSignedTlsLabel', {
                      hostname: server.hostname,
                    })}
                  />
                </div>
              </td>
              <td>
                {server.lastUsed
                  ? new Date(server.lastUsed).toLocaleDateString()
                  : t('host.serverTable.never')}
              </td>
              <td>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={() => onEdit(server.hostname)}
                    disabled={loading}
                    title={t('host.serverTable.editServer')}
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-info"
                    onClick={() => onAssignOrgs(server)}
                    disabled={loading}
                    title={t('host.serverTable.assignOrgs')}
                  >
                    <i className="fas fa-building-user" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(server.id)}
                    disabled={loading}
                    title={t('host.serverTable.removeServer')}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ServerTable.propTypes = {
  servers: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleInsecure: PropTypes.func.isRequired,
  onAssignOrgs: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ServerTable;
