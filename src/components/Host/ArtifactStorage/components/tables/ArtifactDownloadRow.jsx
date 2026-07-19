import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import {
  formatSize,
  formatDate,
  getDownloadStatusIcon,
  getDownloadStatusText,
  getDownloadStatusTag,
} from './artifactTableUtils';

/**
 * Renders the download size/progress cell content for an active download.
 */
const DownloadSizeCell = ({ download }) => {
  const { t } = useTranslation();
  if (download.progress_info?.total_mb) {
    return (
      <div>
        <div className="fw-semibold">
          {formatSize(download.progress_info.downloaded_mb * 1024 * 1024)} /{' '}
          {formatSize(download.progress_info.total_mb * 1024 * 1024)}
        </div>
        {download.progress_info.speed_kbps && (
          <div className="small text-muted">
            {Math.round(download.progress_info.speed_kbps / 1024)} MB/s
          </div>
        )}
      </div>
    );
  }

  if (download.progress_info?.file_size_mb) {
    return (
      <div className="fw-semibold">
        {formatSize(download.progress_info.file_size_mb * 1024 * 1024)}
      </div>
    );
  }

  return (
    <span className="text-muted">
      {download.status === 'running'
        ? t('artifacts.artifactDownloadRow.processingStatus')
        : t('artifacts.artifactDownloadRow.pendingStatus')}
    </span>
  );
};

DownloadSizeCell.propTypes = {
  download: PropTypes.object.isRequired,
};

/**
 * A single active download placeholder row in the artifact table.
 */
const ArtifactDownloadRow = ({ download, onCancelDownload }) => {
  const { t } = useTranslation();
  return (
    <tr className="table-light">
      <td>
        <span className="text-muted">
          <i className="fas fa-clock" />
        </span>
      </td>
      <td>
        <div className="d-flex align-items-center">
          <span className="me-2">{getDownloadStatusIcon(download.status)}</span>
          <div>
            <div className="fw-semibold text-muted">
              {download.filename || t('artifacts.artifactDownloadRow.downloadingLabel')}
            </div>
            <div className="small text-muted">
              <i className="fas fa-download me-1" />
              {download.url && (
                <span title={download.url}>
                  {download.url.length > 50 ? `${download.url.substring(0, 47)}...` : download.url}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td>{getDownloadStatusTag(download.status)}</td>
      <td>
        <DownloadSizeCell download={download} />
      </td>
      <td>
        <span
          className="text-muted"
          title={t('artifacts.artifactDownloadRow.downloadInProgressTooltip')}
        >
          <i className="fas fa-clock" />
        </span>
      </td>
      <td>
        {download.storage_location && (
          <div>
            <div className="fw-semibold small text-muted">{download.storage_location.name}</div>
            <div className="small text-muted">{download.storage_location.path}</div>
          </div>
        )}
      </td>
      <td>
        <span className="small text-muted">{formatDate(download.created_at)}</span>
      </td>
      <td>
        <div className="d-flex gap-2">
          {download.status === 'failed' && download.error_message && (
            <button
              className="btn btn-danger btn-sm"
              title={t('artifacts.artifactDownloadRow.downloadFailedTooltip', {
                error: download.error_message,
              })}
              disabled
            >
              <span>
                <i className="fas fa-exclamation-circle" />
              </span>
            </button>
          )}

          {['queued', 'running'].includes(download.status) && onCancelDownload && (
            <button
              className="btn btn-warning btn-sm"
              onClick={() => onCancelDownload(download.taskId)}
              title={t('artifacts.artifactDownloadRow.cancelDownloadTooltip')}
            >
              <span>
                <i className="fas fa-times" />
              </span>
            </button>
          )}

          <span className="badge text-bg-light text-muted">
            {getDownloadStatusText(download.status)}
          </span>
        </div>
      </td>
    </tr>
  );
};

ArtifactDownloadRow.propTypes = {
  download: PropTypes.object.isRequired,
  onCancelDownload: PropTypes.func,
};

export default ArtifactDownloadRow;
