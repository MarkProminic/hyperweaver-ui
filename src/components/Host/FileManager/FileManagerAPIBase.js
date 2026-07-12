/**
 * Base API integration layer for Hyperweaver File Manager
 * Handles core file operations with the agent's filesystem endpoints
 */

import { getAgentBasePath } from '../../../api/serverUtils';

import {
  transformFilesToHierarchy,
  transformAgentToFile,
  getPathFromFile,
} from './FileManagerTransforms';

class FileManagerAPIBase {
  constructor(serverContext) {
    this.serverContext = serverContext;
    // The agent-side directory backing the file manager's '/' — discovered
    // from the first browse answer. cubone REQUIRES '/'-rooted paths (root
    // children match `/${name}`, the nav tree roots on ''), but a Windows
    // agent answers drive paths like C:/Users — which can never match, so
    // nothing renders. Listings therefore map onto '/'-rooted display
    // paths and requests map back:
    //   - root '/' + drive-shaped paths (the unset-root Windows drive
    //     listing): drives mount under '/' — C:/ ↔ /C:, C:/Users ↔ /C:/Users
    //   - a named root (file_browser.root, or older builds' CWD answer):
    //     paths are root-relative — <root>/x ↔ /x
    //   - zoneweaver: root '/', real '/'-rooted paths — identity
    this.rootPath = null;
  }

  /** Agent path → the '/'-rooted display path cubone can match. */
  toDisplayPath(agentPath) {
    if (!agentPath) {
      return agentPath;
    }
    const base = this.rootPath ? this.rootPath.replace(/\/+$/u, '') : '';
    if (base === '') {
      return /^[A-Za-z]:/u.test(agentPath) ? `/${agentPath.replace(/\/+$/u, '')}` : agentPath;
    }
    if (agentPath === base || agentPath === this.rootPath) {
      return '/';
    }
    return agentPath.startsWith(`${base}/`) ? agentPath.slice(base.length) : agentPath;
  }

  /** Display path → the agent path the wire takes. */
  toAgentPath(displayPath) {
    const base = this.rootPath ? this.rootPath.replace(/\/+$/u, '') : '';
    if (base === '') {
      // A bare "C:" is drive-RELATIVE on Windows — the drive root keeps
      // its slash on the wire.
      const match = /^\/(?<drive>[A-Za-z]:)(?<rest>\/.*)?$/u.exec(displayPath);
      if (match) {
        return match.groups.rest
          ? `${match.groups.drive}${match.groups.rest}`
          : `${match.groups.drive}/`;
      }
      return displayPath;
    }
    return displayPath === '/' ? this.rootPath : `${base}${displayPath}`;
  }

  /**
   * Get current server from context
   * @returns {Object} Current server object
   */
  getCurrentServer() {
    return this.serverContext.currentServer;
  }

  /** The agent host's OS ('windows'|'darwin'|'linux'|'omnios'|undefined). */
  platform() {
    return this.getCurrentServer()?.capabilities?.platform;
  }

  isWindowsAgent() {
    return this.platform() === 'windows';
  }

  /** POSIX ownership defaults — omitted on Windows agents (uid/gid 400 there). */
  ownershipFields() {
    return this.isWindowsAgent() ? {} : { uid: 1000, gid: 1000 };
  }

  /** Archive-create formats the agent supports — Go's bzip2 is decompress-only. */
  archiveFormats() {
    const formats = [
      { value: 'tar.gz', label: 'tar.gz (Compressed tar archive)' },
      { value: 'tar', label: 'tar (Uncompressed tar archive)' },
      { value: 'zip', label: 'zip (ZIP archive)' },
    ];
    if (
      this.platform() !== 'windows' &&
      this.platform() !== 'darwin' &&
      this.platform() !== 'linux'
    ) {
      formats.push(
        { value: 'tar.bz2', label: 'tar.bz2 (BZip2 compressed tar)' },
        { value: 'gz', label: 'gz (GZip compressed)' }
      );
    }
    return formats;
  }

  /**
   * Make API request through ServerContext
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request body data
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, method = 'GET', data = null, params = null) {
    const server = this.getCurrentServer();
    if (!server) {
      throw new Error('No server selected');
    }

    const { makeAgentRequest } = this.serverContext;
    return await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      endpoint,
      method,
      data,
      params
    );
  }

  /**
   * Browse directory and return files in cubone format. Item paths and the
   * answered `current_path` come back in DISPLAY space ('/'-rooted,
   * relative to the discovered rootPath) so cubone's parent/child matching
   * works on every agent.
   * @param {string} path - Directory path to browse (display space)
   * @param {Object} options - Browse options
   * @returns {Promise<Object>} { items, currentPath }
   */
  async loadFiles(path = '/', options = {}) {
    try {
      const params = {
        path: this.toAgentPath(path),
        show_hidden: options.showHidden || false,
        sort_by: options.sortBy || 'name',
        sort_order: options.sortOrder || 'asc',
      };

      const result = await this.makeRequest('filesystem', 'GET', null, params);

      if (result.success && result.data && result.data.items) {
        // The '/' answer's current_path IS the root every display path is
        // relative to — set it before mapping this response's own items.
        if (this.rootPath === null && path === '/' && result.data.current_path) {
          this.rootPath = result.data.current_path;
        }
        return {
          items: transformFilesToHierarchy(
            result.data.items.map(item => ({ ...item, path: this.toDisplayPath(item.path) }))
          ),
          currentPath: this.toDisplayPath(result.data.current_path) || path,
        };
      }
      return { items: [], currentPath: path };
    } catch {
      return { items: [], currentPath: path };
    }
  }

