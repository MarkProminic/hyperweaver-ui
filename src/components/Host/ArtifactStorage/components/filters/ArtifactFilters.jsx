import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { useDebounce } from '../../../../../utils/debounce';

const ArtifactFilters = ({
  filters,
  storagePaths,
  onFilterChange,
  onRefresh,
  onScan,
  onUpload,
  onDownload,
  loading,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    onFilterChange('search', debouncedSearch);
  }, [debouncedSearch, onFilterChange]);

  const handleSearchChange = e => {
    setLocalSearch(e.target.value);
  };

  const handleTypeChange = e => {
    onFilterChange('type', e.target.value);
  };

  const handleStorageLocationChange = e => {
    onFilterChange('storage_location', e.target.value);
  };

  const clearFilters = () => {
    setLocalSearch('');
    onFilterChange('search', '');
    onFilterChange('type', '');
    onFilterChange('storage_location', '');
  };

  const hasActiveFilters = filters.search || filters.type || filters.storage_location;

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="row">
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-search" className="form-label">
                Search Artifacts
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search" />
                </span>
                <input
                  id="artifact-search"
                  className="form-control"
                  type="text"
                  placeholder="Search by filename..."
                  value={localSearch}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-type-filter" className="form-label">
                Filter by Type
              </label>
              <select
                id="artifact-type-filter"
                className="form-select"
                value={filters.type || ''}
                onChange={handleTypeChange}
              >
                <option value="">All Types</option>
                <option value="iso">ISO Files</option>
                <option value="image">VM Images</option>
              </select>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-location-filter" className="form-label">
                Filter by Location
              </label>
              <select
                id="artifact-location-filter"
                className="form-select"
                value={filters.storage_location || ''}
                onChange={handleStorageLocationChange}
              >
                <option value="">All Locations</option>
                {storagePaths.map(path => (
                  <option key={path.id} value={path.id}>
                    {path.name} ({path.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <span className="form-label" aria-hidden="true">
                &nbsp;
              </span>
              <div>
                <button
                  className="btn btn-info"
                  onClick={onRefresh}
                  disabled={loading}
                  title="Refresh artifact list"
                >
                  <span className="me-1">
                    <i className="fas fa-sync-alt" />
                  </span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <span className="form-label" aria-hidden="true">
                &nbsp;
              </span>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={clearFilters}
                  disabled={loading || !hasActiveFilters}
                  title="Clear all filters"
                >
                  <span className="me-1">
                    <i className="fas fa-times" />
                  </span>
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="row">
          <div className="col">
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                onClick={onUpload}
                disabled={loading || storagePaths.length === 0}
                title={
                  storagePaths.length === 0
                    ? 'No storage locations configured'
                    : 'Upload files from your computer'
                }
              >
                <span className="me-1">
                  <i className="fas fa-upload" />
                </span>
                <span>Upload Files</span>
              </button>
              <button
                className="btn btn-success"
                onClick={onDownload}
                disabled={loading || storagePaths.length === 0}
                title={
                  storagePaths.length === 0
                    ? 'No storage locations configured'
                    : 'Download files from URLs'
                }
              >
                <span className="me-1">
                  <i className="fas fa-download" />
                </span>
                <span>Download from URL</span>
              </button>
              <button
                className="btn btn-warning"
                onClick={onScan}
                disabled={loading}
                title="Scan storage locations for new or changed files"
              >
                <span className="me-1">
                  <i className="fas fa-search" />
                </span>
                <span>Scan Storage</span>
              </button>
            </div>
          </div>

          {/* Storage Status Info */}
          <div className="col-auto">
            <div className="mb-3">
              <div className="d-flex flex-wrap gap-1">
                <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                  <span className="me-1">
                    <i className="fas fa-folder" />
                  </span>
                  <span>
                    {storagePaths.length} storage location
                    {storagePaths.length !== 1 ? 's' : ''}
                  </span>
                </span>
                {storagePaths.length > 0 && (
                  <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                    <span className="me-1">
                      <i className="fas fa-check" />
                    </span>
                    <span>{storagePaths.filter(p => p.enabled).length} enabled</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* No Storage Paths Warning */}
        {storagePaths.length === 0 && (
          <div className="alert alert-warning">
            <p>
              <strong>No storage locations configured.</strong>
              You need to create at least one storage location before you can upload or download
              artifacts. Switch to the &quot;Storage Locations&quot; tab to get started.
            </p>
          </div>
        )}

        {/* Disabled Storage Paths Warning */}
        {storagePaths.length > 0 && storagePaths.every(p => !p.enabled) && (
          <div className="alert alert-warning">
            <p>
              <strong>All storage locations are disabled.</strong>
              Enable at least one storage location to upload or download artifacts.
            </p>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="alert alert-secondary">
            <p className="fw-semibold mb-2">Active Filters:</p>
            <div className="d-flex flex-wrap gap-1">
              {filters.search && (
                <span className="badge text-bg-info">Search: &quot;{filters.search}&quot;</span>
              )}
              {filters.type && (
                <span className="badge text-bg-info">Type: {filters.type.toUpperCase()}</span>
              )}
              {filters.storage_location && (
                <span className="badge text-bg-info">
                  Location:{' '}
                  {storagePaths.find(p => p.id === filters.storage_location)?.name ||
                    filters.storage_location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ArtifactFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onScan: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default ArtifactFilters;
