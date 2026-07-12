import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import EtherstubCreateModal from './EtherstubCreateModal';
import EtherstubDetailsModal from './EtherstubDetailsModal';
import EtherstubTable from './EtherstubTable';

const EtherstubManagement = ({ server, onError }) => {
  const [etherstubs, setEtherstubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEtherstub, setSelectedEtherstub] = useState(null);
  const [etherstubDetails, setEtherstubDetails] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
  });

  const { makeAgentRequest } = useServers();

  const loadEtherstubs = useCallback(async () => {
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

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/etherstubs',
        'GET',
        null,
        params
      );

      if (result.success) {
        setEtherstubs(result.data?.etherstubs || []);
      } else {
        onError(result.message || 'Failed to load etherstubs');
        setEtherstubs([]);
      }
    } catch (err) {
      onError(`Error loading etherstubs: ${err.message}`);
      setEtherstubs([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, filters.name, onError]);

  useEffect(() => {
    loadEtherstubs();
  }, [loadEtherstubs]);

  const confirmDeleteEtherstub = async () => {
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
        `network/etherstubs/${encodeURIComponent(deleteTarget)}`,
        'DELETE',
        null,
        {
          temporary: false,
          force: false,
        }
      );

      if (result.success) {
        setDeleteTarget(null);
        await loadEtherstubs();
      } else {
        onError(result.message || `Failed to delete etherstub "${deleteTarget}"`);
      }
    } catch (err) {
      onError(`Error deleting etherstub "${deleteTarget}": ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async etherstub => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const etherstubName = etherstub.name || etherstub.link;

      if (!etherstubName) {
        onError('Unable to determine etherstub name');
        return;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/etherstubs/${encodeURIComponent(etherstubName)}?show_vnics=true`,
        'GET'
      );

      if (result.success) {
        setSelectedEtherstub(etherstub);
        setEtherstubDetails(result.data);
        setShowDetailsModal(true);
      } else {
        onError(result.message || 'Failed to load etherstub details');
      }
    } catch (err) {
      onError(`Error loading etherstub details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEtherstub(null);
    setEtherstubDetails(null);
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
        <h2 className="fs-5 fw-bold">Etherstub Management</h2>
        <p>
          Manage etherstubs on <strong>{server.hostname}</strong>. Etherstubs provide a virtual
          Layer 2 switch for connecting VNICs.
        </p>
      </div>

      {/* Etherstub Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="etherstub-filter-name" className="form-label">
                  Filter by Name
                </label>
                <input
                  id="etherstub-filter-name"
                  className="form-control"
                  type="text"
                  placeholder="Etherstub name"
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
                  onClick={loadEtherstubs}
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

      {/* Etherstubs Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold">
                Etherstubs ({etherstubs.length})
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
                <span>Create Etherstub</span>
              </button>
            </div>
          </div>

          <EtherstubTable
            etherstubs={etherstubs}
            loading={loading}
            onDelete={setDeleteTarget}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Etherstub Create Modal */}
      {showCreateModal && (
        <EtherstubCreateModal
          server={server}
          existingEtherstubs={etherstubs}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEtherstubs();
          }}
          onError={onError}
        />
      )}

      {/* Etherstub Details Modal */}
      {showDetailsModal && selectedEtherstub && (
        <EtherstubDetailsModal
          etherstub={selectedEtherstub}
          etherstubDetails={etherstubDetails}
          onClose={handleCloseDetailsModal}
        />
      )}

      {deleteTarget !== null && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteEtherstub}
          title="Delete Etherstub"
          message={`Are you sure you want to delete etherstub "${deleteTarget}"?`}
          confirmText="Delete"
          confirmVariant="is-danger"
          icon="fas fa-trash"
          loading={loading}
        />
      )}
    </div>
  );
};

EtherstubManagement.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default EtherstubManagement;
