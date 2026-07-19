import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasFeature } from '../../utils/capabilities';

import ArcConfiguration from './ArcConfiguration';
import { ArtifactManagement } from './ArtifactStorage';
import ZfsDatasetsPanel from './ZfsDatasetsPanel';
import ZfsPoolsPanel from './ZfsPoolsPanel';

const StorageManagement = ({ server }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('arc');

  if (!server) {
    return (
      <div className="alert alert-info">
        <p>{t('host.storageManagement.noServerAlert')}</p>
      </div>
    );
  }

  // `artifacts` is config-gated (artifact_storage.enabled) even on agents that
  // advertise `zfs` — the sub-tab rides its own token, not the parent's.
  const artifactsAvailable = hasFeature(server, 'artifacts');

  return (
    <div>
      {/* Sub-Tab Navigation */}
      <ul className="nav nav-tabs mb-0">
        <li className="nav-item">
          <button
            type="button"
            tabIndex={0}
            onClick={e => {
              e.preventDefault();
              setActiveTab('arc');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('arc');
              }
            }}
            className={`nav-link ${activeTab === 'arc' ? 'active' : ''}`}
          >
            <i className="fas fa-memory me-2" />
            ZFS ARC
          </button>
        </li>
        {artifactsAvailable && (
          <li className="nav-item">
            <button
              type="button"
              tabIndex={0}
              onClick={e => {
                e.preventDefault();
                setActiveTab('artifacts');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('artifacts');
                }
              }}
              className={`nav-link ${activeTab === 'artifacts' ? 'active' : ''}`}
            >
              <i className="fas fa-compact-disc me-2" />
              ISO & Artifacts
            </button>
          </li>
        )}
        <li className="nav-item">
          <button
            type="button"
            tabIndex={0}
            onClick={e => {
              e.preventDefault();
              setActiveTab('pools');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('pools');
              }
            }}
            className={`nav-link ${activeTab === 'pools' ? 'active' : ''}`}
          >
            <i className="fas fa-database me-2" />
            ZFS Pools
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            tabIndex={0}
            onClick={e => {
              e.preventDefault();
              setActiveTab('datasets');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('datasets');
              }
            }}
            className={`nav-link ${activeTab === 'datasets' ? 'active' : ''}`}
          >
            <i className="fas fa-folder-tree me-2" />
            ZFS Datasets
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'arc' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-memory me-2" />
                ZFS ARC Configuration
              </h3>
              <p>
                Configure ZFS Adaptive Replacement Cache (ARC) settings on{' '}
                <strong>{server.hostname}</strong>. The ARC is ZFS&apos;s intelligent caching layer
                that stores frequently accessed data in system memory to improve performance.
              </p>
            </div>

            <ArcConfiguration server={server} />
          </div>
        )}

        {/* ISO & Artifacts Tab */}
        {activeTab === 'artifacts' && artifactsAvailable && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-compact-disc me-2" />
                ISO & Artifact Management
              </h3>
              <p>
                Manage ISO files, VM images, and artifact storage locations on{' '}
                <strong>{server.hostname}</strong>. Configure storage paths, upload files, download
                from URLs, and organize your virtualization resources.
              </p>
            </div>

            <ArtifactManagement server={server} />
          </div>
        )}

        {activeTab === 'pools' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-database me-2" />
                ZFS Pools
              </h3>
              <p>
                Manage ZFS storage pools on <strong>{server.hostname}</strong> — health and
                capacity, scrubs, vdev and device operations, properties, import/export, create and
                destroy. Every change runs as an agent task; the Tasks page carries the outcome.
              </p>
            </div>

            <ZfsPoolsPanel server={server} />
          </div>
        )}

        {activeTab === 'datasets' && (
          <div>
            <div className="mb-4">
              <h3 className="fs-6 fw-bold">
                <i className="fas fa-folder-tree me-2" />
                ZFS Datasets
              </h3>
              <p>
                Manage filesystems, volumes, and snapshots on <strong>{server.hostname}</strong> —
                create, snapshot, rename, clone, promote, roll back, hold, tune properties, and
                destroy. Every change runs as an agent task; the Tasks page carries the outcome.
              </p>
            </div>

            <ZfsDatasetsPanel server={server} />
          </div>
        )}
      </div>
    </div>
  );
};

StorageManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
  }),
};

export default StorageManagement;
