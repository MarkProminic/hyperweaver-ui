import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { makeAgentRequest } from '../../api/serverUtils';

const ProvisioningStatus = ({ currentServer }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentServer) {
        return;
      }
      try {
        setLoading(true);
        const result = await makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'provisioning/status'
        );
        if (result.success) {
          setStatus(result.data);
        } else {
          setError(t('host.provisioningStatus.loadFailed', { message: result.message }));
        }
        setLoading(false);
      } catch (err) {
        setError(t('host.provisioningStatus.loadFailed', { message: err.message }));
        setLoading(false);
      }
    };

    fetchStatus();
  }, [currentServer, t]);

  if (loading) {
    return <p>{t('host.provisioningStatus.loading')}</p>;
  }

  if (error) {
    return <p className="text-danger">{error}</p>;
  }

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="h5">{t('host.provisioningStatus.title')}</h3>
        <div className="row g-2">
          {status &&
            Object.entries(status).map(([pkg, installed]) => (
              <div className="col-12 col-sm-6 col-xl-3" key={pkg}>
                <div className="d-flex justify-content-between">
                  <span>{pkg}</span>
                  <span className={`badge ${installed ? 'text-bg-success' : 'text-bg-danger'}`}>
                    {installed
                      ? t('host.provisioningStatus.installed')
                      : t('host.provisioningStatus.notInstalled')}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

ProvisioningStatus.propTypes = {
  currentServer: PropTypes.shape({
    protocol: PropTypes.string,
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

export default React.memo(ProvisioningStatus);
