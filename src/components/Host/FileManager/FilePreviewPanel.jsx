import PropTypes from 'prop-types';

import { canManageHosts } from '../../../utils/permissions';

import { isTextFile, isArchiveFile } from './FileManagerTransforms';

/**
 * Get file size display label
 * @param {Object} file - File object
 * @returns {string} Size label
 */
const getFileSizeLabel = file => {
  if (file.isDirectory) {
    return 'Directory';
  }
  if (file.size) {
    return `${Math.round(file.size / 1024)} KB`;
  }
  return 'Unknown size';
};

/**
 * Get preview content based on file type
 * Uses early returns to avoid nested ternaries
 * @param {Object} file - File object
 * @param {string} userRole - Current user role
 * @returns {JSX.Element} Preview content
 */
const getPreviewContent = (file, userRole) => {
  if (file.isDirectory) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-folder fa-3x" />
        </span>
        <p className="mt-2">Directory</p>
        <p className="form-text text-muted">Double-click to open</p>
      </div>
    );
  }

  if (isTextFile(file)) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-file-alt fa-3x" />
        </span>
        <p className="mt-2">Text File</p>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button
            className="btn btn-primary btn-sm"
            onClick={e => {
              e.stopPropagation();
              const editEvent = new CustomEvent('hyperweaver-edit-file', {
                detail: file,
              });
              document.dispatchEvent(editEvent);
            }}
          >
            <span className="me-1">
              <i className="fas fa-edit" />
            </span>
            <span>Edit File</span>
          </button>
        </div>
      </div>
    );
  }

  if (isArchiveFile(file)) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-file-archive fa-3x" />
        </span>
        <p className="mt-2">Archive File</p>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button
            className="btn btn-success btn-sm"
            onClick={e => {
              e.stopPropagation();
              const extractEvent = new CustomEvent('hyperweaver-extract-archive', { detail: file });
              document.dispatchEvent(extractEvent);
            }}
            disabled={!canManageHosts(userRole)}
          >
            <span className="me-1">
              <i className="fas fa-expand-arrows-alt" />
            </span>
            <span>Extract</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <span>
        <i className="fas fa-file fa-3x" />
      </span>
      <p className="mt-2">File</p>
      <p className="form-text text-muted">Double-click to download</p>
    </div>
  );
};

/**
 * File Preview Panel Component
 * Renders file preview content in the cubone FileManager preview area
 */
const FilePreviewPanel = ({ file, userRole }) => (
  <div className="hyperweaver-file-preview">
    <div className="preview-header">
      <h4 className="fs-6 fw-bold">{file.name}</h4>
      <div className="preview-info">
        <span className="badge text-bg-secondary">{getFileSizeLabel(file)}</span>
        {file._hwMetadata?.mimeType && (
          <span className="badge text-bg-info">{file._hwMetadata.mimeType}</span>
        )}
        {file._hwMetadata?.permissions && (
          <span className="badge text-bg-dark">
            {file._hwMetadata.permissions.octal || 'Unknown'}
          </span>
        )}
      </div>
    </div>

    <div className="preview-content">{getPreviewContent(file, userRole)}</div>

    {/* Action buttons for all files */}
    {canManageHosts(userRole) && (
      <div className="preview-actions">
        <div className="d-flex gap-2 justify-content-center">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={e => {
              e.stopPropagation();
              const propsEvent = new CustomEvent('hyperweaver-show-properties', {
                detail: file,
              });
              document.dispatchEvent(propsEvent);
            }}
          >
            <span className="me-1">
              <i className="fas fa-cog" />
            </span>
            <span>Properties</span>
          </button>
        </div>
      </div>
    )}

    {/* File metadata */}
    <div className="preview-metadata">
      <div className="d-flex flex-wrap gap-2">
        <div>
          <div className="d-inline-flex">
            <span className="badge text-bg-dark rounded-end-0">Modified</span>
            <span className="badge text-bg-secondary rounded-start-0">
              {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
        </div>
        {file._hwMetadata && (
          <div>
            <div className="d-inline-flex">
              <span className="badge text-bg-dark rounded-end-0">Owner</span>
              <span className="badge text-bg-secondary rounded-start-0">
                {file._hwMetadata.uid || 'Unknown'}:{file._hwMetadata.gid || 'Unknown'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

FilePreviewPanel.propTypes = {
  file: PropTypes.object.isRequired,
  userRole: PropTypes.string,
};

export default FilePreviewPanel;
