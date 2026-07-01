import { FileManager } from '@cubone/react-file-manager';
import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import '@cubone/react-file-manager/dist/style.css';

import { useAuth } from '../../../contexts/AuthContext';
import { useServers } from '../../../contexts/ServerContext';
import { canManageHosts, canViewHosts } from '../../../utils/permissions';

import ArchiveModals from './ArchiveModals';
import { AgentFileManagerAPI } from './FileManagerAPI';
import { transformAgentToFile, isTextFile, isArchiveFile } from './FileManagerTransforms';
import FilePropertiesModal from './FilePropertiesModal';
import TextFileEditor from './TextFileEditor';
import './HostFileManager.scss';

const getFileSizeDisplay = file => {
  if (file.isDirectory) {
    return 'Directory';
  }
  if (file.size) {
    return `${Math.round(file.size / 1024)} KB`;
  }
  return 'Unknown size';
};

const getFilePreviewContent = (file, handlers) => {
  if (file.isDirectory) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-folder fa-3x" />
        </span>
        <p className="mt-2">Directory</p>
        <p className="small text-muted">Double-click to open</p>
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
          <button className="btn btn-primary btn-sm" onClick={() => handlers.onEditText(file)}>
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
            onClick={() => handlers.onExtract(file)}
            disabled={!handlers.canManage}
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
      <p className="small text-muted">Double-click to download</p>
    </div>
  );
};

/**
 * Host File Manager Component
 * Integrates cubone react-file-manager with Hyperweaver's architecture
 */
