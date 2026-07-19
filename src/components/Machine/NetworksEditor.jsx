import PropTypes from 'prop-types';

import PickOrType from './PickOrType';

/**
 * Networks editor for the machine-create wizard: one row per spec
 * `networks[]` entry — type (external = the user's bridged network,
 * host = host-only), bridge/uplink (a REAL dropdown fed by the agent's
 * GET /provisioning/bridged-interfaces — phys + aggr + etherstub, class
 * labeled, Custom… escape for anything else), DHCP toggle, static
 * addressing, MAC (auto = the hypervisor assigns), and two DNS entries
 * (the networking role's netplan template reads dns[0] AND dns[1], even
 * under DHCP — proven sequence, sync 2026-07-07). Entries pass to the
 * agent VERBATIM, so keys a row already carries beyond these fields survive
 * the round-trip untouched.
 */

const ADDRESS_FIELDS = [
  { key: 'address', label: 'Address' },
  { key: 'netmask', label: 'Netmask' },
  { key: 'gateway', label: 'Gateway' },
];

// Per-adapter tuning keys the create wire takes on each networks[] entry.
const TUNING_FIELDS = [
  { key: 'promisc', label: 'Promiscuous', suggest: ['deny', 'allow-vms', 'allow-all'] },
  { key: 'speed', label: 'Speed (kbps)', type: 'number' },
  { key: 'boot_prio', label: 'Boot prio', type: 'number' },
  { key: 'bandwidth_group', label: 'Bandwidth group' },
  {
    key: 'nic_type',
    label: 'NIC type',
    suggest: ['Am79C970A', 'Am79C973', '82540EM', '82543GC', '82545EM', 'virtio'],
  },
];

