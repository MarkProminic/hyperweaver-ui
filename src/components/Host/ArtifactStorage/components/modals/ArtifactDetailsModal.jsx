import PropTypes from 'prop-types';
import { useState } from 'react';

import { useServers } from '../../../../../contexts/ServerContext';
import ContentModal from '../../../../common/ContentModal';

const ArtifactDetailsModal = ({ artifact, details, server, onClose }) => {
  const { makeAgentRequest } = useServers();
  const [downloadError, setDownloadError] = useState('');

  const formatSize = bytes => {
    if (!bytes) {
      return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = dateString => {
    if (!dateString) {
      return 'N/A';
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (err) {
      void err;
      return dateString;
    }
  };

  const getTypeIcon = (fileType, extension) => {
    const type = fileType?.toLowerCase() || extension?.toLowerCase();

    if (type === 'iso' || extension?.toLowerCase() === '.iso') {
      return 'fas fa-compact-disc text-info';
    } else if (
      type === 'image' ||
      ['.vmdk', '.vhd', '.vhdx', '.qcow2', '.img'].includes(extension?.toLowerCase())
    ) {
      return 'fas fa-hdd text-warning';
    }
    return 'fas fa-file text-muted';
  };

  const getChecksumStatusIcon = verified => {
    if (verified === true) {
      return <i className="fas fa-check-circle text-success" />;
    } else if (verified === false) {
      return <i className="fas fa-times-circle text-danger" />;
    }
    return <i className="fas fa-question-circle text-muted" />;
  };

  const getChecksumStatusText = verified => {
    if (verified === true) {
      return 'Verified';
    } else if (verified === false) {
      return 'Mismatch';
    }
    return 'Not verified';
  };

  const getFileTypeTagClass = fileType => {
    if (fileType === 'iso') {
      return 'text-bg-info';
    }
    if (fileType === 'image') {
      return 'text-bg-warning';
    }
    return 'text-bg-secondary';
  };

  const getChecksumVerificationClass = verified => {
    if (verified === true) {
      return 'text-success';
    }
    if (verified === false) {
      return 'text-danger';
    }
    return 'text-muted';
  };

  const handleDownloadFile = async () => {
    try {
      setDownloadError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/${artifact.id}/download`,
        'GET',
        null, // data
        null, // params
        false, // bypassCache
        null, // onUploadProgress
        'blob' // responseType
      );

      if (result.success) {
        const blob = result.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = artifact.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
      } else {
        setDownloadError(`Download failed: ${result.message}`);
      }
    } catch (err) {
      setDownloadError(`Error downloading file: ${err.message}`);
    }
  };

  const artifactData = details || artifact;

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={artifact.filename}
      icon={getTypeIcon(artifact.file_type, artifact.extension)}
    >
      {/* Main Info Section */}
      <div>
        <div className="row">
          <div className="col">
            <h4 className="fs-5 fw-bold">File Information</h4>

            <div className="table-responsive">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>
                      <strong>Filename:</strong>
                    </td>
                    <td className="font-monospace">{artifactData.filename}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>File Type:</strong>
                    </td>
                    <td>
                      <span className={`badge ${getFileTypeTagClass(artifactData.file_type)}`}>
                        {artifactData.file_type?.toUpperCase() || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Extension:</strong>
                    </td>
                    <td className="font-monospace">{artifactData.extension || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>MIME Type:</strong>
                    </td>
                    <td className="font-monospace">{artifactData.mime_type || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>File Size:</strong>
                    </td>
                    <td>
                      <strong>{formatSize(artifactData.size)}</strong>
                      <span className="ms-2 text-muted small">
                        ({artifactData.size?.toLocaleString()} bytes)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Path:</strong>
                    </td>
                    <td className="font-monospace small">{artifactData.path}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="col">
            <h4 className="fs-5 fw-bold">Storage Details</h4>

            <div className="table-responsive">
              <table className="table table-sm">
                <tbody>
                  {artifactData.storage_location && (
                    <>
                      <tr>
                        <td>
                          <strong>Storage Name:</strong>
                        </td>
                        <td>{artifactData.storage_location.name}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Storage Path:</strong>
                        </td>
                        <td className="font-monospace small">
                          {artifactData.storage_location.path}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Storage Type:</strong>
                        </td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {artifactData.storage_location.type?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>
                      <strong>Discovered:</strong>
                    </td>
                    <td>{formatDate(artifactData.discovered_at)}</td>
                  </tr>
                  {artifactData.source_url && (
                    <tr>
                      <td>
                        <strong>Source URL:</strong>
                      </td>
                      <td>
                        <a
                          href={artifactData.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="small"
                        >
                          {artifactData.source_url}
                          <span className="ms-1">
                            <i className="fas fa-external-link-alt" />
                          </span>
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Checksum Section */}
      <div>
        <h4 className="fs-5 fw-bold">
          <span className="d-inline-flex align-items-center">
            <span className="me-1">
              <i className="fas fa-shield-alt" />
            </span>
            <span>Checksum Information</span>
          </span>
        </h4>

        <div className="row">
          <div className="col">
            <div className="mb-3">
              <label htmlFor="artifact-checksum" className="form-label">
                Checksum
              </label>
              <input
                id="artifact-checksum"
                className="form-control font-monospace small"
                type="text"
                value={artifactData.checksum || 'Not calculated'}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-auto">
            <div className="mb-3">
              <span className="form-label">Algorithm</span>
              <div>
                <span className="badge text-bg-info">
                  {artifactData.checksum_algorithm?.toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="col-auto">
            <div className="mb-3">
              <span className="form-label">Verification Status</span>
              <div>
                <span className="d-inline-flex align-items-center">
                  <span className="me-1">
                    {getChecksumStatusIcon(artifactData.checksum_verified)}
                  </span>
                  <span
                    className={`fw-semibold ${getChecksumVerificationClass(artifactData.checksum_verified)}`}
                  >
                    {getChecksumStatusText(artifactData.checksum_verified)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {artifactData.checksum_verified === false && (
          <div className="alert alert-warning">
            <p>
              <strong>Checksum Mismatch Warning:</strong> The calculated checksum does not match the
              expected checksum. This could indicate file corruption or an incorrect expected
              checksum value.
            </p>
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div>
        <h4 className="fs-5 fw-bold">Actions</h4>

        {downloadError && (
          <div className="alert alert-danger">
            <button type="button" className="btn-close" onClick={() => setDownloadError('')} />
            {downloadError}
          </div>
        )}

        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={handleDownloadFile}>
            <span className="me-1">
              <i className="fas fa-download" />
            </span>
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Technical Details */}
      <div>
        <h4 className="fs-5 fw-bold">Technical Details</h4>
        <div className="alert alert-secondary">
          <div className="row">
            <div className="col">
              <p className="text-uppercase small fw-semibold text-muted">Artifact ID</p>
              <p className="font-monospace small">{artifactData.id}</p>
            </div>
            {artifactData.storage_location && (
              <div className="col">
                <p className="text-uppercase small fw-semibold text-muted">Storage Location ID</p>
                <p className="font-monospace small">{artifactData.storage_location.id}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Type Specific Information */}
      {(artifactData.file_type === 'iso' || artifactData.extension === '.iso') && (
        <div>
          <h4 className="fs-5 fw-bold">
            <span className="d-inline-flex align-items-center">
              <span className="me-1">
                <i className="fas fa-compact-disc" />
              </span>
              <span>ISO Information</span>
            </span>
          </h4>
          <div className="alert alert-info">
            <p>
              This is an ISO 9660 disc image file, commonly used for distributing operating systems,
              software, and other bootable media. ISO files can be mounted as virtual drives or
              burned to physical media.
            </p>
          </div>
        </div>
      )}

      {artifactData.file_type === 'image' &&
        ['.vmdk', '.vhd', '.vhdx', '.qcow2'].includes(artifactData.extension) && (
          <div>
            <h4 className="fs-5 fw-bold">
              <span className="d-inline-flex align-items-center">
                <span className="me-1">
                  <i className="fas fa-hdd" />
                </span>
                <span>VM Image Information</span>
              </span>
            </h4>
            <div className="alert alert-warning">
              <p>
                This is a virtual machine disk image file. These files contain complete virtual
                machine hard drives and can be used with hypervisors such as VMware, VirtualBox,
                KVM, or Hyper-V.
              </p>
            </div>
          </div>
        )}
    </ContentModal>
  );
};

ArtifactDetailsModal.propTypes = {
  artifact: PropTypes.shape({
    id: PropTypes.string,
    filename: PropTypes.string,
    file_type: PropTypes.string,
    extension: PropTypes.string,
  }).isRequired,
  details: PropTypes.shape({
    id: PropTypes.string,
    filename: PropTypes.string,
    file_type: PropTypes.string,
    extension: PropTypes.string,
    mime_type: PropTypes.string,
    size: PropTypes.number,
    path: PropTypes.string,
    storage_location: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      path: PropTypes.string,
      type: PropTypes.string,
    }),
    discovered_at: PropTypes.string,
    source_url: PropTypes.string,
    checksum: PropTypes.string,
    checksum_algorithm: PropTypes.string,
    checksum_verified: PropTypes.bool,
  }),
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.number,
    protocol: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ArtifactDetailsModal;
