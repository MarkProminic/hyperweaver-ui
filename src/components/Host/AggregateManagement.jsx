import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import AggregateCreateModal from './AggregateCreateModal';
import AggregateDetailsModal from './AggregateDetailsModal';
import AggregateTable from './AggregateTable';

const AggregateManagement = ({ server, onError }) => {
  const [aggregates, setAggregates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAggregate, setSelectedAggregate] = useState(null);
  const [aggregateDetails, setAggregateDetails] = useState(null);
  const [cdpServiceRunning, setCdpServiceRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({
    state: '',
    policy: '',
  });

  const { makeAgentRequest } = useServers();

  const loadAggregates = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.state) {
        params.state = filters.state;
      }
      if (filters.policy) {
        params.policy = filters.policy;
      }
      params.extended = true;

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/aggregates',
        'GET',
        null,
        params
      );

      if (result.success) {
        setAggregates(result.data?.aggregates || []);
      } else {
        onError(result.message || 'Failed to load link aggregates');
        setAggregates([]);
      }
    } catch (err) {
      onError(`Error loading link aggregates: ${err.message}`);
      setAggregates([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError, filters.state, filters.policy]);

  const checkCdpServiceStatus = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'services',
        'GET',
        null,
        { pattern: 'cdp' }
      );

      if (result.success && result.data) {
        const cdpService = result.data.find(
          service => service.fmri && service.fmri.includes('network/cdp')
        );
        setCdpServiceRunning(cdpService && cdpService.state === 'online');
      } else {
        setCdpServiceRunning(false);
      }
    } catch (err) {
      void err;
      setCdpServiceRunning(false);
    }
  }, [server, makeAgentRequest]);

  useEffect(() => {
    loadAggregates();
    checkCdpServiceStatus();
  }, [loadAggregates, checkCdpServiceStatus]);

  const handleDeleteAggregate = async () => {
    if (!server || !makeAgentRequest || !deleteTarget) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/aggregates/${encodeURIComponent(deleteTarget)}`,
        'DELETE',
        null,
        {
          temporary: false,
          created_by: 'api',
        }
      );

      if (result.success) {
        await loadAggregates();
      } else {
        onError(result.message || `Failed to delete link aggregate "${deleteTarget}"`);
      }
    } catch (err) {
      onError(`Error deleting link aggregate "${deleteTarget}": ${err.message}`);
    } finally {
      setDeleteTarget(null);
      setLoading(false);
    }
  };

  const handleViewDetails = async aggregate => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const aggregateName = aggregate.name || aggregate.link;

      if (!aggregateName) {
        onError('Unable to determine aggregate name');
        return;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/aggregates/${encodeURIComponent(aggregateName)}?extended=true&lacp=true`,
        'GET'
      );

      if (result.success) {
        setSelectedAggregate(aggregate);
        setAggregateDetails(result.data);
        setShowDetailsModal(true);
      } else {
        onError(result.message || 'Failed to load aggregate details');
      }
    } catch (err) {
      onError(`Error loading aggregate details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAggregate(null);
    setAggregateDetails(null);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      state: '',
      policy: '',
    });
  };

  return (
    <div>
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAggregate}
        title="Delete Link Aggregate"
        message={`Are you sure you want to delete link aggregate "${deleteTarget}"?`}
        confirmText="Delete"
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={loading}
      />

      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Link Aggregation Management</h2>
        <p>
          Manage link aggregates (LAGs) on <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* CDP Warning */}
      {cdpServiceRunning && (
        <div className="alert alert-warning mb-4">
          <div className="d-flex align-items-center">
            <i className="fas fa-exclamation-triangle me-2" />
            <div className="ms-2">
              <strong>CDP Service Detected</strong>
              <br />
              The Cisco Discovery Protocol (CDP) service is currently running. Link aggregates
              cannot be created while CDP is active. You can disable CDP when creating a new
              aggregate.
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="aggregate-filter-state" className="form-label">
                  Filter by State
                </label>
                <select
                  id="aggregate-filter-state"
                  className="form-select"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label htmlFor="aggregate-filter-policy" className="form-label">
                  Filter by Policy
                </label>
                <select
                  id="aggregate-filter-policy"
                  className="form-select"
                  value={filters.policy}
                  onChange={e => handleFilterChange('policy', e.target.value)}
                >
                  <option value="">All Policies</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                  <option value="L2L3">L2L3</option>
                  <option value="L2L4">L2L4</option>
                  <option value="L3L4">L3L4</option>
                  <option value="L2L3L4">L2L3L4</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadAggregates}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <i className="fas fa-times me-2" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregates Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold">
                Link Aggregates ({aggregates.length})
                {loading && (
                  <span className="ms-2">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                )}
              </h3>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                disabled={loading}
              >
                <i className="fas fa-plus me-2" />
                <span>Create Aggregate</span>
              </button>
            </div>
          </div>

          <AggregateTable
            aggregates={aggregates}
            loading={loading}
            onDelete={setDeleteTarget}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Aggregate Create Modal */}
      {showCreateModal && (
        <AggregateCreateModal
          server={server}
          existingAggregates={aggregates}
          cdpServiceRunning={cdpServiceRunning}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAggregates();
            checkCdpServiceStatus();
          }}
          onError={onError}
        />
      )}

      {/* Aggregate Details Modal */}
      {showDetailsModal && selectedAggregate && (
        <AggregateDetailsModal
          aggregate={selectedAggregate}
          aggregateDetails={aggregateDetails}
          onClose={handleCloseDetailsModal}
        />
      )}
    </div>
  );
};

AggregateManagement.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default AggregateManagement;
