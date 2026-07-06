import PropTypes from 'prop-types';

/**
 * Minimal networks editor for the machine-create wizard (sync item 12): one
 * row per spec `networks[]` entry — bridge (picker fed by the agent's
 * GET /provisioning/bridged-interfaces, free text preserved), DHCP toggle,
 * and static addressing. Entries pass to the agent VERBATIM, so keys a row
 * already carries beyond these fields (an edited spec's mac, dns, type, …)
 * survive the round-trip untouched.
 */

const FIELDS = [
  { key: 'address', label: 'Address' },
  { key: 'netmask', label: 'Netmask' },
  { key: 'gateway', label: 'Gateway' },
];

const NetworksEditor = ({ networks, onNetworksChange, bridgeOptions, loading }) => {
  const setNetwork = (index, patch) => {
    onNetworksChange(
      networks.map((network, i) => (i === index ? { ...network, ...patch } : network))
    );
  };

  return (
    <div className="d-flex flex-column gap-2">
      {networks.length === 0 && (
        <p className="text-muted small mb-0">
          No networks defined — the provisioner template&apos;s defaults apply.
        </p>
      )}
      {networks.map((network, index) => {
        const rowKey = `network-${index}`;
        return (
          <div className="border rounded p-2" key={rowKey}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-bridge`}>
                  Bridge / NIC
                </label>
                <input
                  id={`${rowKey}-bridge`}
                  className="form-control form-control-sm"
                  type="text"
                  list={bridgeOptions.length ? `${rowKey}-bridge-options` : undefined}
                  value={network.bridge ?? ''}
                  onChange={e => setNetwork(index, { bridge: e.target.value })}
                  disabled={loading}
                />
                {bridgeOptions.length > 0 && (
                  <datalist id={`${rowKey}-bridge-options`}>
                    {bridgeOptions.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                )}
              </div>
              <div className="col-6 col-md-2">
                <div className="form-check form-switch mb-1">
                  <input
                    id={`${rowKey}-dhcp`}
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={!!network.dhcp4}
                    onChange={e => setNetwork(index, { dhcp4: e.target.checked })}
                    disabled={loading}
                  />
                  <label className="form-check-label small" htmlFor={`${rowKey}-dhcp`}>
                    DHCP
                  </label>
                </div>
              </div>
              {FIELDS.map(field => (
                <div className="col-6 col-md-2" key={field.key}>
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`${rowKey}-${field.key}`}
                    className="form-control form-control-sm"
                    type="text"
                    value={network[field.key] ?? ''}
                    onChange={e => setNetwork(index, { [field.key]: e.target.value })}
                    disabled={loading || !!network.dhcp4}
                  />
                </div>
              ))}
              <div className="col-auto ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label="Remove network"
                  onClick={() =>
                    onNetworksChange(networks.slice(0, index).concat(networks.slice(index + 1)))
                  }
                  disabled={loading}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onNetworksChange([...networks, { dhcp4: true }])}
          disabled={loading}
        >
          <i className="fas fa-plus me-2" />
          Add Network
        </button>
      </div>
    </div>
  );
};

NetworksEditor.propTypes = {
  networks: PropTypes.array.isRequired,
  onNetworksChange: PropTypes.func.isRequired,
  bridgeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  loading: PropTypes.bool,
};

export default NetworksEditor;
