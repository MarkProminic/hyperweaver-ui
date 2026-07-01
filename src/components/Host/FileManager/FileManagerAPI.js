/**
 * Extended API integration layer for Hyperweaver File Manager
 * Handles archive operations, permissions, system info, and file content
 * Core CRUD operations are in FileManagerAPIBase.js
 */

import { FileManagerAPIBase } from './FileManagerAPIBase';
import { transformAgentToFile, getPathFromFile } from './FileManagerTransforms';

class AgentFileManagerAPI extends FileManagerAPIBase {
  /**
   * Get file content for text files
   * @param {Object} file - File object
   * @returns {Promise<Object>} File content response
   */
  async getFileContent(file) {
    if (file.isDirectory) {
      return { success: false, message: 'Cannot read directory content' };
    }

    try {
      const params = { path: getPathFromFile(file) };
      return await this.makeRequest('filesystem/content', 'GET', null, params);
    } catch (contentErr) {
      return { success: false, message: contentErr.message };
    }
  }

  /**
   * Update file content for text files
   * @param {Object} file - File object
   * @param {string} content - New file content
   * @returns {Promise<Object>} Update response
   */
  async updateFileContent(file, content) {
    if (file.isDirectory) {
      return { success: false, message: 'Cannot write to directory' };
    }

    try {
      const data = {
        path: getPathFromFile(file),
        content,
        backup: false,
        uid: 1000,
        gid: 1000,
        mode: '644',
      };

      return await this.makeRequest('filesystem/content', 'PUT', data);
    } catch (updateErr) {
      return { success: false, message: updateErr.message };
    }
  }

  /**
   * Create archive from files
   * @param {Array} files - Files to archive
   * @param {string} archivePath - Archive destination path
   * @param {string} format - Archive format (zip, tar.gz, etc.)
   * @returns {Promise<Object>} Archive creation response
   */
  async createArchive(files, archivePath, format = 'tar.gz') {
    try {
      const sources = files.map(file => getPathFromFile(file));

      const data = {
        sources,
        archive_path: archivePath,
        format,
      };

      return await this.makeRequest('filesystem/archive/create', 'POST', data);
    } catch (archiveErr) {
      return { success: false, message: archiveErr.message };
    }
  }

  /**
   * Extract archive
   * @param {Object} archiveFile - Archive file object
   * @param {string} extractPath - Extraction destination path
   * @returns {Promise<Object>} Extraction response
   */
  async extractArchive(archiveFile, extractPath) {
    try {
      const data = {
        archive_path: getPathFromFile(archiveFile),
        extract_path: extractPath,
      };

      return await this.makeRequest('filesystem/archive/extract', 'POST', data);
    } catch (extractErr) {
      return { success: false, message: extractErr.message };
    }
  }

  /**
   * Check task status for async operations
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async getTaskStatus(taskId) {
    try {
      return await this.makeRequest(`tasks/${taskId}`, 'GET');
    } catch (taskErr) {
      return { success: false, message: taskErr.message };
    }
  }

  /**
   * Get file manager statistics
   * @param {string} path - Path to get stats for
   * @returns {Promise<Object>} Statistics response
   */
  async getStats(path = '/') {
    try {
      const params = { path };
      return await this.makeRequest('filesystem/stats', 'GET', null, params);
    } catch (statsErr) {
      return { success: false, message: statsErr.message };
    }
  }

  /**
   * Get current API user information
   * @returns {Promise<Object>} User info response
   */
  async getUserInfo() {
    try {
      return await this.makeRequest('system/user-info', 'GET');
    } catch (userErr) {
      return { success: false, message: userErr.message };
    }
  }

  /**
   * Get system users for dropdown selection
   * @returns {Promise<Object>} Users list response
   */
  async getSystemUsers() {
    try {
      return await this.makeRequest('system/users', 'GET');
    } catch (usersErr) {
      return { success: false, message: usersErr.message };
    }
  }

  /**
   * Get system groups for dropdown selection
   * @returns {Promise<Object>} Groups list response
   */
  async getSystemGroups() {
    try {
      return await this.makeRequest('system/groups', 'GET');
    } catch (groupsErr) {
      return { success: false, message: groupsErr.message };
    }
  }

  /**
   * Update file/directory permissions and ownership
   * @param {Object} file - File object
   * @param {Object} permissionChanges - Permission changes to apply
   * @returns {Promise<Object>} Update response
   */
  async updatePermissions(file, permissionChanges) {
    try {
      const data = {
        path: getPathFromFile(file),
        ...permissionChanges,
        recursive: permissionChanges.recursive || false,
      };

      const result = await this.makeRequest('filesystem/permissions', 'PATCH', data);

      if (result.success && result.data && result.data.item) {
        return {
          success: true,
          file: transformAgentToFile(result.data.item),
        };
      }

      return result;
    } catch (permErr) {
      return { success: false, message: permErr.message };
    }
  }
}

export { AgentFileManagerAPI };
export default AgentFileManagerAPI;
