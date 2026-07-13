import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { getGuestAgentNetwork, getGuestAgentOsInfo, setupGuestAgent } from '../../api/machineAPI';
import { ContentModal } from '../common';

/**
 * Guest-agent card: OS identity + the discovery sweep's observed addresses.
 * configuration.guest_info gates it; the channel is only spoken for detail
 * (osinfo once, the full interface table behind "More").
 */

const GuestNetworkTable = ({ interfaces }) => (
  <table className="table table-sm small mb-0 align-middle">
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">MAC address</th>
        <th scope="col" className="text-end">
          IP address
        </th>
      </tr>
    </thead>
    <tbody>
      {interfaces.map(iface => (
        <tr key={iface.name}>
          <td>{iface.name}</td>
          <td>
            <code className="small">{iface['hardware-address'] || '—'}</code>
          </td>
          <td className="text-end">
            {(iface['ip-addresses'] || []).length === 0 && <span className="text-muted">—</span>}
            {(iface['ip-addresses'] || []).map(entry => (
              <div key={`${entry['ip-address']}/${entry.prefix}`}>
                <code className="small">
                  {entry['ip-address']}/{entry.prefix}
                </code>
              </div>
            ))}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

GuestNetworkTable.propTypes = {
  interfaces: PropTypes.array.isRequired,
};

const MachineGuestAgent = ({ currentServer, machineName, guestInfo, colClass = 'col-12' }) => {
  const [osinfo, setOsinfo] = useState(null);
  const [showNetwork, setShowNetwork] = useState(false);
  const [interfaces, setInterfaces] = useState([]);
  const [netLoading, setNetLoading] = useState(false);
  const [netError, setNetError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const ready = !!guestInfo?.agent_responding;
  const ips = Array.isArray(guestInfo?.ips) ? guestInfo.ips : [];

  const runSetup = async () => {
    setBusy(true);
    setActionMsg('');
    const result = await setupGuestAgent(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    setBusy(false);
    setActionMsg(
      result.success
        ? `${result.data?.message || 'Guest-agent channel configured'}${
            result.data?.requires_restart ? ' — takes effect on the next boot.' : ''
          }`
        : result.message
    );
  };

  useEffect(() => {
    setOsinfo(null);
    if (!ready || !currentServer || !machineName) {
      return undefined;
    }
    let cancelled = false;
    getGuestAgentOsInfo(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    ).then(result => {
      if (!cancelled) {
        setOsinfo(result.success ? result.data?.osinfo || null : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, currentServer, machineName]);

  const handleShowNetwork = async () => {
    setShowNetwork(true);
    setNetLoading(true);
    setNetError('');
    const result = await getGuestAgentNetwork(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    setInterfaces(
      result.success && Array.isArray(result.data?.interfaces) ? result.data.interfaces : []
    );
    setNetError(result.success ? '' : result.message || 'Guest network query failed.');
    setNetLoading(false);
  };

  if (!guestInfo) {
    return null;
  }

  return (
    <div className={colClass}>
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="fs-6 fw-bold mb-0">
              <i className="fas fa-satellite-dish me-2" />
              Guest Agent
            </h4>
            {guestInfo.checked_at && (
              <span className="text-muted small">
                checked {new Date(guestInfo.checked_at).toLocaleTimeString()}
              </span>
            )}
          </div>

          {!ready && (
            <>
              <p className="text-muted small mb-2">
                The guest-agent channel is not responding — either the guest is not running qemu-ga,
                or the channel device is not wired yet.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={runSetup}
                disabled={busy}
                title="Wire the guest-agent channel device onto this machine — takes effect on the next boot"
              >
                <i className={`fas ${busy ? 'fa-spinner fa-pulse' : 'fa-plug'} me-2`} />
                Set up channel
              </button>
              {actionMsg && (
                <div className="alert alert-info py-1 px-2 small mt-2 mb-0">{actionMsg}</div>
              )}
            </>
          )}

          {ready && (
            <>
              {osinfo && (
                <div className="mb-2">
                  <span className="text-muted small me-2">OS</span>
                  <span className="small">{osinfo['pretty-name'] || osinfo.name || 'Unknown'}</span>
                  {osinfo['kernel-release'] && (
                    <span className="text-muted small ms-2">({osinfo['kernel-release']})</span>
                  )}
                </div>
              )}

              {ips.length > 0 ? (
                <div className="mb-2">
                  {ips.map(ip => (
                    <div key={ip}>
                      <code>{ip}</code>
                    </div>
                  ))}
                  <span className="text-muted small">
                    via {guestInfo.source === 'additions' ? 'Guest Additions' : 'guest agent'}
                  </span>
                </div>
              ) : (
                <p className="text-muted small mb-2">No addresses observed.</p>
              )}

              <div className="d-flex flex-wrap gap-1">
                {ips.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleShowNetwork}
                  >
                    More
                  </button>
                )}
              </div>
              {actionMsg && (
                <div className="alert alert-info py-1 px-2 small mt-2 mb-0">{actionMsg}</div>
              )}
            </>
          )}

          <ContentModal
            isOpen={showNetwork}
            onClose={() => setShowNetwork(false)}
            title="Guest Agent Network Information"
            icon="fas fa-network-wired"
          >
            {netLoading && (
              <div className="text-center py-3">
                <i className="fas fa-spinner fa-pulse fa-2x" />
              </div>
            )}
            {!netLoading && netError && <div className="alert alert-warning mb-0">{netError}</div>}
            {!netLoading && !netError && <GuestNetworkTable interfaces={interfaces} />}
          </ContentModal>
        </div>
      </div>
    </div>
  );
};

MachineGuestAgent.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  guestInfo: PropTypes.shape({
    ips: PropTypes.arrayOf(PropTypes.string),
    source: PropTypes.string,
    agent_responding: PropTypes.bool,
    checked_at: PropTypes.string,
  }),
  colClass: PropTypes.string,
};

export default MachineGuestAgent;
