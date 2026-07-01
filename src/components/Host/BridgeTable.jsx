import PropTypes from 'prop-types';
import { useState } from 'react';

const BridgeTable = ({ bridges, loading, onDelete, onViewDetails }) => {
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async bridge => {
    const key = bridge.name;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(bridge.name);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getProtectionTag = protection => {
    switch (protection?.toLowerCase()) {
      case 'stp':
        return <span className="badge text-bg-success">STP</span>;
      case 'rstp':
        return <span className="badge text-bg-info">RSTP</span>;
      case 'none':
        return <span className="badge text-bg-secondary">None</span>;
      default:
        return <span className="badge text-bg-secondary">{protection || 'Unknown'}</span>;
    }
  };

  const formatLinks = links => {
    if (!links || !Array.isArray(links)) {
      return 'N/A';
    }
    if (links.length === 0) {
      return 'None';
    }
    if (links.length <= 2) {
      return links.join(', ');
    }
    return `${links.slice(0, 2).join(', ')} +${links.length - 2}`;
  };

  if (loading && bridges.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading bridges...</p>
      </div>
    );
  }

  if (bridges.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-bridge-water fa-2x text-muted" />
        <p className="mt-2 text-muted">No bridges found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Bridge Name</th>
            <th>Protection</th>
            <th>Priority</th>
            <th>Member Links</th>
            <th>Max Age</th>
            <th>Hello Time</th>
            <th>Forward Delay</th>
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bridges.map((bridge, index) => {
            const isDeleting = deleteLoading[bridge.name];

            return (
              <tr key={bridge.name || index}>
                <td>
                  <strong className="font-monospace">{bridge.name}</strong>
                </td>
                <td>{getProtectionTag(bridge.protection)}</td>
                <td>
                  <span className="badge text-bg-secondary">
                    {bridge.priority !== undefined ? bridge.priority : 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="font-monospace small" title={bridge.links?.join(', ')}>
                    {formatLinks(bridge.links)}
                  </span>
                  {bridge.links && bridge.links.length > 0 && (
                    <div className="small text-muted">
                      {bridge.links.length} link
                      {bridge.links.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </td>
                <td>
                  <span className="small">
                    {bridge.max_age !== undefined ? `${bridge.max_age}s` : 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="small">
                    {bridge.hello_time !== undefined ? `${bridge.hello_time}s` : 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="small">
                    {bridge.forward_delay !== undefined ? `${bridge.forward_delay}s` : 'N/A'}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewDetails(bridge)}
                      disabled={loading || isDeleting}
                      title="View Details"
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(bridge)}
                      disabled={loading || isDeleting}
                      title="Delete Bridge"
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

BridgeTable.propTypes = {
  bridges: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      protection: PropTypes.string,
      priority: PropTypes.number,
      links: PropTypes.arrayOf(PropTypes.string),
      max_age: PropTypes.number,
      hello_time: PropTypes.number,
      forward_delay: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default BridgeTable;
