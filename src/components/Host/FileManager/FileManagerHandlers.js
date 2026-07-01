import { useCallback } from 'react';

/**
 * Custom hook providing standard cubone file manager event handlers
 * and modal handlers for the enhanced file manager.
 */
const useCuboneHandlers = ({
  api,
  currentPath,
  setCurrentPath,
  setFiles,
  setIsLoading,
  setError,
  loadFiles,
  serverContext,
  textEditorFile,
  setShowTextEditor,
  setTextEditorFile,
  setShowCreateArchiveModal,
  setSelectedFilesForArchive,
  setShowExtractArchiveModal,
  setArchiveFileForExtract,
  setShowPropertiesModal,
  setPropertiesFile,
}) => {
  // -- Cubone event handlers --

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
    [api, currentPath, setIsLoading, setError, setFiles, loadFiles]
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
    [api, setIsLoading, setError, loadFiles]
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
    [api, setIsLoading, setError, loadFiles]
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
    [api, setIsLoading, setError, loadFiles]
  );

  const handleDownload = useCallback(
    async filesToDownload => {
      const downloadServer = serverContext.currentServer;
      if (!downloadServer) {
        setError('No server selected');
        return;
      }

      const downloadable = filesToDownload.filter(f => !f.isDirectory);
      await Promise.all(
        downloadable.map(async fileToDownload => {
          try {
            const filePath = encodeURIComponent(fileToDownload.path);
            const downloadUrl = `/api/zapi/${downloadServer.protocol}/${downloadServer.hostname}/${downloadServer.port}/filesystem/download?path=${filePath}`;

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
              a.download = fileToDownload.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } else {
              setError(`Failed to download ${fileToDownload.name}: ${response.statusText}`);
            }
          } catch (fetchErr) {
            setError(`Error downloading ${fileToDownload.name}: ${fetchErr.message}`);
          }
        })
      );
    },
    [serverContext, setError]
  );

  const handleFolderChange = useCallback(
    path => {
      const safePath = path || '/';
      setCurrentPath(safePath);
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

  // -- Modal handlers --

  const handleCloseTextEditor = useCallback(() => {
    setShowTextEditor(false);
    setTextEditorFile(null);
  }, [setShowTextEditor, setTextEditorFile]);

  const handleSaveTextFile = useCallback(
    async content => {
      if (!textEditorFile) {
        return;
      }

      setIsLoading(true);
      try {
        const result = await api.updateFileContent(textEditorFile, content);

        if (result.success) {
          setShowTextEditor(false);
          setTextEditorFile(null);
          await loadFiles();
        } else {
          setError(result.message || 'Failed to save file');
        }
      } catch (saveErr) {
        setError(`Failed to save file: ${saveErr.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [api, textEditorFile, setIsLoading, setShowTextEditor, setTextEditorFile, setError, loadFiles]
  );

  const handleArchiveSuccess = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  const handleCloseCreateArchive = useCallback(() => {
    setShowCreateArchiveModal(false);
    setSelectedFilesForArchive([]);
  }, [setShowCreateArchiveModal, setSelectedFilesForArchive]);

  const handleCloseExtractArchive = useCallback(() => {
    setShowExtractArchiveModal(false);
    setArchiveFileForExtract(null);
  }, [setShowExtractArchiveModal, setArchiveFileForExtract]);

  const handleCloseProperties = useCallback(() => {
    setShowPropertiesModal(false);
    setPropertiesFile(null);
  }, [setShowPropertiesModal, setPropertiesFile]);

  const handlePropertiesSuccess = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  return {
    handleCreateFolder,
    handleFileUploading,
    handleFileUploaded,
    handleRename,
    handleDelete,
    handlePaste,
    handleDownload,
    handleFolderChange,
    handleRefresh,
    handleError,
    handleCloseTextEditor,
    handleSaveTextFile,
    handleArchiveSuccess,
    handleCloseCreateArchive,
    handleCloseExtractArchive,
    handleCloseProperties,
    handlePropertiesSuccess,
  };
};

export { useCuboneHandlers };