  /**
   * Create a new folder
   * @param {string} name - Folder name
   * @param {Object} parentFolder - Parent folder object (cubone format)
   * @param {string} currentPath - Current directory path from file manager
   * @returns {Promise<Object>} API response
   */
  async createFolder(name, parentFolder = null, currentPath = '/') {
    try {
      const parentPath = parentFolder ? getPathFromFile(parentFolder) : currentPath;

      const data = {
        path: parentPath,
        name,
        mode: '755',
        ...this.ownershipFields(),
      };

      const result = await this.makeRequest('filesystem/folder', 'POST', data);

      if (result.success && result.data && result.data.item) {
        return {
          success: true,
          file: transformAgentToFile(result.data.item),
        };
      }

      return result;
    } catch (createErr) {
      return { success: false, message: createErr.message };
    }
  }

  /**
   * Rename a file or folder
   * @param {Object} file - File object (cubone format)
   * @param {string} newName - New name
   * @returns {Promise<Object>} API response
   */
  async renameFile(file, newName) {
    try {
      const data = {
        path: getPathFromFile(file),
        new_name: newName,
      };

      const result = await this.makeRequest('filesystem/rename', 'PATCH', data);

      if (result.success && result.data && result.data.item) {
        return {
          success: true,
          file: transformAgentToFile(result.data.item),
        };
      }

      return result;
    } catch (renameErr) {
      return { success: false, message: renameErr.message };
    }
  }

  /**
   * Delete files or folders
   * @param {Array} files - Array of file objects (cubone format)
   * @returns {Promise<Object>} API response
   */
  async deleteFiles(files) {
    try {
      const results = await Promise.all(
        files.map(file =>
          this.makeRequest('filesystem', 'DELETE', {
            path: getPathFromFile(file),
            recursive: file.isDirectory,
            force: false,
          })
        )
      );

      const allSuccess = results.every(r => r.success);
      return {
        success: allSuccess,
        results,
        message: allSuccess ? 'Files deleted successfully' : 'Some files failed to delete',
      };
    } catch (deleteErr) {
      return { success: false, message: deleteErr.message };
    }
  }

  /**
   * Copy files to destination
   * @param {Array} files - Array of file objects (cubone format)
   * @param {Object} destinationFolder - Destination folder object
   * @returns {Promise<Object>} API response with task information
   */
  async copyFiles(files, destinationFolder) {
    try {
      const destinationPath = destinationFolder ? getPathFromFile(destinationFolder) : '/';

      const results = await Promise.all(
        files.map(file =>
          this.makeRequest('filesystem/copy', 'POST', {
            source: getPathFromFile(file),
            destination: `${destinationPath}/${file.name}`,
          })
        )
      );

      const allSuccess = results.every(r => r.success);
      return {
        success: allSuccess,
        results,
        message: allSuccess ? 'Files copied successfully' : 'Some files failed to copy',
        isAsync: true,
        taskIds: results
          .filter(r => r.success)
          .map(r => r.data?.task_id || r.task_id)
          .filter(Boolean),
      };
    } catch (copyErr) {
      return { success: false, message: copyErr.message };
    }
  }

  /**
   * Move files to destination
   * @param {Array} files - Array of file objects (cubone format)
   * @param {Object} destinationFolder - Destination folder object
   * @returns {Promise<Object>} API response with task information
   */
  async moveFiles(files, destinationFolder) {
    try {
      const destinationPath = destinationFolder ? getPathFromFile(destinationFolder) : '/';

      const results = await Promise.all(
        files.map(file =>
          this.makeRequest('filesystem/move', 'PUT', {
            source: getPathFromFile(file),
            destination: `${destinationPath}/${file.name}`,
          })
        )
      );

      const allSuccess = results.every(r => r.success);
      return {
        success: allSuccess,
        results,
        message: allSuccess ? 'Files moved successfully' : 'Some files failed to move',
        isAsync: true,
        taskIds: results
          .filter(r => r.success)
          .map(r => r.data?.task_id || r.task_id)
          .filter(Boolean),
      };
    } catch (moveErr) {
      return { success: false, message: moveErr.message };
    }
  }

  /**
   * Handle copy/move operations
   * @param {Array} files - Array of file objects
   * @param {Object} destinationFolder - Destination folder
   * @param {string} operationType - 'copy' or 'move'
   * @returns {Promise<Object>} Operation result
   */
  async copyMoveFiles(files, destinationFolder, operationType) {
    if (operationType === 'copy') {
      return await this.copyFiles(files, destinationFolder);
    }
    if (operationType === 'move') {
      return await this.moveFiles(files, destinationFolder);
    }
    return { success: false, message: 'Invalid operation type' };
  }

  /**
   * Download files (generates download URLs)
   * @param {Array} files - Array of file objects
   * @returns {Array} Array of download URLs
   */
  getDownloadUrls(files) {
    const server = this.getCurrentServer();
    if (!server) {
      return [];
    }

    const base = getAgentBasePath(server);
    if (base === null) {
      return [];
    }

    return files
      .filter(file => !file.isDirectory)
      .map(file => {
        const path = encodeURIComponent(getPathFromFile(file));
        return `${base}/filesystem/download?path=${path}`;
      });
  }

  /**
   * Get upload configuration for the current server
   * @returns {Object} Upload configuration for cubone
   */
  getUploadConfig() {
    const server = this.getCurrentServer();
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
  }
}

export { FileManagerAPIBase };
