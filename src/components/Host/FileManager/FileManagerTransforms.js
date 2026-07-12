/**
 * Data transformation utilities for converting between Agent format and Cubone file manager format
 */

/**
 * Extract parent path from a file path
 * @param {string} path - File path
 * @returns {string} Parent path
 */
const getParentPath = path => {
  if (!path || path === '/') {
    return '';
  }
  const parts = path.split('/');
  parts.pop(); // Remove the last part (filename)
  return parts.join('/') || '/';
};

/**
 * Transform agent API file object to cubone format
 * @param {Object} hwItem - Agent file item
 * @returns {Object} Cubone compatible file object
 */
export const transformAgentToFile = hwItem => ({
  name: hwItem.name,
  path: hwItem.path, // Contract: forward-slash absolute paths (both agents)
  isDirectory: hwItem.isDirectory,
  updatedAt: hwItem.mtime || hwItem.atime || new Date().toISOString(),
  size: hwItem.size || 0,
  // Additional metadata for internal use
  _hwMetadata: {
    permissions: hwItem.permissions,
    uid: hwItem.uid,
    gid: hwItem.gid,
    mimeType: hwItem.mimeType,
    isBinary: hwItem.isBinary,
    syntax: hwItem.syntax,
  },
});

/**
 * Transform array of agent files to cubone hierarchy format
 * @param {Array} hwFiles - Array of agent API file objects
 * @returns {Array} Array of cubone compatible file objects
 */
export const transformFilesToHierarchy = hwFiles => {
  if (!Array.isArray(hwFiles)) {
    return [];
  }

  return hwFiles.map(file => transformAgentToFile(file));
};

/**
 * Extract path from cubone file object for API calls
 * @param {Object} file - Cubone file object
 * @returns {string} File path
 */
export const getPathFromFile = file => file.path || '/';

/**
 * Build file tree structure for navigation
 * @param {Array} files - Array of file objects
 * @returns {Array} Tree structure for navigation
 */
export const buildFileTree = files => {
  const directories = files.filter(file => file.isDirectory);

  // Group directories by parent path
  const grouped = directories.reduce((acc, dir) => {
    const parentPath = getParentPath(dir.path);
    if (!acc[parentPath]) {
      acc[parentPath] = [];
    }
    acc[parentPath].push(dir);
    return acc;
  }, {});

  // Build tree recursively
  const buildNode = (path = '') => {
    if (!grouped[path]) {
      return [];
    }

    return grouped[path].map(dir => ({
      ...dir,
      children: buildNode(dir.path),
    }));
  };

  return buildNode('');
};

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension (without dot)
 */
export const getFileExtension = filename => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Check if file is likely a text file based on backend metadata
 * @param {Object} file - File object
 * @returns {boolean} True if likely a text file
 */
export const isTextFile = file => {
  if (file.isDirectory) {
    return false;
  }

  // Primary: Use backend's binary analysis (most reliable)
  if (file._hwMetadata && file._hwMetadata.isBinary === false) {
    return true;
  }

  // Secondary: Check MIME type from backend
  if (file._hwMetadata && file._hwMetadata.mimeType) {
    if (file._hwMetadata.mimeType.startsWith('text/')) {
      return true;
    }
    // Additional MIME types that are text-editable
    const textMimeTypes = [
      'application/json',
      'application/javascript',
      'application/xml',
      'application/yaml',
      'application/x-yaml',
      'application/x-sh',
      'application/x-shellscript',
    ];
    if (textMimeTypes.includes(file._hwMetadata.mimeType)) {
      return true;
    }
  }

  // Tertiary: Check if backend detected syntax highlighting
  if (file._hwMetadata && file._hwMetadata.syntax) {
    return true;
  }

  // Fallback: Check for obvious text extensions (minimal list)
  const obviousTextExtensions = ['txt', 'md', 'log'];
  const extension = getFileExtension(file.name);
  if (obviousTextExtensions.includes(extension)) {
    return true;
  }

  // Special case: Shell/config files without extensions but with known patterns
  const textFilePatterns = [
    /^\.(?:bashrc|zshrc|kshrc|profile|bash_profile|zprofile)$/,
    /^(?:bashrc|zshrc|kshrc|profile)$/,
    /^\.(?:vimrc|gitconfig|gitignore)$/,
    /^(?:Dockerfile|Makefile|Rakefile)$/i,
  ];

  if (textFilePatterns.some(pattern => pattern.test(file.name))) {
    return true;
  }

  return false;
};

/**
 * Check if file is an archive that can be extracted
 * @param {Object} file - File object
 * @returns {boolean} True if file is an archive
 */
export const isArchiveFile = file => {
  if (file.isDirectory) {
    return false;
  }

  const archiveExtensions = ['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z'];

  const filename = file.name.toLowerCase();

  // Check for compound extensions like .tar.gz, .tar.bz2
  if (filename.includes('.tar.')) {
    return true;
  }

  // Check single extensions
  const extension = getFileExtension(file.name);
  return archiveExtensions.includes(extension);
};

/**
 * Get archive format from filename for API calls
 * @param {string} filename - Archive filename
 * @returns {string} Archive format for the agent API
 */
export const getArchiveFormat = filename => {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tgz')) {
    return 'tar.gz';
  } else if (lowerName.endsWith('.tar.bz2')) {
    return 'tar.bz2';
  } else if (lowerName.endsWith('.tar')) {
    return 'tar';
  } else if (lowerName.endsWith('.zip')) {
    return 'zip';
  } else if (lowerName.endsWith('.gz')) {
    return 'gz';
  }

  return 'zip'; // Default fallback
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = bytes => {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
};

/**
 * Sort files with directories first, then by name
 * @param {Array} files - Array of files to sort
 * @returns {Array} Sorted array
 */
export const sortFiles = files =>
  [...files].sort((a, b) => {
    // Directories first
    if (a.isDirectory && !b.isDirectory) {
      return -1;
    }
    if (!a.isDirectory && b.isDirectory) {
      return 1;
    }

    // Then alphabetical by name
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
