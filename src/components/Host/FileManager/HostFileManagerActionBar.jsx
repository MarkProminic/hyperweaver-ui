import PropTypes from 'prop-types';

/**
 * Custom action bar for HostFileManager
 * Shows the current path and archive actions for the selection or current directory
 */
const HostFileManagerActionBar = ({
  currentPath,
  files,
  currentlySelectedFiles,
  onCreateArchive,
  setError,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <div>
            <span className="badge text-bg-info d-inline-flex align-items-center gap-1">
              <span className="me-1">
                <i className="fas fa-folder" />
              </span>
              <span>Current: {currentPath}</span>
            </span>
          </div>
        </div>

        <div>
          <div>
            <div className="d-flex gap-2">
              {/* Create Archive Button */}
              <button
                className={`btn btn-sm ${currentlySelectedFiles.length === 0 ? 'btn-outline-info' : 'btn-info'}`}
                onClick={() => {
                  if (currentlySelectedFiles.length > 0) {
                    onCreateArchive(currentlySelectedFiles);
                  } else {
                    setError('Please select files or folders to create an archive');
                  }
                }}
                disabled={currentlySelectedFiles.length === 0}
                title={
                  currentlySelectedFiles.length > 0
                    ? `Create archive from ${currentlySelectedFiles.length} selected item(s)`
                    : 'Select files or folders to create an archive'
                }
              >
                <span className="me-1">
                  <i className="fas fa-file-archive" />
                </span>
                <span>
                  {currentlySelectedFiles.length > 0
                    ? `Archive (${currentlySelectedFiles.length})`
                    : 'Archive'}
                </span>
              </button>

              {/* Archive Directory Button */}
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => {
                  // Archive entire current directory
                  const currentDirFiles = files.filter(f => {
                    const filePath = f.path.startsWith('/') ? f.path.substring(1) : f.path;
                    const currentPathNormalized = currentPath.startsWith('/')
                      ? currentPath.substring(1)
                      : currentPath;

                    // Check if file is in current directory (not subdirectory)
                    const relativePath = filePath.replace(`${currentPathNormalized}/`, '');
                    return (
                      !relativePath.includes('/') && filePath.startsWith(currentPathNormalized)
                    );
                  });

                  if (currentDirFiles.length > 0) {
                    onCreateArchive(currentDirFiles);
                  } else {
                    setError('Current directory is empty');
                  }
                }}
                title="Create archive of entire current directory"
              >
                <span className="me-1">
                  <i className="fas fa-archive" />
                </span>
                <span>Archive Directory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

HostFileManagerActionBar.propTypes = {
  currentPath: PropTypes.string.isRequired,
  files: PropTypes.array.isRequired,
  currentlySelectedFiles: PropTypes.array.isRequired,
  onCreateArchive: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
};

export default HostFileManagerActionBar;
