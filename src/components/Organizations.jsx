import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';

/**
 * Organizations component for viewing and managing organizations (super-admin only)
 * @returns {JSX.Element} Organizations component
 */
const Organizations = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  /**
   * Load all organizations from the API
   */
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/organizations');
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        setMsg(t('auth.organizations.loadFailed'));
      }
    } catch (loadErr) {
      console.error('Error loading organizations:', loadErr);
      setMsg(`Error loading organizations: ${loadErr.response?.data?.message || loadErr.message}`);
    } finally {
      setLoading(false);
    }
  }, [t]);

  /**
   * Load all organizations on component mount
   */
  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = dateString => {
    if (!dateString) {
      return t('auth.organizations.never');
    }
    return new Date(dateString).toLocaleDateString();
  };

  const getNotificationClass = () => {
    if (msg.includes('successfully')) {
      return 'is-success';
    }
    if (msg.includes('Error') || msg.includes('Failed')) {
      return 'is-danger';
    }
    return 'is-warning';
  };

  const renderTableContent = () => {
    if (loading) {
      return (
        <div className="has-text-centered p-4">
          <div className="button is-loading is-large is-ghost" />
          <p className="mt-2">{t('auth.organizations.loading')}</p>
        </div>
      );
    }

    if (organizations.length === 0) {
      return (
        <div className="has-text-centered p-4">
          <p className="has-text-grey">{t('auth.organizations.notFound')}</p>
          <p className="has-text-grey is-size-7">{t('auth.organizations.createdWhen')}</p>
        </div>
      );
    }

    return (
      <div className="table-container">
        <table className="table is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>{t('auth.organizations.nameHeader')}</th>
              <th>{t('auth.organizations.descriptionHeader')}</th>
              <th>{t('auth.organizations.createdHeader')}</th>
              <th>{t('auth.organizations.totalUsersHeader')}</th>
              <th>{t('auth.organizations.activeUsersHeader')}</th>
              <th>{t('auth.organizations.adminUsersHeader')}</th>
              <th>{t('auth.organizations.statusHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => (
              <tr key={org.id}>
                <td>
                  <strong>{org.name}</strong>
                </td>
                <td>
                  {org.description || (
                    <span className="has-text-grey is-italic">
                      {t('auth.organizations.noDescription')}
                    </span>
                  )}
                </td>
                <td>{formatDate(org.created_at)}</td>
                <td>
                  <span className="tag">{org.total_users || 0}</span>
                </td>
                <td>
                  <span className="tag is-success">{org.active_users || 0}</span>
                </td>
                <td>
                  <span className="tag is-warning">{org.admin_users || 0}</span>
                </td>
                <td>
                  <span className={`tag ${org.is_active ? 'is-success' : 'is-danger'}`}>
                    {org.is_active
                      ? t('auth.organizations.active')
                      : t('auth.organizations.inactive')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Check if user has permission to view organizations
  if (user?.role !== 'super-admin') {
    return (
      <div className="hw-page-content-scrollable">
        <div className="container is-fluid m-2">
          <div className="box">
            <div className="notification is-danger">
              <p>
                <strong>{t('auth.organizations.accessDenied')}</strong>
              </p>
              <p>{t('auth.organizations.onlySuperAdmin')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Organization Management - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container is-fluid p-0">
        <div className="box p-0 is-radiusless">
          <div className="titlebar box active level is-mobile mb-0 p-3">
            <div className="level-left">
              <strong>{t('auth.organizations.pageTitle')}</strong>
            </div>
            <div className="level-right">
              <span className="tag is-info">
                {t('auth.organizations.orgCount', { count: organizations.length })}
              </span>
            </div>
          </div>

          <div className="px-4">
            {msg && (
              <div className={`notification ${getNotificationClass()}`}>
                <p>{msg}</p>
              </div>
            )}

            {/* Organizations Table */}
            <div className="box">
              <h2 className="title is-5">{t('auth.organizations.allOrgsTitle')}</h2>
              {renderTableContent()}
            </div>

            {/* Help Section */}
            <div className="box">
              <h2 className="title is-6">{t('auth.organizations.guideTitle')}</h2>
              <div className="content is-size-7">
                <div className="columns">
                  <div className="column">
                    <p>
                      <strong>{t('auth.organizations.lifecycleTitle')}</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>{t('auth.organizations.lifecycleCreation')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.lifecycleGrowth')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.lifecycleManagement')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.lifecycleDeletion')}</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="column">
                    <p>
                      <strong>{t('auth.organizations.rolesTitle')}</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>{t('auth.organizations.roleUser')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.roleAdmin')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.roleSuperAdmin')}</strong>
                      </li>
                    </ul>
                    <p className="mt-3">
                      <strong>{t('auth.organizations.statsTitle')}</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>{t('auth.organizations.statsTotalUsers')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.statsActiveUsers')}</strong>
                      </li>
                      <li>
                        <strong>{t('auth.organizations.statsAdminUsers')}</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organizations;
