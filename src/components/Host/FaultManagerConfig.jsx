import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';

const getModuleTypeLabel = (moduleName, t) => {
  if (moduleName.includes('retire')) {
    return t('host.faultManagerConfig.moduleTypeRetireAgent');
  }
  if (moduleName.includes('detector')) {
    return t('host.faultManagerConfig.moduleTypeDetector');
  }
  if (moduleName.includes('response')) {
    return t('host.faultManagerConfig.moduleTypeResponse');
  }
  return t('host.faultManagerConfig.moduleTypeModule');
};

const FaultManagerConfig = ({ server }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  const loadConfig = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/fault-management/config',
        'GET'
      );

      if (result.success) {
        setConfig(result.data?.config || []);
      } else {
        setError(result.message || t('host.faultManagerConfig.errors.loadFailed'));
        setConfig([]);
      }
    } catch (err) {
      setError(t('host.faultManagerConfig.errors.loadError', { message: err.message }));
      setConfig([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const getModuleIcon = module => {
    if (module.includes('cpumem')) {
      return 'fas fa-microchip';
    }
    if (module.includes('disk')) {
      return 'fas fa-hdd';
    }
    if (module.includes('zfs')) {
      return 'fas fa-database';
    }
    if (module.includes('network')) {
      return 'fas fa-network-wired';
    }
    return 'fas fa-cog';
  };

  const getModuleTypeTag = module => {
    if (module.includes('retire')) {
      return 'text-bg-info';
    }
    if (module.includes('detector')) {
      return 'text-bg-warning';
    }
    if (module.includes('response')) {
      return 'text-bg-success';
    }
    return 'text-bg-secondary';
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center p-4">
            <i className="fas fa-spinner fa-spin fa-2x" />
            <p className="mt-2">{t('host.faultManagerConfig.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <h4 className="fs-6 fw-bold">
                <i className="fas fa-info-circle me-2" />
                <span>{t('host.faultManagerConfig.faultManagerStatus')}</span>
              </h4>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={loadConfig}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2" />
                <span>{t('host.faultManagerConfig.refresh')}</span>
              </button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <span className="form-label">{t('host.faultManagerConfig.totalModules')}</span>
                <p>
                  <span className="badge text-bg-info">{config.length}</span>
                </p>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <span className="form-label">{t('host.faultManagerConfig.moduleTypes')}</span>
                <div>
                  <div className="d-flex flex-wrap gap-1">
                    {[...new Set(config.map(m => m.module.split('-').pop()))].map(type => (
                      <span key={type} className="badge text-bg-secondary">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <span className="form-label">{t('host.faultManagerConfig.status')}</span>
                <p>
                  <span className="badge text-bg-success d-inline-flex align-items-center gap-1">
                    <i className="fas fa-check-circle" />
                    <span>{t('host.faultManagerConfig.active')}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Table */}
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold mb-4">
            <i className="fas fa-puzzle-piece me-2" />
            <span>{t('host.faultManagerConfig.faultManagementModules')}</span>
          </h4>

          {config.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>{t('host.faultManagerConfig.thModule')}</th>
                    <th>{t('host.faultManagerConfig.thVersion')}</th>
                    <th>{t('host.faultManagerConfig.thDescription')}</th>
                    <th>{t('host.faultManagerConfig.thType')}</th>
                  </tr>
                </thead>
                <tbody>
                  {config.map(module => (
                    <tr key={module.module}>
                      <td>
                        <div className="d-flex align-items-center">
                          <i className={`${getModuleIcon(module.module)} text-info`} />
                          <span className="ms-2 font-monospace fw-semibold">{module.module}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">v{module.version}</span>
                      </td>
                      <td>
                        <span className="small">
                          {module.description || t('host.faultManagerConfig.noDescription')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getModuleTypeTag(module.module)}`}>
                          {getModuleTypeLabel(module.module, t)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-4">
              <i className="fas fa-puzzle-piece fa-2x text-muted" />
              <p className="mt-2 text-muted">{t('host.faultManagerConfig.noModulesFound')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold mb-3">
            <i className="fas fa-question-circle me-2" />
            <span>{t('host.faultManagerConfig.faultManagerInformation')}</span>
          </h4>

          <div className="small">
            <div className="row g-3">
              <div className="col">
                <p>
                  <strong>{t('host.faultManagerConfig.commonModules')}</strong>
                </p>
                <ul>
                  <li>
                    <strong>cpumem-retire:</strong> {t('host.faultManagerConfig.cpumemRetireDesc')}
                  </li>
                  <li>
                    <strong>disk-retire:</strong> {t('host.faultManagerConfig.diskRetireDesc')}
                  </li>
                  <li>
                    <strong>zfs-retire:</strong> {t('host.faultManagerConfig.zfsRetireDesc')}
                  </li>
                </ul>
              </div>
              <div className="col">
                <p>
                  <strong>{t('host.faultManagerConfig.moduleTypesTitle')}</strong>
                </p>
                <ul>
                  <li>
                    <strong>{t('host.faultManagerConfig.retireAgentsLabel')}</strong>{' '}
                    {t('host.faultManagerConfig.retireAgentsDesc')}
                  </li>
                  <li>
                    <strong>{t('host.faultManagerConfig.detectorsLabel')}</strong>{' '}
                    {t('host.faultManagerConfig.detectorsDesc')}
                  </li>
                  <li>
                    <strong>{t('host.faultManagerConfig.responseAgentsLabel')}</strong>{' '}
                    {t('host.faultManagerConfig.responseAgentsDesc')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

FaultManagerConfig.propTypes = {
  server: PropTypes.object.isRequired,
};

export default FaultManagerConfig;
