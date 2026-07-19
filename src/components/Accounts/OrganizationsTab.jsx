import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { canEditOrg, getNotificationClass } from './accountUtils';

/**
 * Organizations tab content - org table with inline editing
 */
const OrganizationsTab = ({
  user,
  organizations,
  orgLoading,
  orgMsg,
  editingOrg,
  editOrgName,
  setEditOrgName,
  editOrgDescription,
  setEditOrgDescription,
  handleEditOrg,
  handleCancelEditOrg,
  handleSaveOrgChanges,
  canModifyOrg,
  handleDeactivateOrg,
  setDeleteModalOrg,
}) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="fs-5 fw-bold">{t('accounts.organizationsTab.title')}</h2>
        {orgMsg && (
          <div className={`alert ${getNotificationClass(orgMsg)} mb-4`}>
            <p>{orgMsg}</p>
          </div>
        )}

        {orgLoading ? (
          <div className="text-center p-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">{t('accounts.organizationsTab.loading')}</span>
            </div>
            <p className="mt-2">{t('accounts.organizationsTab.loadingOrganizations')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('accounts.organizationsTab.columnOrgName')}</th>
                  <th>{t('accounts.organizationsTab.columnDescription')}</th>
                  <th>{t('accounts.organizationsTab.columnTotalUsers')}</th>
                  <th>{t('accounts.organizationsTab.columnActiveUsers')}</th>
                  <th>{t('accounts.organizationsTab.columnAdmins')}</th>
                  <th>{t('accounts.organizationsTab.columnCreated')}</th>
                  <th>{t('accounts.organizationsTab.columnStatus')}</th>
                  <th>{t('accounts.organizationsTab.columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map(org => (
                  <tr key={org.id}>
                    <td>
                      {editingOrg === org.id ? (
                        <input
                          className="form-control form-control-sm"
                          type="text"
                          value={editOrgName}
                          onChange={e => setEditOrgName(e.target.value)}
                          placeholder={t('accounts.organizationsTab.orgNamePlaceholder')}
                          disabled={orgLoading}
                        />
                      ) : (
                        <strong>{org.name}</strong>
                      )}
                    </td>
                    <td>
                      {editingOrg === org.id ? (
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
                          value={editOrgDescription}
                          onChange={e => setEditOrgDescription(e.target.value)}
                          placeholder={t('accounts.organizationsTab.descriptionPlaceholder')}
                          disabled={orgLoading}
                        />
                      ) : (
                        org.description || (
                          <span className="text-muted fst-italic">
                            {t('accounts.organizationsTab.noDescription')}
                          </span>
                        )
                      )}
                    </td>
                    <td>
                      <span className="badge text-bg-info">{org.total_users || 0}</span>
                    </td>
                    <td>
                      <span className="badge text-bg-success">{org.active_users || 0}</span>
                    </td>
                    <td>
                      <span className="badge text-bg-warning">{org.admin_users || 0}</span>
                    </td>
                    <td>{new Date(org.created_at).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge ${org.is_active ? 'text-bg-success' : 'text-bg-danger'}`}
                      >
                        {org.is_active
                          ? t('accounts.organizationsTab.statusActive')
                          : t('accounts.organizationsTab.statusInactive')}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {editingOrg === org.id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleSaveOrgChanges(org.id)}
                              disabled={!editOrgName.trim() || orgLoading}
                            >
                              {t('accounts.organizationsTab.buttonSave')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={handleCancelEditOrg}
                              disabled={orgLoading}
                            >
                              {t('accounts.organizationsTab.buttonCancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            {canEditOrg(user, org) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-info"
                                onClick={() => handleEditOrg(org)}
                                disabled={orgLoading || editingOrg !== null}
                                title={t('accounts.organizationsTab.editOrgTitle')}
                              >
                                {t('accounts.organizationsTab.buttonEdit')}
                              </button>
                            )}
                            {canModifyOrg(org) && org.is_active && (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                onClick={() => handleDeactivateOrg(org.id)}
                                disabled={orgLoading || editingOrg !== null}
                                title={t('accounts.organizationsTab.deactivateOrgTitle')}
                              >
                                {t('accounts.organizationsTab.buttonDeactivate')}
                              </button>
                            )}
                            {canModifyOrg(org) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeleteModalOrg(org)}
                                disabled={orgLoading || editingOrg !== null}
                                title={t('accounts.organizationsTab.deleteOrgTitle')}
                              >
                                {t('accounts.organizationsTab.buttonDelete')}
                              </button>
                            )}
                            {!canEditOrg(user, org) && !canModifyOrg(org) && (
                              <span className="text-muted small">
                                {t('accounts.organizationsTab.noPermission')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted fst-italic p-4">
                      {t('accounts.organizationsTab.emptyState')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

OrganizationsTab.propTypes = {
  user: PropTypes.object.isRequired,
  organizations: PropTypes.array.isRequired,
  orgLoading: PropTypes.bool.isRequired,
  orgMsg: PropTypes.string.isRequired,
  editingOrg: PropTypes.number,
  editOrgName: PropTypes.string.isRequired,
  setEditOrgName: PropTypes.func.isRequired,
  editOrgDescription: PropTypes.string.isRequired,
  setEditOrgDescription: PropTypes.func.isRequired,
  handleEditOrg: PropTypes.func.isRequired,
  handleCancelEditOrg: PropTypes.func.isRequired,
  handleSaveOrgChanges: PropTypes.func.isRequired,
  canModifyOrg: PropTypes.func.isRequired,
  handleDeactivateOrg: PropTypes.func.isRequired,
  setDeleteModalOrg: PropTypes.func.isRequired,
};

export default OrganizationsTab;
