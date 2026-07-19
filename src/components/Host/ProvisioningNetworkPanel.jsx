import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  getProvisioningNetworkStatus,
  setupProvisioningNetwork,
  teardownProvisioningNetwork,
} from '../../api/provisioningAPI';
import { ConfirmModal } from '../common';

/**
 * Provisioning-network panel (sync 2026-07-07, Agent AI's Manage-tab note):
 * the dedicated host-side provisioning network — status in the base's
 * component-map shape, setup/teardown as 202 tasks. Dormant by default per
 * Mark's ruling; this panel is where power users switch it on. Rides the
 * existing `provisioning` token — no gate of its own.
 */
const ProvisioningNetworkPanel = ({ server }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [confirmTeardown, setConfirmTeardown] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const result = await getProvisioningNetworkStatus(
      server.hostname,
      server.port,
      server.protocol
    );
    if (result.success) {
      setStatus(result.data || null);
      setError('');
    } else {
      setStatus(null);
      setError(t('host.provisioningNetworkPanel.loadFailed', { message: result.message }));
    }
    setLoading(false);
  }, [server, t]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runAction = async (label, call) => {
    setLoading(true);
    setMsg('');
    setError('');
    const result = await call(server.hostname, server.port, server.protocol);
    if (result.success) {
      const taskId = result.data?.task_id;
      setMsg(
        taskId
          ? t('host.provisioningNetworkPanel.actionQueuedTask', { label, taskId })
          : t('host.provisioningNetworkPanel.actionQueued', { label })
      );
    } else {
      setError(t('host.provisioningNetworkPanel.actionFailed', { label, message: result.message }));
    }
    setLoading(false);
    // The 202 task does the work — refresh shortly after queueing.
    setTimeout(loadStatus, 2000);
  };

  const components =
    status?.components && typeof status.components === 'object'
      ? Object.entries(status.components)
      : [];
  const config =
    status?.config && typeof status.config === 'object' ? Object.entries(status.config) : [];

  // Component values are OBJECTS on the wire (per-component detail maps),
  // not booleans — flatten them readably and derive a health color from any
  // boolean sub-values they carry.
  const componentHealth = value => {
    if (typeof value === 'boolean') {
      return value ? 'ok' : 'bad';
    }
    if (value && typeof value === 'object') {
      const flags = Object.values(value).filter(sub => typeof sub === 'boolean');
      if (flags.length === 0) {
        return 'unknown';
      }
      return flags.every(Boolean) ? 'ok' : 'bad';
    }
    return 'unknown';
  };

  const componentDetail = value => {
    if (typeof value === 'boolean') {
      return value
        ? t('host.provisioningNetworkPanel.ok')
        : t('host.provisioningNetworkPanel.missing');
    }
    if (value && typeof value === 'object') {
      return Object.entries(value)
        .map(([key, sub]) => `${key}: ${String(sub)}`)
        .join(' · ');
    }
    return String(value);
  };

  const HEALTH_CLASSES = {
    ok: 'text-bg-success',
    bad: 'text-bg-danger',
    unknown: 'text-bg-light',
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h4 className="fs-6 fw-bold mb-0">
            <i className="fas fa-diagram-project me-2" />
            {t('host.provisioningNetworkPanel.title')}
            {status && status.enabled !== false && (
              <span
                className={`badge ms-2 ${status.ready ? 'text-bg-success' : 'text-bg-warning'}`}
              >
                {status.ready
                  ? t('host.provisioningNetworkPanel.ready')
                  : t('host.provisioningNetworkPanel.notReady')}
              </span>
            )}
          </h4>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={loadStatus}
              disabled={loading}
            >
              <i className="fas fa-sync-alt" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              title={t('host.provisioningNetworkPanel.editSettingsTitle')}
              onClick={() => navigate('/ui/settings/agent')}
            >
              <i className="fas fa-sliders me-2" />
              {t('host.provisioningNetworkPanel.editSettings')}
            </button>
            {status && status.enabled !== false && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    runAction(
                      t('host.provisioningNetworkPanel.setupLabel'),
                      setupProvisioningNetwork
                    )
                  }
                  disabled={loading}
                >
                  <i className="fas fa-play me-2" />
                  {t('host.provisioningNetworkPanel.setUp')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setConfirmTeardown(true)}
                  disabled={loading}
                >
                  <i className="fas fa-trash me-2" />
                  {t('host.provisioningNetworkPanel.tearDown')}
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {msg && <div className="alert alert-info py-2">{msg}</div>}

        {status && status.enabled === false && (
          <div className="alert alert-info mb-0">
            <p className="mb-0">
              {status.message || t('host.provisioningNetworkPanel.disabledMessage')}
            </p>
          </div>
        )}

        {status && status.enabled !== false && (
          <>
            <p className="form-text text-muted mt-0">
              {t('host.provisioningNetworkPanel.changeAddressingBefore')}{' '}
              <code>provisioning.network</code>{' '}
              {t('host.provisioningNetworkPanel.changeAddressingAfter')}
            </p>
            {components.length > 0 && (
              <div className="mb-3">
                <h6 className="fw-bold">{t('host.provisioningNetworkPanel.components')}</h6>
                <div className="table-responsive">
                  <table className="table table-striped table-sm small mb-0">
                    <tbody>
                      {components.map(([name, value]) => (
                        <tr key={name}>
                          <td className="px-3 py-1">
                            <span className={`badge ${HEALTH_CLASSES[componentHealth(value)]}`}>
                              {name}
                            </span>
                          </td>
                          <td className="px-3 py-1">
                            <code className="small">{componentDetail(value)}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {config.length > 0 && (
              <div className="table-responsive">
                <table className="table table-striped table-sm small mb-0">
                  <tbody>
                    {config.map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-3 py-2">
                          <strong>{key}</strong>
                        </td>
                        <td className="px-3 py-2">
                          <code className="small">{String(value)}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {!status && !error && loading && (
          <p className="text-muted mb-0">{t('host.provisioningNetworkPanel.loading')}</p>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmTeardown}
        onClose={() => setConfirmTeardown(false)}
        onConfirm={() => {
          setConfirmTeardown(false);
          runAction(t('host.provisioningNetworkPanel.teardownLabel'), teardownProvisioningNetwork);
        }}
        title={t('host.provisioningNetworkPanel.teardownTitle')}
        message={t('host.provisioningNetworkPanel.teardownMessage', {
          hostname: server.hostname,
        })}
        confirmText={t('host.provisioningNetworkPanel.tearDown')}
        loading={loading}
      />
    </div>
  );
};

ProvisioningNetworkPanel.propTypes = {
  server: PropTypes.object.isRequired,
};

export default ProvisioningNetworkPanel;
