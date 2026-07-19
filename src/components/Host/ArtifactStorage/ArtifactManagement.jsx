import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../contexts/ServerContext';
import { ConfirmModal } from '../../common';

import ArtifactStorageModals from './ArtifactStorageModals';
import ArtifactFilters from './components/filters/ArtifactFilters';
import ArtifactTable from './components/tables/ArtifactTable';
import StoragePathTable from './components/tables/StoragePathTable';
import useArtifactDownloads from './useArtifactDownloads';

const getDownloadTagClass = status => {
  if (status === 'running') {
    return 'text-bg-primary';
  }
  if (status === 'queued') {
    return 'text-bg-info';
  }
  if (status === 'failed') {
    return 'text-bg-danger';
  }
  return 'text-bg-secondary';
};

const ArtifactManagement = ({ server }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('storage-paths');

  // Storage Paths state
  const [storagePaths, setStoragePaths] = useState([]);
  const [storagePathsLoading, setStoragePathsLoading] = useState(false);

  // Artifacts state
  const [artifacts, setArtifacts] = useState([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsPagination, setArtifactsPagination] = useState({
    total: 0,
    limit: 25,
    offset: 0,
    has_more: false,
  });

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    storage_location: '',
    sort_by: 'filename',
    sort_order: 'asc',
  });

  // Modal states
  const [showStoragePathCreateModal, setShowStoragePathCreateModal] = useState(false);
  const [showStoragePathEditModal, setShowStoragePathEditModal] = useState(false);
  const [showArtifactUploadModal, setShowArtifactUploadModal] = useState(false);
  const [showArtifactDownloadModal, setShowArtifactDownloadModal] = useState(false);
  const [showArtifactDetailsModal, setShowArtifactDetailsModal] = useState(false);
  const [showArtifactMoveModal, setShowArtifactMoveModal] = useState(false);
  const [showArtifactCopyModal, setShowArtifactCopyModal] = useState(false);
  const [selectedStoragePath, setSelectedStoragePath] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [artifactDetails, setArtifactDetails] = useState(null);

  // Confirm modal states
  const [deleteStoragePathTarget, setDeleteStoragePathTarget] = useState(null);
  const [deleteArtifactIds, setDeleteArtifactIds] = useState(null);

  // General state
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  const loadArtifacts = useCallback(
    async (resetOffset = true) => {
      if (!server || !makeAgentRequest) {
        return;
      }

      try {
        setArtifactsLoading(true);
        setError('');

        const params = {
          limit: artifactsPagination.limit,
          offset: resetOffset ? 0 : artifactsPagination.offset,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
        };

        if (filters.search.trim()) {
          params.search = filters.search.trim();
        }
        if (filters.type) {
          params.type = filters.type;
        }
        if (filters.storage_location) {
          params.storage_location_id = filters.storage_location;
        }

        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          'artifacts',
          'GET',
          null,
          params
        );

        if (result.success && result.data) {
          setArtifacts(result.data.artifacts || []);
          if (result.data.pagination) {
            setArtifactsPagination(result.data.pagination);
          }
        } else {
          setError(result.message || 'Failed to load artifacts');
          setArtifacts([]);
        }
      } catch (err) {
        setError(`Error loading artifacts: ${err.message}`);
        setArtifacts([]);
      } finally {
        setArtifactsLoading(false);
      }
    },
    [
      server,
      makeAgentRequest,
      artifactsPagination.limit,
      artifactsPagination.offset,
      filters.sort_by,
      filters.sort_order,
      filters.search,
      filters.type,
      filters.storage_location,
    ]
  );

  const { activeDownloads, activeDownloadsList, startDownloadTracking, stopDownloadTracking } =
    useArtifactDownloads({
      server,
      makeAgentRequest,
      onRefresh: () => loadArtifacts(false),
    });

  const loadStoragePaths = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setStoragePathsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/storage/paths',
        'GET'
      );

      if (result.success && result.data) {
        setStoragePaths(result.data.paths || []);
      } else {
        setError(result.message || 'Failed to load storage paths');
        setStoragePaths([]);
      }
    } catch (err) {
      setError(`Error loading storage paths: ${err.message}`);
      setStoragePaths([]);
    } finally {
      setStoragePathsLoading(false);
    }
  }, [server, makeAgentRequest]);

  useEffect(() => {
    if (activeTab === 'storage-paths') {
      loadStoragePaths();
    } else if (activeTab === 'artifacts') {
      loadArtifacts(true);
    }
  }, [activeTab, loadArtifacts, loadStoragePaths]);

  useEffect(() => {
    if (activeTab === 'artifacts') {
      loadArtifacts(true);
    }
  }, [
    activeTab,
    loadArtifacts,
    filters.search,
    filters.type,
    filters.storage_location,
    filters.sort_by,
    filters.sort_order,
  ]);

  const handleStoragePathDelete = async () => {
    if (!deleteStoragePathTarget) {
      return;
    }

    try {
      setStoragePathsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/storage/paths/${deleteStoragePathTarget.id}`,
        'DELETE',
        {
          recursive: false,
          remove_db_records: true,
          force: false,
        }
      );

      if (result.success) {
        await loadStoragePaths();
      } else {
        setError(result.message || 'Failed to delete storage path');
      }
    } catch (err) {
      setError(`Error deleting storage path: ${err.message}`);
    } finally {
      setDeleteStoragePathTarget(null);
      setStoragePathsLoading(false);
    }
  };

  const handleStoragePathToggle = async storagePath => {
    try {
      setStoragePathsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/storage/paths/${storagePath.id}`,
        'PUT',
        { enabled: !storagePath.enabled }
      );

      if (result.success) {
        await loadStoragePaths();
      } else {
        setError(result.message || 'Failed to update storage path');
      }
    } catch (err) {
      setError(`Error updating storage path: ${err.message}`);
    } finally {
      setStoragePathsLoading(false);
    }
  };

  const handleArtifactDetails = async artifact => {
    try {
      setArtifactsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/${artifact.id}`,
        'GET'
      );

      if (result.success && result.data) {
        setSelectedArtifact(artifact);
        setArtifactDetails(result.data);
        setShowArtifactDetailsModal(true);
      } else {
        setError(result.message || 'Failed to load artifact details');
      }
    } catch (err) {
      setError(`Error loading artifact details: ${err.message}`);
    } finally {
      setArtifactsLoading(false);
    }
  };

  const handleArtifactDelete = async () => {
    if (!deleteArtifactIds) {
      return;
    }

    try {
      setArtifactsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/files',
        'DELETE',
        {
          artifact_ids: deleteArtifactIds,
          delete_files: true,
          force: false,
        }
      );

      if (result.success) {
        await loadArtifacts();
      } else {
        setError(result.message || 'Failed to delete artifacts');
      }
    } catch (err) {
      setError(`Error deleting artifacts: ${err.message}`);
    } finally {
      setDeleteArtifactIds(null);
      setArtifactsLoading(false);
    }
  };

  const handleScanStorage = async () => {
    try {
      setArtifactsLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'artifacts/scan',
        'POST',
        { verify_checksums: false, remove_orphaned: false }
      );

      if (result.success) {
        setTimeout(() => {
          loadArtifacts();
        }, 3000);
      } else {
        setError(result.message || 'Failed to start storage scan');
      }
    } catch (err) {
      setError(`Error starting storage scan: ${err.message}`);
    } finally {
      setArtifactsLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePaginationChange = newOffset => {
    setArtifactsPagination(prev => ({ ...prev, offset: newOffset }));
    loadArtifacts(false);
  };

  const handleStoragePathClick = storagePath => {
    setActiveTab('artifacts');
    setFilters(prev => ({
      ...prev,
      storage_location: storagePath.id,
      search: '',
      type: '',
    }));
    setArtifactsPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleUploadSuccess = results => {
    setShowArtifactUploadModal(false);
    results.forEach(result => {
      if (result.success && result.task_id && result.data) {
        const storageLocation = storagePaths.find(sp => sp.id === result.data.storage_location?.id);
        startDownloadTracking(result.task_id, {
          taskId: result.task_id,
          filename: result.data.filename || result.file,
          isUpload: true,
          storage_location: result.data.storage_location || storageLocation,
          created_at: new Date().toISOString(),
        });
      }
    });
    setActiveTab('artifacts');
  };

  const handleDownloadSuccess = result => {
    setShowArtifactDownloadModal(false);
    if (result.task_id) {
      const storageLocation = storagePaths.find(sp => sp.id === result.storage_location?.id);
      startDownloadTracking(result.task_id, {
        taskId: result.task_id,
        filename: result.filename,
        url: result.url,
        storage_location: result.storage_location || storageLocation,
        created_at: new Date().toISOString(),
      });
      setActiveTab('artifacts');
    }
  };

  if (!server) {
    return (
      <div className="alert alert-info">
        <p>{t('artifacts.artifactManagement.noServerSelected')}</p>
      </div>
    );
  }

  return (
    <div>
      <ConfirmModal
        isOpen={deleteStoragePathTarget !== null}
        onClose={() => setDeleteStoragePathTarget(null)}
        onConfirm={handleStoragePathDelete}
        title={t('artifacts.artifactManagement.deleteStoragePathTitle')}
        message={t('artifacts.artifactManagement.deleteStoragePathMessage', {
          name: deleteStoragePathTarget?.name,
        })}
        confirmText={t('artifacts.artifactManagement.deleteButton')}
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={storagePathsLoading}
      />

      <ConfirmModal
        isOpen={deleteArtifactIds !== null}
        onClose={() => setDeleteArtifactIds(null)}
        onConfirm={handleArtifactDelete}
        title={t('artifacts.artifactManagement.deleteArtifactsTitle')}
        message={t('artifacts.artifactManagement.deleteArtifactsMessage', {
          count: deleteArtifactIds?.length || 0,
        })}
        confirmText={t('artifacts.artifactManagement.deleteButton')}
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={artifactsLoading}
      />

      {/* Sub-Tab Navigation */}
      <ul className="nav nav-tabs mb-0">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'storage-paths' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage-paths')}
          >
            <span className="me-1">
              <i className="fas fa-folder" />
            </span>
            <span>{t('artifacts.artifactManagement.storageLocationsTab')}</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'artifacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('artifacts')}
          >
            <span className="me-1">
              <i className="fas fa-compact-disc" />
            </span>
            <span>{t('artifacts.artifactManagement.artifactsTab')}</span>
          </button>
        </li>
      </ul>

      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4">
        {activeTab === 'storage-paths' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <span className="d-inline-flex align-items-center">
                  <span className="me-2">
                    <i className="fas fa-folder" />
                  </span>
                  <span>{t('artifacts.artifactManagement.storageLocationsHeading')}</span>
                </span>
              </h3>
              <p>
                {t('artifacts.artifactManagement.storageLocationsDescription', {
                  hostname: server.hostname,
                })}
              </p>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h4 className="fs-6 fw-bold">
                      {t('artifacts.artifactManagement.storagePathsCount', {
                        count: storagePaths.length,
                      })}
                      {storagePathsLoading && (
                        <span className="ms-2">
                          <i className="fas fa-spinner fa-spin" />
                        </span>
                      )}
                    </h4>
                  </div>
                  <div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-info"
                        onClick={loadStoragePaths}
                        disabled={storagePathsLoading}
                      >
                        <span className="me-1">
                          <i className="fas fa-sync-alt" />
                        </span>
                        <span>{t('artifacts.artifactManagement.refreshButton')}</span>
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowStoragePathCreateModal(true)}
                        disabled={storagePathsLoading}
                      >
                        <span className="me-1">
                          <i className="fas fa-plus" />
                        </span>
                        <span>{t('artifacts.artifactManagement.createStoragePathButton')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <StoragePathTable
                  storagePaths={storagePaths}
                  loading={storagePathsLoading}
                  onEdit={sp => {
                    setSelectedStoragePath(sp);
                    setShowStoragePathEditModal(true);
                  }}
                  onDelete={setDeleteStoragePathTarget}
                  onToggle={handleStoragePathToggle}
                  onNameClick={handleStoragePathClick}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <span className="d-inline-flex align-items-center">
                  <span className="me-2">
                    <i className="fas fa-compact-disc" />
                  </span>
                  <span>{t('artifacts.artifactManagement.artifactsHeading')}</span>
                </span>
              </h3>
              <p>
                {t('artifacts.artifactManagement.artifactsDescription', {
                  hostname: server.hostname,
                })}
              </p>
            </div>

            {activeDownloadsList.length > 0 && (
              <div className="alert alert-info mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="d-flex align-items-center">
                      <span className="me-2">
                        <i className="fas fa-download" />
                      </span>
                      <span>
                        {t('artifacts.artifactManagement.downloadsInProgress', {
                          count: activeDownloadsList.length,
                        })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="d-flex gap-2 flex-wrap">
                      {activeDownloadsList.map(download => (
                        <span
                          key={download.taskId}
                          className={`badge ${getDownloadTagClass(download.status)}`}
                        >
                          {download.filename || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ArtifactFilters
              filters={filters}
              storagePaths={storagePaths}
              onFilterChange={handleFilterChange}
              onRefresh={() => loadArtifacts(true)}
              onScan={handleScanStorage}
              onUpload={() => setShowArtifactUploadModal(true)}
              onDownload={() => setShowArtifactDownloadModal(true)}
              loading={artifactsLoading}
            />

            <div className="card">
              <div className="card-body">
                <ArtifactTable
                  artifacts={artifacts}
                  activeDownloads={activeDownloads}
                  pagination={artifactsPagination}
                  loading={artifactsLoading}
                  onDetails={handleArtifactDetails}
                  onDelete={setDeleteArtifactIds}
                  onMove={artifact => {
                    setSelectedArtifact(artifact);
                    setShowArtifactMoveModal(true);
                  }}
                  onCopy={artifact => {
                    setSelectedArtifact(artifact);
                    setShowArtifactCopyModal(true);
                  }}
                  onPaginationChange={handlePaginationChange}
                  onSort={(sortBy, sortOrder) => {
                    handleFilterChange('sort_by', sortBy);
                    handleFilterChange('sort_order', sortOrder);
                  }}
                  onCancelDownload={stopDownloadTracking}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ArtifactStorageModals
        server={server}
        storagePaths={storagePaths}
        selectedStoragePath={selectedStoragePath}
        selectedArtifact={selectedArtifact}
        artifactDetails={artifactDetails}
        showStoragePathCreateModal={showStoragePathCreateModal}
        showStoragePathEditModal={showStoragePathEditModal}
        showArtifactUploadModal={showArtifactUploadModal}
        showArtifactDownloadModal={showArtifactDownloadModal}
        showArtifactDetailsModal={showArtifactDetailsModal}
        showArtifactMoveModal={showArtifactMoveModal}
        showArtifactCopyModal={showArtifactCopyModal}
        onCloseStoragePathCreate={() => setShowStoragePathCreateModal(false)}
        onSuccessStoragePathCreate={() => {
          setShowStoragePathCreateModal(false);
          loadStoragePaths();
        }}
        onCloseStoragePathEdit={() => {
          setShowStoragePathEditModal(false);
          setSelectedStoragePath(null);
        }}
        onSuccessStoragePathEdit={() => {
          setShowStoragePathEditModal(false);
          setSelectedStoragePath(null);
          loadStoragePaths();
        }}
        onCloseArtifactUpload={() => setShowArtifactUploadModal(false)}
        onSuccessArtifactUpload={handleUploadSuccess}
        onCloseArtifactDownload={() => setShowArtifactDownloadModal(false)}
        onSuccessArtifactDownload={handleDownloadSuccess}
        onCloseArtifactDetails={() => {
          setShowArtifactDetailsModal(false);
          setSelectedArtifact(null);
          setArtifactDetails(null);
        }}
        onCloseArtifactMove={() => {
          setShowArtifactMoveModal(false);
          setSelectedArtifact(null);
        }}
        onSuccessArtifactMove={() => {
          setShowArtifactMoveModal(false);
          setSelectedArtifact(null);
        }}
        onCloseArtifactCopy={() => {
          setShowArtifactCopyModal(false);
          setSelectedArtifact(null);
        }}
        onSuccessArtifactCopy={() => {
          setShowArtifactCopyModal(false);
          setSelectedArtifact(null);
        }}
        onError={setError}
        loadArtifacts={loadArtifacts}
      />
    </div>
  );
};

ArtifactManagement.propTypes = {
  server: PropTypes.object.isRequired,
};

export default ArtifactManagement;
