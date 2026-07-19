import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const PackageFilters = ({
  filters,
  handleFilterChange,
  handleSearch,
  clearFilters,
  isSearchMode,
  loading,
  loadPackages,
}) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="row g-3">
          <div className="col">
            <div className="mb-3">
              <label className="form-label" htmlFor="package-name-filter">
                {t('host.packageFilters.filterByPackageName')}
              </label>
              <input
                id="package-name-filter"
                className="form-control"
                type="text"
                placeholder={t('host.packageFilters.enterPackageNamePattern')}
                value={filters.pattern}
                onChange={e => handleFilterChange('pattern', e.target.value)}
                disabled={isSearchMode}
              />
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label className="form-label" htmlFor="publisher-filter">
                {t('host.packageFilters.filterByPublisher')}
              </label>
              <select
                id="publisher-filter"
                className="form-select"
                value={filters.publisher}
                onChange={e => handleFilterChange('publisher', e.target.value)}
                disabled={isSearchMode}
              >
                <option value="">{t('host.packageFilters.allPublishers')}</option>
                <option value="omnios">omnios</option>
                <option value="extra.omnios">extra.omnios</option>
                <option value="ooce">ooce</option>
              </select>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <label className="form-label" htmlFor="status-filter">
                {t('host.packageFilters.filterByStatus')}
              </label>
              <select
                id="status-filter"
                className="form-select"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                disabled={isSearchMode}
              >
                <option value="">{t('host.packageFilters.allStatus')}</option>
                <option value="installed">{t('host.packageFilters.installed')}</option>
                <option value="frozen">{t('host.packageFilters.frozen')}</option>
                <option value="manual">{t('host.packageFilters.manual')}</option>
              </select>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <label className="form-label" htmlFor="show-all-toggle">
                {t('host.packageFilters.showAll')}
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
                  {t('host.packageFilters.allPackages')}
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
                {t('host.packageFilters.searchAvailablePackages')}
              </label>
              <div className="input-group">
                <input
                  id="search-query-input"
                  className="form-control"
                  type="text"
                  placeholder={t('host.packageFilters.searchForPackages')}
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
                {t('host.packageFilters.search')}
              </label>
              <button
                id="search-button"
                type="button"
                className="btn btn-info"
                onClick={handleSearch}
                disabled={loading}
              >
                <i className="fas fa-search me-2" />
                <span>{t('host.packageFilters.search')}</span>
              </button>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <label className="form-label" htmlFor="refresh-button">
                {t('host.packageFilters.refresh')}
              </label>
              <button
                id="refresh-button"
                type="button"
                className="btn btn-info"
                onClick={loadPackages}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2" />
                <span>{t('host.packageFilters.refresh')}</span>
              </button>
            </div>
          </div>
          <div className="col-auto">
            <div className="mb-3">
              <label className="form-label" htmlFor="clear-button">
                {t('host.packageFilters.clear')}
              </label>
              <button
                id="clear-button"
                type="button"
                className="btn btn-secondary"
                onClick={clearFilters}
                disabled={loading}
              >
                <i className="fas fa-times me-2" />
                <span>{t('host.packageFilters.clear')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
