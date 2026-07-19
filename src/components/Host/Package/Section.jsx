import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../contexts/ServerContext';

import PackageActionModal from './ActionModal';
import PackageDetailsModal from './DetailsModal';
import PackageFilters from './Filters';
import PackageTable from './Table';

const PackageSection = ({ server, onError }) => {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('install');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [filters, setFilters] = useState({
    pattern: '',
    publisher: '',
    status: '',
    showAll: false,
    searchQuery: '',
  });

  const { makeAgentRequest } = useServers();

  const loadPackages = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');
      setIsSearchMode(false);

      const params = {};
      if (filters.pattern) {
        params.filter = filters.pattern;
      }
      if (filters.showAll) {
        params.all = true;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/packages',
        'GET',
        null,
        params
      );

      if (result.success) {
        const packageList = result.data?.packages || [];
        // Filter by publisher and status on client side
        const filteredPackages = packageList.filter(pkg => {
          if (filters.publisher && pkg.publisher !== filters.publisher) {
            return false;
          }
          if (filters.status) {
            if (filters.status === 'installed' && !pkg.installed) {
              return false;
            }
            if (filters.status === 'frozen' && !pkg.frozen) {
              return false;
            }
            if (filters.status === 'manual' && !pkg.manually_installed) {
              return false;
            }
          }
          return true;
        });
        setPackages(filteredPackages);
      } else {
        onError(result.message || 'Failed to load packages');
        setPackages([]);
      }
    } catch (err) {
      onError(`Error loading packages: ${err.message}`);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [
    server,
    makeAgentRequest,
    onError,
    filters.pattern,
    filters.publisher,
    filters.status,
    filters.showAll,
  ]);

  const searchPackages = useCallback(async () => {
    if (!server || !makeAgentRequest || !filters.searchQuery.trim()) {
      return;
    }

    try {
      setLoading(true);
      onError('');
      setIsSearchMode(true);

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/packages/search',
        'GET',
        null,
        {
          query: filters.searchQuery.trim(),
          local: false,
          remote: true,
        }
      );

      if (result.success) {
        // Transform search results to package-like format
        const searchData = result.data?.results || [];
        const packageNames = [
          ...new Set(
            searchData
              .filter(item => item.index === 'pkg.fmri')
              .map(item => item.package.split('@')[0].replace('pkg:/', ''))
          ),
        ];

        const transformedResults = packageNames.map(name => ({
          name,
          publisher: 'Available',
          version: 'Latest',
          installed: false,
          frozen: false,
          manually_installed: false,
          flags: 'a--',
        }));

        setSearchResults(transformedResults);
      } else {
        onError(result.message || 'Failed to search packages');
        setSearchResults([]);
      }
    } catch (err) {
      onError(`Error searching packages: ${err.message}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError, filters.searchQuery]);

  // Load packages on component mount and when filters change
  useEffect(() => {
    if (filters.searchQuery) {
      searchPackages();
    } else {
      loadPackages();
    }
  }, [filters.searchQuery, loadPackages, searchPackages]);

  const handlePackageAction = async (packageName, action, options = {}) => {
    if (!server || !makeAgentRequest) {
      return { success: false, message: 'Server not available' };
    }

    try {
      setLoading(true);
      onError('');

      const endpoint =
        action === 'install' ? 'system/packages/install' : 'system/packages/uninstall';
      const requestData = {
        packages: [packageName],
        dry_run: options.dryRun || false,
        accept_licenses: options.acceptLicenses || false,
        be_name: options.beName || '',
      };

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        'POST',
        requestData
      );

      if (result.success) {
        // Refresh package list after action
        await loadPackages();
        return { success: true, data: result.data };
      }
      onError(result.message || `Failed to ${action} package`);
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = `Error during package ${action}: ${err.message}`;
      onError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async pkg => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/packages/info',
        'GET',
        null,
        {
          package: pkg.name,
          remote: !pkg.installed,
        }
      );

      if (result.success) {
        setSelectedPackage({ ...pkg, details: result.data });
        setShowDetailsModal(true);
      } else {
        onError(result.message || 'Failed to load package details');
      }
    } catch (err) {
      onError(`Error loading package details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShowActionModal = (pkg, action) => {
    setSelectedPackage(pkg);
    setActionType(action);
    setShowActionModal(true);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    if (filters.searchQuery.trim()) {
      searchPackages();
    } else {
      setIsSearchMode(false);
      loadPackages();
    }
  };

  const clearFilters = () => {
    setFilters({
      pattern: '',
      publisher: '',
      status: '',
      showAll: false,
      searchQuery: '',
    });
    setIsSearchMode(false);
  };

  const displayPackages = isSearchMode ? searchResults : packages;

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">{t('host.packageSection.packageManagement')}</h2>
        <p>{t('host.packageSection.managePackagesOn', { hostname: server.hostname })}</p>
      </div>

      {/* Package Filters */}
      <PackageFilters
        filters={filters}
        handleFilterChange={handleFilterChange}
        handleSearch={handleSearch}
        clearFilters={clearFilters}
        isSearchMode={isSearchMode}
        loading={loading}
        loadPackages={loadPackages}
      />

      {/* Packages Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <h3 className="fs-6 fw-bold mb-0">
                {isSearchMode
                  ? t('host.packageSection.searchResults', { count: displayPackages.length })
                  : t('host.packageSection.packages', { count: displayPackages.length })}
                {loading && (
                  <span className="ms-2">
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                )}
              </h3>
            </div>
          </div>

          <PackageTable
            packages={displayPackages}
            loading={loading}
            onInstall={pkg => handleShowActionModal(pkg, 'install')}
            onUninstall={pkg => handleShowActionModal(pkg, 'uninstall')}
            onViewDetails={handleViewDetails}
            isSearchMode={isSearchMode}
          />
        </div>
      </div>

      {/* Package Details Modal */}
      {showDetailsModal && selectedPackage && (
        <PackageDetailsModal
          package={selectedPackage}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPackage(null);
          }}
        />
      )}

      {/* Package Action Modal */}
      {showActionModal && selectedPackage && (
        <PackageActionModal
          package={selectedPackage}
          action={actionType}
          onClose={() => {
            setShowActionModal(false);
            setSelectedPackage(null);
          }}
          onConfirm={handlePackageAction}
        />
      )}
    </div>
  );
};

PackageSection.propTypes = {
  server: PropTypes.object.isRequired,
  onError: PropTypes.func.isRequired,
};

export default PackageSection;
