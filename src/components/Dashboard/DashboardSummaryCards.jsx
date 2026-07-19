import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { hasMachines } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';

import { bytesToSize } from './dashboardUtils';

/**
 * Infrastructure summary cards — servers, machines, memory, health status.
 */
const DashboardSummaryCards = ({ summary, onShowHealthModal }) => {
  const { t } = useTranslation();
  const { servers } = useServers();
  const machinesLabel = resourceLabel(servers);
  const machinesAvailable = servers.some(hasMachines);

  return (
    <div className="row g-3 mb-3">
      <div className="col-12 col-sm-6 col-xl-3">
        <div className="card h-100">
          <div className="card-body text-center">
            <div className="text-uppercase small fw-semibold text-muted">
              {t('dashboard.summaryCards.totalServers')}
            </div>
            <div className="fs-2 fw-bold text-info">{summary.totalServers}</div>
            <div className="d-flex justify-content-around mt-2">
              <div className="text-center">
                <div className="text-uppercase small fw-semibold text-success">
                  {t('dashboard.summaryCards.online')}
                </div>
                <div className="fs-6 fw-bold">{summary.onlineServers}</div>
              </div>
              <div className="text-center">
                <div className="text-uppercase small fw-semibold text-danger">
                  {t('dashboard.summaryCards.offline')}
                </div>
                <div className="fs-6 fw-bold">{summary.offlineServers}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {machinesAvailable && (
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="text-uppercase small fw-semibold text-muted">
                {t('dashboard.summaryCards.totalMachines', { label: machinesLabel })}
              </div>
              <div className="fs-2 fw-bold text-primary">{summary.totalZones}</div>
              <div className="d-flex justify-content-around mt-2">
                <div className="text-center">
                  <div className="text-uppercase small fw-semibold text-success">
                    {t('dashboard.summaryCards.running')}
                  </div>
                  <div className="fs-6 fw-bold">{summary.runningZones}</div>
                </div>
                <div className="text-center">
                  <div className="text-uppercase small fw-semibold text-warning">
                    {t('dashboard.summaryCards.stopped')}
                  </div>
                  <div className="fs-6 fw-bold">{summary.stoppedZones}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="col-12 col-sm-6 col-xl-3">
        <div className="card h-100">
          <div className="card-body text-center">
            <div className="text-uppercase small fw-semibold text-muted">
              {t('dashboard.summaryCards.memoryUsage')}
            </div>
            <div className="fs-2 fw-bold text-info">
              {summary.totalMemory > 0
                ? `${Math.round((summary.usedMemory / summary.totalMemory) * 100)}%`
                : t('dashboard.summaryCards.notAvailable')}
            </div>
            <div className="mt-2">
              <div className="text-uppercase small fw-semibold text-muted">
                {summary.totalMemory > 0
                  ? `${bytesToSize(summary.usedMemory)} / ${bytesToSize(summary.totalMemory)}`
                  : t('dashboard.summaryCards.noDataAvailable')}
              </div>
              {summary.totalMemory > 0 && (
                <div
                  className="progress mt-2"
                  style={{ height: '0.5rem' }}
                  role="progressbar"
                  aria-valuenow={Math.round((summary.usedMemory / summary.totalMemory) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar bg-info"
                    style={{
                      width: `${(summary.usedMemory / summary.totalMemory) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-sm-6 col-xl-3">
        <button
          type="button"
          className="card h-100 w-100 text-reset p-0"
          onClick={() => {
            if (summary.totalIssues > 0) {
              onShowHealthModal();
            }
          }}
          title={summary.totalIssues > 0 ? t('dashboard.summaryCards.clickToViewDetails') : ''}
          style={{
            cursor: summary.totalIssues > 0 ? 'pointer' : 'default',
          }}
          disabled={summary.totalIssues === 0}
        >
          <div className="card-body text-center">
            <div className="text-uppercase small fw-semibold text-muted">
              {t('dashboard.summaryCards.healthStatus')}
            </div>
            <div className="fs-2 fw-bold text-success">{summary.healthyServers}</div>
            <div className="d-flex justify-content-around mt-2">
              <div className="text-center">
                <div className="text-uppercase small fw-semibold text-success">
                  {t('dashboard.summaryCards.healthy')}
                </div>
                <div className="fs-6 fw-bold">{summary.healthyServers}</div>
              </div>
              <div className="text-center">
                <div className="text-uppercase small fw-semibold text-warning">
                  {t('dashboard.summaryCards.issues')}
                </div>
                <div className="fs-6 fw-bold">{summary.totalIssues}</div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

DashboardSummaryCards.propTypes = {
  summary: PropTypes.shape({
    totalServers: PropTypes.number.isRequired,
    onlineServers: PropTypes.number.isRequired,
    offlineServers: PropTypes.number.isRequired,
    totalZones: PropTypes.number.isRequired,
    runningZones: PropTypes.number.isRequired,
    stoppedZones: PropTypes.number.isRequired,
    totalMemory: PropTypes.number.isRequired,
    usedMemory: PropTypes.number.isRequired,
    healthyServers: PropTypes.number.isRequired,
    totalIssues: PropTypes.number.isRequired,
  }).isRequired,
  onShowHealthModal: PropTypes.func.isRequired,
};

export default DashboardSummaryCards;
