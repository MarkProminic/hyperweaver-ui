import PropTypes from 'prop-types';

import { ContentModal } from '../common';

const VnicDetailsModal = ({ vnic, onClose }) => {
  const formatDetails = details => {
    if (!details) {
      return [];
    }

    // Convert details object to array of key-value pairs for display
    return Object.entries(details).map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    }));
  };

  const formatMac = mac => {
    if (!mac) {
      return 'N/A';
    }
    // Format MAC address with colons if not already formatted
    if (mac.includes(':')) {
      return mac;
    }
    return mac.match(/.{2}/g)?.join(':') || mac;
  };

  const formatSpeed = speed => {
    if (!speed) {
      return 'N/A';
    }
    if (speed >= 1000) {
      return `${speed / 1000} Gbps`;
    }
    return `${speed} Mbps`;
  };

  const getStateTagClass = state => {
    if (state === 'up') {
      return 'text-bg-success';
    }
    if (state === 'down') {
      return 'text-bg-danger';
    }
    return 'text-bg-secondary';
  };

  const detailsArray = formatDetails(vnic.details);

  return (
    <ContentModal isOpen onClose={onClose} title="VNIC Details" icon="fas fa-network-wired">
      {/* VNIC Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Basic Information</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>VNIC Name</strong>
                  </td>
                  <td className="font-monospace">{vnic.link}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Physical Link</strong>
                  </td>
                  <td className="font-monospace">{vnic.over || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>State</strong>
                  </td>
                  <td>
                    <span className={`badge ${getStateTagClass(vnic.state)}`}>
                      {vnic.state || 'Unknown'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>MAC Address</strong>
                  </td>
                  <td className="font-monospace">{formatMac(vnic.macaddress)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>MAC Address Type</strong>
                  </td>
                  <td>{vnic.macaddrtype || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>VLAN ID</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-secondary">
                      {vnic.vid !== undefined ? vnic.vid : 'N/A'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Zone Assignment</strong>
                  </td>
                  <td className="font-monospace">
                    {vnic.zone && vnic.zone !== '--' ? vnic.zone : 'Global Zone'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Speed</strong>
                  </td>
                  <td>{formatSpeed(vnic.speed)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>MTU</strong>
                  </td>
                  <td>{vnic.mtu || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Media Type</strong>
                  </td>
                  <td>{vnic.media || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Duplex</strong>
                  </td>
                  <td>{vnic.duplex || 'N/A'}</td>
                </tr>
                {vnic.device && (
                  <tr>
                    <td>
                      <strong>Device</strong>
                    </td>
                    <td className="font-monospace">{vnic.device}</td>
                  </tr>
                )}
                {vnic.bridge && vnic.bridge !== '--' && (
                  <tr>
                    <td>
                      <strong>Bridge</strong>
                    </td>
                    <td className="font-monospace">{vnic.bridge}</td>
                  </tr>
                )}
                {vnic.pause && (
                  <tr>
                    <td>
                      <strong>Pause</strong>
                    </td>
                    <td>{vnic.pause}</td>
                  </tr>
                )}
                {vnic.auto && (
                  <tr>
                    <td>
                      <strong>Auto Negotiation</strong>
                    </td>
                    <td>{vnic.auto}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      {detailsArray.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Additional Details</h3>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsArray.map((detail, index) => (
                    <tr key={detail.label || index}>
                      <td>
                        <strong>{detail.label}</strong>
                      </td>
                      <td>
                        {detail.value.includes('\n') ? (
                          <pre className="small bg-dark text-light p-2">{detail.value}</pre>
                        ) : (
                          <span className="font-monospace small">{detail.value}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no additional details available */}
      {detailsArray.length === 0 && (
        <div className="alert alert-info">
          <p>No additional detailed information available for this VNIC.</p>
        </div>
      )}

      {/* Timestamps */}
      {(vnic.created_at || vnic.updated_at) && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Timestamps</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {vnic.created_at && (
                    <tr>
                      <td>
                        <strong>Created</strong>
                      </td>
                      <td>{new Date(vnic.created_at).toLocaleString()}</td>
                    </tr>
                  )}
                  {vnic.updated_at && (
                    <tr>
                      <td>
                        <strong>Last Updated</strong>
                      </td>
                      <td>{new Date(vnic.updated_at).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ContentModal>
  );
};

VnicDetailsModal.propTypes = {
  vnic: PropTypes.shape({
    link: PropTypes.string,
    over: PropTypes.string,
    state: PropTypes.string,
    macaddress: PropTypes.string,
    macaddrtype: PropTypes.string,
    vid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    zone: PropTypes.string,
    speed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    media: PropTypes.string,
    duplex: PropTypes.string,
    device: PropTypes.string,
    bridge: PropTypes.string,
    pause: PropTypes.string,
    auto: PropTypes.string,
    details: PropTypes.object,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VnicDetailsModal;
