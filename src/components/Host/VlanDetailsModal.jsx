import PropTypes from 'prop-types';

import { ContentModal } from '../common';

const VlanDetailsModal = ({ vlan, onClose }) => {
  const renderDetailRow = (label, value, monospace = false) => (
    <div className="row">
      <div className="col-4">
        <strong>{label}:</strong>
      </div>
      <div className="col">
        <span className={monospace ? 'font-monospace' : ''}>{value || 'N/A'}</span>
      </div>
    </div>
  );

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <span className="badge text-bg-success">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return <span className="badge text-bg-secondary">{state || 'Unknown'}</span>;
    }
  };

  const getVlanTag = vid => {
    if (vid === undefined || vid === null || vid === '') {
      return <span className="badge text-bg-dark">No VID</span>;
    }

    // Assign colors based on VLAN ID to make each VLAN visually distinct
    const colors = [
      'text-bg-primary', // Blue
      'text-bg-info', // Cyan
      'text-bg-success', // Green
      'text-bg-warning', // Yellow
      'text-bg-danger', // Red
      'text-bg-primary', // Blue-ish
      'text-bg-primary', // Repeat for more VLANs
      'text-bg-info',
      'text-bg-success',
    ];

    const colorIndex = parseInt(vid) % colors.length;
    const colorClass = colors[colorIndex];

    return <span className={`badge ${colorClass}`}>{vid}</span>;
  };

  const formatTimestamp = timestamp => {
    if (!timestamp) {
      return 'N/A';
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <ContentModal isOpen onClose={onClose} title={`VLAN Details: ${vlan.link}`} icon="fas fa-tags">
      <div>
        {/* Basic VLAN Information */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-info-circle me-2" />
              <span>Basic Information</span>
            </h4>

            {renderDetailRow('VLAN Name', vlan.link, true)}

            <div className="row">
              <div className="col-4">
                <strong>VLAN ID:</strong>
              </div>
              <div className="col">{getVlanTag(vlan.vid)}</div>
            </div>

            {renderDetailRow('Physical Link', vlan.over, true)}

            <div className="row">
              <div className="col-4">
                <strong>State:</strong>
              </div>
              <div className="col">{getStateTag(vlan.state)}</div>
            </div>

            {renderDetailRow('Class', vlan.class)}
            {renderDetailRow('MTU', vlan.mtu || '1500')}
            {renderDetailRow('Flags', vlan.flags)}
          </div>
        </div>

        {/* Technical Details */}
        {vlan.details && (
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="fs-6 fw-bold mb-3">
                <i className="fas fa-cogs me-2" />
                <span>Technical Details</span>
              </h4>

              {vlan.details.link && renderDetailRow('Link Name', vlan.details.link, true)}
              {vlan.details.class && renderDetailRow('Link Class', vlan.details.class)}
              {vlan.details.vid && renderDetailRow('VLAN ID', vlan.details.vid)}
              {vlan.details.over && renderDetailRow('Over Link', vlan.details.over, true)}
              {vlan.details.state && (
                <div className="row">
                  <div className="col-4">
                    <strong>Current State:</strong>
                  </div>
                  <div className="col">{getStateTag(vlan.details.state)}</div>
                </div>
              )}
              {vlan.details.mtu && renderDetailRow('MTU Size', vlan.details.mtu)}
              {vlan.details.flags && renderDetailRow('Interface Flags', vlan.details.flags)}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-clock me-2" />
              <span>Metadata</span>
            </h4>

            {vlan.scan_timestamp &&
              renderDetailRow('Last Scanned', formatTimestamp(vlan.scan_timestamp))}
            {vlan.created_at && renderDetailRow('Created At', formatTimestamp(vlan.created_at))}
            {vlan.updated_at && renderDetailRow('Updated At', formatTimestamp(vlan.updated_at))}

            <div className="row">
              <div className="col-4">
                <strong>Data Source:</strong>
              </div>
              <div className="col">
                <span className="badge text-bg-info">{vlan.source || 'database'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Data for Debugging */}
        {import.meta.env.MODE === 'development' && (
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="fs-6 fw-bold mb-3">
                <i className="fas fa-code me-2" />
                <span>Raw Data (Development)</span>
              </h4>

              <pre className="bg-body-tertiary p-3 small">{JSON.stringify(vlan, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </ContentModal>
  );
};

VlanDetailsModal.propTypes = {
  vlan: PropTypes.shape({
    link: PropTypes.string,
    vid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    over: PropTypes.string,
    state: PropTypes.string,
    class: PropTypes.string,
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    flags: PropTypes.string,
    details: PropTypes.object,
    scan_timestamp: PropTypes.string,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
    source: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VlanDetailsModal;
