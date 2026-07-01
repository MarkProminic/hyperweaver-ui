import PropTypes from 'prop-types';
import { useState } from 'react';

import ArtifactDownloadRow from './ArtifactDownloadRow';
import ArtifactRow from './ArtifactRow';

const ArtifactTable = ({
  artifacts,
  activeDownloads,
  pagination,
  loading,
  onDetails,
  onDelete,
  onMove,
  onCopy,
  onPaginationChange,
  onSort,
  onCancelDownload,
}) => {
  const [selectedArtifacts, setSelectedArtifacts] = useState(new Set());
  const [sortBy, setSortBy] = useState('filename');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = field => {
    let newOrder = 'asc';
    if (sortBy === field && sortOrder === 'asc') {
      newOrder = 'desc';
    }

    setSortBy(field);
    setSortOrder(newOrder);
    onSort(field, newOrder);
  };

  const getSortIcon = field => {
    if (sortBy !== field) {
      return <i className="fas fa-sort text-muted" />;
    }

    return sortOrder === 'asc' ? (
      <i className="fas fa-sort-up text-primary" />
    ) : (
      <i className="fas fa-sort-down text-primary" />
    );
  };

  const handleSelectArtifact = artifactId => {
    const newSelected = new Set(selectedArtifacts);
    if (newSelected.has(artifactId)) {
      newSelected.delete(artifactId);
    } else {
      newSelected.add(artifactId);
    }
    setSelectedArtifacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedArtifacts.size === artifacts.length) {
      setSelectedArtifacts(new Set());
    } else {
      setSelectedArtifacts(new Set(artifacts.map(a => a.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedArtifacts.size > 0) {
      onDelete([...selectedArtifacts]);
      setSelectedArtifacts(new Set());
    }
  };

  const activeDownloadsList = activeDownloads ? Array.from(activeDownloads.values()) : [];

  const renderPagination = () => {
    if (!pagination || pagination.total <= pagination.limit) {
      return null;
    }

    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasNext = pagination.has_more;
    const hasPrev = pagination.offset > 0;

    return (
      <nav
        className="d-flex justify-content-center align-items-center gap-2 mt-4"
        role="navigation"
        aria-label="pagination"
      >
        <button
          className="btn btn-outline-primary"
          disabled={!hasPrev || loading}
          onClick={() => onPaginationChange(Math.max(0, pagination.offset - pagination.limit))}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages} ({pagination.total} total)
        </span>
        <button
          className="btn btn-outline-primary"
          disabled={!hasNext || loading}
          onClick={() => onPaginationChange(pagination.offset + pagination.limit)}
        >
          Next
        </button>
      </nav>
    );
  };

  if (loading && artifacts.length === 0 && activeDownloadsList.length === 0) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-spinner fa-spin fa-2x" />
        </span>
        <p className="mt-2">Loading artifacts...</p>
      </div>
    );
  }

  if (artifacts.length === 0 && activeDownloadsList.length === 0) {
    return (
      <div className="text-center p-4">
        <span className="text-muted">
          <i className="fas fa-compact-disc fa-2x" />
        </span>
        <p className="mt-2 text-muted">No artifacts found</p>
        <p className="text-muted small">Upload files or download from URLs to get started</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk Actions */}
      {selectedArtifacts.size > 0 && (
        <div className="alert alert-secondary mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span>
                <strong>{selectedArtifacts.size}</strong> artifacts selected
              </span>
            </div>
            <div>
              <div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  <span className="me-1">
                    <i className="fas fa-trash" />
                  </span>
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th width="30">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="artifact-select-all"
                    checked={selectedArtifacts.size === artifacts.length && artifacts.length > 0}
                    onChange={handleSelectAll}
                  />
                  <label className="form-check-label visually-hidden" htmlFor="artifact-select-all">
                    Select all artifacts
                  </label>
                </div>
              </th>
              <th
                className="cursor-pointer"
                onClick={() => handleSort('filename')}
                title="Click to sort by filename"
              >
                <span className="d-inline-flex align-items-center">
                  <span>Filename</span>
                  <span className="ms-1">{getSortIcon('filename')}</span>
                </span>
              </th>
              <th>Type</th>
              <th
                className="cursor-pointer"
                onClick={() => handleSort('size')}
                title="Click to sort by size"
              >
                <span className="d-inline-flex align-items-center">
                  <span>Size</span>
                  <span className="ms-1">{getSortIcon('size')}</span>
                </span>
              </th>
              <th>Checksum</th>
              <th>Storage Location</th>
              <th
                className="cursor-pointer"
                onClick={() => handleSort('discovered_at')}
                title="Click to sort by date"
              >
                <span className="d-inline-flex align-items-center">
                  <span>Added</span>
                  <span className="ms-1">{getSortIcon('discovered_at')}</span>
                </span>
              </th>
              <th width="150">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeDownloadsList.map(download => (
              <ArtifactDownloadRow
                key={download.taskId}
                download={download}
                onCancelDownload={onCancelDownload}
              />
            ))}

            {artifacts.map(artifact => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                selected={selectedArtifacts.has(artifact.id)}
                loading={loading}
                onSelect={handleSelectArtifact}
                onDetails={onDetails}
                onDelete={onDelete}
                onMove={onMove}
                onCopy={onCopy}
              />
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
};

ArtifactTable.propTypes = {
  artifacts: PropTypes.array.isRequired,
  activeDownloads: PropTypes.instanceOf(Map),
  pagination: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onPaginationChange: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  onCancelDownload: PropTypes.func,
};

export default ArtifactTable;
