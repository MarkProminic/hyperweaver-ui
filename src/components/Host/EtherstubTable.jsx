import PropTypes from 'prop-types';
import { useState } from 'react';

const EtherstubTable = ({ etherstubs, loading, onDelete, onViewDetails }) => {
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async etherstub => {
    const key = etherstub.name || etherstub.link;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(etherstub.name || etherstub.link);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading && etherstubs.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">Loading etherstubs...</p>
      </div>
    );
  }

  if (etherstubs.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-ethernet fa-2x text-muted" />
        <p className="mt-2 text-muted">No etherstubs found</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Etherstub Name</th>
            <th>Class</th>
            <th>State</th>
            <th>Over</th>
            <th>VNICs</th>
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
          {etherstubs.map((etherstub, index) => {
            const etherstubName = etherstub.name || etherstub.link;
            const isDeleting = deleteLoading[etherstubName];

            return (
              <tr key={etherstubName || index}>
                <td>
                  <strong className="font-monospace">{etherstubName}</strong>
                </td>
                <td>
                  <span className="badge text-bg-info">{etherstub.class || 'etherstub'}</span>
                </td>
                <td>
                  <span className="badge text-bg-success">{etherstub.state || 'up'}</span>
                </td>
                <td>
                  <span className="small">{etherstub.over || '--'}</span>
                </td>
                <td>
                  <span className="small">
                    {etherstub.vnics ? `${etherstub.vnics.length} VNICs` : '0 VNICs'}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewDetails(etherstub)}
                      disabled={loading || isDeleting}
                      title="View Details"
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(etherstub)}
                      disabled={loading || isDeleting}
                      title="Delete Etherstub"
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

EtherstubTable.propTypes = {
  etherstubs: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default EtherstubTable;
