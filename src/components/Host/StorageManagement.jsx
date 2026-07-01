import PropTypes from 'prop-types';
import { useState } from 'react';

import ArcConfiguration from './ArcConfiguration';
import { ArtifactManagement } from './ArtifactStorage';

const StorageManagement = ({ server }) => {
  const [activeTab, setActiveTab] = useState('arc');

  if (!server) {
    return (
      <div className="alert alert-info">
        <p>No server selected for storage management.</p>
      </div>
    );
  }

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
        <li className="nav-item">
          <button type="button" className="nav-link" disabled>
            <i className="fas fa-database me-2" />
            ZFS Pools
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className="nav-link" disabled>
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
        {activeTab === 'artifacts' && (
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

        {/* Future: ZFS Pools tab content */}
        {activeTab === 'pools' && (
          <div className="alert alert-info">
            <p>ZFS Pool management will be available in a future update.</p>
          </div>
        )}

        {/* Future: ZFS Datasets tab content */}
        {activeTab === 'datasets' && (
          <div className="alert alert-info">
            <p>ZFS Dataset management will be available in a future update.</p>
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
