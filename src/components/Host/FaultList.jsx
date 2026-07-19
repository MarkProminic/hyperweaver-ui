import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';

import FaultDetailsModal from './FaultDetailsModal';
import FaultTable from './FaultTable';
import { getSeverityTagClass } from './FaultUtils';

const FaultList = ({ server }) => {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    all: false,
    summary: false,
    limit: 50,
    force_refresh: false,
  });

  // Modal states
  const [selectedFault, setSelectedFault] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { makeAgentRequest } = useServers();
  const { t } = useTranslation();

  const loadFaults = useCallback(
    async (forceRefresh = false) => {
      if (!server || !makeAgentRequest) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const params = {
          all: filters.all,
          summary: filters.summary,
          limit: filters.limit,
          force_refresh: forceRefresh,
        };

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'system/fault-management/faults',
          'GET',
          null,
          params
        );

        if (result.success) {
          setFaults(result.data?.faults || []);
          setSummary(result.data?.summary || null);
        } else {
          setError(result.message || t('host.faultList.errors.loadFailed'));
          setFaults([]);
          setSummary(null);
        }
      } catch (err) {
        setError(t('host.faultList.errors.loadError', { message: err.message }));
        setFaults([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [server, makeAgentRequest, filters.all, filters.summary, filters.limit, t]
  );

  useEffect(() => {
    loadFaults();
  }, [loadFaults]);

  const handleFaultAction = async (uuid, action, fmri = null) => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = action === 'acquit' ? { target: uuid } : { fmri };

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/fault-management/actions/${action}`,
        'POST',
        payload
      );

      if (result.success) {
        // Refresh faults list after action
        setFilters(prev => ({ ...prev, force_refresh: true }));
        await loadFaults();
      } else {
        setError(result.message || t('host.faultList.errors.actionFailed', { action }));
      }
    } catch (err) {
      setError(t('host.faultList.errors.actionError', { action, message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = fault => {
    // Details are already included in the fault list response, no need for API call
    setSelectedFault(fault);
    setShowDetailsModal(true);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      force_refresh: field === 'all' || field === 'limit', // Force refresh for these changes
    }));
  };

  const clearFilters = () => {
    setFilters({
      all: false,
      summary: false,
      limit: 50,
      force_refresh: true,
    });
  };

  return (
    <div>
      {/* Fault Summary */}
      {summary && (
        <div className="card mb-4">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-chart-pie me-2" />
              <span>{t('host.faultList.faultSummary')}</span>
            </h4>

            <div className="row g-3">
              <div className="col">
                <div className="mb-3">
                  <span className="form-label">{t('host.faultList.totalFaults')}</span>
                  <p>
                    <span className="badge text-bg-info">{summary.totalFaults}</span>
                  </p>
                </div>
              </div>
              {summary.severityLevels.length > 0 && (
                <div className="col">
                  <div className="mb-3">
                    <span className="form-label">{t('host.faultList.severityLevels')}</span>
                    <div>
                      <div className="d-flex flex-wrap gap-1">
                        {[...new Set(summary.severityLevels.map(level => level.toLowerCase()))].map(
                          level => (
                            <span key={level} className={`badge ${getSeverityTagClass(level)}`}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {summary.faultClasses.length > 0 && (
                <div className="col">
                  <div className="mb-3">
                    <span className="form-label">{t('host.faultList.faultClasses')}</span>
                    <div>
                      <div className="d-flex flex-wrap gap-1">
                        {summary.faultClasses.slice(0, 3).map(cls => (
                          <span key={cls} className="badge text-bg-secondary">
                            {cls.split('.').pop()}
                          </span>
                        ))}
                        {summary.faultClasses.length > 3 && (
                          <span className="badge text-bg-secondary">
                            {t('host.faultList.moreClasses', {
                              count: summary.faultClasses.length - 3,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fault Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-3">
              <div className="mb-3">
                <label htmlFor="fault-limit" className="form-label">
                  {t('host.faultList.maxFaults')}
                </label>
                <div>
                  <select
                    id="fault-limit"
                    className="form-select"
                    value={filters.limit}
                    onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                  >
                    <option value={25}>{t('host.faultList.faultsOption', { count: 25 })}</option>
                    <option value={50}>{t('host.faultList.faultsOption', { count: 50 })}</option>
                    <option value={100}>{t('host.faultList.faultsOption', { count: 100 })}</option>
                    <option value={200}>{t('host.faultList.faultsOption', { count: 200 })}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label">{t('host.faultList.includeResolved')}</span>
                <div>
                  <div className="form-check form-switch">
                    <input
                      id="fault-include-resolved"
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={filters.all}
                      onChange={e => handleFilterChange('all', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="fault-include-resolved">
                      {t('host.faultList.showAll')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label" aria-hidden="true">
                  &nbsp;
                </span>
                <div>
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={() => loadFaults(true)}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    <span>{t('host.faultList.refresh')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label" aria-hidden="true">
                  &nbsp;
                </span>
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={clearFilters}
                    disabled={loading}
                  >
                    <i className="fas fa-times me-2" />
                    <span>{t('host.faultList.clear')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Faults Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold">
                {t('host.faultList.systemFaultsCount', { count: faults.length })}
                {loading && (
                  <span className="ms-2">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                )}
              </h3>
            </div>
          </div>

          <FaultTable
            faults={faults}
            loading={loading}
            onAction={handleFaultAction}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Fault Details Modal */}
      {showDetailsModal && selectedFault && (
        <FaultDetailsModal
          fault={selectedFault}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFault(null);
          }}
        />
      )}
    </div>
  );
};

FaultList.propTypes = {
  server: PropTypes.object.isRequired,
};

export default FaultList;
