import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { hasMachines } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';

import { getServerHealthStatus, getStatusColor } from './dashboardUtils';

/**
 * Individual server status cards with health indicators.
 */
const ServerCard = ({ serverResult, onNavigateToServer }) => {
  const { t } = useTranslation();
  const { server, success, data, error: serverError } = serverResult;
  const status = getServerHealthStatus(serverResult);
  const statusColor = getStatusColor(status);

  let statusTooltip = t('dashboard.serverCards.hostHealthy');
  if (status === 'offline') {
    statusTooltip = serverError || t('dashboard.serverCards.connectionFailed');
  } else if (status === 'warning') {
    const issues = [];
    if (data?.loadavg?.[0] > 2) {
      issues.push(t('dashboard.serverCards.highCpuLoad'));
    }
    if (data?.totalmem && data?.freemem && data.freemem / data.totalmem < 0.1) {
      issues.push(t('dashboard.serverCards.lowMemory'));
    }
    statusTooltip = issues.join(', ');
  }

  return (
    <div className="col-12 col-xl-6">
      <div className="card h-100">
        <div className="card-body">
          <h2 className="h5 mb-3 d-flex align-items-center gap-2">
            <span className={statusColor} title={statusTooltip}>
              <i className="fas fa-circle small" />
            </span>
            {/* A user-set entityName wins; then the agent's self-reported
                hostname beats the registered address (127.0.0.1 in Direct
                mode); a dead connection falls back. */}
            <span title={`Registered as ${server.hostname}:${server.port}`}>
              {server.entityName || data?.hostname || server.hostname}
            </span>
          </h2>

          {success && data ? (
            <>
              <p className="text-muted mb-3">
                {data?.type || 'Unknown'} {data?.release || ''}
              </p>

              <div className="row mb-3">
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {resourceLabel(server)}
                  </div>
                  <div className="fs-4 fw-bold">
                    {hasMachines(server)
                      ? `${data.runningmachines?.length || 0} / ${data.allmachines?.length || 0}`
                      : '—'}
                  </div>
                </div>
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {t('dashboard.serverCards.cpuLoad')}
                  </div>
                  <div className="fs-4 fw-bold">
                    {data.loadavg
                      ? data.loadavg[0].toFixed(2)
                      : t('dashboard.serverCards.notAvailable')}
                  </div>
                </div>
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {t('dashboard.serverCards.memory')}
                  </div>
                  <div className="fs-4 fw-bold">
                    {data.totalmem && data.freemem
                      ? `${Math.round(((data.totalmem - data.freemem) / data.totalmem) * 100)}%`
                      : t('dashboard.serverCards.notAvailable')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={() => onNavigateToServer(server)}
              >
                <i className="fas fa-arrow-right me-2" />
                {t('dashboard.serverCards.viewDetails')}
              </button>
            </>
          ) : (
            <>
              <p className="text-muted mb-3">{t('dashboard.serverCards.connectionFailedFull')}</p>

              <div className="row mb-3">
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {resourceLabel(server)}
                  </div>
                  <div className="fs-4 fw-bold text-muted">-</div>
                </div>
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {t('dashboard.serverCards.cpuLoad')}
                  </div>
                  <div className="fs-4 fw-bold text-muted">-</div>
                </div>
                <div className="col text-center">
                  <div className="text-uppercase small fw-semibold text-muted">
                    {t('dashboard.serverCards.memory')}
                  </div>
                  <div className="fs-4 fw-bold text-muted">-</div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={() => onNavigateToServer(server)}
                disabled
              >
                <i className="fas fa-arrow-right me-2" />
                {t('dashboard.serverCards.viewDetails')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ServerCard.propTypes = {
  serverResult: PropTypes.shape({
    server: PropTypes.object.isRequired,
    success: PropTypes.bool.isRequired,
    data: PropTypes.object,
    error: PropTypes.string,
  }).isRequired,
  onNavigateToServer: PropTypes.func.isRequired,
};

const DashboardServerCards = ({ servers, onNavigateToServer }) => (
  <div className="row g-2 mb-0">
    {servers?.map(serverResult => (
      <ServerCard
        key={`${serverResult.server.hostname}-${serverResult.server.port}-card`}
        serverResult={serverResult}
        onNavigateToServer={onNavigateToServer}
      />
    ))}
  </div>
);

DashboardServerCards.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  onNavigateToServer: PropTypes.func.isRequired,
};

export default DashboardServerCards;
