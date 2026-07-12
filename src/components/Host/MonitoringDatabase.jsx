import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { useServers } from '../../contexts/ServerContext';

/**
 * Monitoring database panel — what the agent's monitoring store holds:
 * per-table record counts and latest sample timestamps (GET
 * /monitoring/summary, both agents' shapes render generically), plus the
 * collection config where the status answer carries one. Renders NOTHING
 * when the store is empty — realtime-only agents keep no database, so
 * there is nothing to report on.
 */

const labelize = key =>
  key.replace(/(?<lower>[a-z])(?<upper>[A-Z])/gu, '$<lower> $<upper>').replace(/_/gu, ' ');

const MonitoringDatabase = ({ currentServer }) => {
  const { makeAgentRequest, getMonitoringStatus } = useServers();
  const [summary, setSummary] = useState(null);
  const [statusConfig, setStatusConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    setLoading(true);
    const [summaryResult, statusResult] = await Promise.all([
      makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'monitoring/summary'
      ),
      getMonitoringStatus(currentServer.hostname, currentServer.port, currentServer.protocol),
    ]);
    setSummary(summaryResult.success ? summaryResult.data : null);
    setStatusConfig(statusResult.success ? statusResult.data?.config || null : null);
    setLoading(false);
  }, [currentServer, makeAgentRequest, getMonitoringStatus]);

  useEffect(() => {
    setSummary(null);
    setStatusConfig(null);
    load();
  }, [load]);

  const recordCounts = summary?.recordCounts || {};
  const latestData = summary?.latestData || {};
  const tables = Object.keys(recordCounts).filter(table => recordCounts[table] > 0);

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="card mb-5">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="h5 mb-0 d-flex align-items-center gap-2">
            <i className="fas fa-database" />
            <span>Monitoring Database</span>
          </h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            disabled={loading}
            title="Refresh"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
          </button>
        </div>

        {(statusConfig?.collection_interval || statusConfig?.retention_days) && (
          <p className="form-text text-muted mt-0">
            {statusConfig.collection_interval && (
              <span className="me-3">
                Collection interval: <strong>{statusConfig.collection_interval}s</strong>
              </span>
            )}
            {statusConfig.retention_days && (
              <span>
                Retention: <strong>{statusConfig.retention_days} days</strong>
              </span>
            )}
          </p>
        )}

        <div className="table-responsive">
          <table className="table table-striped table-sm small mb-0">
            <thead>
              <tr>
                <th className="px-3">Data</th>
                <th className="px-3 text-end">Records</th>
                <th className="px-3">Latest sample</th>
              </tr>
            </thead>
            <tbody>
              {tables.map(table => (
                <tr key={table}>
                  <td className="px-3 text-capitalize">{labelize(table)}</td>
                  <td className="px-3 text-end">{recordCounts[table].toLocaleString()}</td>
                  <td className="px-3 text-muted">
                    {latestData[table] ? new Date(latestData[table]).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

MonitoringDatabase.propTypes = {
  currentServer: PropTypes.object,
};

export default MonitoringDatabase;
