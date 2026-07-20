import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../contexts/AuthContext';
import { agentPlatform } from '../../../utils/capabilities';
import { canStartStopMachines } from '../../../utils/permissions';
import { ConfirmModal } from '../../common';

import { HostOnlyIfModal, HostOnlyNetModal } from './HostOnlyModals';
import NatNetworkModal from './NatNetworkModal';
import {
  createHostOnlyIf,
  createHostOnlyNet,
  createNatNetwork,
  deleteHostOnlyIf,
  deleteHostOnlyNet,
  deleteNatNetwork,
  listSpaces,
  modifyHostOnlyIf,
  modifyHostOnlyNet,
  modifyNatNetwork,
  natNetworkService,
} from './spacesApi';

/**
 * The VirtualBox network-spaces management panel (network-spaces token):
 * host-only interfaces (+DHCP), 7.x host-only networks, NAT networks with
 * their forwards, and the read-only internal networks. Sits on the Host
 * Networking page for spaces-speaking hosts; mutations gate on the operator
 * role, and every change refreshes the list + the caller's structures.
 */
const NetworkSpacesPanel = ({ server, onChanged = null }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = canStartStopMachines(user?.role);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listSpaces(server);
    if (result.success) {
      setSpaces(result.data?.spaces || []);
      setLoadError('');
    } else {
      setLoadError(result.message || '');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    load();
  }, [load]);

  const finish = result => {
    setModalBusy(false);
    if (result?.success) {
      setModal(null);
      setModalError('');
      load();
      if (onChanged) {
        onChanged();
      }
    } else {
      setModalError(result?.message || t('host.networkSpaces.loadFailed', { message: '' }));
    }
  };

  const run = async action => {
    setModalBusy(true);
    setModalError('');
    finish(await action());
  };

  const saveModal = body => {
    const { kind, space } = modal;
    if (kind === 'hostonly') {
      run(() =>
        space ? modifyHostOnlyIf(server, space.name, body) : createHostOnlyIf(server, body)
      );
    } else if (kind === 'hostonlynet') {
      run(() =>
        space ? modifyHostOnlyNet(server, space.name, body) : createHostOnlyNet(server, body)
      );
    } else if (kind === 'natnetwork') {
      run(() =>
        space ? modifyNatNetwork(server, space.name, body) : createNatNetwork(server, body)
      );
    }
  };

  const confirmDelete = () => {
    const { kind, space } = modal;
    if (kind === 'delete-hostonly') {
      run(() => deleteHostOnlyIf(server, space.name));
    } else if (kind === 'delete-hostonlynet') {
      run(() => deleteHostOnlyNet(server, space.name));
    } else {
      run(() => deleteNatNetwork(server, space.name));
    }
  };

  const service = async (space, action) => {
    const result = await natNetworkService(server, space.name, action);
    if (result.success) {
      load();
    } else {
      setLoadError(result.message || '');
    }
  };

  const hostonlyIfs = spaces.filter(space => space.type === 'hostonly');
  const hostonlyNets = spaces.filter(space => space.type === 'hostonlynet');
  const natNets = spaces.filter(space => space.type === 'natnetwork');
  const intnets = spaces.filter(space => space.type === 'intnet');

  // Platform split (agent ruling): VBox 7 on macOS removed host-only
  // ADAPTERS — darwin agents carry hostonlynet ONLY; every other host
  // carries hostonly ONLY and 400s the hostonlynet verbs. Unknown platform
  // keeps both families visible.
  const platform = agentPlatform(server);
  const showHostonlyIfs = platform !== 'darwin';
  const showHostonlyNets = platform === 'darwin' || platform === null;

  const stateBadge = on => (
    <span className={`badge ${on ? 'text-bg-success' : 'text-bg-secondary'}`}>
      {on ? t('host.networkSpaces.enabledLabel') : t('host.networkSpaces.disabledLabel')}
    </span>
  );

  const rowActions = (editModal, deleteModal) =>
    canEdit && (
      <td className="text-end">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary me-1"
          title={t('host.networkSpaces.edit')}
          onClick={() => {
            setModalError('');
            setModal(editModal);
          }}
        >
          <i className="fas fa-pen" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title={t('host.networkSpaces.del')}
          onClick={() => {
            setModalError('');
            setModal(deleteModal);
          }}
        >
          <i className="fas fa-trash" />
        </button>
      </td>
    );

  const sectionHead = (label, createKind) => (
    <div className="d-flex align-items-center mb-2">
      <h6 className="h6 mb-0">{label}</h6>
      {canEdit && createKind && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary ms-auto"
          onClick={() => {
            setModalError('');
            setModal({ kind: createKind, space: null });
          }}
        >
          <i className="fas fa-plus me-1" />
          {t('host.networkSpaces.createBtn')}
        </button>
      )}
    </div>
  );

  return (
    <div className="card mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fs-5 fw-bold mb-0">
          <i className="fas fa-diagram-project me-2" />
          <span>{t('host.networkSpaces.title')}</span>
        </h2>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={load}
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${collapsed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setCollapsed(prev => !prev)}
          >
            <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-1">
          {loadError && <div className="alert alert-warning py-2">{loadError}</div>}

          {showHostonlyIfs && (
            <>
              {sectionHead(t('host.networkSpaces.sectionHostonlyIfs'), 'hostonly')}
              <table className="table table-sm align-middle">
                <tbody>
                  {hostonlyIfs.map(space => (
                    <tr key={space.name}>
                      <td className="hw-topo-mono">{space.name}</td>
                      <td className="hw-topo-mono">
                        {space.ip_address} / {space.network_mask}
                      </td>
                      <td>
                        {space.dhcp?.exists
                          ? t('host.networkSpaces.dhcpRange', {
                              lower: space.dhcp.lower_ip,
                              upper: space.dhcp.upper_ip,
                            })
                          : t('host.networkSpaces.dhcpOff')}
                      </td>
                      {rowActions({ kind: 'hostonly', space }, { kind: 'delete-hostonly', space })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {showHostonlyNets && (
            <>
              {sectionHead(t('host.networkSpaces.sectionHostonlyNets'), 'hostonlynet')}
              <table className="table table-sm align-middle">
                <tbody>
                  {hostonlyNets.map(space => (
                    <tr key={space.name}>
                      <td className="hw-topo-mono">{space.name}</td>
                      <td className="hw-topo-mono">
                        {space.network_mask} · {space.lower_ip}–{space.upper_ip}
                      </td>
                      <td>{stateBadge(space.enabled !== false)}</td>
                      {rowActions(
                        { kind: 'hostonlynet', space },
                        { kind: 'delete-hostonlynet', space }
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {sectionHead(t('host.networkSpaces.sectionNat'), 'natnetwork')}
          <table className="table table-sm align-middle">
            <tbody>
              {natNets.map(space => (
                <tr key={space.name}>
                  <td className="hw-topo-mono">{space.name}</td>
                  <td className="hw-topo-mono">
                    {space.cidr}
                    {space.gateway ? ` · ${space.gateway}` : ''}
                  </td>
                  <td>
                    {stateBadge(space.enabled !== false)}{' '}
                    {space.dhcp_enabled && (
                      <span className="badge text-bg-info">
                        {t('host.networkSpaces.dhcpToggle')}
                      </span>
                    )}{' '}
                    {space.ipv6 && <span className="badge text-bg-info">v6</span>}{' '}
                    <span className="badge text-bg-light">
                      {t('host.networkSpaces.forwardCount', {
                        count: (space.port_forwards || []).length,
                      })}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success me-1"
                        title={t('host.networkSpaces.start')}
                        onClick={() => service(space, 'start')}
                      >
                        <i className="fas fa-play" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning me-1"
                        title={t('host.networkSpaces.stop')}
                        onClick={() => service(space, 'stop')}
                      >
                        <i className="fas fa-stop" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-1"
                        title={t('host.networkSpaces.edit')}
                        onClick={() => {
                          setModalError('');
                          setModal({ kind: 'natnetwork', space });
                        }}
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title={t('host.networkSpaces.del')}
                        onClick={() => {
                          setModalError('');
                          setModal({ kind: 'delete-natnetwork', space });
                        }}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {intnets.length > 0 && (
            <>
              {sectionHead(t('host.networkSpaces.sectionIntnets'), null)}
              <p className="hw-topo-mono small mb-1">
                {intnets.map(space => space.name).join(' · ')}
              </p>
              <p className="text-muted small">{t('host.networkSpaces.intnetNote')}</p>
            </>
          )}
        </div>
      )}

      {modal && modal.kind === 'hostonly' && (
        <HostOnlyIfModal
          space={modal.space}
          busy={modalBusy}
          error={modalError}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.kind === 'hostonlynet' && (
        <HostOnlyNetModal
          space={modal.space}
          busy={modalBusy}
          error={modalError}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.kind === 'natnetwork' && (
        <NatNetworkModal
          space={modal.space}
          busy={modalBusy}
          error={modalError}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.kind.startsWith('delete-') && (
        <ConfirmModal
          isOpen
          onClose={() => setModal(null)}
          onConfirm={confirmDelete}
          title={t('host.networkSpaces.confirmDeleteTitle', { name: modal.space.name })}
          message={modalError || t('host.networkSpaces.confirmDeleteBody')}
          confirmText={t('host.networkSpaces.del')}
          loading={modalBusy}
        />
      )}
    </div>
  );
};

NetworkSpacesPanel.propTypes = {
  server: PropTypes.object.isRequired,
  onChanged: PropTypes.func,
};

export default NetworkSpacesPanel;
