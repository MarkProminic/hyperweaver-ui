import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';

/**
 * Server Setup component for bootstrapping Servers
 * @returns {JSX.Element} ServerSetup component
 */
const ServerSetup = () => {
  const { t } = useTranslation();
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState('5001');
  const [protocol, setProtocol] = useState('https');
  const [entityName, setEntityName] = useState('Hyperweaver-Production');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addServer, testServer, refreshServers } = useServers();

  /**
   * Handle server bootstrap form submission
   * @param {Event} e - Form submit event
   */
  const handleBootstrap = async e => {
    e.preventDefault();

    if (!hostname || !port || !protocol || !entityName) {
      setMsg(t('auth.serverSetup.allFieldsRequired'));
      return;
    }

    if (!isAuthenticated) {
      setMsg(t('auth.serverSetup.loginFirstBootstrap'));
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      // Add server (this will bootstrap automatically)
      const result = await addServer({
        hostname,
        port: parseInt(port),
        protocol,
        entityName,
      });

      if (result.success) {
        setMsg(t('auth.serverSetup.bootstrapSuccessMsg'));

        // Test the connection
        const testResult = await testServer({
          hostname,
          port: parseInt(port),
          protocol,
        });

        if (testResult.success) {
          setMsg(t('auth.serverSetup.bootstrapVerifiedMsg'));

          // Refresh servers context
          await refreshServers();

          setTimeout(() => {
            navigate('/ui');
          }, 2000);
        } else {
          setMsg(`Bootstrap successful but connection test failed: ${testResult.message}`);
        }
      } else {
        setMsg(result.message);
      }
    } catch (bootstrapErr) {
      console.error('Bootstrap error:', bootstrapErr);
      setMsg(t('auth.serverSetup.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Test connection to server without bootstrapping
   */
  const handleTestConnection = async () => {
    if (!hostname || !port || !protocol) {
      setMsg(t('auth.serverSetup.fillFieldsFirst'));
      return;
    }

    if (!isAuthenticated) {
      setMsg(t('auth.serverSetup.loginFirstTest'));
      return;
    }

    try {
      setLoading(true);
      setMsg(t('auth.serverSetup.testingConnection'));

      const result = await testServer({
        hostname,
        port: parseInt(port),
        protocol,
      });

      if (result.success) {
        setMsg(t('auth.serverSetup.testSuccessMsg'));
      } else {
        setMsg(`Connection test failed: ${result.message}`);
      }
    } catch (testErr) {
      console.error('Test connection error:', testErr);
      setMsg(t('auth.serverSetup.testFailedCheckDetails'));
    } finally {
      setLoading(false);
    }
  };

  const getNotificationClass = () => {
    if (msg.includes('successful') || msg.includes('verified')) {
      return 'alert-success';
    }
    if (msg.includes('failed') || msg.includes('error')) {
      return 'alert-danger';
    }
    return 'alert-info';
  };

  return (
    <section className="min-vh-100 d-flex align-items-center py-4">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Server Setup - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-6">
            <form onSubmit={handleBootstrap} className="card">
              <div className="card-body p-4">
                <h1 className="h3 text-center mb-1">{t('auth.serverSetup.serverSetupTitle')}</h1>
                <p className="text-muted text-center mb-4">
                  {t('auth.serverSetup.bootstrapNewServerDesc')}
                </p>

                {user && (
                  <div className="alert alert-info">
                    <p className="mb-1">
                      <strong>
                        {t('auth.serverSetup.welcomeMsg', { username: user.username })}
                      </strong>
                    </p>
                    <p className="mb-0">{t('auth.serverSetup.canAddServersMsg')}</p>
                  </div>
                )}

                {msg && (
                  <div className={`alert ${getNotificationClass()}`}>
                    <p className="mb-0">{msg}</p>
                  </div>
                )}

                <div className="row">
                  <div className="col-12 col-md-3">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="protocol">
                        {t('auth.serverSetup.protocolLabel')}
                      </label>
                      <select
                        id="protocol"
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
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="hostname">
                        {t('auth.serverSetup.hostnameLabel')}
                      </label>
                      <input
                        id="hostname"
                        type="text"
                        className="form-control"
                        placeholder={t('auth.serverSetup.hostnamePlaceholder')}
                        value={hostname}
                        onChange={e => setHostname(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-md-3">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="port">
                        {t('auth.serverSetup.portLabel')}
                      </label>
                      <input
                        id="port"
                        type="number"
                        className="form-control"
                        placeholder={t('auth.serverSetup.portPlaceholder')}
                        value={port}
                        onChange={e => setPort(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="entityName">
                    {t('auth.serverSetup.entityNameLabel')}
                  </label>
                  <input
                    id="entityName"
                    type="text"
                    className="form-control"
                    placeholder={t('auth.serverSetup.entityNamePlaceholder')}
                    value={entityName}
                    onChange={e => setEntityName(e.target.value)}
                    disabled={loading}
                  />
                  <div className="form-text text-muted">
                    {t('auth.serverSetup.entityNameHelpText')}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-info flex-fill"
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    {t('auth.serverSetup.testConnectionBtn')}
                  </button>
                  <button type="submit" className="btn btn-primary flex-fill" disabled={loading}>
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    {t('auth.serverSetup.bootstrapServerBtn')}
                  </button>
                </div>

                <div className="text-center mt-4">
                  <p className="form-text text-muted">
                    <strong>{t('auth.serverSetup.bootstrapNote')}</strong>
                  </p>
                </div>

                <div className="text-center mt-3">
                  <a href="/ui" className="btn btn-link">
                    {t('auth.serverSetup.skipSetupLink')}
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServerSetup;
