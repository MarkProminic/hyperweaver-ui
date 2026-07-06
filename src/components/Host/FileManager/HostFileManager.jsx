import { FileManager } from '@cubone/react-file-manager';
import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import '@cubone/react-file-manager/dist/style.css';

import { getAgentBasePath } from '../../../api/serverUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useServers } from '../../../contexts/ServerContext';
import { canManageHosts, canViewHosts } from '../../../utils/permissions';

import ArchiveModals from './ArchiveModals';
import { AgentFileManagerAPI } from './FileManagerAPI';
import FilePropertiesModal from './FilePropertiesModal';
import HostFileManagerActionBar from './HostFileManagerActionBar';
import HostFileManagerPreview from './HostFileManagerPreview';
import TextFileEditor from './TextFileEditor';
import { useHostFileManagerHandlers } from './useHostFileManagerHandlers';
import { useHostFileManagerModals } from './useHostFileManagerModals';
import './HostFileManager.scss';

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

  // File loading and cubone event handlers
  const {
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
  } = useHostFileManagerHandlers({
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
  });

  // Text editor, archive, and properties modal handlers
  const {
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
  } = useHostFileManagerModals({
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
  });

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

  // Upload configuration (mode-aware agent base path)
  const fileUploadConfig = useMemo(() => {
    if (!server) {
      return null;
    }

    const base = getAgentBasePath(server);
    if (base === null) {
      return null;
    }

    return {
      url: `${base}/filesystem/upload`,
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
        <HostFileManagerActionBar
          currentPath={currentPath}
          files={files}
          currentlySelectedFiles={currentlySelectedFiles}
          onCreateArchive={handleCreateArchive}
          setError={setError}
        />
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
          <HostFileManagerPreview
            file={file}
            onEditText={f => {
              setTextEditorFile(f);
              setShowTextEditor(true);
            }}
            onExtract={handleExtractArchive}
            canManage={canManageHosts(user?.role)}
            onShowProperties={handleShowProperties}
          />
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
