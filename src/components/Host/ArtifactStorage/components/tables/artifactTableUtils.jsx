/**
 * Shared utility functions for ArtifactTable and its sub-components.
 */

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
    return 'N/A';
  }

  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return dateString;
  }
};

const getTypeIcon = (fileType, extension) => {
  const type = fileType?.toLowerCase() || extension?.toLowerCase();

  if (type === 'iso' || extension?.toLowerCase() === '.iso') {
    return <i className="fas fa-compact-disc text-info" />;
  } else if (
    type === 'image' ||
    ['.vmdk', '.vhd', '.vhdx', '.qcow2', '.img'].includes(extension?.toLowerCase())
  ) {
    return <i className="fas fa-hdd text-warning" />;
  }
  return <i className="fas fa-file text-muted" />;
};

const getTypeTag = (fileType, extension) => {
  const type = fileType?.toLowerCase();

  if (type === 'iso') {
    return <span className="badge text-bg-info">ISO</span>;
  } else if (type === 'image') {
    return <span className="badge text-bg-warning">Image</span>;
  }
  return <span className="badge text-bg-light">{extension || 'File'}</span>;
};

const getChecksumStatus = artifact => {
  if (artifact.checksum_verified === true) {
    return (
      <span className="text-success" title="Checksum verified">
        <i className="fas fa-check-circle" />
      </span>
    );
  } else if (artifact.checksum_verified === false) {
    return (
      <span className="text-danger" title="Checksum mismatch">
        <i className="fas fa-times-circle" />
      </span>
    );
  } else if (artifact.calculated_checksum && !artifact.user_provided_checksum) {
    return (
      <span className="text-info" title="Checksum calculated">
        <i className="fas fa-info-circle" />
      </span>
    );
  }
  return (
    <span className="text-muted" title="No checksum">
      <i className="fas fa-minus-circle" />
    </span>
  );
};

const getDownloadStatusIcon = status => {
  switch (status) {
    case 'queued':
      return <i className="fas fa-clock text-info" />;
    case 'running':
      return <i className="fas fa-spinner fa-spin text-primary" />;
    case 'completed':
      return <i className="fas fa-check-circle text-success" />;
    case 'failed':
      return <i className="fas fa-times-circle text-danger" />;
    default:
      return <i className="fas fa-question-circle text-muted" />;
  }
};

const getDownloadStatusText = status => {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Downloading...';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
};

const getDownloadStatusTag = status => {
  switch (status) {
    case 'queued':
      return <span className="badge text-bg-info">Queued</span>;
    case 'running':
      return <span className="badge text-bg-primary">Downloading</span>;
    case 'completed':
      return <span className="badge text-bg-success">Completed</span>;
    case 'failed':
      return <span className="badge text-bg-danger">Failed</span>;
    default:
      return <span className="badge text-bg-light">{status}</span>;
  }
};

export {
  formatSize,
  formatDate,
  getTypeIcon,
  getTypeTag,
  getChecksumStatus,
  getDownloadStatusIcon,
  getDownloadStatusText,
  getDownloadStatusTag,
};
