/**
 * Event handlers for HostFileManager
 * Custom hook providing file loading and cubone FileManager event handlers
 */

import { useCallback } from 'react';

import { getAgentBasePath } from '../../../api/serverUtils';

import { transformAgentToFile, isTextFile } from './FileManagerTransforms';

/**
 * Custom hook for HostFileManager event handlers
 * @param {Object} config - Configuration with state, setters, and API
 * @returns {Object} Handler functions for cubone FileManager
 */
const useHostFileManagerHandlers = ({
  server,
  serverContext,
  api,
  currentPath,
  setCurrentPath,
  directoryCache,
  setDirectoryCache,
  setFiles,
  setIsLoading,
  setError,
  setTextEditorFile,
  setShowTextEditor,
  setCurrentlySelectedFiles,
}) => {
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
        const { items: currentFiles, currentPath: answeredPath } = await api.loadFiles(path);

        // Always maintain root directories for navigation
        let cachedDirectories = directoryCache.get('/') || [];

        // Load root directories if not cached
        if (cachedDirectories.length === 0) {
          try {
            const { items: rootFiles } = await api.loadFiles('/');
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
                  const { items: parentFiles } = await api.loadFiles(searchPath);
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
        // Track the RESOLVED path the agent answered — '/' resolves to a
        // drive root (C:/) on Windows agents, and cubone's content pane
        // only matches items against the path it was told is current.
        if (answeredPath && answeredPath !== path) {
          setCurrentPath(answeredPath);
        }
      } catch (loadErr) {
        console.error('Error loading files:', loadErr);
        setError(`Failed to load files: ${loadErr.message}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      server,
      currentPath,
      api,
      directoryCache,
      setDirectoryCache,
      setFiles,
      setIsLoading,
      setError,
      setCurrentPath,
    ]
  );

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

      const base = getAgentBasePath(currentServer);
      if (base === null) {
        setError('Host not resolvable yet — try again in a moment');
        return;
      }

      // Download files using authenticated requests - use Promise.all to avoid await in loop
      const downloadPromises = filesToDownload
        .filter(file => !file.isDirectory)
        .map(async file => {
          const path = encodeURIComponent(file.path);
          const downloadUrl = `${base}/filesystem/download?path=${path}`;

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

  return {
    loadFiles,
    handleCreateFolder,
    handleFileUploading,
    handleFileUploaded,
    handleRename,
    handleDelete,
    handlePaste,
    handleDownload,
    handleFileOpen,
    handleFolderChange,
    handleRefresh,
    handleSelect,
    handleError,
    handleCut,
    handleCopy,
    handleLayoutChange,
  };
};

export { useHostFileManagerHandlers };
