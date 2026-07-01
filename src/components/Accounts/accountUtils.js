/**
 * Get notification CSS class based on message content
 * @param {string} msg - Notification message
 * @returns {string} Bootstrap alert contextual class
 */
export const getNotificationClass = msg => {
  if (msg.includes('successfully')) {
    return 'alert-success';
  }
  if (msg.includes('Error') || msg.includes('Failed')) {
    return 'alert-danger';
  }
  return 'alert-warning';
};

/**
 * Get role badge color class
 * @param {string} role - User role
 * @returns {string} Bootstrap badge contextual class
 */
export const getRoleBadgeClass = role => {
  switch (role) {
    case 'super-admin':
      return 'text-bg-danger';
    case 'admin':
      return 'text-bg-warning';
    case 'user':
      return 'text-bg-success';
    default:
      return 'text-bg-info';
  }
};

/**
 * Check if current user can modify target user
 * @param {object} currentUser - Current authenticated user
 * @param {object} targetUser - User to check permissions for
 * @returns {boolean} Whether current user can modify target user
 */
export const canModifyUser = (currentUser, targetUser) => {
  if (targetUser.id === currentUser.id) {
    return false;
  }
  if (currentUser.role === 'super-admin') {
    return targetUser.role !== 'super-admin';
  }
  if (currentUser.role === 'admin') {
    return targetUser.role === 'user';
  }
  return false;
};

/**
 * Check if current user can edit organization
 * @param {object} currentUser - Current authenticated user
 * @param {object} org - Organization to check
 * @returns {boolean} Whether current user can edit organization
 */
export const canEditOrg = (currentUser, org) => {
  if (currentUser.role === 'super-admin') {
    return true;
  }
  if (currentUser.role === 'admin') {
    const userOrgId = currentUser.organizationId || currentUser.organization_id;
    return userOrgId && parseInt(userOrgId) === parseInt(org.id);
  }
  return false;
};
