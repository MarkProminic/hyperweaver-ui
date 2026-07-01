import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../../contexts/ServerContext';
import { useDebounce } from '../../../utils/debounce';

import AuthorizationsTab from './AuthorizationsTab';
import ProfilesTab from './ProfilesTab';
import RolesTab from './RolesTab';

const RBACDiscoverySection = ({ server, onError }) => {
  const [activeTab, setActiveTab] = useState('authorizations');
  const [authorizations, setAuthorizations] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    authorizationFilter: '',
    profileFilter: '',
    limit: 100,
  });

  const { makeAgentRequest } = useServers();

  // Debounce the filters to avoid excessive API calls
  const debouncedAuthFilter = useDebounce(filters.authorizationFilter, 500);
  const debouncedProfileFilter = useDebounce(filters.profileFilter, 500);

  const loadAuthorizations = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (debouncedAuthFilter) {
        params.filter = debouncedAuthFilter;
      }
      if (filters.limit) {
        params.limit = filters.limit;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/rbac/authorizations',
        'GET',
        null,
        params
      );

      if (result.success) {
        setAuthorizations(result.data?.authorizations || []);
      } else {
        onError(result.message || 'Failed to load authorizations');
        setAuthorizations([]);
      }
    } catch (err) {
      onError(`Error loading authorizations: ${err.message}`);
      setAuthorizations([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedAuthFilter, filters.limit, onError]);

  const loadProfiles = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (debouncedProfileFilter) {
        params.filter = debouncedProfileFilter;
      }
      if (filters.limit) {
        params.limit = filters.limit;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/rbac/profiles',
        'GET',
        null,
        params
      );

      if (result.success) {
        setProfiles(result.data?.profiles || []);
      } else {
        onError(result.message || 'Failed to load profiles');
        setProfiles([]);
      }
    } catch (err) {
      onError(`Error loading profiles: ${err.message}`);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedProfileFilter, filters.limit, onError]);

  const loadRoles = useCallback(async () => {
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
        'system/rbac/roles',
        'GET'
      );

      if (result.success) {
        setRoles(result.data?.roles || []);
      } else {
        onError(result.message || 'Failed to load roles');
        setRoles([]);
      }
    } catch (err) {
      onError(`Error loading roles: ${err.message}`);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError]);

  useEffect(() => {
    if (activeTab === 'authorizations') {
      loadAuthorizations();
    } else if (activeTab === 'profiles') {
      loadProfiles();
    } else if (activeTab === 'roles') {
      loadRoles();
    }
  }, [activeTab, loadAuthorizations, loadProfiles, loadRoles]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      authorizationFilter: '',
      profileFilter: '',
      limit: 100,
    });
  };

  const copyToClipboard = text => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard:', text);
    });
  };

  const handleRefresh = () => {
    if (activeTab === 'authorizations') {
      loadAuthorizations();
    } else if (activeTab === 'profiles') {
      loadProfiles();
    } else {
      loadRoles();
    }
  };

  const tabs = [
    { key: 'authorizations', label: 'Authorizations', icon: 'fa-shield-alt' },
    { key: 'profiles', label: 'Profiles', icon: 'fa-id-card' },
    { key: 'roles', label: 'Roles', icon: 'fa-user-shield' },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">RBAC Discovery</h2>
        <p>
          Browse available authorizations, profiles, and roles on <strong>{server.hostname}</strong>
          . Use this to discover what RBAC components are available for user and role configuration.
        </p>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-0">
        {tabs.map(tab => (
          <li key={tab.key} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fas ${tab.icon} me-2`} />
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            {activeTab !== 'roles' && (
              <div className="col">
                <div className="mb-3">
                  <label className="form-label" htmlFor="rbac-filter">
                    Filter {activeTab === 'authorizations' ? 'Authorizations' : 'Profiles'}
                  </label>
                  <input
                    id="rbac-filter"
                    className="form-control"
                    type="text"
                    placeholder={
                      activeTab === 'authorizations'
                        ? 'Enter authorization pattern (e.g., solaris.admin)'
                        : 'Enter profile pattern (e.g., admin)'
                    }
                    value={
                      activeTab === 'authorizations'
                        ? filters.authorizationFilter
                        : filters.profileFilter
                    }
                    onChange={e =>
                      handleFilterChange(
                        activeTab === 'authorizations' ? 'authorizationFilter' : 'profileFilter',
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>
            )}

            {activeTab !== 'roles' && (
              <div className="col-auto">
                <div className="mb-3">
                  <label className="form-label" htmlFor="rbac-limit">
                    Limit Results
                  </label>
                  <select
                    id="rbac-limit"
                    className="form-select w-auto"
                    value={filters.limit}
                    onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                  >
                    <option value={50}>50 Results</option>
                    <option value={100}>100 Results</option>
                    <option value={200}>200 Results</option>
                    <option value={500}>500 Results</option>
                  </select>
                </div>
              </div>
            )}

            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="rbac-refresh">
                  Refresh
                </label>
                <div>
                  <button
                    type="button"
                    id="rbac-refresh"
                    className="btn btn-info"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {activeTab !== 'roles' && (
              <div className="col-auto">
                <div className="mb-3">
                  <label className="form-label" htmlFor="rbac-clear">
                    Clear
                  </label>
                  <div>
                    <button
                      type="button"
                      id="rbac-clear"
                      className="btn"
                      onClick={clearFilters}
                      disabled={loading}
                    >
                      <i className="fas fa-times me-2" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <div className="card-body">
          {/* Authorizations Tab */}
          {activeTab === 'authorizations' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <h3 className="fs-6 fw-bold">
                    Authorizations ({authorizations.length})
                    {loading && (
                      <span className="ms-2">
                        <i className="fas fa-spinner fa-spin" />
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <AuthorizationsTab
                authorizations={authorizations}
                loading={loading}
                copyToClipboard={copyToClipboard}
              />
            </div>
          )}

          {/* Profiles Tab */}
          {activeTab === 'profiles' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <h3 className="fs-6 fw-bold">
                    Profiles ({profiles.length})
                    {loading && (
                      <span className="ms-2">
                        <i className="fas fa-spinner fa-spin" />
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <ProfilesTab
                profiles={profiles}
                loading={loading}
                copyToClipboard={copyToClipboard}
              />
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <h3 className="fs-6 fw-bold">
                    Available Roles ({roles.length})
                    {loading && (
                      <span className="ms-2">
                        <i className="fas fa-spinner fa-spin" />
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <RolesTab roles={roles} loading={loading} copyToClipboard={copyToClipboard} />
            </div>
          )}
        </div>
      </div>

      {/* Help Information */}
      <div className="alert alert-info">
        <p>
          <strong>Tip:</strong> Use the copy button next to each item to copy its name to your
          clipboard. You can then paste it when creating or editing users and roles.
        </p>
        {activeTab === 'authorizations' && (
          <p className="mt-2">
            <strong>Authorization Wildcards:</strong> Many authorizations support wildcards (*). For
            example, &quot;solaris.admin.*&quot; grants all admin-related authorizations.
          </p>
        )}
      </div>
    </div>
  );
};

RBACDiscoverySection.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default RBACDiscoverySection;
