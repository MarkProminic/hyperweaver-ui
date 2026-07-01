// Permission utility functions for Hyperweaver application

// Permission levels (higher number = more permissions)
export const PERMISSION_LEVELS = {
  user: 1,
  admin: 2,
  'super-admin': 3,
};

// Permission checker functions
export const hasMinPermission = (userRole, minLevel) =>
  PERMISSION_LEVELS[userRole] >= PERMISSION_LEVELS[minLevel];

// Zone Management Permissions
export const canControlZones = userRole => hasMinPermission(userRole, 'user'); // Users can control zones
export const canAccessZoneConsole = userRole => hasMinPermission(userRole, 'user'); // Users can access console
export const canStartStopZones = userRole => hasMinPermission(userRole, 'user'); // Users can start/stop zones
export const canRestartZones = userRole => hasMinPermission(userRole, 'user'); // Users can restart zones
export const canDestroyZones = userRole => hasMinPermission(userRole, 'admin'); // Only admins can destroy zones

// Host Management Permissions
export const canViewHosts = userRole => hasMinPermission(userRole, 'user'); // Users can view hosts (read-only)
export const canControlHosts = userRole => hasMinPermission(userRole, 'admin'); // Only admins can control hosts
export const canPowerOffHosts = userRole => hasMinPermission(userRole, 'admin'); // Only admins can power off hosts
export const canRegisterHosts = userRole => hasMinPermission(userRole, 'admin'); // Only admins can register hosts
export const canManageHosts = userRole => hasMinPermission(userRole, 'admin'); // Only admins can manage hosts

// User Management Permissions
export const canViewUsers = userRole => hasMinPermission(userRole, 'admin'); // Admins can view users
export const canManageUsers = userRole => hasMinPermission(userRole, 'admin'); // Admins can manage users
export const canManageSuperAdmins = userRole => userRole === 'super-admin'; // Only super-admins can manage super-admins

// System Settings Permissions
export const canManageSettings = userRole => userRole === 'super-admin'; // Only super-admins can manage system settings
export const canManageApiKeys = userRole => hasMinPermission(userRole, 'admin'); // Admins can manage API keys

// General Access Permissions
export const canViewStats = userRole => hasMinPermission(userRole, 'user'); // All users can view stats
export const canViewDashboard = userRole => hasMinPermission(userRole, 'user'); // All users can view dashboard
