import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { isTextFile, isArchiveFile } from './FileManagerTransforms';

const getFileSizeDisplay = (file, t) => {
  if (file.isDirectory) {
    return t('fileManager.hostFileManagerPreview.directory');
  }
  if (file.size) {
    return `${Math.round(file.size / 1024)} KB`;
  }
  return t('fileManager.hostFileManagerPreview.unknownSize');
};

const getFilePreviewContent = (file, handlers, t) => {
  if (file.isDirectory) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-folder fa-3x" />
        </span>
        <p className="mt-2">{t('fileManager.hostFileManagerPreview.directory')}</p>
        <p className="small text-muted">
          {t('fileManager.hostFileManagerPreview.doubleClickOpen')}
        </p>
      </div>
    );
  }

  if (isTextFile(file)) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-file-alt fa-3x" />
        </span>
        <p className="mt-2">{t('fileManager.hostFileManagerPreview.textFile')}</p>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button className="btn btn-primary btn-sm" onClick={() => handlers.onEditText(file)}>
            <span className="me-1">
              <i className="fas fa-edit" />
            </span>
            <span>{t('fileManager.hostFileManagerPreview.editFile')}</span>
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
        <p className="mt-2">{t('fileManager.hostFileManagerPreview.archiveFile')}</p>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button
            className="btn btn-success btn-sm"
            onClick={() => handlers.onExtract(file)}
            disabled={!handlers.canManage}
          >
            <span className="me-1">
              <i className="fas fa-expand-arrows-alt" />
            </span>
            <span>{t('fileManager.hostFileManagerPreview.extract')}</span>
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
      <p className="mt-2">{t('fileManager.hostFileManagerPreview.file')}</p>
      <p className="small text-muted">
        {t('fileManager.hostFileManagerPreview.doubleClickDownload')}
      </p>
    </div>
  );
};

/**
 * File preview panel for HostFileManager
 * Renders file details, type-specific actions, and metadata in the cubone preview area
 */
const HostFileManagerPreview = ({ file, onEditText, onExtract, canManage, onShowProperties }) => {
  const { t } = useTranslation();

  return (
    <div className="file-preview-container">
      <div className="preview-header">
        <h4 className="fs-6 fw-bold">{file.name}</h4>
        <div className="preview-info">
          <span className="badge text-bg-secondary">{getFileSizeDisplay(file, t)}</span>
          {file._hwMetadata?.mimeType && (
            <span className="badge text-bg-info">{file._hwMetadata.mimeType}</span>
          )}
        </div>
      </div>

      <div className="preview-content">
        {getFilePreviewContent(
          file,
          {
            onEditText,
            onExtract,
            canManage,
          },
          t
        )}
      </div>

      {/* File metadata */}
      <div className="preview-metadata">
        <div className="d-flex flex-wrap gap-2">
          <div>
            <div className="d-inline-flex">
              <span className="badge text-bg-dark rounded-end-0">
                {t('fileManager.hostFileManagerPreview.modified')}
              </span>
              <span className="badge text-bg-secondary rounded-start-0">
                {file.updatedAt
                  ? new Date(file.updatedAt).toLocaleDateString()
                  : t('fileManager.hostFileManagerPreview.unknown')}
              </span>
            </div>
          </div>
          {file._hwMetadata?.permissions && (
            <div>
              <div className="d-inline-flex">
                <span className="badge text-bg-dark rounded-end-0">
                  {t('fileManager.hostFileManagerPreview.permissions')}
                </span>
                <span className="badge text-bg-secondary rounded-start-0">
                  {file._hwMetadata.permissions.octal ||
                    t('fileManager.hostFileManagerPreview.unknown')}
                </span>
              </div>
            </div>
          )}
          {file._hwMetadata && (
            <div>
              <div className="d-inline-flex">
                <span className="badge text-bg-dark rounded-end-0">
                  {t('fileManager.hostFileManagerPreview.owner')}
                </span>
                <span className="badge text-bg-secondary rounded-start-0">
                  {file._hwMetadata.uid || t('fileManager.hostFileManagerPreview.unknown')}:
                  {file._hwMetadata.gid || t('fileManager.hostFileManagerPreview.unknown')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Properties button */}
        {canManage && (
          <div className="text-center mt-3">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onShowProperties(file)}
            >
              <span className="me-1">
                <i className="fas fa-cog" />
              </span>
              <span>{t('fileManager.hostFileManagerPreview.properties')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

HostFileManagerPreview.propTypes = {
  file: PropTypes.object.isRequired,
  onEditText: PropTypes.func.isRequired,
  onExtract: PropTypes.func.isRequired,
  canManage: PropTypes.bool,
  onShowProperties: PropTypes.func.isRequired,
};

export default HostFileManagerPreview;
