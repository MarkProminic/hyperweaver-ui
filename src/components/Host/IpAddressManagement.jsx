import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';
import { hasHypervisor } from '../../utils/capabilities';
import { FormModal } from '../common';

import IpAddressCreateModal from './IpAddressCreateModal';
import IpAddressTableManagement from './IpAddressTableManagement';

const IpAddressManagement = ({ server, onError }) => {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(null);
  const [wireNote, setWireNote] = useState('');
  const isGoAgent = hasHypervisor(server, 'virtualbox') || hasHypervisor(server, 'utm');
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
        // Dedupe by addrobj + address: the Go agent's synthetic <if>/v4|v6
        // addrobj covers several addresses — addrobj alone hid siblings.
        const rawAddresses = result.data?.addresses || [];
        const rowKey = addr => `${addr.addrobj}|${addr.ip_address || addr.addr || ''}`;
        const uniqueAddresses = rawAddresses.filter(
          (addr, index, self) => index === self.findIndex(a => rowKey(a) === rowKey(addr))
        );
        setAddresses(uniqueAddresses);
      } else {
        onError(result.message || t('host.ipAddressManagement.errors.loadFailed'));
        setAddresses([]);
      }
    } catch (err) {
      onError(t('host.ipAddressManagement.errors.loadError', { message: err.message }));
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
    t,
  ]);

  // Load IP addresses on component mount and when filters change
  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDeleteAddress = address => {
    setAddressToDelete(address);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!server || !makeAgentRequest || !addressToDelete) {
      return;
    }

    try {
      setDeleting(true);
      onError('');

      const siblingCount = addresses.filter(a => a.addrobj === addressToDelete.addrobj).length;
      const bareAddress =
        addressToDelete.ip_address || (addressToDelete.addr || '').split('/')[0] || '';
      const params = { release: false };
      if (isGoAgent && siblingCount > 1 && bareAddress) {
        params.address = bareAddress;
      }
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `network/addresses/${encodeURIComponent(addressToDelete.addrobj)}`,
        'DELETE',
        null,
        params
      );

      if (result.success) {
        setShowDeleteModal(false);
        setAddressToDelete(null);
        await loadAddresses();
      } else {
        onError(
          result.message ||
            t('host.ipAddressManagement.errors.deleteFailed', { name: addressToDelete.addrobj })
        );
      }
    } catch (err) {
      onError(
        t('host.ipAddressManagement.errors.deleteError', {
          name: addressToDelete.addrobj,
          message: err.message,
        })
      );
    } finally {
      setDeleting(false);
    }
  };

  const runToggle = async (address, action) => {
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
        if (result.data?.note) {
          setWireNote(result.data.note);
        }
        await loadAddresses();
      } else {
        onError(
          result.message ||
            t('host.ipAddressManagement.errors.toggleFailed', { action, name: address.addrobj })
        );
      }
    } catch (err) {
      onError(
        t('host.ipAddressManagement.errors.toggleError', {
          action,
          name: address.addrobj,
          message: err.message,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAddress = async (address, action) => {
    if (!server || !makeAgentRequest) {
      return;
    }
    if (isGoAgent && action === 'disable') {
      setDisableConfirm(address);
      return;
    }
    await runToggle(address, action);
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
        <h2 className="fs-5 fw-bold">{t('host.ipAddressManagement.title')}</h2>
        <p>
          {t('host.ipAddressManagement.managePrefix')} <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* IP Address Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-interface">
                  {t('host.ipAddressManagement.filterByInterface')}
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
                  {t('host.ipAddressManagement.ipVersion')}
                </label>
                <select
                  id="filter-ip-version"
                  className="form-select"
                  value={filters.ip_version}
                  onChange={e => handleFilterChange('ip_version', e.target.value)}
                >
                  <option value="">{t('host.ipAddressManagement.allVersions')}</option>
                  <option value="v4">IPv4</option>
                  <option value="v6">IPv6</option>
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-type">
                  {t('host.ipAddressManagement.addressType')}
                </label>
                <select
                  id="filter-type"
                  className="form-select"
                  value={filters.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                >
                  <option value="">{t('host.ipAddressManagement.allTypes')}</option>
                  <option value="static">{t('host.ipAddressManagement.typeStatic')}</option>
                  <option value="dhcp">{t('host.ipAddressManagement.typeDhcp')}</option>
                  <option value="addrconf">{t('host.ipAddressManagement.typeAddrconf')}</option>
                </select>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="filter-state">
                  {t('host.ipAddressManagement.state')}
                </label>
                <select
                  id="filter-state"
                  className="form-select"
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">{t('host.ipAddressManagement.allStates')}</option>
                  <option value="ok">{t('host.ipAddressManagement.stateOk')}</option>
                  <option value="disabled">{t('host.ipAddressManagement.stateDisabled')}</option>
                  <option value="down">{t('host.ipAddressManagement.stateDown')}</option>
                  <option value="duplicate">{t('host.ipAddressManagement.stateDuplicate')}</option>
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
                    {t('host.ipAddressManagement.refresh')}
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
                    {t('host.ipAddressManagement.clear')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {wireNote && (
        <div className="alert alert-info d-flex justify-content-between align-items-center">
          <span>{wireNote}</span>
          <button type="button" className="btn btn-sm btn-light" onClick={() => setWireNote('')}>
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* IP Addresses Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {t('host.ipAddressManagement.ipAddresses', { total: addresses.length })}
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
                {t('host.ipAddressManagement.createIpAddress')}
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
          title={t('host.ipAddressManagement.deleteTitle')}
          icon="fas fa-trash"
          submitText={t('host.ipAddressManagement.delete')}
          submitVariant="is-danger"
          loading={deleting}
        >
          <div className="alert alert-danger">
            <p>
              <strong>{t('host.ipAddressManagement.warning')}</strong>{' '}
              {t('host.ipAddressManagement.cannotUndo')}
            </p>
          </div>
          <p className="mb-4">
            {t('host.ipAddressManagement.deletePrompt')}{' '}
            <strong className="font-monospace">
              {addressToDelete.addrobj}
              {addressToDelete.ip_address ? ` (${addressToDelete.ip_address})` : ''}
            </strong>
            ?
          </p>
          <p className="text-muted small">{t('host.ipAddressManagement.deleteNote')}</p>
        </FormModal>
      )}

      {disableConfirm && (
        <FormModal
          isOpen
          onClose={() => setDisableConfirm(null)}
          onSubmit={async () => {
            const target = disableConfirm;
            setDisableConfirm(null);
            await runToggle(target, 'disable');
          }}
          title={t('host.ipAddressManagement.goDisableTitle')}
          icon="fas fa-pause"
          submitText={t('host.ipAddressManagement.goDisableConfirm')}
          submitVariant="is-warning"
          loading={loading}
        >
          <div className="alert alert-warning">
            <p className="mb-0">
              {t('host.ipAddressManagement.goDisableBody', { iface: disableConfirm.interface })}
            </p>
          </div>
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
