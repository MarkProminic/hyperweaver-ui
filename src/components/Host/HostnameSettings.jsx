import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';

const HostnameSettings = ({ server, onError }) => {
  const { t } = useTranslation();
  const [hostnameInfo, setHostnameInfo] = useState(null);
  const [newHostname, setNewHostname] = useState('');
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [applyImmediately, setApplyImmediately] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadHostnameInfo = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/hostname',
        'GET'
      );

      if (result.success) {
        setHostnameInfo(result.data);
        setNewHostname(result.data.hostname || '');
      } else {
        onError(result.message || t('host.hostnameSettings.errors.loadFailed'));
      }
    } catch (err) {
      onError(t('host.hostnameSettings.errors.loadError', { message: err.message }));
    } finally {
      setLoading(false);
    }
  }, [makeAgentRequest, server, onError, t]);

  // Load current hostname information
  useEffect(() => {
    loadHostnameInfo();
  }, [loadHostnameInfo]);

  const handleChangeHostname = async e => {
    e.preventDefault();

    if (!newHostname.trim()) {
      onError(t('host.hostnameSettings.errors.empty'));
      return;
    }

    if (newHostname === hostnameInfo?.hostname) {
      onError(t('host.hostnameSettings.errors.same'));
      return;
    }

    try {
      setChanging(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/hostname',
        'PUT',
        {
          hostname: newHostname.trim(),
          apply_immediately: applyImmediately,
        }
      );

      if (result.success) {
        // Refresh hostname info after successful change
        await loadHostnameInfo();

        // Show success message
        const message = applyImmediately
          ? `Hostname changed to "${newHostname}" and applied immediately`
          : `Hostname change to "${newHostname}" scheduled (requires reboot)`;

        // You might want to show a success notification here
        console.log(message);
      } else {
        onError(result.message || t('host.hostnameSettings.errors.changeFailed'));
      }
    } catch (err) {
      onError(t('host.hostnameSettings.errors.changeError', { message: err.message }));
    } finally {
      setChanging(false);
    }
  };

  const isHostnameValid = hostname => {
    // RFC compliant hostname/FQDN validation
    if (!hostname || hostname.length === 0 || hostname.length > 253) {
      return false;
    }

    // Split into labels (parts separated by dots)
    const labels = hostname.split('.');

    // Each label must be valid
    for (const label of labels) {
      // Label length check (1-63 characters)
      if (label.length === 0 || label.length > 63) {
        return false;
      }

      // Label format check: start/end with alphanumeric, hyphens allowed in middle
      const labelRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
      if (!labelRegex.test(label)) {
        return false;
      }
    }

    return true;
  };

  const hasChanges = newHostname !== hostnameInfo?.hostname;

  if (loading && !hostnameInfo) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-spinner fa-spin fa-2x" />
        </span>
        <p className="mt-2">{t('host.hostnameSettings.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.hostnameSettings.title')}</h2>
        <p>
          {t('host.hostnameSettings.viewPrefix')} <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* Current Hostname Information */}
      {hostnameInfo && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.hostnameSettings.currentInfo')}</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  <tr>
                    <td>
                      <strong>{t('host.hostnameSettings.currentHostname')}</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.hostname}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t('host.hostnameSettings.nodenameFile')}</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.nodename_file}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t('host.hostnameSettings.systemHostname')}</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.system_hostname}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>{t('host.hostnameSettings.configMatch')}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${hostnameInfo.matches ? 'text-bg-success' : 'text-bg-warning'}`}
                      >
                        {hostnameInfo.matches
                          ? t('host.hostnameSettings.yes')
                          : t('host.hostnameSettings.no')}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!hostnameInfo.matches && (
              <div className="alert alert-warning">
                <p>
                  <strong>{t('host.hostnameSettings.warning')}</strong>{' '}
                  {t('host.hostnameSettings.mismatchWarning')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Hostname Form */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.hostnameSettings.changeHostname')}</h3>

          <form onSubmit={handleChangeHostname}>
            <div className="mb-3">
              <label className="form-label" htmlFor="new-hostname-input">
                {t('host.hostnameSettings.newHostname')}
              </label>
              <input
                id="new-hostname-input"
                className={`form-control ${newHostname && !isHostnameValid(newHostname) ? 'is-invalid' : ''}`}
                type="text"
                placeholder={t('host.hostnameSettings.enterNewHostname')}
                value={newHostname}
                onChange={e => setNewHostname(e.target.value)}
                disabled={changing}
              />
              {newHostname && !isHostnameValid(newHostname) && (
                <p className="form-text text-danger">
                  {t('host.hostnameSettings.invalidHostname')}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label className="form-check-label">
                <input
                  type="checkbox"
                  checked={applyImmediately}
                  onChange={e => setApplyImmediately(e.target.checked)}
                  disabled={changing}
                />
                <span className="ms-2">{t('host.hostnameSettings.applyImmediately')}</span>
              </label>
              <p className="form-text text-muted">
                {applyImmediately
                  ? t('host.hostnameSettings.applyImmediatelyHelp')
                  : t('host.hostnameSettings.applyLaterHelp')}
              </p>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!hasChanges || !isHostnameValid(newHostname) || changing}
              >
                {changing && <span className="spinner-border spinner-border-sm" />}
                {t('host.hostnameSettings.changeHostname')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setNewHostname(hostnameInfo?.hostname || '')}
                disabled={!hasChanges || changing}
              >
                {t('host.hostnameSettings.reset')}
              </button>
              <button
                type="button"
                className="btn btn-info"
                onClick={loadHostnameInfo}
                disabled={loading || changing}
              >
                {loading && <span className="spinner-border spinner-border-sm" />}
                <span className="me-1">
                  <i className="fas fa-sync-alt" />
                </span>
                <span>{t('host.hostnameSettings.refresh')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

HostnameSettings.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default HostnameSettings;
