import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
                {t('artifacts.artifactFilters.searchLabel')}
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search" />
                </span>
                <input
                  id="artifact-search"
                  className="form-control"
                  type="text"
                  placeholder={t('artifacts.artifactFilters.searchPlaceholder')}
                  value={localSearch}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-type-filter" className="form-label">
                {t('artifacts.artifactFilters.typeFilterLabel')}
              </label>
              <select
                id="artifact-type-filter"
                className="form-select"
                value={filters.type || ''}
                onChange={handleTypeChange}
              >
                <option value="">{t('artifacts.artifactFilters.allTypes')}</option>
                <option value="iso">{t('artifacts.artifactFilters.isoFiles')}</option>
                <option value="image">{t('artifacts.artifactFilters.vmImages')}</option>
              </select>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-location-filter" className="form-label">
                {t('artifacts.artifactFilters.locationFilterLabel')}
              </label>
              <select
                id="artifact-location-filter"
                className="form-select"
                value={filters.storage_location || ''}
                onChange={handleStorageLocationChange}
              >
                <option value="">{t('artifacts.artifactFilters.allLocations')}</option>
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
                  title={t('artifacts.artifactFilters.refreshTooltip')}
                >
                  <span className="me-1">
                    <i className="fas fa-sync-alt" />
                  </span>
                  <span>{t('artifacts.artifactFilters.refreshButton')}</span>
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
                  title={t('artifacts.artifactFilters.clearTooltip')}
                >
                  <span className="me-1">
                    <i className="fas fa-times" />
                  </span>
                  <span>{t('artifacts.artifactFilters.clearButton')}</span>
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
                    ? t('artifacts.artifactFilters.noStorageLocationsConfigured')
                    : t('artifacts.artifactFilters.uploadFilesFromComputerTooltip')
                }
              >
                <span className="me-1">
                  <i className="fas fa-upload" />
                </span>
                <span>{t('artifacts.artifactFilters.uploadFilesButton')}</span>
              </button>
              <button
                className="btn btn-success"
                onClick={onDownload}
                disabled={loading || storagePaths.length === 0}
                title={
                  storagePaths.length === 0
                    ? t('artifacts.artifactFilters.noStorageLocationsConfigured')
                    : t('artifacts.artifactFilters.downloadFilesFromUrlsTooltip')
                }
              >
                <span className="me-1">
                  <i className="fas fa-download" />
                </span>
                <span>{t('artifacts.artifactFilters.downloadFromUrlButton')}</span>
              </button>
              <button
                className="btn btn-warning"
                onClick={onScan}
                disabled={loading}
                title={t('artifacts.artifactFilters.scanStorageTooltip')}
              >
                <span className="me-1">
                  <i className="fas fa-search" />
                </span>
                <span>{t('artifacts.artifactFilters.scanStorageButton')}</span>
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
                    {t('artifacts.artifactFilters.storageLocationCount', {
                      count: storagePaths.length,
                    })}
                  </span>
                </span>
                {storagePaths.length > 0 && (
                  <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                    <span className="me-1">
                      <i className="fas fa-check" />
                    </span>
                    <span>
                      {t('artifacts.artifactFilters.enabledCount', {
                        count: storagePaths.filter(p => p.enabled).length,
                      })}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* No Storage Paths Warning */}
        {storagePaths.length === 0 && (
          <div className="alert alert-warning">
            <p>{t('artifacts.artifactFilters.noStorageLocationsWarning')}</p>
          </div>
        )}

        {/* Disabled Storage Paths Warning */}
        {storagePaths.length > 0 && storagePaths.every(p => !p.enabled) && (
          <div className="alert alert-warning">
            <p>{t('artifacts.artifactFilters.allStorageLocationsDisabledWarning')}</p>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="alert alert-secondary">
            <p className="fw-semibold mb-2">{t('artifacts.artifactFilters.activeFiltersLabel')}</p>
            <div className="d-flex flex-wrap gap-1">
              {filters.search && (
                <span className="badge text-bg-info">
                  {t('artifacts.artifactFilters.searchFilter', { search: filters.search })}
                </span>
              )}
              {filters.type && (
                <span className="badge text-bg-info">
                  {t('artifacts.artifactFilters.typeFilter', { type: filters.type.toUpperCase() })}
                </span>
              )}
              {filters.storage_location && (
                <span className="badge text-bg-info">
                  {t('artifacts.artifactFilters.locationFilter', {
                    location:
                      storagePaths.find(p => p.id === filters.storage_location)?.name ||
                      filters.storage_location,
                  })}
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
