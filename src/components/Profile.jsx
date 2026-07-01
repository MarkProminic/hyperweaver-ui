import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';

import { FormModal } from './common';
import PasswordManagement from './Profile/PasswordManagement';
import ProfileInfo from './Profile/ProfileInfo';

const Profile = () => {
  const { user, logout } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmText: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  /**
   * Handle password change
   */
  const handlePasswordChange = async e => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMsg('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMsg('New password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      if (response.data.success) {
        setMsg('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setShowPasswordChange(false);
      } else {
        setMsg(response.data.message);
      }
    } catch (changeErr) {
      console.error('Error changing password:', changeErr);
      setMsg(`Error changing password: ${changeErr.response?.data?.message || changeErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle account deletion
   */
  const handleDeleteAccount = async () => {
    if (deleteData.confirmText !== 'DELETE') {
      setMsg('You must type "DELETE" to confirm account deletion');
      return;
    }

    try {
      setLoading(true);
      setMsg('');

      const response = await axios.delete('/api/auth/delete-account', {
        data: {
          password: deleteData.password,
          confirmText: deleteData.confirmText,
        },
      });

      if (response.data.success) {
        // Account deleted successfully, redirect to login
        await logout();
        window.location.href = '/ui/login?message=Account deleted successfully';
      } else {
        setMsg(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setMsg(`Error deleting account: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close delete modal and reset form
   */
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteData({ password: '', confirmText: '' });
    setMsg('');
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeClass = role => {
    switch (role) {
      case 'super-admin':
        return 'text-bg-danger';
      case 'admin':
        return 'text-bg-warning';
      case 'user':
        return 'text-bg-success';
      default:
        return 'text-bg-light';
    }
  };

  const getNotificationClass = () => {
    if (msg.includes('successfully')) {
      return 'alert-success';
    }
    if (msg.includes('Error') || msg.includes('must')) {
      return 'alert-danger';
    }
    return 'alert-warning';
  };

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Profile - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>User Profile</strong>
          </div>

          <div className="px-4">
            {msg && (
              <div className={`alert ${getNotificationClass()}`}>
                <p>{msg}</p>
              </div>
            )}

            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <ProfileInfo user={user} />
              </div>

              <div className="col">
                {/* Account Information */}
                <div className="card">
                  <div className="card-body">
                    <h2 className="fs-5 fw-bold">Account Information</h2>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="username">
                        Username
                      </label>
                      <input
                        id="username"
                        className="form-control"
                        type="text"
                        value={user?.username || ''}
                        disabled
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        className="form-control"
                        type="email"
                        value={user?.email || ''}
                        disabled
                      />
                    </div>

                    <div className="mb-3">
                      <p className="form-label">Role</p>
                      <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                        {user?.role || 'Unknown'}
                      </span>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="createdAt">
                        Member Since
                      </label>
                      <input
                        id="createdAt"
                        className="form-control"
                        type="text"
                        value={
                          user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'Unknown'
                        }
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <PasswordManagement
                  showPasswordChange={showPasswordChange}
                  setShowPasswordChange={setShowPasswordChange}
                  passwordData={passwordData}
                  setPasswordData={setPasswordData}
                  handlePasswordChange={handlePasswordChange}
                  loading={loading}
                  setMsg={setMsg}
                />

                {/* Account Deletion */}
                <div className="card">
                  <div className="card-body">
                    <h2 className="fs-5 fw-bold text-danger">Danger Zone</h2>
                    <div className="alert alert-danger">
                      <p>
                        <strong>Warning:</strong> Account deletion is permanent and cannot be
                        undone.
                      </p>
                      {user?.role === 'super-admin' && (
                        <p>
                          <strong>Note:</strong> As a super-admin, you cannot delete your account if
                          you are the last super-admin.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <FormModal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          onSubmit={handleDeleteAccount}
          title="⚠️ Delete Account"
          icon="fas fa-exclamation-triangle"
          submitText={loading ? 'Deleting...' : 'Delete Account Permanently'}
          submitVariant="is-danger"
          loading={loading}
          submitDisabled={deleteData.confirmText !== 'DELETE' || !deleteData.password}
        >
          <div className="alert alert-danger">
            <p>
              <strong>WARNING: This action cannot be undone!</strong>
            </p>
            <p>You are about to permanently delete your account:</p>
          </div>

          <div className="card">
            <div className="card-body">
              <p>
                <strong>Username:</strong> {user?.username}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Role:</strong> {user?.role}
              </p>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="deletePassword">
              Current Password
            </label>
            <input
              id="deletePassword"
              className="form-control"
              type="password"
              value={deleteData.password}
              onChange={e => setDeleteData({ ...deleteData, password: e.target.value })}
              placeholder="Enter your current password"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="deleteConfirm">
              Type &quot;DELETE&quot; to confirm account deletion:
            </label>
            <input
              id="deleteConfirm"
              className="form-control"
              type="text"
              value={deleteData.confirmText}
              onChange={e => setDeleteData({ ...deleteData, confirmText: e.target.value })}
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
            <p className="form-text text-muted">
              This will permanently remove your account and all associated data.
            </p>
          </div>
        </FormModal>
      )}
    </div>
  );
};

export default Profile;
