import PropTypes from 'prop-types';

import {
  formatSize,
  formatDate,
  getTypeIcon,
  getTypeTag,
  getChecksumStatus,
} from './artifactTableUtils';

/**
 * A single artifact row in the artifact table.
 */
const ArtifactRow = ({
  artifact,
  selected,
  loading,
  onSelect,
  onDetails,
  onDelete,
  onMove,
  onCopy,
}) => (
  <tr>
    <td>
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          id={`artifact-select-${artifact.id}`}
          checked={selected}
          onChange={() => onSelect(artifact.id)}
        />
        <label
          className="form-check-label visually-hidden"
          htmlFor={`artifact-select-${artifact.id}`}
        >
          Select {artifact.filename}
        </label>
      </div>
    </td>
    <td>
      <div className="d-flex align-items-center">
        <span className="me-2">{getTypeIcon(artifact.file_type, artifact.extension)}</span>
        <div>
          <div className="fw-semibold">{artifact.filename}</div>
          {artifact.source_url && (
            <div className="small text-muted">
              <i className="fas fa-download me-1" />
              Downloaded from URL
            </div>
          )}
        </div>
      </div>
    </td>
    <td>{getTypeTag(artifact.file_type, artifact.extension)}</td>
    <td>
      <span className="fw-semibold">{formatSize(artifact.size)}</span>
    </td>
    <td>
      <div className="d-flex align-items-center">
        {getChecksumStatus(artifact)}
        {artifact.checksum_algorithm && (
          <span className="badge text-bg-light ms-1">
            {artifact.checksum_algorithm.toUpperCase()}
          </span>
        )}
      </div>
    </td>
    <td>
      {artifact.storage_location && (
        <div>
          <div className="fw-semibold small">{artifact.storage_location.name}</div>
          <div className="small text-muted">{artifact.storage_location.path}</div>
        </div>
      )}
    </td>
    <td>
      <span className="small">{formatDate(artifact.discovered_at)}</span>
    </td>
    <td>
      <div className="d-flex gap-2">
        <button
          className="btn btn-sm"
          onClick={() => onDetails(artifact)}
          disabled={loading}
          title="View details"
        >
          <span>
            <i className="fas fa-info-circle" />
          </span>
        </button>

        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete([artifact.id])}
          disabled={loading}
          title="Delete artifact"
        >
          <span>
            <i className="fas fa-trash" />
          </span>
        </button>

        <div className="dropdown">
          <button
            className="btn btn-sm dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <span>
              <i className="fas fa-ellipsis-h" aria-hidden="true" />
            </span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button type="button" className="dropdown-item" onClick={() => onMove(artifact)}>
                <span className="d-inline-flex align-items-center">
                  <span className="me-1">
                    <i className="fas fa-truck" />
                  </span>
                  <span>Move</span>
                </span>
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={() => onCopy(artifact)}>
                <span className="d-inline-flex align-items-center">
                  <span className="me-1">
                    <i className="fas fa-copy" />
                  </span>
                  <span>Copy</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </td>
  </tr>
);

ArtifactRow.propTypes = {
  artifact: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

export default ArtifactRow;
