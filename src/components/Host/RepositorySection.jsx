import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import AddRepositoryModal from './AddRepositoryModal';
import EditRepositoryModal from './EditRepositoryModal';
import RepositoryTable from './RepositoryTable';

const RepositorySection = ({ server, onError }) => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState(null);
  const [filters, setFilters] = useState({
    publisher: '',
    enabledOnly: false,
    type: '',
  });

  const { makeAgentRequest } = useServers();

  const loadRepositories = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.enabledOnly) {
        params.enabled_only = true;
      }
      if (filters.publisher) {
        params.publisher = filters.publisher;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/repositories',
        'GET',
        null,
        params
      );

      if (result.success) {
        const repoList = result.data?.publishers || [];
        // Filter by type on client side
        const filteredRepos = repoList.filter(repo => {
          if (filters.type && repo.type !== filters.type) {
            return false;
          }
          return true;
        });
        setRepositories(filteredRepos);
      } else {
        onError(result.message || 'Failed to load repositories');
        setRepositories([]);
      }
    } catch (err) {
      onError(`Error loading repositories: ${err.message}`);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError, filters.enabledOnly, filters.publisher, filters.type]);

  // Load repositories on component mount and when filters change
  useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  const handleToggleRepository = async (publisherName, enable) => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const action = enable ? 'enable' : 'disable';
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/repositories/${encodeURIComponent(publisherName)}/${action}`,
        'POST',
        { created_by: 'api' }
      );

      if (result.success) {
        // Refresh repositories list after action
        await loadRepositories();
      } else {
        onError(result.message || `Failed to ${action} repository`);
      }
    } catch (err) {
      onError(`Error ${enable ? 'enabling' : 'disabling'} repository: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performDeleteRepository = async publisherName => {
    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/repositories/${encodeURIComponent(publisherName)}`,
        'DELETE'
      );

      if (result.success) {
        // Refresh repositories list after deletion
        await loadRepositories();
      } else {
        onError(result.message || `Failed to delete repository "${publisherName}"`);
      }
    } catch (err) {
      onError(`Error deleting repository "${publisherName}": ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepository = publisherName => {
    setRepoToDelete(publisherName);
  };

  const handleConfirmDelete = async () => {
    if (repoToDelete) {
      await performDeleteRepository(repoToDelete);
      setRepoToDelete(null);
    }
  };

  const handleEditRepository = repo => {
    setSelectedRepository(repo);
    setShowEditModal(true);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      publisher: '',
      enabledOnly: false,
      type: '',
    });
  };

  // Group repositories by publisher name for display
  const groupedRepositories = repositories.reduce((acc, repo) => {
    if (!acc[repo.name]) {
      acc[repo.name] = [];
    }
    acc[repo.name].push(repo);
    return acc;
  }, {});

  const repositoryGroups = Object.entries(groupedRepositories).map(([name, repos]) => ({
    name,
    repositories: repos,
    enabled: repos.some(r => r.enabled !== false),
    origins: repos.filter(r => r.type === 'origin'),
    mirrors: repos.filter(r => r.type === 'mirror'),
  }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Repository Management</h2>
        <p>
          Manage package repositories (publishers) on <strong>{server.hostname}</strong>. Add,
          remove, enable, and disable package repositories.
        </p>
      </div>

      {/* Repository Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="publisher-filter">
                  Filter by Publisher
                </label>

                <input
                  id="publisher-filter"
                  className="form-control"
                  type="text"
                  placeholder="Enter publisher name..."
                  value={filters.publisher}
                  onChange={e => handleFilterChange('publisher', e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="type-filter">
                  Filter by Type
                </label>

                <select
                  id="type-filter"
                  className="form-select"
                  value={filters.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="origin">Origin</option>
                  <option value="mirror">Mirror</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="enabled-only-filter">
                  Enabled Only
                </label>

                <div className="form-check form-switch">
                  <input
                    id="enabled-only-filter"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.enabledOnly}
                    onChange={e => handleFilterChange('enabledOnly', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="enabled-only-filter">
                    Enabled
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="refresh-button">
                  Refresh
                </label>
                <div>
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={loadRepositories}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="clear-button">
                  Clear
                </label>
                <div>
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
      </div>

      {/* Repositories Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                Repositories ({repositories.length})
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
                onClick={() => setShowAddModal(true)}
                disabled={loading}
              >
                <i className="fas fa-plus me-2" />
                <span>Add Repository</span>
              </button>
            </div>
          </div>

          <RepositoryTable
            repositories={repositories}
            repositoryGroups={repositoryGroups}
            loading={loading}
            onToggle={handleToggleRepository}
            onEdit={handleEditRepository}
            onDelete={handleDeleteRepository}
          />
        </div>
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <AddRepositoryModal
          server={server}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadRepositories();
          }}
          onError={onError}
        />
      )}

      {/* Edit Repository Modal */}
      {showEditModal && selectedRepository && (
        <EditRepositoryModal
          server={server}
          repository={selectedRepository}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRepository(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRepository(null);
            loadRepositories();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {repoToDelete && (
        <ConfirmModal
          isOpen={!!repoToDelete}
          onClose={() => setRepoToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Repository"
          message={`Are you sure you want to delete repository "${repoToDelete}"?`}
          confirmText="Delete"
          confirmVariant="is-danger"
          loading={loading}
        />
      )}
    </div>
  );
};

RepositorySection.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default RepositorySection;
