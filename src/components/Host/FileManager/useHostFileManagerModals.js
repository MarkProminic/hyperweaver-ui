/**
 * Modal handlers for HostFileManager
 * Custom hook providing text editor, archive, and properties modal handlers
 */

/**
 * Custom hook for HostFileManager modal handlers
 * @param {Object} config - Configuration with state, setters, API, and loadFiles
 * @returns {Object} Modal handler functions
 */
const useHostFileManagerModals = ({
  api,
  loadFiles,
  setIsLoading,
  setError,
  textEditorFile,
  setTextEditorFile,
  setShowTextEditor,
  setShowCreateArchiveModal,
  setSelectedFilesForArchive,
  setShowExtractArchiveModal,
  setArchiveFileForExtract,
  setShowPropertiesModal,
  setPropertiesFile,
}) => {
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

  return {
    handleCloseTextEditor,
    handleSaveTextFile,
    handleCreateArchive,
    handleExtractArchive,
    handleArchiveSuccess,
    handleCloseCreateArchive,
    handleCloseExtractArchive,
    handleShowProperties,
    handleCloseProperties,
    handlePropertiesSuccess,
  };
};

export { useHostFileManagerModals };
