import { FileManager } from '@cubone/react-file-manager';
import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import '@cubone/react-file-manager/dist/style.css';

import { useAuth } from '../../../contexts/AuthContext';
import { useServers } from '../../../contexts/ServerContext';
import { canManageHosts, canViewHosts } from '../../../utils/permissions';

import CustomActions from './CustomActions';
import { useExtendedHandlers } from './ExtendedFileManagerHandlers';
import { AgentFileManagerAPI } from './FileManagerAPI';
import FilePreviewPanel from './FilePreviewPanel';
import './HostFileManager.scss';

/**
 * Extended File Manager Component
 * Properly integrates with cubone's internal systems for context menu and actions
 */
const ExtendedFileManager = ({ server }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [error, setError] = useState('');
  const [directoryCache, setDirectoryCache] = useState(new Map());

  const { user } = useAuth();
  const serverContext = useServers();

  // Initialize API instance
  const api = useMemo(() => new AgentFileManagerAPI(serverContext), [serverContext]);

  // All cubone event handlers
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
    handleError,
  } = useExtendedHandlers({
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
      edit: canManageHosts(user?.role),
      archive: canManageHosts(user?.role),
      properties: canManageHosts(user?.role),
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
  const themeConfig = useMemo(
    () => ({
      primaryColor: '#ff6600',
      fontFamily: 'Nunito Sans, sans-serif',
    }),
    []
  );

  // Don't render if no server is selected
  if (!server) {
    return (
      <div className="alert alert-info">
        <p>Please select a server from the navbar to access the file manager.</p>
      </div>
    );
  }

  return (
    <div className="host-file-manager extended">
      {/* Error notification */}
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Extended File Manager with Custom Actions */}
      <FileManager
        files={files}
        fileUploadConfig={fileUploadConfig}
        isLoading={isLoading}
        onCreateFolder={handleCreateFolder}
        onFileUploading={handleFileUploading}
        onFileUploaded={handleFileUploaded}
        onPaste={handlePaste}
        onRename={handleRename}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
        onFileOpen={handleFileOpen}
        onFolderChange={handleFolderChange}
        onError={handleError}
        layout="grid"
        enableFilePreview
        filePreviewComponent={file => <FilePreviewPanel file={file} userRole={user?.role} />}
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

      {/* Custom Actions Integration */}
      <CustomActions
        api={api}
        currentPath={currentPath}
        files={files}
        loadFiles={loadFiles}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        setError={setError}
        permissions={permissions}
      />
    </div>
  );
};

ExtendedFileManager.propTypes = {
  server: PropTypes.object,
};

export default ExtendedFileManager;
