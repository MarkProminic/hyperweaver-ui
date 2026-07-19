import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

import { FormModal } from './common';
import PasswordManagement from './Profile/PasswordManagement';
import ProfileInfo from './Profile/ProfileInfo';

const Profile = () => {
  const { t } = useTranslation();
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
      setMsg(t('auth.profile.passwordsNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMsg(t('auth.profile.passwordMinLength'));
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
        setMsg(t('auth.profile.passwordChangedSuccess'));
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
      setMsg(t('auth.profile.deleteConfirmRequired'));
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
            <strong>{t('auth.profile.userProfileTitle')}</strong>
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
                    <h2 className="fs-5 fw-bold">{t('auth.profile.accountInfoTitle')}</h2>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="username">
                        {t('auth.profile.usernameLabel')}
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
                        {t('auth.profile.emailLabel')}
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
                      <p className="form-label">{t('auth.profile.roleLabel')}</p>
                      <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                        {user?.role || t('auth.profile.unknown')}
                      </span>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="createdAt">
                        {t('auth.profile.memberSinceLabel')}
                      </label>
                      <input
                        id="createdAt"
                        className="form-control"
                        type="text"
                        value={
                          user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : t('auth.profile.unknown')
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
                    <h2 className="fs-5 fw-bold text-danger">
                      {t('auth.profile.dangerZoneTitle')}
                    </h2>
                    <div className="alert alert-danger">
                      <p>
                        <strong>{t('auth.profile.deletionWarning')}</strong>
                      </p>
                      {user?.role === 'super-admin' && (
                        <p>
                          <strong>{t('auth.profile.superAdminNote')}</strong>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      {t('auth.profile.deleteAccountBtn')}
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
          title={t('auth.profile.deleteModalTitle')}
          icon="fas fa-exclamation-triangle"
          submitText={loading ? t('auth.profile.deletingBtn') : t('auth.profile.deletePermBtn')}
          submitVariant="is-danger"
          loading={loading}
          submitDisabled={deleteData.confirmText !== 'DELETE' || !deleteData.password}
        >
          <div className="alert alert-danger">
            <p>
              <strong>{t('auth.profile.deleteWarning')}</strong>
            </p>
            <p>{t('auth.profile.deletePermanentlyMsg')}</p>
          </div>

          <div className="card">
            <div className="card-body">
              <p>
                <strong>{t('auth.profile.username')}:</strong> {user?.username}
              </p>
              <p>
                <strong>{t('auth.profile.emailLabel')}:</strong> {user?.email}
              </p>
              <p>
                <strong>{t('auth.profile.roleLabel')}:</strong> {user?.role}
              </p>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="deletePassword">
              {t('auth.profile.currentPasswordLabel')}
            </label>
            <input
              id="deletePassword"
              className="form-control"
              type="password"
              value={deleteData.password}
              onChange={e => setDeleteData({ ...deleteData, password: e.target.value })}
              placeholder={t('auth.profile.currentPasswordPlaceholder')}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="deleteConfirm">
              {t('auth.profile.confirmDeleteLabel')}
            </label>
            <input
              id="deleteConfirm"
              className="form-control"
              type="text"
              value={deleteData.confirmText}
              onChange={e => setDeleteData({ ...deleteData, confirmText: e.target.value })}
              placeholder={t('auth.profile.confirmDeletePlaceholder')}
              autoComplete="off"
            />
            <p className="form-text text-muted">{t('auth.profile.permanentRemovalMsg')}</p>
          </div>
        </FormModal>
      )}
    </div>
  );
};

export default Profile;
