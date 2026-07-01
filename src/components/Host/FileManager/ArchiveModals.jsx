import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import FormModal from '../../common/FormModal';

import { getArchiveFormat } from './FileManagerTransforms';

/**
 * Archive Creation Modal
 */
const CreateArchiveModal = ({ isOpen, onClose, selectedFiles, currentPath, api, onSuccess }) => {
  const [archiveName, setArchiveName] = useState('');
  const [format, setFormat] = useState('tar.gz');
  const [destination, setDestination] = useState(currentPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && selectedFiles.length > 0) {
      // Generate default archive name based on selection
      const baseName = selectedFiles.length === 1 ? selectedFiles[0].name : 'archive';
      setArchiveName(`${baseName}.${format}`);
    }
  }, [isOpen, selectedFiles, format]);

  useEffect(() => {
    setDestination(currentPath);
  }, [currentPath]);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!archiveName.trim()) {
      setError('Archive name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const archivePath = `${destination}/${archiveName}`;
      const result = await api.createArchive(selectedFiles, archivePath, format);

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.message || 'Failed to create archive');
      }
    } catch (createErr) {
      console.error('Error creating archive:', createErr);
      setError(`Failed to create archive: ${createErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = newFormat => {
    setFormat(newFormat);
    // Update archive name with new extension
    const nameWithoutExt = archiveName.replace(/\.(?:tar\.gz|tar\.bz2|zip|tar|gz)$/i, '');
    setArchiveName(`${nameWithoutExt}.${newFormat}`);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Create Archive"
      icon="fas fa-file-archive"
      submitText="Create Archive"
      submitVariant="is-primary"
      submitIcon="fas fa-plus"
      loading={loading}
      showCancelButton
    >
      {/* Selected files info */}
      <div className="mb-3">
        <div className="alert alert-info">
          <strong>Creating archive from {selectedFiles.length} item(s):</strong>
          <ul className="mt-2">
            {selectedFiles.slice(0, 5).map(file => (
              <li key={file.path || file.name}>📁 {file.name}</li>
            ))}
            {selectedFiles.length > 5 && <li>... and {selectedFiles.length - 5} more items</li>}
          </ul>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-danger">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          {error}
        </div>
      )}

      {/* Archive name */}
      <div className="mb-3">
        <label htmlFor="archive-name" className="form-label">
          Archive Name
        </label>
        <input
          id="archive-name"
          className="form-control"
          type="text"
          value={archiveName}
          onChange={e => setArchiveName(e.target.value)}
          placeholder="Enter archive name..."
          required
        />
        <p className="form-text text-muted">The archive will be created in the current directory</p>
      </div>

      {/* Format selection */}
      <div className="mb-3">
        <label htmlFor="archive-format" className="form-label">
          Archive Format
        </label>
        <select
          id="archive-format"
          className="form-select"
          value={format}
          onChange={e => handleFormatChange(e.target.value)}
        >
          <option value="tar.gz">tar.gz (Compressed tar archive)</option>
          <option value="tar.bz2">tar.bz2 (BZip2 compressed tar)</option>
          <option value="tar">tar (Uncompressed tar archive)</option>
          <option value="zip">zip (ZIP archive)</option>
          <option value="gz">gz (GZip compressed)</option>
        </select>
      </div>

      {/* Destination path */}
      <div className="mb-3">
        <label htmlFor="archive-destination" className="form-label">
          Destination Directory
        </label>
        <input
          id="archive-destination"
          className="form-control"
          type="text"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="/path/to/destination"
          required
        />
        <p className="form-text text-muted">Directory where the archive will be created</p>
      </div>
    </FormModal>
  );
};

CreateArchiveModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedFiles: PropTypes.array.isRequired,
  currentPath: PropTypes.string.isRequired,
  api: PropTypes.object.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

/**
 * Archive Extraction Modal
 */
const ExtractArchiveModal = ({ isOpen, onClose, archiveFile, currentPath, api, onSuccess }) => {
  const [destination, setDestination] = useState(currentPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDestination(currentPath);
  }, [currentPath]);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!destination.trim()) {
      setError('Destination path is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.extractArchive(archiveFile, destination);

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.message || 'Failed to extract archive');
      }
    } catch (extractErr) {
      console.error('Error extracting archive:', extractErr);
      setError(`Failed to extract archive: ${extractErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!archiveFile) {
    return null;
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Extract Archive"
      icon="fas fa-file-archive"
      submitText="Extract Archive"
      submitVariant="is-success"
      submitIcon="fas fa-expand-arrows-alt"
      loading={loading}
      showCancelButton
    >
      {/* Archive info */}
      <div className="mb-3">
        <div className="alert alert-secondary">
          <div className="row align-items-center">
            <div className="col">
              <strong>Archive:</strong> {archiveFile.name}
            </div>
            <div className="col">
              <strong>Size:</strong>{' '}
              {archiveFile.size ? `${Math.round(archiveFile.size / 1024)} KB` : 'Unknown'}
            </div>
            <div className="col">
              <strong>Format:</strong> {getArchiveFormat(archiveFile.name)}
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-danger">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          {error}
        </div>
      )}

      {/* Destination path */}
      <div className="mb-3">
        <label htmlFor="extract-destination" className="form-label">
          Extract To Directory
        </label>
        <input
          id="extract-destination"
          className="form-control"
          type="text"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="/path/to/extraction/directory"
          required
        />
        <p className="form-text text-muted">
          Directory where the archive contents will be extracted
        </p>
      </div>

      {/* Quick destination options */}
      <div className="mb-3">
        <span className="form-label" aria-hidden="true">
          Quick Options
        </span>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm" onClick={() => setDestination(currentPath)}>
            Current Directory ({currentPath})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const archiveNameWithoutExt = archiveFile.name.replace(
                /\.(?:tar\.gz|tar\.bz2|zip|tar|gz)$/i,
                ''
              );
              setDestination(`${currentPath}/${archiveNameWithoutExt}`);
            }}
          >
            New Folder ({archiveFile.name.replace(/\.(?:tar\.gz|tar\.bz2|zip|tar|gz)$/i, '')})
          </button>
        </div>
      </div>
    </FormModal>
  );
};

ExtractArchiveModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  archiveFile: PropTypes.object,
  currentPath: PropTypes.string.isRequired,
  api: PropTypes.object.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

/**
 * Combined Archive Modals Component
 */
const ArchiveModals = ({
  showCreateModal,
  showExtractModal,
  onCloseCreate,
  onCloseExtract,
  selectedFiles,
  archiveFile,
  currentPath,
  api,
  onArchiveSuccess,
}) => (
  <>
    {showCreateModal && (
      <CreateArchiveModal
        isOpen={showCreateModal}
        onClose={onCloseCreate}
        selectedFiles={selectedFiles}
        currentPath={currentPath}
        api={api}
        onSuccess={onArchiveSuccess}
      />
    )}

    {showExtractModal && archiveFile && (
      <ExtractArchiveModal
        isOpen={showExtractModal}
        onClose={onCloseExtract}
        archiveFile={archiveFile}
        currentPath={currentPath}
        api={api}
        onSuccess={onArchiveSuccess}
      />
    )}
  </>
);

ArchiveModals.propTypes = {
  showCreateModal: PropTypes.bool.isRequired,
  showExtractModal: PropTypes.bool.isRequired,
  onCloseCreate: PropTypes.func.isRequired,
  onCloseExtract: PropTypes.func.isRequired,
  selectedFiles: PropTypes.array.isRequired,
  archiveFile: PropTypes.object,
  currentPath: PropTypes.string.isRequired,
  api: PropTypes.object.isRequired,
  onArchiveSuccess: PropTypes.func.isRequired,
};

export default ArchiveModals;
