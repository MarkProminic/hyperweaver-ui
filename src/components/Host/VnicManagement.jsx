import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import VnicCreateModal from './VnicCreateModal';
import VnicDetailsModal from './VnicDetailsModal';
import VnicTable from './VnicTable';

const VnicManagement = ({ server, onError }) => {
  const { t } = useTranslation();
  const [vnics, setVnics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVnic, setSelectedVnic] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableLinks, setAvailableLinks] = useState([]);
  const [availableZones, setAvailableZones] = useState([]);
  const [filters, setFilters] = useState({
    over: '',
    zone: '',
    state: '',
  });
  const [vnicToDelete, setVnicToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadFilterOptions = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      // Load links and zones for filter dropdowns
      const [linksResult, zonesResult] = await Promise.all([
        makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'monitoring/network/interfaces',
          'GET'
        ),
        makeAgentRequest(server.hostname, server.port, server.protocol, 'zones', 'GET'),
      ]);

      // Process links
      if (linksResult.success && linksResult.data?.interfaces) {
        const links = linksResult.data.interfaces
          .filter(link => link.class === 'phys')
          .map(link => link.link)
          .filter(Boolean);
        const uniqueLinks = [...new Set(links)].sort();
        setAvailableLinks(uniqueLinks);
      }

      // Process zones
      if (zonesResult.success && zonesResult.data?.zones) {
        const zones = zonesResult.data.zones.map(zone => zone.name).filter(Boolean);
        const uniqueZones = [...new Set(zones)].sort();
        setAvailableZones(uniqueZones);
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  }, [server, makeAgentRequest]);

  const loadVnics = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.over) {
        params.over = filters.over;
      }
      if (filters.zone) {
        params.zone = filters.zone;
      }
      if (filters.state) {
        params.state = filters.state;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/vnics',
        'GET',
        null,
        params
      );

      if (result.success) {
        // Deduplicate VNICs by link name to avoid duplicate entries
        const rawVnics = result.data?.vnics || [];
        const uniqueVnics = rawVnics.filter(
          (vnic, index, self) => index === self.findIndex(v => v.link === vnic.link)
        );
        setVnics(uniqueVnics);
      } else {
        onError(result.message || t('host.vnicManagement.failedToLoadVnics'));
        setVnics([]);
      }
    } catch (err) {
      onError(t('host.vnicManagement.errorLoadingVnics', { message: err.message }));
      setVnics([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, filters, onError, t]);

  // Load VNICs on component mount and when filters change
  useEffect(() => {
    loadVnics();
    loadFilterOptions();
  }, [loadVnics, loadFilterOptions]);

  const handleDeleteVnic = vnicName => {
    setVnicToDelete(vnicName);
  };

  const confirmDeleteVnic = async () => {
    if (!server || !makeAgentRequest || !vnicToDelete) {
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
        `network/vnics/${encodeURIComponent(vnicToDelete)}`,
        'DELETE',
        null, // No request body to avoid parsing issues
        {
          // Query parameters instead
          temporary: false,
        }
      );

      if (result.success) {
        // Refresh VNICs list after deletion
        await loadVnics();
      } else {
        onError(
          result.message || t('host.vnicManagement.failedToDeleteVnic', { vnicName: vnicToDelete })
        );
      }
    } catch (err) {
      onError(
        t('host.vnicManagement.errorDeletingVnic', {
          vnicName: vnicToDelete,
          message: err.message,
        })
      );
    } finally {
      setDeleting(false);
      setVnicToDelete(null);
    }
  };

  const handleViewDetails = async vnic => {
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
        `network/vnics/${encodeURIComponent(vnic.link)}`,
        'GET'
      );

      if (result.success) {
        setSelectedVnic({ ...vnic, details: result.data });
        setShowDetailsModal(true);
      } else {
        onError(result.message || t('host.vnicManagement.failedToLoadVnicDetails'));
      }
    } catch (err) {
      onError(t('host.vnicManagement.errorLoadingVnicDetails', { message: err.message }));
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
      over: '',
      zone: '',
      state: '',
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.vnicManagement.vnicManagement')}</h2>
        <p>
          {t('host.vnicManagement.manageVnicsIntroPrefix')} <strong>{server.hostname}</strong>
          {t('host.vnicManagement.manageVnicsIntroSuffix')}
        </p>
      </div>

      {/* VNIC Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-over">
                  {t('host.vnicManagement.filterByPhysicalLink')}
                </label>
                <select
                  id="filter-over"
                  className="form-select"
                  value={filters.over}
                  onChange={e => handleFilterChange('over', e.target.value)}
                >
                  <option value="">{t('host.vnicManagement.allPhysicalLinks')}</option>
                  {availableLinks.map(link => (
                    <option key={link} value={link}>
                      {link}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-zone">
                  {t('host.vnicManagement.filterByZone')}
                </label>
                <select
                  id="filter-zone"
                  className="form-select"
                  value={filters.zone}
                  onChange={e => handleFilterChange('zone', e.target.value)}
                >
                  <option value="">{t('host.vnicManagement.allZones')}</option>
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
                <label className="form-label" htmlFor="filter-state">
                  {t('host.vnicManagement.filterByState')}
                </label>
                <select
                  id="filter-state"
                  className="form-select"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">{t('host.vnicManagement.allStates')}</option>
                  <option value="up">{t('host.vnicManagement.up')}</option>
                  <option value="down">{t('host.vnicManagement.down')}</option>
                  <option value="unknown">{t('host.vnicManagement.unknown')}</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <div className="form-label">&nbsp;</div>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadVnics}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>{t('host.vnicManagement.refresh')}</span>
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <div className="form-label">&nbsp;</div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <i className="fas fa-times me-2" />
                  <span>{t('host.vnicManagement.clear')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VNICs Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {t('host.vnicManagement.vnicsHeading', { count: vnics.length })}
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
                <span>{t('host.vnicManagement.createVnic')}</span>
              </button>
            </div>
          </div>

          <VnicTable
            vnics={vnics}
            loading={loading}
            onDelete={handleDeleteVnic}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* VNIC Details Modal */}
      {showDetailsModal && selectedVnic && (
        <VnicDetailsModal
          vnic={selectedVnic}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedVnic(null);
          }}
        />
      )}

      {/* VNIC Create Modal */}
      {showCreateModal && (
        <VnicCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadVnics();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {vnicToDelete && (
        <ConfirmModal
          isOpen={!!vnicToDelete}
          onClose={() => setVnicToDelete(null)}
          onConfirm={confirmDeleteVnic}
          title={t('host.vnicManagement.deleteVnicTitle')}
          message={t('host.vnicManagement.deleteVnicConfirm', { vnicName: vnicToDelete })}
          confirmText={t('host.vnicManagement.delete')}
          confirmVariant="is-danger"
          loading={deleting}
        />
      )}
    </div>
  );
};

VnicManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default VnicManagement;
