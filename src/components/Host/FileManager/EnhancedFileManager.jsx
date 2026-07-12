import { FileManager } from '@cubone/react-file-manager';
import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import '@cubone/react-file-manager/dist/style.css';

import { getAgentBasePath } from '../../../api/serverUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useServers } from '../../../contexts/ServerContext';
import { canManageHosts, canViewHosts } from '../../../utils/permissions';

import ArchiveModals from './ArchiveModals';
import { useCuboneExtensions } from './CuboneExtensions';
import { AgentFileManagerAPI } from './FileManagerAPI';
import { useCuboneHandlers } from './FileManagerHandlers';
import { isTextFile, isArchiveFile } from './FileManagerTransforms';
import FilePropertiesModal from './FilePropertiesModal';
import TextFileEditor from './TextFileEditor';
import './HostFileManager.scss';

/**
 * Enhanced File Manager Component
 * Implements the PR's custom actions functionality locally
 */
const EnhancedFileManager = ({ server }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [error, setError] = useState('');
  // Pure fetch cache, never rendered — a ref, NOT state. As state, every cache write gave
  // loadFiles a new identity, re-fired the load effect, and every navigation double-loaded
  // (spinner flicker). Mutating a ref keeps loadFiles stable.
  const directoryCacheRef = useRef(new Map());

  // Modal states for custom actions
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textEditorFile, setTextEditorFile] = useState(null);
  const [showCreateArchiveModal, setShowCreateArchiveModal] = useState(false);
  const [showExtractArchiveModal, setShowExtractArchiveModal] = useState(false);
  const [selectedFilesForArchive, setSelectedFilesForArchive] = useState([]);
  const [archiveFileForExtract, setArchiveFileForExtract] = useState(null);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertiesFile, setPropertiesFile] = useState(null);

  const { user } = useAuth();
  const serverContext = useServers();

  // Initialize API instance. Built from ONLY the two context fields the API class reads
  // (currentServer + the module-stable makeAgentRequest) — keying the memo on the whole
  // context object made the API (and everything downstream: loadFiles, the load effect)
  // churn and reload the listing whenever the provider re-rendered.
  const { currentServer: apiServer, makeAgentRequest: apiRequest } = serverContext;
  const api = useMemo(
    () => new AgentFileManagerAPI({ currentServer: apiServer, makeAgentRequest: apiRequest }),
    [apiServer, apiRequest]
  );

  // Load files with navigation support
  const loadFiles = useCallback(
    async (path = currentPath) => {
      if (!server) {
        setFiles([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        // Load current directory files — loadFiles answers {items, currentPath}
        const { items: currentFiles, currentPath: answeredPath } = await api.loadFiles(path);

        // Maintain root directories for navigation
        let cachedDirectories = directoryCacheRef.current.get('/') || [];

        if (cachedDirectories.length === 0) {
          try {
            const { items: rootFiles } = await api.loadFiles('/');
            cachedDirectories = rootFiles.filter(file => file.isDirectory);
            directoryCacheRef.current.set('/', cachedDirectories);
          } catch {
            // Root directory loading failed, continue without it
          }
        }

        // Build comprehensive file list for cubone navigation
        const combinedFiles = [...currentFiles];

        // Add cached root directories if not at root
        if (path !== '/') {
          cachedDirectories.forEach(dir => {
            if (!combinedFiles.some(f => f.path === dir.path)) {
              combinedFiles.push(dir);
            }
          });
        }

        // Load parent directories for subdirectory navigation
        if (path !== '/') {
          const pathParts = path.split('/').filter(Boolean);

          // Build parent path list
          const parentPaths = [];
          pathParts.slice(0, -1).reduce((accPath, part) => {
            const fullPath = `${accPath}/${part}`;
            parentPaths.push(fullPath);
            return fullPath;
          }, '');

          // Load uncached parent directories in parallel
          const parentDirResults = await Promise.all(
            parentPaths.map(async parentPath => {
              const cached = directoryCacheRef.current.get(parentPath);
              if (cached) {
                return { path: parentPath, dirs: cached, isNew: false };
              }
              try {
                const { items: parentFiles } = await api.loadFiles(parentPath);
                const dirs = parentFiles.filter(f => f.isDirectory);
                return { path: parentPath, dirs, isNew: true };
              } catch {
                return { path: parentPath, dirs: [], isNew: false };
              }
            })
          );

          // Update cache for newly loaded directories
          parentDirResults
            .filter(r => r.isNew)
            .forEach(entry => {
              directoryCacheRef.current.set(entry.path, entry.dirs);
            });

          // Add all parent directories to combined files
          parentDirResults.forEach(result => {
            result.dirs.forEach(dir => {
              if (!combinedFiles.some(f => f.path === dir.path)) {
                combinedFiles.push(dir);
              }
            });
          });
        }

        setFiles(combinedFiles);
        // Track the RESOLVED path the agent answered — '/' resolves to a
        // drive root (C:/) on Windows agents, and cubone's content pane
        // only matches items against the path it was told is current.
        if (answeredPath && answeredPath !== path) {
          setCurrentPath(answeredPath);
        }
      } catch (loadErr) {
        setError(`Failed to load files: ${loadErr.message}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [server, currentPath, api]
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
    const primaryColor = '#ff6600';
    const fontFamily = 'Nunito Sans, sans-serif';
    return { primaryColor, fontFamily };
  }, []);

  // Custom action handlers for the config.actions system
  const handleEditFile = useCallback(file => {
    if (isTextFile(file)) {
      setTextEditorFile(file);
      setShowTextEditor(true);
    } else {
      setError('This file cannot be edited as text');
    }
  }, []);

  const handleCreateArchive = useCallback(selectedFiles => {
    setSelectedFilesForArchive(Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles]);
    setShowCreateArchiveModal(true);
  }, []);

  const handleExtractArchive = useCallback(file => {
    if (isArchiveFile(file)) {
      setArchiveFileForExtract(file);
      setShowExtractArchiveModal(true);
    } else {
      setError('This file cannot be extracted');
    }
  }, []);

  const handleShowProperties = useCallback(file => {
    setPropertiesFile(file);
    setShowPropertiesModal(true);
  }, []);

  // Custom actions configuration following the PR pattern
  const customActions = useMemo(
    () => [
      {
        title: 'Open',
        key: 'open',
        onClick: file => {
          if (file.isDirectory) {
            setCurrentPath(file.path);
          } else if (isTextFile(file)) {
            handleEditFile(file);
          }
        },
        showToolbar: false,
        showMenu: true,
        icon: null,
      },
      {
        title: 'Edit File',
        key: 'edit',
        onClick: handleEditFile,
        showToolbar: false,
        showMenu: true,
        multiple: false,
        icon: <i className="fas fa-edit" />,
        hidden: false,
      },
      {
        title: 'Create Archive',
        key: 'createArchive',
        onClick: handleCreateArchive,
        showToolbar: true,
        showMenu: true,
        multiple: true,
        icon: <i className="fas fa-file-archive" />,
        hidden: false,
      },
      {
        title: 'Extract Archive',
        key: 'extractArchive',
        onClick: handleExtractArchive,
        showToolbar: false,
        showMenu: true,
        multiple: false,
        icon: <i className="fas fa-expand-arrows-alt" />,
        hidden: false,
      },
      {
        title: 'Properties',
        key: 'properties',
        onClick: handleShowProperties,
        showToolbar: false,
        showMenu: true,
        multiple: false,
        icon: <i className="fas fa-cog" />,
        hidden: false,
      },
    ],
    [handleEditFile, handleCreateArchive, handleExtractArchive, handleShowProperties]
  );

  // Get all handlers from custom hook
  const {
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
  } = useCuboneHandlers({
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
  });

  // Custom action handlers for cubone extensions
  const customActionHandlers = useMemo(
    () => ({
      handleEditFile,
      handleCreateArchive,
      handleExtractArchive,
      handleShowProperties,
    }),
    [handleEditFile, handleCreateArchive, handleExtractArchive, handleShowProperties]
  );

  // Extended permissions for custom actions
  const extendedPermissions = useMemo(
    () => ({
      ...permissions,
      edit: canManageHosts(user?.role),
      archive: canManageHosts(user?.role),
      properties: canManageHosts(user?.role),
    }),
    [permissions, user?.role]
  );

  // Use cubone extensions to add context menu and toolbar functionality
  useCuboneExtensions(files, extendedPermissions, customActionHandlers);

  // Don't render if no server is selected
  if (!server) {
    return (
      <div className="alert alert-info">
        <p>Please select a server from the navbar to access the file manager.</p>
      </div>
    );
  }

  return (
    <div className="host-file-manager enhanced">
      {/* Error notification */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* File Manager with Config Actions */}
      <FileManager
        files={files}
        fileUploadConfig={fileUploadConfig}
        isLoading={isLoading}
        config={{
          actions: customActions,
        }}
        onCreateFolder={handleCreateFolder}
        onFileUploading={handleFileUploading}
        onFileUploaded={handleFileUploaded}
        onPaste={handlePaste}
        onRename={handleRename}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        onFolderChange={handleFolderChange}
        onError={handleError}
        layout="grid"
        enableFilePreview
        maxFileSize={50 * 1024 * 1024 * 1024}
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

      {/* Custom Action Modals */}
      {showTextEditor && textEditorFile && (
        <TextFileEditor
          file={textEditorFile}
          api={api}
          onClose={handleCloseTextEditor}
          onSave={handleSaveTextFile}
        />
      )}

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

EnhancedFileManager.propTypes = {
  server: PropTypes.object,
};

export default EnhancedFileManager;
