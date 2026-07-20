import { Helmet } from '@dr.pogodin/react-helmet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
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
import DashboardWidget from './DashboardWidget';
import useDashboardLayout from './useDashboardLayout';

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
  const { layout, draggingId, setDraggingId, moveWidget, toggleCollapsed, toggleHidden } =
    useDashboardLayout();

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

  const widgetAvailable = id => (id === 'topology' ? !isDirect && servers.length > 0 : true);

  const widgetBody = id => {
    if (id === 'summary') {
      return summary ? (
        <DashboardSummaryCards
          summary={summary}
          onShowHealthModal={() => setShowHealthModal(true)}
        />
      ) : null;
    }
    if (id === 'quickActions') {
      return (
        <DashboardQuickActions
          servers={infrastructureData.servers || []}
          summary={summary || {}}
          onNavigateZoneRegister={navigateToZoneRegister}
          onNavigateZones={navigateToZones}
          onNavigateServerRegister={navigateToServerRegister}
          onNavigateSettings={navigateToSettings}
        />
      );
    }
    if (id === 'serverCards') {
      return (
        <DashboardServerCards
          servers={infrastructureData.servers || []}
          onNavigateToServer={navigateToServer}
          topologyByHost={topologyByHost}
        />
      );
    }
    return (
      <div className="card mb-0">
        <div className="card-body">
          <TopologyPanel fixedScope="all" sharedFeed={topologyFeed} />
        </div>
      </div>
    );
  };

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
                <div className="d-flex gap-2">
                  <Dropdown as={ButtonGroup} align="end" autoClose="outside">
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      <i className="fas fa-table-columns me-2" />
                      {t('dashboard.widgets.menu')}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {layout
                        .filter(row => widgetAvailable(row.id))
                        .map(row => (
                          <label
                            key={row.id}
                            className="dropdown-item d-flex align-items-center gap-2 mb-0 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="form-check-input m-0"
                              checked={!row.hidden}
                              onChange={() => toggleHidden(row.id)}
                            />
                            {t(`dashboard.widgets.${row.id}`)}
                          </label>
                        ))}
                    </Dropdown.Menu>
                  </Dropdown>
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

          {layout
            .filter(row => widgetAvailable(row.id) && !row.hidden)
            .map(row => (
              <DashboardWidget
                key={row.id}
                id={row.id}
                title={t(`dashboard.widgets.${row.id}`)}
                collapsed={row.collapsed}
                dragging={draggingId === row.id}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onDropOn={targetId => {
                  moveWidget(draggingId, targetId);
                  setDraggingId(null);
                }}
                onToggleCollapsed={toggleCollapsed}
                onHide={toggleHidden}
              >
                {widgetBody(row.id)}
              </DashboardWidget>
            ))}

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
