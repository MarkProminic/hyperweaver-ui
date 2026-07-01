import axios from 'axios';
import { useState, useEffect, useMemo } from 'react';

import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for Accounts page state management and handlers
 * Manages users, organizations, and invitation state
 * @returns {object} All state and handler functions
 */
export const useAccountsData = () => {
  const { user } = useAuth();

  // User management state
  const [allUsers, setAllUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [viewScope, setViewScope] = useState('organization');
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Tab and organizations state
  const [activeTab, setActiveTab] = useState('users');
  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgMsg, setOrgMsg] = useState('');
  const [deleteModalOrg, setDeleteModalOrg] = useState(null);
  const [deleteOrgConfirmText, setDeleteOrgConfirmText] = useState('');

  // Organization editing state
  const [editingOrg, setEditingOrg] = useState(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDescription, setEditOrgDescription] = useState('');

  // Invitation state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOrganizationId, setInviteOrganizationId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  // Confirmation modals state
  const [confirmModalUser, setConfirmModalUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState('');
  const [confirmModalOrg, setConfirmModalOrg] = useState(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [msg]);

  useEffect(() => {
    if (orgMsg) {
      const timer = setTimeout(() => {
        setOrgMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [orgMsg]);

  useEffect(() => {
    if (inviteMsg) {
      const timer = setTimeout(() => {
        setInviteMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [inviteMsg]);

  /**
   * Load all organizations from the API
   */
  const loadOrganizations = async () => {
    try {
      setOrgLoading(true);
      const response = await axios.get('/api/organizations');
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        setOrgMsg('Failed to load organizations');
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setOrgMsg(`Error loading organizations: ${error.response?.data?.message || error.message}`);
    } finally {
      setOrgLoading(false);
    }
  };

  /**
   * Load all users from the API
   */
  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      if (response.data.success) {
        setAllUsers(response.data.users);
        setViewScope(response.data.viewScope || 'organization');
      } else {
        setMsg('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMsg(`Error loading users: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'users') {
      loadAllUsers();
    } else if (activeTab === 'organizations' && user?.role === 'super-admin') {
      loadOrganizations();
    }
  }, [activeTab, user?.role]);

  /**
   * Handle role change for a user
   * @param {number} userId - User ID to update
   * @param {string} role - New role to assign
   */
  const handleRoleChange = async (userId, role) => {
    try {
      setLoading(true);
      setMsg('');

      const response = await axios.put('/api/admin/users/role', {
        userId,
        newRole: role,
      });

      if (response.data.success) {
        setMsg(`User role updated to ${role} successfully!`);
        setEditingUser(null);
        setNewRole('');
        await loadAllUsers();
      } else {
        setMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setMsg(`Error updating role: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user deactivation
   * @param {number} userId - User ID to deactivate
   */
  const handleDeactivateUser = userId => {
    console.log('Deactivate button clicked for user:', userId);
    const targetUser = allUsers.find(u => u.id === userId);
    setConfirmModalUser(targetUser);
    setConfirmAction('deactivate');
  };

  /**
   * Handle user reactivation
   * @param {number} userId - User ID to reactivate
   */
  const handleReactivateUser = userId => {
    console.log('Reactivate button clicked for user:', userId);
    const targetUser = allUsers.find(u => u.id === userId);
    setConfirmModalUser(targetUser);
    setConfirmAction('reactivate');
  };

  /**
   * Confirm and execute user action (deactivate/reactivate)
   */
  const confirmUserAction = async () => {
    if (!confirmModalUser || !confirmAction) {
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      let response;
      if (confirmAction === 'deactivate') {
        console.log('Sending deactivation request...');
        response = await axios.delete(`/api/admin/users/${confirmModalUser.id}`);
      } else if (confirmAction === 'reactivate') {
        console.log('Sending reactivation request...');
        response = await axios.put(`/api/admin/users/${confirmModalUser.id}/reactivate`);
      }

      console.log('Action response:', response.data);

      if (response.data.success) {
        setMsg(`User ${confirmAction}d successfully!`);
        setConfirmModalUser(null);
        setConfirmAction('');
        await loadAllUsers();
      } else {
        setMsg(response.data.message);
      }
    } catch (error) {
      console.error(`Error ${confirmAction}ing user:`, error);
      setMsg(`Error ${confirmAction}ing user: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close user confirmation modal
   */
  const closeConfirmModal = () => {
    setConfirmModalUser(null);
    setConfirmAction('');
  };

  /**
   * Handle permanent user deletion (super-admin only)
   */
  const handleDeleteUser = async () => {
    if (!deleteModalUser) {
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      const response = await axios.delete(`/api/admin/users/${deleteModalUser.id}/delete`);

      if (response.data.success) {
        setMsg('User permanently deleted successfully!');
        setDeleteModalUser(null);
        setDeleteConfirmText('');
        await loadAllUsers();
      } else {
        setMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMsg(`Error deleting user: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle organization deactivation
   * @param {number} orgId - Organization ID to deactivate
   */
  const handleDeactivateOrg = orgId => {
    const org = organizations.find(o => o.id === orgId);
    setConfirmModalOrg(org);
  };

  /**
   * Pre-calculate organization permissions
   */
  const orgPermissions = useMemo(() => {
    const permissions = {};

    organizations.forEach(org => {
      if (user.role === 'super-admin') {
        const userOrgId = user.organizationId || user.organization_id;
        const normalizedUserOrgId = userOrgId ? parseInt(userOrgId) : null;
        const normalizedOrgId = parseInt(org.id);

        if (normalizedUserOrgId && normalizedUserOrgId === normalizedOrgId) {
          permissions[org.id] = false;
        } else if (!normalizedUserOrgId && org.name === 'Default Organization') {
          permissions[org.id] = false;
        } else {
          permissions[org.id] = true;
        }
      } else {
        permissions[org.id] = false;
      }
    });

    return permissions;
  }, [organizations, user]);

  /**
   * Check if current user can modify organization
   * @param {object} org - Organization to check
   * @returns {boolean} Whether current user can modify organization
   */
  const canModifyOrg = org => orgPermissions[org.id] || false;

  /**
   * Confirm and execute organization deactivation
   */
  const confirmOrgAction = async () => {
    if (!confirmModalOrg) {
      return;
    }

    try {
      setOrgLoading(true);
      setOrgMsg('');

      const response = await axios.put(`/api/organizations/${confirmModalOrg.id}/deactivate`);

      if (response.data.success) {
        setOrgMsg('Organization deactivated successfully!');
        setConfirmModalOrg(null);
        await loadOrganizations();
      } else {
        setOrgMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error deactivating organization:', error);
      setOrgMsg(
        `Error deactivating organization: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setOrgLoading(false);
    }
  };

  /**
   * Close organization confirmation modal
   */
  const closeConfirmOrgModal = () => {
    setConfirmModalOrg(null);
  };

  /**
   * Handle permanent organization deletion (super-admin only)
   */
  const handleDeleteOrg = async () => {
    if (!deleteModalOrg) {
      return;
    }

    try {
      setOrgLoading(true);
      setOrgMsg('');

      const response = await axios.delete(`/api/organizations/${deleteModalOrg.id}`);

      if (response.data.success) {
        setOrgMsg('Organization permanently deleted successfully!');
        setDeleteModalOrg(null);
        setDeleteOrgConfirmText('');
        await loadOrganizations();
      } else {
        setOrgMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      setOrgMsg(`Error deleting organization: ${error.response?.data?.message || error.message}`);
    } finally {
      setOrgLoading(false);
    }
  };

  /**
   * Close delete user modal
   */
  const closeDeleteModal = () => {
    setDeleteModalUser(null);
    setDeleteConfirmText('');
  };

  /**
   * Close delete organization modal
   */
  const closeDeleteOrgModal = () => {
    setDeleteModalOrg(null);
    setDeleteOrgConfirmText('');
  };

  /**
   * Handle start editing organization
   * @param {object} org - Organization to edit
   */
  const handleEditOrg = org => {
    setEditingOrg(org.id);
    setEditOrgName(org.name);
    setEditOrgDescription(org.description || '');
  };

  /**
   * Handle cancel editing organization
   */
  const handleCancelEditOrg = () => {
    setEditingOrg(null);
    setEditOrgName('');
    setEditOrgDescription('');
  };

  /**
   * Handle save organization changes
   * @param {number} orgId - Organization ID to update
   */
  const handleSaveOrgChanges = async orgId => {
    try {
      setOrgLoading(true);
      setOrgMsg('');

      const updates = {};
      if (
        editOrgName.trim() &&
        editOrgName.trim() !== organizations.find(o => o.id === orgId)?.name
      ) {
        updates.name = editOrgName.trim();
      }
      if (editOrgDescription !== organizations.find(o => o.id === orgId)?.description) {
        updates.description = editOrgDescription.trim() || null;
      }

      if (Object.keys(updates).length === 0) {
        setOrgMsg('No changes to save');
        handleCancelEditOrg();
        return;
      }

      const response = await axios.put(`/api/organizations/${orgId}`, updates);

      if (response.data.success) {
        setOrgMsg('Organization updated successfully!');
        handleCancelEditOrg();
        await loadOrganizations();
      } else {
        setOrgMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      setOrgMsg(`Error updating organization: ${error.response?.data?.message || error.message}`);
    } finally {
      setOrgLoading(false);
    }
  };

  /**
   * Handle sending user invitation
   */
  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      return;
    }

    try {
      setInviteLoading(true);
      setInviteMsg('');

      const payload = { email: inviteEmail };

      if (user?.role === 'super-admin' && inviteOrganizationId) {
        payload.organizationId = parseInt(inviteOrganizationId);
      }

      const response = await axios.post('/api/invitations/send', payload);

      if (response.data.success) {
        setInviteMsg(
          `Invitation sent successfully to ${inviteEmail}! The invite will expire in 7 days.`
        );
        setInviteEmail('');
        setInviteOrganizationId('');
        setShowInviteModal(false);
      } else {
        setInviteMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setInviteMsg(`Error sending invitation: ${error.response?.data?.message || error.message}`);
    } finally {
      setInviteLoading(false);
    }
  };

  /**
   * Close invitation modal and reset state
   */
  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteOrganizationId('');
    setInviteMsg('');
  };

  return {
    user,
    // User state
    allUsers,
    editingUser,
    setEditingUser,
    newRole,
    setNewRole,
    loading,
    msg,
    viewScope,
    deleteModalUser,
    setDeleteModalUser,
    deleteConfirmText,
    setDeleteConfirmText,
    // Tab state
    activeTab,
    setActiveTab,
    // Organization state
    organizations,
    orgLoading,
    orgMsg,
    deleteModalOrg,
    setDeleteModalOrg,
    deleteOrgConfirmText,
    setDeleteOrgConfirmText,
    editingOrg,
    editOrgName,
    setEditOrgName,
    editOrgDescription,
    setEditOrgDescription,
    // Invitation state
    showInviteModal,
    setShowInviteModal,
    inviteEmail,
    setInviteEmail,
    inviteOrganizationId,
    setInviteOrganizationId,
    inviteLoading,
    inviteMsg,
    // Confirmation state
    confirmModalUser,
    confirmAction,
    confirmModalOrg,
    // User handlers
    handleRoleChange,
    handleDeactivateUser,
    handleReactivateUser,
    confirmUserAction,
    closeConfirmModal,
    handleDeleteUser,
    // Organization handlers
    handleDeactivateOrg,
    canModifyOrg,
    confirmOrgAction,
    closeConfirmOrgModal,
    handleDeleteOrg,
    closeDeleteModal,
    closeDeleteOrgModal,
    handleEditOrg,
    handleCancelEditOrg,
    handleSaveOrgChanges,
    // Invitation handlers
    handleSendInvitation,
    closeInviteModal,
    // Data loaders
    loadOrganizations,
  };
};