const NetworksEditor = ({
  networks,
  onNetworksChange,
  bridgeChoices = [],
  ipSuggestions = null,
  nicEnums = null,
  loading,
}) => {
  const ipOptions = Array.isArray(ipSuggestions?.suggestions) ? ipSuggestions.suggestions : [];
  const setNetwork = (index, patch) => {
    onNetworksChange(
      networks.map((network, i) => (i === index ? { ...network, ...patch } : network))
    );
  };

  const setDns = (index, dnsIndex, value) => {
    const dns = Array.isArray(networks[index].dns) ? [...networks[index].dns] : [];
    while (dns.length < 2) {
      dns.push('');
    }
    dns[dnsIndex] = value;
    setNetwork(index, { dns });
  };

  return (
    <div className="d-flex flex-column gap-2">
      {/* ADVISORY free IPs from the host's own network (converged wire) —
          point-in-time, never a reservation; free text always wins. */}
      {ipOptions.length > 0 && (
        <datalist id="machine-ip-suggestions">
          {ipOptions.map(ip => (
            <option key={ip} value={ip} />
          ))}
        </datalist>
      )}
      {networks.length === 0 && (
        <p className="text-muted small mb-0">
          No networks defined — the provisioner template&apos;s defaults apply.
        </p>
      )}
      {networks.map((network, index) => {
        const rowKey = `network-${index}`;
        const dns = Array.isArray(network.dns) ? network.dns : [];
        return (
          <div className="border rounded p-2" key={rowKey}>
            {index === 0 && (
              <p className="form-text text-muted mt-0 mb-2">
                The first network becomes the {`machine's`} real network after provisioning —
                usually your bridged external.
              </p>
            )}
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-2">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-type`}>
                  Type
                </label>
                <input
                  id={`${rowKey}-type`}
                  className="form-control form-control-sm"
                  type="text"
                  list={`${rowKey}-type-options`}
                  value={network.type ?? ''}
                  onChange={e => setNetwork(index, { type: e.target.value })}
                  disabled={loading}
                />
                <datalist id={`${rowKey}-type-options`}>
                  <option value="external" />
                  <option value="host" />
                </datalist>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-bridge`}>
                  Bridge / Uplink
                </label>
                {bridgeChoices.length > 0 ? (
                  <PickOrType
                    id={`${rowKey}-bridge`}
                    value={network.bridge ?? ''}
                    onChange={next => setNetwork(index, { bridge: next })}
                    options={bridgeChoices}
                    blankLabel="Select an uplink…"
                    placeholder="link name"
                    small
                    disabled={loading}
                  />
                ) : (
                  <input
                    id={`${rowKey}-bridge`}
                    className="form-control form-control-sm"
                    type="text"
                    value={network.bridge ?? ''}
                    onChange={e => setNetwork(index, { bridge: e.target.value })}
                    disabled={loading}
                  />
                )}
                {bridgeChoices.some(
                  choice => choice.provisioning && choice.value === network.bridge
                ) && (
                  <span className="form-text text-warning small">
                    <i className="fas fa-triangle-exclamation me-1" />
                    This is the PROVISIONING etherstub — the agent&apos;s transport network, not a
                    real uplink for guest traffic.
                  </span>
                )}
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-mac`}>
                  MAC
                </label>
                <input
                  id={`${rowKey}-mac`}
                  className="form-control form-control-sm"
                  type="text"
                  placeholder="auto"
                  value={network.mac ?? ''}
                  onChange={e => setNetwork(index, { mac: e.target.value })}
                  disabled={loading}
                />
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
            <div className="row g-2 align-items-end mt-0">
              {ADDRESS_FIELDS.map(field => (
                <div className="col-6 col-md-2" key={field.key}>
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`${rowKey}-${field.key}`}
                    className="form-control form-control-sm"
                    type="text"
                    list={
                      field.key === 'address' && !network.dhcp4 && ipOptions.length > 0
                        ? 'machine-ip-suggestions'
                        : undefined
                    }
                    placeholder={
                      field.key === 'gateway' && ipSuggestions?.gateway
                        ? `e.g. ${ipSuggestions.gateway}`
                        : undefined
                    }
                    value={network[field.key] ?? ''}
                    onChange={e => setNetwork(index, { [field.key]: e.target.value })}
                    disabled={loading || !!network.dhcp4}
                  />
                </div>
              ))}
              {[0, 1].map(dnsIndex => (
                <div className="col-6 col-md-2" key={`dns-${dnsIndex}`}>
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-dns-${dnsIndex}`}>
                    DNS {dnsIndex + 1}
                  </label>
                  <input
                    id={`${rowKey}-dns-${dnsIndex}`}
                    className="form-control form-control-sm"
                    type="text"
                    placeholder={dnsIndex === 0 ? '1.1.1.1' : '1.0.0.1'}
                    value={dns[dnsIndex] ?? ''}
                    onChange={e => setDns(index, dnsIndex, e.target.value)}
                    disabled={loading}
                  />
                </div>
              ))}
              <div className="col-6 col-md-2">
                <label className="form-label small mb-1" htmlFor={`${rowKey}-route`}>
                  Route
                </label>
                <input
                  id={`${rowKey}-route`}
                  className="form-control form-control-sm font-monospace"
                  type="text"
                  placeholder="(default)"
                  title="OPTIONAL. Blank = the default route. A scoped CIDR (e.g. 10.190.190.0/24) confines this NIC's route so it never takes the guest's default."
                  value={network.route ?? ''}
                  onChange={e => setNetwork(index, { route: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <details className="mt-1">
              <summary className="small text-muted">Adapter tuning</summary>
              <div className="row g-2 align-items-end mt-0">
                <div className="col-6 col-md-2">
                  <label className="form-label small mb-1" htmlFor={`${rowKey}-cable`}>
                    Cable
                  </label>
                  <select
                    id={`${rowKey}-cable`}
                    className="form-select form-select-sm"
                    value={network.cable_connected ?? ''}
                    onChange={e => setNetwork(index, { cable_connected: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">(default)</option>
                    <option value="on">connected</option>
                    <option value="off">disconnected</option>
                  </select>
                </div>
                {TUNING_FIELDS.map(field => {
                  // knob_values (flat dotted keys) beats the hardcoded list
                  // when the agent maps it.
                  const vocabulary = nicEnums?.[`nics.${field.key}`] || field.suggest;
                  return (
                    <div className="col-6 col-md-2" key={field.key}>
                      <label className="form-label small mb-1" htmlFor={`${rowKey}-${field.key}`}>
                        {field.label}
                      </label>
                      {vocabulary ? (
                        <select
                          id={`${rowKey}-${field.key}`}
                          className="form-select form-select-sm"
                          value={network[field.key] ?? ''}
                          onChange={e => setNetwork(index, { [field.key]: e.target.value })}
                          disabled={loading}
                        >
                          <option value="">(default)</option>
                          {vocabulary.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`${rowKey}-${field.key}`}
                          className="form-control form-control-sm"
                          type={field.type || 'text'}
                          placeholder="(default)"
                          value={network[field.key] ?? ''}
                          onChange={e => setNetwork(index, { [field.key]: e.target.value })}
                          disabled={loading}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            onNetworksChange([...networks, { type: '', dhcp4: true, mac: 'auto', dns: ['', ''] }])
          }
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
  bridgeChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  ipSuggestions: PropTypes.object,
  nicEnums: PropTypes.object,
  loading: PropTypes.bool,
};

export default NetworksEditor;
