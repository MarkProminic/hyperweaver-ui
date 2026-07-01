import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

import IpAddressCreateModal from './IpAddressCreateModal';
import IpAddressTableManagement from './IpAddressTableManagement';

const IpAddressManagement = ({ server, onError }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    interface: '',
    ip_version: '',
    type: '',
    state: '',
  });

  const { makeAgentRequest } = useServers();

  const loadAddresses = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.interface) {
        params.interface = filters.interface;
      }
      if (filters.ip_version) {
        params.ip_version = filters.ip_version;
      }
      if (filters.type) {
        params.type = filters.type;
      }
      if (filters.state) {
        params.state = filters.state;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/addresses',
        'GET',
        null,
        params
      );

      if (result.success) {
        // Deduplicate IP addresses by addrobj to avoid duplicate entries
        const rawAddresses = result.data?.addresses || [];
        const uniqueAddresses = rawAddresses.filter(
          (addr, index, self) => index === self.findIndex(a => a.addrobj === addr.addrobj)
        );
        setAddresses(uniqueAddresses);
      } else {
        onError(result.message || 'Failed to load IP addresses');
        setAddresses([]);
      }
    } catch (err) {
      onError(`Error loading IP addresses: ${err.message}`);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [
    makeAgentRequest,
    server,
    filters.interface,
    filters.ip_version,
    filters.type,
    filters.state,
    onError,
  ]);

  // Load IP addresses on component mount and when filters change
  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDeleteAddress = addrobj => {
    setAddressToDelete(addrobj);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!server || !makeAgentRequest || !addressToDelete) {
      return;
    }

    try {
      setDeleting(true);
      onError('');

      // Use query parameters instead of request body for DELETE request
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/addresses/${encodeURIComponent(addressToDelete)}`,
        'DELETE',
        null, // No request body to avoid parsing issues
        {
          // Query parameters instead
          release: false,
          created_by: 'api',
        }
      );

      if (result.success) {
        setShowDeleteModal(false);
        setAddressToDelete(null);
        // Refresh addresses list after deletion
        await loadAddresses();
      } else {
        onError(result.message || `Failed to delete IP address "${addressToDelete}"`);
      }
    } catch (err) {
      onError(`Error deleting IP address "${addressToDelete}": ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAddress = async (address, action) => {
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
        `network/addresses/${encodeURIComponent(address.addrobj)}/${action}`,
        'PUT'
      );

      if (result.success) {
        // Refresh addresses list after action
        await loadAddresses();
      } else {
        onError(result.message || `Failed to ${action} IP address "${address.addrobj}"`);
      }
    } catch (err) {
      onError(`Error ${action}ing IP address "${address.addrobj}": ${err.message}`);
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
      interface: '',
      ip_version: '',
      type: '',
      state: '',
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">IP Address Management</h2>
        <p>
          Manage IP address assignments on <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* IP Address Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-interface">
                  Filter by Interface
                </label>
                <input
                  id="filter-interface"
                  className="form-control"
                  type="text"
                  placeholder="e.g., vnic0"
                  value={filters.interface}
                  onChange={e => handleFilterChange('interface', e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-ip-version">
                  IP Version
                </label>
                <select
                  id="filter-ip-version"
                  className="form-select"
                  value={filters.ip_version}
                  onChange={e => handleFilterChange('ip_version', e.target.value)}
                >
                  <option value="">All Versions</option>
                  <option value="v4">IPv4</option>
                  <option value="v6">IPv6</option>
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-type">
                  Address Type
                </label>
                <select
                  id="filter-type"
                  className="form-select"
                  value={filters.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="static">Static</option>
                  <option value="dhcp">DHCP</option>
                  <option value="addrconf">Auto Config</option>
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-state">
                  State
                </label>
                <select
                  id="filter-state"
                  className="form-select"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  <option value="ok">OK</option>
                  <option value="disabled">Disabled</option>
                  <option value="down">Down</option>
                  <option value="duplicate">Duplicate</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-auto">
              <div className="mb-3">
                <span className="form-label" aria-hidden="true">
                  &nbsp;
                </span>
                <div>
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={loadAddresses}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    Refresh
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
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Addresses Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                IP Addresses ({addresses.length})
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
                Create IP Address
              </button>
            </div>
          </div>

          <IpAddressTableManagement
            addresses={addresses}
            loading={loading}
            onDelete={handleDeleteAddress}
            onToggle={handleToggleAddress}
          />
        </div>
      </div>

      {/* IP Address Create Modal */}
      {showCreateModal && (
        <IpAddressCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAddresses();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && addressToDelete && (
        <FormModal
          isOpen
          onClose={() => {
            setShowDeleteModal(false);
            setAddressToDelete(null);
          }}
          onSubmit={confirmDeleteAddress}
          title="Delete IP Address"
          icon="fas fa-trash"
          submitText="Delete"
          submitVariant="is-danger"
          loading={deleting}
        >
          <div className="alert alert-danger">
            <p>
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <p className="mb-4">
            Are you sure you want to delete the IP address{' '}
            <strong className="font-monospace">{addressToDelete}</strong>?
          </p>
          <p className="text-muted small">
            This will remove the IP address configuration from the system.
          </p>
        </FormModal>
      )}
    </div>
  );
};

IpAddressManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default IpAddressManagement;
