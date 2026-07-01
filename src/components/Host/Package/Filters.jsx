import PropTypes from 'prop-types';

const PackageFilters = ({
  filters,
  handleFilterChange,
  handleSearch,
  clearFilters,
  isSearchMode,
  loading,
  loadPackages,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="package-name-filter">
              Filter by Package Name
            </label>
            <input
              id="package-name-filter"
              className="form-control"
              type="text"
              placeholder="Enter package name pattern..."
              value={filters.pattern}
              onChange={e => handleFilterChange('pattern', e.target.value)}
              disabled={isSearchMode}
            />
          </div>
        </div>
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="publisher-filter">
              Filter by Publisher
            </label>
            <select
              id="publisher-filter"
              className="form-select"
              value={filters.publisher}
              onChange={e => handleFilterChange('publisher', e.target.value)}
              disabled={isSearchMode}
            >
              <option value="">All Publishers</option>
              <option value="omnios">omnios</option>
              <option value="extra.omnios">extra.omnios</option>
              <option value="ooce">ooce</option>
            </select>
          </div>
        </div>
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="status-filter">
              Filter by Status
            </label>
            <select
              id="status-filter"
              className="form-select"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              disabled={isSearchMode}
            >
              <option value="">All Status</option>
              <option value="installed">Installed</option>
              <option value="frozen">Frozen</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
        <div className="col-auto">
          <div className="mb-3">
            <label className="form-label" htmlFor="show-all-toggle">
              Show All
            </label>
            <div className="form-check form-switch">
              <input
                id="show-all-toggle"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={filters.showAll}
                onChange={e => handleFilterChange('showAll', e.target.checked)}
                disabled={isSearchMode}
              />
              <label className="form-check-label" htmlFor="show-all-toggle">
                All Packages
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Search Row */}
      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label className="form-label" htmlFor="search-query-input">
              Search Available Packages
            </label>
            <div className="input-group">
              <input
                id="search-query-input"
                className="form-control"
                type="text"
                placeholder="Search for packages..."
                value={filters.searchQuery}
                onChange={e => handleFilterChange('searchQuery', e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
              />
              <span className="input-group-text">
                <i className="fas fa-search" />
              </span>
            </div>
          </div>
        </div>
        <div className="col-auto">
          <div className="mb-3">
            <label className="form-label" htmlFor="search-button">
              Search
            </label>
            <button
              id="search-button"
              type="button"
              className="btn btn-info"
              onClick={handleSearch}
              disabled={loading}
            >
              <i className="fas fa-search me-2" />
              <span>Search</span>
            </button>
          </div>
        </div>
        <div className="col-auto">
          <div className="mb-3">
            <label className="form-label" htmlFor="refresh-button">
              Refresh
            </label>
            <button
              id="refresh-button"
              type="button"
              className="btn btn-info"
              onClick={loadPackages}
              disabled={loading}
            >
              <i className="fas fa-sync-alt me-2" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        <div className="col-auto">
          <div className="mb-3">
            <label className="form-label" htmlFor="clear-button">
              Clear
            </label>
            <button
              id="clear-button"
              type="button"
              className="btn btn-secondary"
              onClick={clearFilters}
              disabled={loading}
            >
              <i className="fas fa-times me-2" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

PackageFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  handleFilterChange: PropTypes.func.isRequired,
  handleSearch: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  isSearchMode: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  loadPackages: PropTypes.func.isRequired,
};

export default PackageFilters;
