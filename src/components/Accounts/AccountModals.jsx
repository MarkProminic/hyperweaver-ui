import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../common';

import { getNotificationClass } from './accountUtils';

/**
 * All modal dialogs for the Accounts page
 */
const AccountModals = ({
  user,
  // Delete user modal
  deleteModalUser,
  deleteConfirmText,
  setDeleteConfirmText,
  loading,
  handleDeleteUser,
  closeDeleteModal,
  // Delete org modal
  deleteModalOrg,
  deleteOrgConfirmText,
  setDeleteOrgConfirmText,
  orgLoading,
  handleDeleteOrg,
  closeDeleteOrgModal,
  // Invite modal
  showInviteModal,
  inviteEmail,
  setInviteEmail,
  inviteOrganizationId,
  setInviteOrganizationId,
  inviteLoading,
  inviteMsg,
  organizations,
  viewScope,
  handleSendInvitation,
  closeInviteModal,
  // User action confirm modal
  confirmModalUser,
  confirmAction,
  confirmUserAction,
  closeConfirmModal,
  // Org deactivation confirm modal
  confirmModalOrg,
  confirmOrgAction,
  closeConfirmOrgModal,
}) => {
  const { t } = useTranslation();
  const confirmSubmitText = () => {
    if (loading) {
      return confirmAction === 'deactivate'
        ? t('accounts.accountModals.deactivatingUser')
        : t('accounts.accountModals.reactivatingUser');
    }
    return confirmAction === 'deactivate'
      ? t('accounts.accountModals.deactivateUserAction')
      : t('accounts.accountModals.reactivateUserAction');
  };
  return (
    <>
      {/* Delete User Confirmation Modal */}
      <FormModal
        isOpen={!!deleteModalUser}
        onClose={closeDeleteModal}
        onSubmit={handleDeleteUser}
        title={t('accounts.accountModals.deleteUserTitle')}
        icon="fas fa-trash"
        submitText={
          loading
            ? t('accounts.accountModals.deletingUser')
            : t('accounts.accountModals.deleteUserPermanently')
        }
        submitVariant="is-danger"
        loading={loading}
        disabled={deleteConfirmText !== 'DELETE'}
      >
        <div className="alert alert-danger">
          <p>
            <strong>{t('accounts.accountModals.warningCannotUndo')}</strong>
          </p>
          <p>{t('accounts.accountModals.deleteUserConfirm')}</p>
        </div>

        {deleteModalUser && (
          <div className="card">
            <div className="card-body">
              <p>
                <strong>{t('accounts.accountModals.labelUsername')}:</strong>{' '}
                {deleteModalUser.username}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelEmail')}:</strong> {deleteModalUser.email}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelRole')}:</strong> {deleteModalUser.role}
              </p>
              {deleteModalUser.organization_name && (
                <p>
                  <strong>{t('accounts.accountModals.labelOrganization')}:</strong>{' '}
                  {deleteModalUser.organization_name}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label" htmlFor="delete-user-confirm">
            {t('accounts.accountModals.typeDeleteLabel')}
          </label>
          <input
            id="delete-user-confirm"
            className="form-control"
            type="text"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder={t('accounts.accountModals.typeDeletePlaceholder')}
            autoComplete="off"
          />
          <p className="form-text text-muted">
            {t('accounts.accountModals.deleteUserPermanentlyNote')}
          </p>
        </div>
      </FormModal>

      {/* Organization Delete Confirmation Modal */}
      <FormModal
        isOpen={!!deleteModalOrg}
        onClose={closeDeleteOrgModal}
        onSubmit={handleDeleteOrg}
        title={t('accounts.accountModals.deleteOrgTitle')}
        icon="fas fa-trash"
        submitText={
          orgLoading
            ? t('accounts.accountModals.deletingOrg')
            : t('accounts.accountModals.deleteOrgPermanently')
        }
        submitVariant="is-danger"
        loading={orgLoading}
        disabled={deleteOrgConfirmText !== 'DELETE'}
      >
        <div className="alert alert-danger">
          <p>
            <strong>{t('accounts.accountModals.warningCannotUndo')}</strong>
          </p>
          <p>{t('accounts.accountModals.deleteOrgConfirm')}</p>
        </div>

        {deleteModalOrg && (
          <div className="card">
            <div className="card-body">
              <p>
                <strong>{t('accounts.accountModals.labelOrgName')}:</strong> {deleteModalOrg.name}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelDescription')}:</strong>{' '}
                {deleteModalOrg.description || t('accounts.accountModals.noDescription')}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelTotalUsers')}:</strong>{' '}
                {deleteModalOrg.total_users || 0}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelActiveUsers')}:</strong>{' '}
                {deleteModalOrg.active_users || 0}
              </p>
              <p>
                <strong>{t('accounts.accountModals.labelCreated')}:</strong>{' '}
                {new Date(deleteModalOrg.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {deleteModalOrg && deleteModalOrg.active_users > 0 && (
          <div className="alert alert-warning">
            <p>
              <strong>{t('accounts.accountModals.labelNote')}:</strong>{' '}
              {t('accounts.accountModals.activeUsersWarning', {
                count: deleteModalOrg.active_users,
              })}
            </p>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label" htmlFor="delete-org-confirm">
            {t('accounts.accountModals.typeDeleteLabel')}
          </label>
          <input
            id="delete-org-confirm"
            className="form-control"
            type="text"
            value={deleteOrgConfirmText}
            onChange={e => setDeleteOrgConfirmText(e.target.value)}
            placeholder={t('accounts.accountModals.typeDeletePlaceholder')}
            autoComplete="off"
          />
          <p className="form-text text-muted">
            {t('accounts.accountModals.deleteOrgPermanentlyNote')}
          </p>
        </div>
      </FormModal>

      {/* Invite User Modal */}
      <FormModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        onSubmit={handleSendInvitation}
        title={t('accounts.accountModals.inviteTitle')}
        icon="fas fa-envelope"
        submitText={
          inviteLoading
            ? t('accounts.accountModals.sendingInvitation')
            : t('accounts.accountModals.sendInvitation')
        }
        submitVariant="is-primary"
        loading={inviteLoading}
        disabled={!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)}
      >
        <p className="mb-4">
          {t('accounts.accountModals.inviteDescription', {
            scope:
              user?.role === 'super-admin' && viewScope === 'all'
                ? t('accounts.accountModals.scopeSystem')
                : t('accounts.accountModals.scopeOrganization'),
          })}
        </p>

        <div className="mb-3">
          <label className="form-label" htmlFor="invite-email">
            {t('accounts.accountModals.labelEmailAddress')}
          </label>
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-envelope" />
            </span>
            <input
              id="invite-email"
              className="form-control"
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder={t('accounts.accountModals.enterEmailPlaceholder')}
              autoComplete="off"
              disabled={inviteLoading}
            />
          </div>
          <p className="form-text text-muted">{t('accounts.accountModals.emailExpiresNote')}</p>
        </div>

        {user?.role === 'super-admin' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="invite-org">
              {t('accounts.accountModals.labelOrganizationOptional')}
            </label>
            <select
              id="invite-org"
              className="form-select"
              value={inviteOrganizationId}
              onChange={e => setInviteOrganizationId(e.target.value)}
              disabled={inviteLoading}
            >
              <option value="">{t('accounts.accountModals.selectOrganization')}</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.active_users} {t('accounts.accountModals.activeUsers')})
                </option>
              ))}
            </select>
            <p className="form-text text-muted">{t('accounts.accountModals.chooseOrgNote')}</p>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="alert alert-info">
            <p>
              <strong>{t('accounts.accountModals.organizationAdmin')}:</strong>{' '}
              {t('accounts.accountModals.invitationAdminNote')}
            </p>
          </div>
        )}

        {inviteMsg && (
          <div className={`alert ${getNotificationClass(inviteMsg)}`}>
            <p>{inviteMsg}</p>
          </div>
        )}
      </FormModal>

      {/* User Action Confirmation Modal */}
      <FormModal
        isOpen={!!confirmModalUser}
        onClose={closeConfirmModal}
        onSubmit={confirmUserAction}
        title={
          confirmAction === 'deactivate'
            ? t('accounts.accountModals.deactivateUserTitle')
            : t('accounts.accountModals.reactivateUserTitle')
        }
        icon={`fas ${confirmAction === 'deactivate' ? 'fa-user-slash' : 'fa-user-check'}`}
        submitText={confirmSubmitText()}
        submitVariant={confirmAction === 'deactivate' ? 'is-danger' : 'is-success'}
        loading={loading}
      >
        {confirmModalUser && (
          <p>
            {t('accounts.accountModals.confirmAction', {
              action: confirmAction,
              username: confirmModalUser.username,
            })}
          </p>
        )}
      </FormModal>

      {/* Organization Deactivation Confirmation Modal */}
      <FormModal
        isOpen={!!confirmModalOrg}
        onClose={closeConfirmOrgModal}
        onSubmit={confirmOrgAction}
        title={t('accounts.accountModals.deactivateOrgTitle')}
        icon="fas fa-building"
        submitText={
          orgLoading
            ? t('accounts.accountModals.deactivatingOrg')
            : t('accounts.accountModals.deactivateOrgButton')
        }
        submitVariant="is-danger"
        loading={orgLoading}
      >
        {confirmModalOrg && (
          <div>
            <p>
              {t('accounts.accountModals.deactivateOrgConfirm', { orgName: confirmModalOrg.name })}
            </p>
            <p className="mt-3 text-muted">{t('accounts.accountModals.deactivateOrgNote')}</p>
          </div>
        )}
      </FormModal>
    </>
  );
};

AccountModals.propTypes = {
  user: PropTypes.object.isRequired,
  deleteModalUser: PropTypes.object,
  deleteConfirmText: PropTypes.string.isRequired,
  setDeleteConfirmText: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  handleDeleteUser: PropTypes.func.isRequired,
  closeDeleteModal: PropTypes.func.isRequired,
  deleteModalOrg: PropTypes.object,
  deleteOrgConfirmText: PropTypes.string.isRequired,
  setDeleteOrgConfirmText: PropTypes.func.isRequired,
  orgLoading: PropTypes.bool.isRequired,
  handleDeleteOrg: PropTypes.func.isRequired,
  closeDeleteOrgModal: PropTypes.func.isRequired,
  showInviteModal: PropTypes.bool.isRequired,
  inviteEmail: PropTypes.string.isRequired,
  setInviteEmail: PropTypes.func.isRequired,
  inviteOrganizationId: PropTypes.string.isRequired,
  setInviteOrganizationId: PropTypes.func.isRequired,
  inviteLoading: PropTypes.bool.isRequired,
  inviteMsg: PropTypes.string.isRequired,
  organizations: PropTypes.array.isRequired,
  viewScope: PropTypes.string.isRequired,
  handleSendInvitation: PropTypes.func.isRequired,
  closeInviteModal: PropTypes.func.isRequired,
  confirmModalUser: PropTypes.object,
  confirmAction: PropTypes.string.isRequired,
  confirmUserAction: PropTypes.func.isRequired,
  closeConfirmModal: PropTypes.func.isRequired,
  confirmModalOrg: PropTypes.object,
  confirmOrgAction: PropTypes.func.isRequired,
  closeConfirmOrgModal: PropTypes.func.isRequired,
};

export default AccountModals;
