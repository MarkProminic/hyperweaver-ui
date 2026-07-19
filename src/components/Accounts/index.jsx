import { Helmet } from '@dr.pogodin/react-helmet';
import { useTranslation } from 'react-i18next';

import { useAccountsData } from '../../hooks/useAccountsData';

import AccountModals from './AccountModals';
import { getNotificationClass } from './accountUtils';
import OrganizationsTab from './OrganizationsTab';
import UsersTab from './UsersTab';

/**
 * Accounts component for admin user and organization management
 * @returns {JSX.Element} Accounts component
 */
const Accounts = () => {
  const { t } = useTranslation();
  const data = useAccountsData();

  const { user, activeTab, setActiveTab, allUsers, viewScope, organizations, msg } = data;

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t('accounts.accounts.pageTitle')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <strong>
                {user?.role === 'super-admin'
                  ? t('accounts.accounts.accountManagement')
                  : t('accounts.accounts.userManagement')}
              </strong>
              {user?.role === 'super-admin' && (
                <ul className="nav nav-tabs px-3 pt-2 mb-0">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                      onClick={() => setActiveTab('users')}
                      role="tab"
                      aria-selected={activeTab === 'users'}
                    >
                      <i className="fas fa-users me-2" />
                      {t('accounts.accounts.tabUsers')}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'organizations' ? 'active' : ''}`}
                      onClick={() => setActiveTab('organizations')}
                      role="tab"
                      aria-selected={activeTab === 'organizations'}
                    >
                      <i className="fas fa-building me-2" />
                      {t('accounts.accounts.tabOrganizations')}
                    </button>
                  </li>
                </ul>
              )}
            </div>
            <div className="d-flex align-items-center">
              {activeTab === 'users' && (
                <span className="badge text-bg-info">
                  {allUsers.length}{' '}
                  {viewScope === 'all'
                    ? t('accounts.accounts.total')
                    : t('accounts.accounts.organization')}{' '}
                  {t('accounts.accounts.users')}
                </span>
              )}
              {activeTab === 'organizations' && user?.role === 'super-admin' && (
                <span className="badge text-bg-info">
                  {organizations.length} {t('accounts.accounts.organizations')}
                </span>
              )}
            </div>
          </div>

          <div className="card-body">
            {msg && (
              <div className={`alert ${getNotificationClass(msg)}`}>
                <p>{msg}</p>
              </div>
            )}

            {activeTab === 'users' && <UsersTab {...data} />}

            {activeTab === 'organizations' && user?.role === 'super-admin' && (
              <OrganizationsTab {...data} />
            )}

            {/* Help Section */}
            <div className="card">
              <div className="card-body">
                <h2 className="fs-6 fw-bold">{t('accounts.accounts.helpTitle')}</h2>
                <div className="small">
                  <div className="row g-3">
                    <div className="col">
                      <p>
                        <strong>{t('accounts.accounts.helpRoles')}:</strong>
                      </p>
                      <ul>
                        <li>
                          <strong>{t('accounts.accounts.helpRoleUser')}:</strong>{' '}
                          {t('accounts.accounts.helpRoleUserDesc')}
                        </li>
                        <li>
                          <strong>{t('accounts.accounts.helpRoleAdmin')}:</strong>{' '}
                          {t('accounts.accounts.helpRoleAdminDesc')}
                        </li>
                        <li>
                          <strong>{t('accounts.accounts.helpRoleSuperAdmin')}:</strong>{' '}
                          {t('accounts.accounts.helpRoleSuperAdminDesc')}
                        </li>
                      </ul>
                    </div>
                    <div className="col">
                      <p>
                        <strong>{t('accounts.accounts.helpVisibility')}:</strong>
                      </p>
                      <ul>
                        <li>
                          <strong>{t('accounts.accounts.helpVisibilitySuperAdmins')}:</strong>{' '}
                          {t('accounts.accounts.helpVisibilitySuperAdminsDesc')}
                        </li>
                        <li>
                          <strong>{t('accounts.accounts.helpVisibilityOrgAdmins')}:</strong>{' '}
                          {t('accounts.accounts.helpVisibilityOrgAdminsDesc')}
                        </li>
                        <li>
                          <strong>{t('accounts.accounts.helpVisibilityUsers')}:</strong>{' '}
                          {t('accounts.accounts.helpVisibilityUsersDesc')}
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col">
                      <p>
                        <strong>{t('accounts.accounts.helpPermissions')}:</strong>
                      </p>
                      <ul>
                        <li>{t('accounts.accounts.helpPermissionsSuper')}</li>
                        <li>{t('accounts.accounts.helpPermissionsAdmin')}</li>
                        <li>{t('accounts.accounts.helpPermissionsModify')}</li>
                      </ul>
                    </div>
                    <div className="col">
                      <p>
                        <strong>{t('accounts.accounts.helpOrganizations')}:</strong>
                      </p>
                      <ul>
                        <li>{t('accounts.accounts.helpOrgsBelong')}</li>
                        <li>{t('accounts.accounts.helpOrgsSuper')}</li>
                        <li>{t('accounts.accounts.helpOrgsAdmin')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AccountModals {...data} />
    </div>
  );
};

export default Accounts;
