import { Helmet } from '@dr.pogodin/react-helmet';

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
  const data = useAccountsData();

  const { user, activeTab, setActiveTab, allUsers, viewScope, organizations, msg } = data;

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>User Management - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <strong>
                {user?.role === 'super-admin' ? 'Account Management' : 'User Management'}
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
                      Users
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
                      Organizations
                    </button>
                  </li>
                </ul>
              )}
            </div>
            <div className="d-flex align-items-center">
              {activeTab === 'users' && (
                <span className="badge text-bg-info">
                  {allUsers.length} {viewScope === 'all' ? 'Total' : 'Organization'} Users
                </span>
              )}
              {activeTab === 'organizations' && user?.role === 'super-admin' && (
                <span className="badge text-bg-info">{organizations.length} Organizations</span>
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
                <h2 className="fs-6 fw-bold">User Management Guide</h2>
                <div className="small">
                  <div className="row g-3">
                    <div className="col">
                      <p>
                        <strong>Roles:</strong>
                      </p>
                      <ul>
                        <li>
                          <strong>User:</strong> Basic access to zones and hosts
                        </li>
                        <li>
                          <strong>Admin:</strong> Can manage users and organization settings
                        </li>
                        <li>
                          <strong>Super Admin:</strong> Full system access, can manage all users and
                          organizations
                        </li>
                      </ul>
                    </div>
                    <div className="col">
                      <p>
                        <strong>Visibility:</strong>
                      </p>
                      <ul>
                        <li>
                          <strong>Super Admins:</strong> Can see all users across all organizations
                        </li>
                        <li>
                          <strong>Organization Admins:</strong> Can only see users in their
                          organization
                        </li>
                        <li>
                          <strong>Users:</strong> Cannot access user management
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col">
                      <p>
                        <strong>Permissions:</strong>
                      </p>
                      <ul>
                        <li>Super admins can modify any user except other super admins</li>
                        <li>Admins can only modify regular users in their organization</li>
                        <li>No one can modify their own role or deactivate themselves</li>
                      </ul>
                    </div>
                    <div className="col">
                      <p>
                        <strong>Organizations:</strong>
                      </p>
                      <ul>
                        <li>Users belong to organizations for access control</li>
                        <li>Super admins operate at system level (no organization)</li>
                        <li>Organization admins manage users within their scope</li>
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
