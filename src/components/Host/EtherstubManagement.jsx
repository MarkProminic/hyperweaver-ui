import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { ConfirmModal } from '../common';

import EtherstubCreateModal from './EtherstubCreateModal';
import EtherstubDetailsModal from './EtherstubDetailsModal';
import EtherstubTable from './EtherstubTable';

const EtherstubManagement = ({ server, onError }) => {
  const { t } = useTranslation();
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
        onError(result.message || t('host.etherstubManagement.errors.loadFailed'));
        setEtherstubs([]);
      }
    } catch (err) {
      onError(t('host.etherstubManagement.errors.loadError', { message: err.message }));
      setEtherstubs([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, filters.name, onError, t]);

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
        onError(
          result.message ||
            t('host.etherstubManagement.errors.deleteFailed', { name: deleteTarget })
        );
      }
    } catch (err) {
      onError(
        t('host.etherstubManagement.errors.deleteError', {
          name: deleteTarget,
          message: err.message,
        })
      );
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
        onError(t('host.etherstubManagement.errors.nameUnknown'));
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
        onError(result.message || t('host.etherstubManagement.errors.detailsFailed'));
      }
    } catch (err) {
      onError(t('host.etherstubManagement.errors.detailsError', { message: err.message }));
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
        <h2 className="fs-5 fw-bold">{t('host.etherstubManagement.title')}</h2>
        <p>
          {t('host.etherstubManagement.managePrefix')} <strong>{server.hostname}</strong>
          {t('host.etherstubManagement.manageSuffix')}
        </p>
      </div>

      {/* Etherstub Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label htmlFor="etherstub-filter-name" className="form-label">
                  {t('host.etherstubManagement.filterByName')}
                </label>
                <input
                  id="etherstub-filter-name"
                  className="form-control"
                  type="text"
                  placeholder={t('host.etherstubManagement.etherstubNamePlaceholder')}
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
                  <span>{t('host.etherstubManagement.refresh')}</span>
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
                  <span>{t('host.etherstubManagement.clear')}</span>
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
                {t('host.etherstubManagement.etherstubs', { total: etherstubs.length })}
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
                <span>{t('host.etherstubManagement.createEtherstub')}</span>
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
          title={t('host.etherstubManagement.deleteTitle')}
          message={t('host.etherstubManagement.deleteMessage', { name: deleteTarget })}
          confirmText={t('host.etherstubManagement.delete')}
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
