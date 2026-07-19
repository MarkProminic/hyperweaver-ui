import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import VlanCreateModal from './VlanCreateModal';
import VlanDetailsModal from './VlanDetailsModal';
import VlanTable from './VlanTable';

const VlanManagement = ({ server, onError }) => {
  const [vlans, setVlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVlan, setSelectedVlan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableLinks, setAvailableLinks] = useState([]);
  const [filters, setFilters] = useState({
    vid: '',
    over: '',
    state: '',
  });
  const [vlanToDelete, setVlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { makeAgentRequest } = useServers();
  const { t } = useTranslation();

  const loadFilterOptions = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      // Load physical links for filter dropdown
      const linksResult = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'monitoring/network/interfaces',
        'GET'
      );

      // Process physical links
      if (linksResult.success && linksResult.data?.interfaces) {
        const links = linksResult.data.interfaces
          .filter(link => link.class === 'phys')
          .map(link => link.link)
          .filter(Boolean);
        const uniqueLinks = [...new Set(links)].sort();
        setAvailableLinks(uniqueLinks);
      }
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  }, [server, makeAgentRequest]);

  const loadVlans = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const params = {};
      if (filters.vid) {
        params.vid = parseInt(filters.vid);
      }
      if (filters.over) {
        params.over = filters.over;
      }
      if (filters.state) {
        params.state = filters.state;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/vlans',
        'GET',
        null,
        params
      );

      if (result.success) {
        // Deduplicate VLANs by link name to avoid duplicate entries
        const rawVlans = result.data?.vlans || [];
        const uniqueVlans = rawVlans.filter(
          (vlan, index, self) => index === self.findIndex(v => v.link === vlan.link)
        );
        setVlans(uniqueVlans);
      } else {
        onError(result.message || t('host.vlanManagement.errors.loadFailed'));
        setVlans([]);
      }
    } catch (err) {
      onError(t('host.vlanManagement.errors.loadError', { message: err.message }));
      setVlans([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, filters, onError, t]);

  // Load VLANs on component mount and when filters change
  useEffect(() => {
    loadVlans();
    loadFilterOptions();
  }, [loadVlans, loadFilterOptions]);

  const handleDeleteVlan = vlanName => {
    setVlanToDelete(vlanName);
  };

  const confirmDeleteVlan = async () => {
    if (!server || !makeAgentRequest || !vlanToDelete) {
      return;
    }

    try {
      setDeleting(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/vlans/${encodeURIComponent(vlanToDelete)}`,
        'DELETE',
        null, // No request body to avoid parsing issues
        {
          // Query parameters instead
          temporary: false,
        }
      );

      if (result.success) {
        // Refresh VLANs list after deletion
        await loadVlans();
      } else {
        onError(
          result.message || t('host.vlanManagement.errors.deleteFailed', { name: vlanToDelete })
        );
      }
    } catch (err) {
      onError(
        t('host.vlanManagement.errors.deleteError', { name: vlanToDelete, message: err.message })
      );
    } finally {
      setDeleting(false);
      setVlanToDelete(null);
    }
  };

  const handleViewDetails = async vlan => {
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
        `network/vlans/${encodeURIComponent(vlan.link)}`,
        'GET'
      );

      if (result.success) {
        setSelectedVlan({ ...vlan, details: result.data });
        setShowDetailsModal(true);
      } else {
        onError(result.message || t('host.vlanManagement.errors.loadDetailsFailed'));
      }
    } catch (err) {
      onError(t('host.vlanManagement.errors.loadDetailsError', { message: err.message }));
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
      vid: '',
      over: '',
      state: '',
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.vlanManagement.title')}</h2>
        <p>
          {t('host.vlanManagement.manageOn')} <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* VLAN Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-vid">
                  {t('host.vlanManagement.filterByVlanId')}
                </label>
                <input
                  id="filter-vid"
                  className="form-control"
                  type="number"
                  min="1"
                  max="4094"
                  placeholder={t('host.vlanManagement.filterByVlanIdPlaceholder')}
                  value={filters.vid}
                  onChange={e => handleFilterChange('vid', e.target.value)}
                />
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-over">
                  {t('host.vlanManagement.filterByPhysicalLink')}
                </label>
                <select
                  id="filter-over"
                  className="form-select"
                  value={filters.over}
                  onChange={e => handleFilterChange('over', e.target.value)}
                >
                  <option value="">{t('host.vlanManagement.allPhysicalLinks')}</option>
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
                <label className="form-label" htmlFor="filter-state">
                  {t('host.vlanManagement.filterByState')}
                </label>
                <select
                  id="filter-state"
                  className="form-select"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">{t('host.vlanManagement.allStates')}</option>
                  <option value="up">{t('host.vlanManagement.stateUp')}</option>
                  <option value="down">{t('host.vlanManagement.stateDown')}</option>
                  <option value="unknown">{t('host.vlanManagement.stateUnknown')}</option>
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <div className="form-label">&nbsp;</div>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={loadVlans}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2" />
                  <span>{t('host.vlanManagement.refresh')}</span>
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
                  <span>{t('host.vlanManagement.clear')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VLANs Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold">
                {t('host.vlanManagement.vlansCount', { count: vlans.length })}
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
                <span>{t('host.vlanManagement.createVlan')}</span>
              </button>
            </div>
          </div>

          <VlanTable
            vlans={vlans}
            loading={loading}
            onDelete={handleDeleteVlan}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* VLAN Details Modal */}
      {showDetailsModal && selectedVlan && (
        <VlanDetailsModal
          vlan={selectedVlan}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedVlan(null);
          }}
        />
      )}

      {/* VLAN Create Modal */}
      {showCreateModal && (
        <VlanCreateModal
          server={server}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadVlans();
          }}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {vlanToDelete && (
        <ConfirmModal
          isOpen={!!vlanToDelete}
          onClose={() => setVlanToDelete(null)}
          onConfirm={confirmDeleteVlan}
          title={t('host.vlanManagement.deleteVlanTitle')}
          message={t('host.vlanManagement.deleteVlanMessage', { name: vlanToDelete })}
          confirmText={t('host.vlanManagement.delete')}
          confirmVariant="is-danger"
          loading={deleting}
        />
      )}
    </div>
  );
};

VlanManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default VlanManagement;
