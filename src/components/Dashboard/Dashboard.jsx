import { Helmet } from '@dr.pogodin/react-helmet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useMode } from '../../contexts/ModeContext';
import { useServers } from '../../contexts/ServerContext';
import { hasMachines } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';
import TopologyPanel from '../Host/NetworkTopology/TopologyPanel';
import { useTopologyFeed } from '../Host/NetworkTopology/useTopologyFeed';

import DashboardHealthModal from './DashboardHealthModal';
import DashboardQuickActions from './DashboardQuickActions';
import DashboardServerCards from './DashboardServerCards';
import DashboardSummaryCards from './DashboardSummaryCards';
import { calculateInfrastructureSummary } from './dashboardUtils';

/**
 * Multi-Host Application Overview Dashboard
 *
 * Provides an infrastructure-wide view across all configured
 * Servers, showing aggregate data and health status.
 */
const Dashboard = () => {
  const { t } = useTranslation();
  const [infrastructureData, setInfrastructureData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const {
    makeAgentRequest,
    getMonitoringHealth,
    servers,
    loading: serversLoading,
    selectServer,
    clearMachine,
  } = useServers();
  const { isDirect } = useMode();
  const navigate = useNavigate();

  const topologyFeed = useTopologyFeed({ scope: 'all' });
  const topologyByHost = useMemo(
    () =>
      new Map(
        topologyFeed.hosts.map(host => [`${host.server.hostname}:${host.server.port}`, host.graph])
      ),
    [topologyFeed.hosts]
  );

  // The Dashboard is datacenter/host scope — a machine selection carried in from
  // /ui/machines would keep that machine highlighted in the tree (and in the
  // breadcrumb) while looking at the dashboard. Clear it on arrival, whatever the
  // navigation path (sidebar button, Datacenter node, breadcrumb, typed URL).
  useEffect(() => {
    clearMachine();
  }, [clearMachine]);

  const fetchInfrastructureData = useCallback(async () => {
    if (!servers || servers.length === 0) {
      setError(t('dashboard.dashboard.noServersConfigured'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      const serverPromises = servers.map(async server => {
        try {
          const [statsResult, healthResult] = await Promise.allSettled([
            makeAgentRequest(server.hostname, server.port, server.protocol, 'stats'),
            getMonitoringHealth(server.hostname, server.port, server.protocol),
          ]);

          const statsSuccess = statsResult.status === 'fulfilled' && statsResult.value.success;
          const healthSuccess = healthResult.status === 'fulfilled' && healthResult.value.success;

          const getErrorMessage = () => {
            if (statsSuccess) {
              return null;
            }
            if (statsResult.status === 'fulfilled') {
              return statsResult.value.message || 'Failed to fetch data';
            }
            return statsResult.reason?.message || 'Connection failed';
          };

          return {
            server,
            success: statsSuccess,
            data: statsSuccess ? statsResult.value.data : null,
            healthData: healthSuccess ? healthResult.value.data : null,
            error: getErrorMessage(),
          };
        } catch (fetchErr) {
          return {
            server,
            success: false,
            data: null,
            healthData: null,
            error: fetchErr.message || 'Connection failed',
          };
        }
      });

      const results = await Promise.all(serverPromises);

      setInfrastructureData({
        servers: results,
        summary: calculateInfrastructureSummary(results),
        lastUpdated: new Date().toISOString(),
      });
      setLastRefresh(new Date());
    } catch (outerErr) {
      setError(`Error fetching infrastructure overview: ${outerErr.message}`);
    } finally {
      setLoading(false);
    }
  }, [servers, makeAgentRequest, getMonitoringHealth, t]);

  // Navigation helpers
  const navigateToServer = useCallback(
    server => {
      selectServer(server);
      navigate('/ui/hosts');
    },
    [selectServer, navigate]
  );

  const navigateToZones = useCallback(() => {
    navigate('/ui/machines');
  }, [navigate]);

  const navigateToServerRegister = useCallback(() => {
    navigate('/ui/settings/hyperweaver?tab=servers');
  }, [navigate]);

  const navigateToZoneRegister = useCallback(() => {
    // The machine-create wizard lives on the Machines page (?create=1 opens
    // it) — /ui/zone-register is the legacy setup form, not machine creation.
    navigate('/ui/machines?create=1');
  }, [navigate]);

  // Direct mode has no Hyperweaver (Server) settings — the agent's own settings page is
  // THE settings page there. Without this, the button redirected to /ui/settings/hyperweaver,
  // which Layout bounces straight back to the dashboard in Direct mode: a silent no-op.
  const navigateToSettings = useCallback(() => {
    navigate(isDirect ? '/ui/settings/agent' : '/ui/settings');
  }, [navigate, isDirect]);

  useEffect(() => {
    if (!serversLoading && servers && servers.length > 0) {
      fetchInfrastructureData();

      const interval = setInterval(fetchInfrastructureData, 30 * 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [servers, serversLoading, fetchInfrastructureData]);

  // Loading state
  if (serversLoading || (loading && !infrastructureData.servers)) {
    return (
      <div className="hw-page-content-scrollable">
        <div className="container-fluid p-0">
          <div className="p-4 bg-body-secondary">
            <div className="card">
              <div className="card-body text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{t('dashboard.dashboard.loading')}</span>
                </div>
                <p className="mt-3 mb-0">{t('dashboard.dashboard.loadingOverview')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No servers state
  if (!servers || servers.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Infrastructure Overview - Hyperweaver</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="p-4 bg-body-secondary">
            <div className="alert alert-info">
              <h2 className="h4">{t('dashboard.dashboard.welcome')}</h2>
              <p className="mb-4">{t('dashboard.dashboard.welcomeDescription')}</p>
              <button type="button" onClick={navigateToServerRegister} className="btn btn-primary">
                <i className="fas fa-plus me-2" />
                {t('dashboard.dashboard.addServer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary } = infrastructureData;

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Infrastructure Overview - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>

      <div className="container-fluid p-0">
        <div className="p-4 bg-body-secondary">
          {/* Header */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 mb-1">{t('dashboard.dashboard.infrastructureOverview')}</h1>
                  <p className="text-muted mb-0">
                    {t('dashboard.dashboard.managing', {
                      totalServers: summary?.totalServers || 0,
                    })}
                    {servers.some(hasMachines) && (
                      <>
                        {' '}
                        {t('dashboard.dashboard.with', {
                          totalZones: summary?.totalZones || 0,
                          resource: resourceLabel(servers).toLowerCase(),
                        })}
                      </>
                    )}
                    {lastRefresh && (
                      <span className="ms-2">
                        •{' '}
                        {t('dashboard.dashboard.lastUpdated', {
                          time: lastRefresh.toLocaleTimeString(),
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={fetchInfrastructureData}
                    disabled={loading}
                  >
                    {loading ? (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                    ) : (
                      <i className="fas fa-sync-alt me-2" />
                    )}
                    {t('dashboard.dashboard.refresh')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              <p className="mb-0">{error}</p>
            </div>
          )}

          {summary && (
            <DashboardSummaryCards
              summary={summary}
              onShowHealthModal={() => setShowHealthModal(true)}
            />
          )}

          <DashboardQuickActions
            servers={infrastructureData.servers || []}
            summary={summary || {}}
            onNavigateZoneRegister={navigateToZoneRegister}
            onNavigateZones={navigateToZones}
            onNavigateServerRegister={navigateToServerRegister}
            onNavigateSettings={navigateToSettings}
          />

          <DashboardServerCards
            servers={infrastructureData.servers || []}
            onNavigateToServer={navigateToServer}
            topologyByHost={topologyByHost}
          />

          {!isDirect && servers.length > 0 && (
            <div className="card mb-3">
              <div className="card-body">
                <h2 className="fs-5 fw-bold mb-3">
                  <i className="fas fa-project-diagram me-2" />
                  {t('dashboard.dashboard.datacenterTopology')}
                </h2>
                <TopologyPanel fixedScope="all" sharedFeed={topologyFeed} />
              </div>
            </div>
          )}

          <DashboardHealthModal
            isOpen={showHealthModal}
            onClose={() => setShowHealthModal(false)}
            servers={infrastructureData.servers || []}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
