/**
 * Event handlers for ExtendedFileManager
 * Custom hook providing all cubone FileManager callbacks
 */

import { useCallback } from 'react';

import { getAgentBasePath } from '../../../api/serverUtils';

import { isTextFile } from './FileManagerTransforms';

/**
 * Custom hook for ExtendedFileManager event handlers
 * @param {Object} config - Configuration with state, setters, and API
 * @returns {Object} Handler functions for cubone FileManager
 */
const useExtendedHandlers = ({
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
}) => {
  /**
   * Load files with navigation support
   * Loads current directory + caches parent directories for cubone nav panel
   */
  const loadFiles = useCallback(
    async (path = currentPath) => {
      if (!server) {
        setFiles([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const currentFiles = await api.loadFiles(path);

        // Maintain root directories for navigation
        let cachedDirectories = directoryCache.get('/') || [];

        if (cachedDirectories.length === 0) {
          try {
            const rootFiles = await api.loadFiles('/');
            cachedDirectories = rootFiles.filter(file => file.isDirectory);
            setDirectoryCache(prev => new Map(prev).set('/', cachedDirectories));
          } catch {
            // Root directory load failed
          }
        }

        const combinedFiles = [...currentFiles];

        // Add cached root directories if not at root
        if (path !== '/') {
          cachedDirectories.forEach(dir => {
            if (!combinedFiles.some(f => f.path === dir.path)) {
              combinedFiles.push(dir);
            }
          });
        }

        // Add parent directories for subdirectory navigation
        if (path !== '/') {
          const pathParts = path.split('/').filter(Boolean);

          // Build parent paths using reduce
          const parentPaths = [];
          pathParts.slice(0, -1).reduce((accPath, part) => {
            const fullPath = `${accPath}/${part}`;
            parentPaths.push(fullPath);
            return fullPath;
          }, '');

          // Load uncached parent directories in parallel
          const uncachedPaths = parentPaths.filter(p => !directoryCache.get(p));
          const parentResults = await Promise.all(
            uncachedPaths.map(parentPath =>
              api.loadFiles(parentPath).then(
                parentFiles => ({
                  path: parentPath,
                  dirs: parentFiles.filter(f => f.isDirectory),
                }),
                () => null
              )
            )
          );

          // Build local lookup from newly loaded results
          const newEntries = parentResults.filter(Boolean);
          const newEntriesMap = new Map(newEntries.map(({ path: p, dirs }) => [p, dirs]));

          // Update directory cache
          if (newEntries.length > 0) {
            setDirectoryCache(prev => {
              const updated = new Map(prev);
              newEntries.forEach(({ path: entryPath, dirs }) => {
                updated.set(entryPath, dirs);
              });
              return updated;
            });
          }

          // Add all parent directories to combined files
          parentPaths.forEach(parentPath => {
            const dirs = directoryCache.get(parentPath) || newEntriesMap.get(parentPath) || [];
            dirs.forEach(dir => {
              if (!combinedFiles.some(f => f.path === dir.path)) {
                combinedFiles.push(dir);
              }
            });
          });
        }

        setFiles(combinedFiles);
      } catch (loadErr) {
        setError(`Failed to load files: ${loadErr.message}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [server, currentPath, api, directoryCache, setDirectoryCache, setFiles, setIsLoading, setError]
  );

  const handleCreateFolder = useCallback(
    async (name, parentFolder) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await api.createFolder(name, parentFolder, currentPath);

        if (result.success) {
          setFiles(prevFiles => [...prevFiles, result.file]);
          setTimeout(() => loadFiles(), 500);
        } else {
          setError(result.message || 'Failed to create folder');
        }
      } catch (createErr) {
        setError(`Failed to create folder: ${createErr.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [api, currentPath, loadFiles, setFiles, setIsLoading, setError]
  );

  const handleFileUploading = useCallback(
    (file, parentFolder) => {
      void file;
      const uploadPath = parentFolder?.path || currentPath || '/';

      return {
        uploadPath,
        overwrite: false,
        mode: '644',
        uid: 1000,
        gid: 1000,
      };
    },
    [currentPath]
  );

  const handleFileUploaded = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const handleRename = useCallback(
    async (file, newName) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await api.renameFile(file, newName);

        if (result.success) {
          await loadFiles();
        } else {
          setError(result.message || 'Failed to rename file');
        }
      } catch (renameErr) {
        setError(`Failed to rename file: ${renameErr.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [api, loadFiles, setIsLoading, setError]
  );

  const handleDelete = useCallback(
    async filesToDelete => {
      setIsLoading(true);
      setError('');

      try {
        const result = await api.deleteFiles(filesToDelete);

        if (result.success) {
          await loadFiles();
        } else {
          setError(result.message || 'Failed to delete files');
        }
      } catch (deleteErr) {
        setError(`Failed to delete files: ${deleteErr.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [api, loadFiles, setIsLoading, setError]
  );

  const handlePaste = useCallback(
    async (copiedItems, destinationFolder, operationType) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await api.copyMoveFiles(copiedItems, destinationFolder, operationType);

        if (result.success) {
          await loadFiles();
        } else {
          setError(result.message || `Failed to ${operationType} files`);
        }
      } catch (pasteErr) {
        setError(`Failed to ${operationType} files: ${pasteErr.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [api, loadFiles, setIsLoading, setError]
  );

  const handleDownload = useCallback(
    async filesToDownload => {
      const downloadServer = serverContext.currentServer;
      if (!downloadServer) {
        setError('No server selected');
        return;
      }

      const base = getAgentBasePath(downloadServer);
      if (base === null) {
        setError('Host not resolvable yet — try again in a moment');
        return;
      }

      try {
        const downloadableFiles = filesToDownload.filter(f => !f.isDirectory);
        await Promise.all(
          downloadableFiles.map(async dlFile => {
            const filePath = encodeURIComponent(dlFile.path);
            const downloadUrl = `${base}/filesystem/download?path=${filePath}`;

            try {
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
                a.download = dlFile.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } else {
                setError(`Failed to download ${dlFile.name}: ${response.statusText}`);
              }
            } catch (fetchErr) {
              setError(`Error downloading ${dlFile.name}: ${fetchErr.message}`);
            }
          })
        );
      } catch (downloadErr) {
        setError(`Failed to download files: ${downloadErr.message}`);
      }
    },
    [serverContext, setError]
  );

  const handleFileOpen = useCallback(
    file => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
        return undefined;
      }
      if (isTextFile(file)) {
        return { action: 'editFile', file };
      }
      handleDownload([file]);
      return undefined;
    },
    [setCurrentPath, handleDownload]
  );

  const handleFolderChange = useCallback(
    path => {
      setCurrentPath(path || '/');
    },
    [setCurrentPath]
  );

  const handleRefresh = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const handleError = useCallback(
    fmError => {
      setError(fmError.message || 'An error occurred');
    },
    [setError]
  );

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
    handleError,
  };
};

export { useExtendedHandlers };