const HostFileManager = ({ server }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [error, setError] = useState('');
  const [textEditorFile, setTextEditorFile] = useState(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [directoryCache, setDirectoryCache] = useState(new Map()); // Cache for directory contents
  const [showCreateArchiveModal, setShowCreateArchiveModal] = useState(false);
  const [showExtractArchiveModal, setShowExtractArchiveModal] = useState(false);
  const [selectedFilesForArchive, setSelectedFilesForArchive] = useState([]);
  const [archiveFileForExtract, setArchiveFileForExtract] = useState(null);
  const [currentlySelectedFiles, setCurrentlySelectedFiles] = useState([]);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertiesFile, setPropertiesFile] = useState(null);

  const { user } = useAuth();
  const serverContext = useServers();

  // Initialize API instance
  const api = useMemo(() => new AgentFileManagerAPI(serverContext), [serverContext]);

  // Load files when path or server changes
  const loadFiles = useCallback(
    async (path = currentPath) => {
      if (!server) {
        setFiles([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        console.log('Loading files for path:', path);

        // Load current directory files
        const currentFiles = await api.loadFiles(path);

        // Always maintain root directories for navigation
        let cachedDirectories = directoryCache.get('/') || [];

        // Load root directories if not cached
        if (cachedDirectories.length === 0) {
          try {
            const rootFiles = await api.loadFiles('/');
            cachedDirectories = rootFiles.filter(file => file.isDirectory);
            setDirectoryCache(prev => new Map(prev).set('/', cachedDirectories));
          } catch (rootErr) {
            void rootErr;
            console.log('Could not load root directories for navigation');
          }
        }

        // Build comprehensive file list for cubone navigation
        const combinedFiles = [...currentFiles];

        // Add cached root directories if we're not at root
        if (path !== '/') {
          cachedDirectories.forEach(dir => {
            if (!combinedFiles.some(f => f.path === dir.path)) {
              combinedFiles.push(dir);
            }
          });
        }

        // If we're in a subdirectory, ensure parent directories are included
        if (path !== '/') {
          const pathParts = path.split('/').filter(Boolean);

          // Load all parent directories in parallel to avoid await-in-loop
          const parentDirPromises = Array.from(
            { length: pathParts.length - 1 },
            async (unusedElement, i) => {
              void unusedElement;
              const searchPath = `/${pathParts.slice(0, i + 1).join('/')}`;

              // Check cache first
              let parentDirs = directoryCache.get(searchPath);
              if (!parentDirs) {
                try {
                  const parentFiles = await api.loadFiles(searchPath);
                  parentDirs = parentFiles.filter(file => file.isDirectory);
                  setDirectoryCache(prev => new Map(prev).set(searchPath, parentDirs));
                } catch (parentErr) {
                  void parentErr;
                  console.log('Could not load parent directory:', searchPath);
                  return [];
                }
              }
              return parentDirs || [];
            }
          );

          const allParentDirs = await Promise.all(parentDirPromises);

          // Add all parent directories to combined files
          allParentDirs.flat().forEach(dir => {
            if (!combinedFiles.some(f => f.path === dir.path)) {
              combinedFiles.push(dir);
            }
          });
        }

        console.log('Combined files for cubone:', combinedFiles.length, 'files');
        setFiles(combinedFiles);
      } catch (loadErr) {
        console.error('Error loading files:', loadErr);
        setError(`Failed to load files: ${loadErr.message}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [server, currentPath, api, directoryCache]
  );

  // Load files when component mounts or dependencies change
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Permission configuration based on user role
  const permissions = useMemo(
    () => ({
      create: canManageHosts(user?.role),
      upload: canManageHosts(user?.role),
      move: canManageHosts(user?.role),
      copy: canManageHosts(user?.role),
      rename: canManageHosts(user?.role),
      download: canViewHosts(user?.role),
      delete: canManageHosts(user?.role),
    }),
    [user?.role]
  );

  // Upload configuration
  const fileUploadConfig = useMemo(() => {
    if (!server) {
      return null;
    }

    return {
      url: `/api/zapi/${server.protocol}/${server.hostname}/${server.port}/filesystem/upload`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    };
  }, [server]);

  // Theme integration
  const themeConfig = useMemo(() => {
    const primaryColor = '#ff6600'; // Brand orange
    const fontFamily = 'Nunito Sans, sans-serif'; // Match Hyperweaver

    return { primaryColor, fontFamily };
  }, []);

  // Create folder handler
  const handleCreateFolder = async (name, parentFolder) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.createFolder(name, parentFolder, currentPath);

      if (result.success) {
        // Add new folder to current files list and refresh to update navigation
        setFiles(prevFiles => [...prevFiles, result.file]);
        // Refresh files to ensure navigation pane updates
        setTimeout(() => loadFiles(), 500);
      } else {
        setError(result.message || 'Failed to create folder');
      }
    } catch (createErr) {
      console.error('Error creating folder:', createErr);
      setError(`Failed to create folder: ${createErr.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // File upload handlers
  const handleFileUploading = (file, parentFolder) => {
    // Use current path or parent folder path, ensure it's never empty
    const uploadPath = parentFolder?.path || currentPath || '/';

    console.log('File uploading:', {
      fileName: file.name,
      uploadPath,
      parentFolder: parentFolder?.name,
      currentPath,
    });

    // Return form data that will be appended to the multipart upload
    // Follow official API spec with proper types
    return {
      uploadPath,
      overwrite: false, // Boolean per API spec
      mode: '644', // String octal format per API spec
      uid: 1000, // Integer per API spec
      gid: 1000, // Integer per API spec
    };
  };

  const handleFileUploaded = response => {
    try {
      const uploadedFile = JSON.parse(response);
      const transformedFile = transformAgentToFile(uploadedFile);

      setFiles(prevFiles => [...prevFiles, transformedFile]);
    } catch (uploadErr) {
      console.error('Error processing uploaded file:', uploadErr);
      // Refresh files as fallback
      loadFiles();
    }
  };

  // Rename handler
  const handleRename = async (file, newName) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.renameFile(file, newName);

      if (result.success) {
        // Instead of trying to update the specific file, just refresh the file list
        // This ensures we get the correct data from the server
        await loadFiles();
      } else {
        setError(result.message || 'Failed to rename file');
      }
    } catch (renameErr) {
      console.error('Error renaming file:', renameErr);
      setError(`Failed to rename file: ${renameErr.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async filesToDelete => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.deleteFiles(filesToDelete);

      if (result.success) {
        // Remove deleted files from current list
        const deletedIds = filesToDelete.map(f => f._id);
        setFiles(prevFiles => prevFiles.filter(f => !deletedIds.includes(f._id)));
      } else {
        setError(result.message || 'Failed to delete files');
      }
    } catch (deleteErr) {
      console.error('Error deleting files:', deleteErr);
      setError(`Failed to delete files: ${deleteErr.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy/Move handler
  const handlePaste = async (copiedItems, destinationFolder, operationType) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await api.copyMoveFiles(copiedItems, destinationFolder, operationType);

      if (result.success) {
        // Refresh files to show changes
        await loadFiles();

        // Show success message for async operations
        if (result.isAsync && result.taskIds && result.taskIds.length > 0) {
          console.log(`${operationType} operation started. Task IDs:`, result.taskIds);
        }
      } else {
        setError(result.message || `Failed to ${operationType} files`);
      }
    } catch (pasteErr) {
      console.error(`Error ${operationType} files:`, pasteErr);
      setError(`Failed to ${operationType} files: ${pasteErr.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Download handler with authentication
  const handleDownload = async filesToDownload => {
    try {
      const { currentServer } = serverContext;
      if (!currentServer) {
        setError('No server selected');
        return;
      }

      // Download files using authenticated requests - use Promise.all to avoid await in loop
      const downloadPromises = filesToDownload
        .filter(file => !file.isDirectory)
        .map(async file => {
          const path = encodeURIComponent(file.path);
          const downloadUrl = `/api/zapi/${currentServer.protocol}/${currentServer.hostname}/${currentServer.port}/filesystem/download?path=${path}`;

          try {
            // Use authenticated fetch to get the file
            const response = await fetch(downloadUrl, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`,
              },
            });

            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = file.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } else {
              console.error(`Failed to download ${file.name}:`, response.statusText);
              setError(`Failed to download ${file.name}: ${response.statusText}`);
            }
          } catch (fetchError) {
            console.error(`Error downloading ${file.name}:`, fetchError);
            setError(`Error downloading ${file.name}: ${fetchError.message}`);
          }
        });

      await Promise.all(downloadPromises);
    } catch (downloadErr) {
      console.error('Error downloading files:', downloadErr);
      setError(`Failed to download files: ${downloadErr.message}`);
    }
  };

  // File open handler (for double-click)
  const handleFileOpen = file => {
    if (file.isDirectory) {
      // Navigate to directory
      setCurrentPath(file.path);
    } else if (isTextFile(file)) {
      // Open text file editor
      setTextEditorFile(file);
      setShowTextEditor(true);
    } else {
      // Download file
      handleDownload([file]);
    }
  };

  // Folder change handler
  const handleFolderChange = path => {
    // Ensure path is never empty, default to root
    const safePath = path || '/';
    console.log('Folder change:', path, '->', safePath);
    setCurrentPath(safePath);
  };

  // Refresh handler
  const handleRefresh = () => {
    loadFiles();
  };

  // Selection handler
  const handleSelect = selectedFiles => {
    console.log('Selected files:', selectedFiles);
    setCurrentlySelectedFiles(selectedFiles);
  };

  // Error handler
  const handleError = (err, file) => {
    console.error('File manager error:', err, file);
    setError(err.message || 'An error occurred');
  };

  // Cut/Copy handlers (optional callbacks)
  const handleCut = cutFiles => {
    console.log('Files cut:', cutFiles);
  };

  const handleCopy = copiedFiles => {
    console.log('Files copied:', copiedFiles);
  };

  // Layout change handler
  const handleLayoutChange = layout => {
    console.log('Layout changed to:', layout);
  };

  // Close text editor
  const handleCloseTextEditor = () => {
    setShowTextEditor(false);
    setTextEditorFile(null);
  };

  // Save text file
  const handleSaveTextFile = async content => {
    if (!textEditorFile) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.updateFileContent(textEditorFile, content);

      if (result.success) {
        setShowTextEditor(false);
        setTextEditorFile(null);
        // Refresh files to show updated modification time
        await loadFiles();
      } else {
        setError(result.message || 'Failed to save file');
      }
    } catch (saveErr) {
      console.error('Error saving file:', saveErr);
      setError(`Failed to save file: ${saveErr.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Archive handlers
  const handleCreateArchive = selectedFiles => {
    setSelectedFilesForArchive(selectedFiles);
    setShowCreateArchiveModal(true);
  };

  const handleExtractArchive = archiveFile => {
    setArchiveFileForExtract(archiveFile);
    setShowExtractArchiveModal(true);
  };

  const handleArchiveSuccess = async result => {
    console.log('Archive operation successful:', result);

    if (result.isAsync && result.task_id) {
      console.log('Archive task started:', result.task_id);
      // Show success message for async operation
      setError(''); // Clear any previous errors
    }

    // Refresh files to show new archive or extracted files
    await loadFiles();
  };

  const handleCloseCreateArchive = () => {
    setShowCreateArchiveModal(false);
    setSelectedFilesForArchive([]);
  };

  const handleCloseExtractArchive = () => {
    setShowExtractArchiveModal(false);
    setArchiveFileForExtract(null);
  };

  // Properties modal handlers
  const handleShowProperties = file => {
    setPropertiesFile(file);
    setShowPropertiesModal(true);
  };

  const handleCloseProperties = () => {
    setShowPropertiesModal(false);
    setPropertiesFile(null);
  };

  const handlePropertiesSuccess = async result => {
    console.log('Properties updated successfully:', result);
    // Refresh files to show updated permissions
    await loadFiles();
  };

  // Don't render if no server is selected
  if (!server) {
    return (
      <div className="alert alert-info">
        <p>Please select a server from the navbar to access the file manager.</p>
      </div>
    );
  }

  return (
    <div className="host-file-manager">
      {/* Error notification */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Custom Action Bar */}
      {canManageHosts(user?.role) && (
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
                          handleCreateArchive(currentlySelectedFiles);
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
                            !relativePath.includes('/') &&
                            filePath.startsWith(currentPathNormalized)
                          );
                        });

                        if (currentDirFiles.length > 0) {
                          handleCreateArchive(currentDirFiles);
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
      )}

      {/* File Manager */}
      <FileManager
        files={files}
        fileUploadConfig={fileUploadConfig}
        isLoading={isLoading}
        onCreateFolder={handleCreateFolder}
        onFileUploading={handleFileUploading}
        onFileUploaded={handleFileUploaded}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onRename={handleRename}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onLayoutChange={handleLayoutChange}
        onRefresh={handleRefresh}
        onFileOpen={handleFileOpen}
        onFolderChange={handleFolderChange}
        onSelect={handleSelect}
        onError={handleError}
        layout="grid"
        enableFilePreview
        filePreviewComponent={file => (
          <div className="file-preview-container">
            <div className="preview-header">
              <h4 className="fs-6 fw-bold">{file.name}</h4>
              <div className="preview-info">
                <span className="badge text-bg-secondary">{getFileSizeDisplay(file)}</span>
                {file._hwMetadata?.mimeType && (
                  <span className="badge text-bg-info">{file._hwMetadata.mimeType}</span>
                )}
              </div>
            </div>

            <div className="preview-content">
              {getFilePreviewContent(file, {
                onEditText: f => {
                  setTextEditorFile(f);
                  setShowTextEditor(true);
                },
                onExtract: handleExtractArchive,
                canManage: canManageHosts(user?.role),
              })}
            </div>

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
                {file._hwMetadata?.permissions && (
                  <div>
                    <div className="d-inline-flex">
                      <span className="badge text-bg-dark rounded-end-0">Permissions</span>
                      <span className="badge text-bg-secondary rounded-start-0">
                        {file._hwMetadata.permissions.octal || 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
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

              {/* Properties button */}
              {canManageHosts(user?.role) && (
                <div className="text-center mt-3">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleShowProperties(file)}
                  >
                    <span className="me-1">
                      <i className="fas fa-cog" />
                    </span>
                    <span>Properties</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        maxFileSize={50 * 1024 * 1024 * 1024} // 50GB limit
        height="calc(100vh - 200px)"
        width="100%"
        initialPath={currentPath}
        primaryColor={themeConfig.primaryColor}
        fontFamily={themeConfig.fontFamily}
        permissions={permissions}
        collapsibleNav
        defaultNavExpanded
        language="en"
      />

      {/* Text File Editor Modal */}
      {showTextEditor && textEditorFile && (
        <TextFileEditor
          file={textEditorFile}
          api={api}
          onClose={handleCloseTextEditor}
          onSave={handleSaveTextFile}
        />
      )}

      {/* Archive Modals */}
      <ArchiveModals
        showCreateModal={showCreateArchiveModal}
        showExtractModal={showExtractArchiveModal}
        onCloseCreate={handleCloseCreateArchive}
        onCloseExtract={handleCloseExtractArchive}
        selectedFiles={selectedFilesForArchive}
        archiveFile={archiveFileForExtract}
        currentPath={currentPath}
        api={api}
        onArchiveSuccess={handleArchiveSuccess}
      />

      {/* File Properties Modal */}
      {showPropertiesModal && propertiesFile && (
        <FilePropertiesModal
          isOpen={showPropertiesModal}
          onClose={handleCloseProperties}
          file={propertiesFile}
          api={api}
          onSuccess={handlePropertiesSuccess}
        />
      )}
    </div>
  );
};

HostFileManager.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
};

export default HostFileManager;
