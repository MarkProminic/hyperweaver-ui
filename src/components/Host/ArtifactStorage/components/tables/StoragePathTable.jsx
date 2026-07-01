import PropTypes from 'prop-types';

const StoragePathTable = ({ storagePaths, loading, onEdit, onDelete, onToggle, onNameClick }) => {
  const formatSize = bytes => {
    if (!bytes) {
      return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = dateString => {
    if (!dateString) {
      return 'Never';
    }

    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch {
      return dateString;
    }
  };

  const getTypeIcon = type => {
    switch (type?.toLowerCase()) {
      case 'iso':
        return <i className="fas fa-compact-disc" />;
      case 'image':
        return <i className="fas fa-hdd" />;
      default:
        return <i className="fas fa-folder" />;
    }
  };

  const getTypeTag = type => {
    switch (type?.toLowerCase()) {
      case 'iso':
        return <span className="badge text-bg-info">ISO</span>;
      case 'image':
        return <span className="badge text-bg-warning">Image</span>;
      default:
        return <span className="badge text-bg-light">{type}</span>;
    }
  };

  const getStatusTag = enabled =>
    enabled ? (
      <span className="badge text-bg-success">Enabled</span>
    ) : (
      <span className="badge text-bg-danger">Disabled</span>
    );

  const getDiskUsageBar = diskUsage => {
    if (!diskUsage || !diskUsage.use_percent) {
      return null;
    }

    const percentage = parseInt(diskUsage.use_percent.replace('%', ''));
    let colorClass = 'bg-success';

    if (percentage >= 90) {
      colorClass = 'bg-danger';
    } else if (percentage >= 75) {
      colorClass = 'bg-warning';
    }

    return (
      <div className="mb-3">
        <span className="form-label small">Disk Usage</span>
        <div
          className="progress"
          style={{ height: '0.5rem' }}
          role="progressbar"
          title={`${diskUsage.used} / ${diskUsage.total} (${diskUsage.use_percent})`}
        >
          <div className={`progress-bar ${colorClass}`} style={{ width: `${percentage}%` }} />
        </div>
        <p className="form-text text-muted small">
          {diskUsage.used} / {diskUsage.total} ({diskUsage.use_percent})
        </p>
      </div>
    );
  };

  if (loading && storagePaths.length === 0) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-spinner fa-spin fa-2x" />
        </span>
        <p className="mt-2">Loading storage paths...</p>
      </div>
    );
  }

  if (storagePaths.length === 0) {
    return (
      <div className="text-center p-4">
        <span className="text-muted">
          <i className="fas fa-folder fa-2x" />
        </span>
        <p className="mt-2 text-muted">No storage paths configured</p>
        <p className="text-muted small">Create a storage path to begin managing artifacts</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Path</th>
            <th>Type</th>
            <th>Status</th>
            <th>Files</th>
            <th>Size</th>
            <th>Last Scan</th>
            <th>Usage</th>
            <th width="200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {storagePaths.map(storagePath => (
            <tr key={storagePath.id}>
              <td>
                <div className="d-flex align-items-center">
                  <span className="me-2">{getTypeIcon(storagePath.type)}</span>
                  {onNameClick ? (
                    <button
                      type="button"
                      className="fw-bold cursor-pointer text-primary btn btn-link p-0"
                      onClick={() => onNameClick(storagePath)}
                      title={`View artifacts in ${storagePath.name} (${storagePath.file_count || 0} files)`}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                      }}
                    >
                      {storagePath.name}
                      <span className="ms-1">
                        <i className="fas fa-external-link-alt small" />
                      </span>
                    </button>
                  ) : (
                    <strong>{storagePath.name}</strong>
                  )}
                </div>
              </td>
              <td>
                <span className="font-monospace small" title={storagePath.path}>
                  {storagePath.path}
                </span>
              </td>
              <td>{getTypeTag(storagePath.type)}</td>
              <td>{getStatusTag(storagePath.enabled)}</td>
              <td>
                <span className="fw-semibold">{storagePath.file_count || 0}</span>
              </td>
              <td>{formatSize(storagePath.total_size)}</td>
              <td>
                <span className="small">{formatDate(storagePath.last_scan_at)}</span>
              </td>
              <td>
                {storagePath.disk_usage ? (
                  <div style={{ minWidth: '120px' }}>{getDiskUsageBar(storagePath.disk_usage)}</div>
                ) : (
                  <span className="text-muted small">N/A</span>
                )}
              </td>
              <td>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => onEdit(storagePath)}
                    disabled={loading}
                    title="Edit storage path"
                  >
                    <span>
                      <i className="fas fa-edit" />
                    </span>
                  </button>

                  <button
                    className={`btn btn-sm ${storagePath.enabled ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => onToggle(storagePath)}
                    disabled={loading}
                    title={storagePath.enabled ? 'Disable storage path' : 'Enable storage path'}
                  >
                    <span>
                      <i className={`fas ${storagePath.enabled ? 'fa-pause' : 'fa-play'}`} />
                    </span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(storagePath)}
                    disabled={loading}
                    title="Delete storage path"
                  >
                    <span>
                      <i className="fas fa-trash" />
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

StoragePathTable.propTypes = {
  storagePaths: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNameClick: PropTypes.func,
};

export default StoragePathTable;
