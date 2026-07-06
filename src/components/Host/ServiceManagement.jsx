import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { useDebounce } from '../../utils/debounce';

import ServiceDetailsModal from './ServiceDetailsModal';
import ServicePropertiesModal from './ServicePropertiesModal';
import ServiceTable from './ServiceTable';

const ServiceManagement = ({ server }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableZones, setAvailableZones] = useState([]);
  const [filters, setFilters] = useState({
    pattern: '',
    zone: '',
    state: '',
    showDisabled: false,
  });

  // Modal states
  const [selectedService, setSelectedService] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);

  const { makeAgentRequest } = useServers();

  // Debounce the pattern filter to avoid excessive API calls
  const debouncedPattern = useDebounce(filters.pattern, 500);

  const loadZones = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'machines',
        'GET'
      );

      if (result.success && result.data?.machines) {
        // Extract unique zone names from the machine list (canonical wire keys)
        const zones = result.data.machines.map(zone => zone.name).filter(Boolean);
        const uniqueZones = [...new Set(zones)].sort();
        setAvailableZones(uniqueZones);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
    }
  }, [server, makeAgentRequest]);

  const loadServices = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {};
      if (debouncedPattern) {
        params.pattern = debouncedPattern;
      }
      if (filters.zone) {
        params.zone = filters.zone;
      }
      if (filters.showDisabled) {
        params.all = true;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'services',
        'GET',
        null,
        params
      );

      if (result.success) {
        setServices(result.data || []);
      } else {
        setError(result.message || 'Failed to load services');
        setServices([]);
      }
    } catch (err) {
      setError(`Error loading services: ${err.message}`);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedPattern, filters.zone, filters.showDisabled]);

  // Load services on component mount and when filters change
  useEffect(() => {
    loadServices();
    loadZones();
  }, [server, debouncedPattern, filters.zone, filters.showDisabled, loadServices, loadZones]); // Use debounced pattern

  const handleServiceAction = async (fmri, action) => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'services/action',
        'POST',
        {
          fmri: encodeURIComponent(fmri),
          action,
          options: {},
        }
      );

      if (result.success) {
        // Refresh services list after action
        await loadServices();
      } else {
        setError(result.message || `Failed to ${action} service`);
      }
    } catch (err) {
      setError(`Error performing ${action}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async service => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `services/${encodeURIComponent(service.fmri)}`,
        'GET'
      );

      if (result.success) {
        setSelectedService({ ...service, details: result.data });
        setShowDetailsModal(true);
      } else {
        setError(result.message || 'Failed to load service details');
      }
    } catch (err) {
      setError(`Error loading service details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProperties = async service => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `services/${encodeURIComponent(service.fmri)}/properties`,
        'GET'
      );

      if (result.success) {
        setSelectedService({ ...service, properties: result.data });
        setShowPropertiesModal(true);
      } else {
        setError(result.message || 'Failed to load service properties');
      }
    } catch (err) {
      setError(`Error loading service properties: ${err.message}`);
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
      pattern: '',
      zone: '',
      state: '',
      showDisabled: false,
    });
  };

  // Apply client-side filtering for state since backend doesn't support it
  const filteredServices = services.filter(service => {
    if (filters.state && service.state.toLowerCase() !== filters.state.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* Service Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="service-name-filter">
                  Filter by Service Name
                </label>
                <input
                  className="form-control"
                  id="service-name-filter"
                  type="text"
                  placeholder="Enter service name pattern..."
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="zone-filter">
                  Filter by Zone
                </label>
                <select
                  className="form-select"
                  id="zone-filter"
                  value={filters.zone}
                  onChange={e => handleFilterChange('zone', e.target.value)}
                >
                  <option value="">All Zones</option>
                  {availableZones.map(zone => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="state-filter">
                  Filter by State
                </label>
                <select
                  className="form-select"
                  id="state-filter"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  <option value="online">Online</option>
                  <option value="disabled">Disabled</option>
                  <option value="offline">Offline</option>
                  <option value="legacy_run">Legacy Run</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="show-disabled-filter">
                  Show Disabled
                </label>
                <div className="form-check form-switch">
                  <input
                    id="show-disabled-filter"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.showDisabled}
                    onChange={e => handleFilterChange('showDisabled', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="show-disabled-filter">
                    Include All
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadServices}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
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

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Services Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fs-6 fw-bold">
              Services ({filteredServices.length})
              {loading && (
                <span className="ms-2">
                  <i className="fas fa-spinner fa-spin" />
                </span>
              )}
            </h3>
          </div>

          <ServiceTable
            services={filteredServices}
            loading={loading}
            onAction={handleServiceAction}
            onViewDetails={handleViewDetails}
            onViewProperties={handleViewProperties}
          />
        </div>
      </div>

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedService(null);
          }}
        />
      )}

      {/* Service Properties Modal */}
      {showPropertiesModal && selectedService && (
        <ServicePropertiesModal
          service={selectedService}
          onClose={() => {
            setShowPropertiesModal(false);
            setSelectedService(null);
          }}
        />
      )}
    </div>
  );
};

ServiceManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
};
export default ServiceManagement;
