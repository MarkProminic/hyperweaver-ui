import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { canManageHosts } from '../../../utils/permissions';

import { isTextFile, isArchiveFile } from './FileManagerTransforms';

/**
 * Get file size display label
 * @param {Object} file - File object
 * @returns {string} Size label
 */
const getFileSizeLabel = (file, t) => {
  if (file.isDirectory) {
    return t('fileManager.filePreviewPanel.directory');
  }
  if (file.size) {
    return `${Math.round(file.size / 1024)} KB`;
  }
  return t('fileManager.filePreviewPanel.unknownSize');
};

/**
 * Get preview content based on file type
 * Uses early returns to avoid nested ternaries
 * @param {Object} file - File object
 * @param {string} userRole - Current user role
 * @returns {JSX.Element} Preview content
 */
const getPreviewContent = (file, userRole, t) => {
  if (file.isDirectory) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-folder fa-3x" />
        </span>
        <p className="mt-2">{t('fileManager.filePreviewPanel.directory')}</p>
        <p className="form-text text-muted">{t('fileManager.filePreviewPanel.doubleClickOpen')}</p>
      </div>
    );
  }

  if (isTextFile(file)) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-file-alt fa-3x" />
        </span>
        <p className="mt-2">{t('fileManager.filePreviewPanel.textFile')}</p>
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
            <span>{t('fileManager.filePreviewPanel.editFile')}</span>
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
        <p className="mt-2">{t('fileManager.filePreviewPanel.archiveFile')}</p>
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
            <span>{t('fileManager.filePreviewPanel.extract')}</span>
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
      <p className="mt-2">{t('fileManager.filePreviewPanel.file')}</p>
      <p className="form-text text-muted">
        {t('fileManager.filePreviewPanel.doubleClickDownload')}
      </p>
    </div>
  );
};

/**
 * File Preview Panel Component
 * Renders file preview content in the cubone FileManager preview area
 */
const FilePreviewPanel = ({ file, userRole }) => {
  const { t } = useTranslation();

  return (
    <div className="hyperweaver-file-preview">
      <div className="preview-header">
        <h4 className="fs-6 fw-bold">{file.name}</h4>
        <div className="preview-info">
          <span className="badge text-bg-secondary">{getFileSizeLabel(file, t)}</span>
          {file._hwMetadata?.mimeType && (
            <span className="badge text-bg-info">{file._hwMetadata.mimeType}</span>
          )}
          {file._hwMetadata?.permissions && (
            <span className="badge text-bg-dark">
              {file._hwMetadata.permissions.octal || t('fileManager.filePreviewPanel.unknown')}
            </span>
          )}
        </div>
      </div>

      <div className="preview-content">{getPreviewContent(file, userRole, t)}</div>

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
              <span>{t('fileManager.filePreviewPanel.properties')}</span>
            </button>
          </div>
        </div>
      )}

      {/* File metadata */}
      <div className="preview-metadata">
        <div className="d-flex flex-wrap gap-2">
          <div>
            <div className="d-inline-flex">
              <span className="badge text-bg-dark rounded-end-0">
                {t('fileManager.filePreviewPanel.modified')}
              </span>
              <span className="badge text-bg-secondary rounded-start-0">
                {file.updatedAt
                  ? new Date(file.updatedAt).toLocaleDateString()
                  : t('fileManager.filePreviewPanel.unknown')}
              </span>
            </div>
          </div>
          {file._hwMetadata && (
            <div>
              <div className="d-inline-flex">
                <span className="badge text-bg-dark rounded-end-0">
                  {t('fileManager.filePreviewPanel.owner')}
                </span>
                <span className="badge text-bg-secondary rounded-start-0">
                  {file._hwMetadata.uid || t('fileManager.filePreviewPanel.unknown')}:
                  {file._hwMetadata.gid || t('fileManager.filePreviewPanel.unknown')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

FilePreviewPanel.propTypes = {
  file: PropTypes.object.isRequired,
  userRole: PropTypes.string,
};

export default FilePreviewPanel;
