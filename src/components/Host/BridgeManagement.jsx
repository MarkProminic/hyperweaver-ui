import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal, ContentModal } from '../common';

import BridgeCreateModal from './BridgeCreateModal';
import BridgeTable from './BridgeTable';

const BridgeManagement = ({ server, onError }) => {
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bridgeDetails, setBridgeDetails] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
  });

  const { makeAgentRequest } = useServers();

  const loadBridges = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.name) {
        params.name = filters.name;
      }
      params.extended = true;

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/bridges',
        'GET',
        null,
        params
      );

      if (result.success) {
        setBridges(result.data?.bridges || []);
      } else {
        onError(result.message || 'Failed to load bridges');
        setBridges([]);
      }
    } catch (err) {
      onError(`Error loading bridges: ${err.message}`);
      setBridges([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError, filters]);

  useEffect(() => {
    loadBridges();
  }, [loadBridges]);

  const handleDeleteBridge = async bridgeName => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/bridges/${encodeURIComponent(bridgeName)}`,
        'DELETE',
        null,
        {
          force: false,
          created_by: 'api',
        }
      );

      if (result.success) {
        await loadBridges();
      } else {
        onError(result.message || `Failed to delete bridge "${bridgeName}"`);
      }
    } catch (err) {
      onError(`Error deleting bridge "${bridgeName}": ${err.message}`);
    } finally {
      setLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleViewDetails = async bridge => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/bridges/${encodeURIComponent(bridge.name)}?show_links=true&show_forwarding=true`,
        'GET'
      );

      if (result.success) {
        setBridgeDetails(result.data);
      } else {
        onError(result.message || 'Failed to load bridge details');
      }
    } catch (err) {
      onError(`Error loading bridge details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Bridge Management</h2>
        <p>
          Manage 802.1D bridges on <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* Bridge Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="bridge-filter-name" className="form-label">
                  Filter by Name
                </label>
                <input
                  id="bridge-filter-name"
                  className="form-control"
                  type="text"
                  placeholder="Bridge name"
                  value={filters.name}
                  onChange={e => handleFilterChange('name', e.target.value)}
                />
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadBridges}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label d-block" aria-hidden="true">
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

      {/* Bridges Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold">
                Bridges ({bridges.length})
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
                <span>Create Bridge</span>
              </button>
            </div>
          </div>

          <BridgeTable
            bridges={bridges}
            loading={loading}
            onDelete={bridgeName => setDeleteTarget(bridgeName)}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {showCreateModal && (
        <BridgeCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadBridges();
          }}
          onError={onError}
        />
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDeleteBridge(deleteTarget)}
        title="Delete Bridge"
        message={`Are you sure you want to delete bridge "${deleteTarget}"?`}
        confirmText="Delete"
        confirmVariant="is-danger"
        icon="fas fa-trash"
      />

      {bridgeDetails && (
        <ContentModal
          isOpen
          onClose={() => setBridgeDetails(null)}
          title="Bridge Details"
          icon="fas fa-network-wired"
        >
          <pre className="small bg-body-tertiary">{JSON.stringify(bridgeDetails, null, 2)}</pre>
        </ContentModal>
      )}
    </div>
  );
};

BridgeManagement.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default BridgeManagement;
