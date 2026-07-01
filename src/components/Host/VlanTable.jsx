import PropTypes from 'prop-types';
import { useState } from 'react';

const VlanTable = ({ vlans, loading, onDelete, onViewDetails }) => {
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async vlan => {
    const key = vlan.link;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(vlan.link);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStateIcon = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <i className="fas fa-check-circle text-success me-2" />;
      case 'down':
        return <i className="fas fa-times-circle text-danger me-2" />;
      default:
        return <i className="fas fa-question-circle text-muted me-2" />;
    }
  };

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

  if (loading && vlans.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading VLANs...</p>
      </div>
    );
  }

  if (vlans.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-tags fa-2x text-muted" />
        <p className="mt-2 text-muted">No VLANs found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-sm">
        <thead>
          <tr>
            <th>VLAN Name</th>
            <th>VLAN ID</th>
            <th>Physical Link</th>
            <th>State</th>
            <th>MTU</th>
            <th>Flags</th>
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vlans.map((vlan, index) => {
            const isDeleting = deleteLoading[vlan.link];

            return (
              <tr key={vlan.link || index}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStateIcon(vlan.state)}
                    <span className="ms-2">
                      <strong className="font-monospace">{vlan.link}</strong>
                    </span>
                  </div>
                </td>
                <td>{getVlanTag(vlan.vid)}</td>
                <td>
                  <span className="font-monospace">{vlan.over || 'N/A'}</span>
                </td>
                <td>{getStateTag(vlan.state)}</td>
                <td>
                  <span className="small">{vlan.mtu || '1500'}</span>
                </td>
                <td>
                  <span className="small text-muted">{vlan.flags || '-'}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewDetails(vlan)}
                      disabled={loading || isDeleting}
                      title="View Details"
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(vlan)}
                      disabled={loading || isDeleting}
                      title="Delete VLAN"
                    >
                      {isDeleting && (
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                      )}
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

VlanTable.propTypes = {
  vlans: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default VlanTable;
