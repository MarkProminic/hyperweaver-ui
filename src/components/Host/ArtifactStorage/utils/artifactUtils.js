/**
 * Utility functions for artifact storage management
 */

/**
 * Format bytes into human-readable file size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format date string to localized date and time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDateTime = dateString => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch {
    return dateString;
  }
};

/**
 * Get file type information based on extension
 * @param {string} extension - File extension (including dot)
 * @returns {object} File type info with icon class and type
 */
export const getFileTypeInfo = extension => {
  const ext = extension?.toLowerCase();

  if (ext === '.iso') {
    return {
      type: 'iso',
      icon: 'fas fa-compact-disc',
      color: 'text-info',
      tag: 'text-bg-info',
      description: 'ISO disc image',
    };
  }

  if (['.vmdk', '.vhd', '.vhdx', '.qcow2', '.img'].includes(ext)) {
    return {
      type: 'image',
      icon: 'fas fa-hdd',
      color: 'text-warning',
      tag: 'text-bg-warning',
      description: 'Virtual machine disk image',
    };
  }

  return {
    type: 'unknown',
    icon: 'fas fa-file',
    color: 'text-muted',
    tag: 'text-bg-light',
    description: 'Unknown file type',
  };
};

/**
 * Validate file extension for artifact uploads
 * @param {string} filename - Name of the file
 * @returns {object} Validation result
 */
export const validateFileType = filename => {
  const validExtensions = ['.iso', '.img', '.vmdk', '.vhd', '.vhdx', '.qcow2'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  return {
    isValid: validExtensions.includes(extension),
    extension,
    validExtensions,
  };
};

/**
 * Extract filename from URL
 * @param {string} url - URL string
 * @returns {string} Extracted filename or empty string
 */
export const extractFilenameFromUrl = url => {
  try {
    const urlObj = new URL(url);
    const { pathname } = urlObj;
    const filename = pathname.split('/').pop();
    return filename && filename.includes('.') ? filename : '';
  } catch {
    return '';
  }
};

/**
 * Calculate percentage of disk usage
 * @param {string} usageString - Usage percentage string (e.g., "65%")
 * @returns {number} Percentage as number
 */
export const parseUsagePercentage = usageString => {
  if (!usageString) {
    return 0;
  }
  return parseInt(usageString.replace('%', '')) || 0;
};

/**
 * Get color class for disk usage percentage
 * @param {number} percentage - Usage percentage
 * @returns {string} Bootstrap background color class
 */
export const getDiskUsageColor = percentage => {
  if (percentage >= 90) {
    return 'bg-danger';
  }
  if (percentage >= 75) {
    return 'bg-warning';
  }
  return 'bg-success';
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {object} Validation result
 */
export const validateUrl = url => {
  try {
    const urlObj = new URL(url);
    return {
      isValid: ['http:', 'https:'].includes(urlObj.protocol),
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
    };
  } catch {
    return {
      isValid: false,
      protocol: null,
      hostname: null,
    };
  }
};

/**
 * Generate download progress message
 * @param {object} taskStatus - Task status object
 * @returns {string} Human-readable progress message
 */
export const getDownloadProgressMessage = taskStatus => {
  if (!taskStatus) {
    return 'Unknown status';
  }

  switch (taskStatus.status) {
    case 'queued':
      return 'Download queued...';
    case 'running':
      return 'Downloading...';
    case 'completed':
      return 'Download completed successfully';
    case 'failed':
      return `Download failed: ${taskStatus.error_message || 'Unknown error'}`;
    default:
      return `Status: ${taskStatus.status}`;
  }
};

/**
 * Get checksum status information
 * @param {boolean|null} verified - Checksum verification result
 * @returns {object} Status information with icon and color
 */
export const getChecksumStatus = verified => {
  if (verified === true) {
    return {
      icon: 'fas fa-check-circle',
      color: 'text-success',
      text: 'Verified',
      tag: 'text-bg-success',
    };
  }

  if (verified === false) {
    return {
      icon: 'fas fa-times-circle',
      color: 'text-danger',
      text: 'Mismatch',
      tag: 'text-bg-danger',
    };
  }

  return {
    icon: 'fas fa-question-circle',
    color: 'text-muted',
    text: 'Not verified',
    tag: 'text-bg-light',
  };
};

/**
 * Build API query parameters for artifact filtering
 * @param {object} filters - Filter object
 * @param {object} pagination - Pagination object
 * @returns {object} Query parameters object
 */
export const buildArtifactQuery = (filters, pagination) => {
  const params = {};

  if (pagination) {
    if (pagination.limit) {
      params.limit = pagination.limit;
    }
    if (pagination.offset) {
      params.offset = pagination.offset;
    }
  }

  if (filters) {
    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.storage_location) {
      params.storage_location_id = filters.storage_location;
    }
    if (filters.sort_by) {
      params.sort_by = filters.sort_by;
    }
    if (filters.sort_order) {
      params.sort_order = filters.sort_order;
    }
  }

  return params;
};

/**
 * Calculate total size of selected files
 * @param {FileList|Array} files - Files to calculate total size for
 * @returns {number} Total size in bytes
 */
export const calculateTotalFileSize = files => {
  if (!files) {
    return 0;
  }

  return Array.from(files).reduce((total, file) => total + file.size, 0);
};

/**
 * Generate unique task tracking ID
 * @returns {string} Unique ID string
 */
export const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Check if storage path is suitable for file type
 * @param {object} storagePath - Storage path object
 * @param {string} fileExtension - File extension
 * @returns {boolean} Whether storage path is suitable
 */
export const isStoragePathSuitable = (storagePath, fileExtension) => {
  if (!storagePath || !fileExtension) {
    return false;
  }

  const fileTypeInfo = getFileTypeInfo(fileExtension);

  // ISO files should go to ISO storage, VM images to image storage
  if (fileTypeInfo.type === 'iso' && storagePath.type === 'iso') {
    return true;
  }
  if (fileTypeInfo.type === 'image' && storagePath.type === 'image') {
    return true;
  }

  // Allow any type if storage path is generic
  return storagePath.type === 'artifact';
};
