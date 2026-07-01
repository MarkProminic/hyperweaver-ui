import { Helmet } from '@dr.pogodin/react-helmet';
import axios from 'axios';
import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';

/**
 * Organizations component for viewing and managing organizations (super-admin only)
 * @returns {JSX.Element} Organizations component
 */
const Organizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  /**
   * Load all organizations from the API
   */
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/organizations');
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        setMsg('Failed to load organizations');
      }
    } catch (loadErr) {
      console.error('Error loading organizations:', loadErr);
      setMsg(`Error loading organizations: ${loadErr.response?.data?.message || loadErr.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all organizations on component mount
   */
  useEffect(() => {
    loadOrganizations();
  }, []);

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = dateString => {
    if (!dateString) {
      return 'Never';
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
          <p className="mt-2">Loading organizations...</p>
        </div>
      );
    }

    if (organizations.length === 0) {
      return (
        <div className="has-text-centered p-4">
          <p className="has-text-grey">No organizations found.</p>
          <p className="has-text-grey is-size-7">
            Organizations are created when users register or are invited.
          </p>
        </div>
      );
    }

    return (
      <div className="table-container">
        <table className="table is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Total Users</th>
              <th>Active Users</th>
              <th>Admin Users</th>
              <th>Status</th>
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
                    <span className="has-text-grey is-italic">No description</span>
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
                    {org.is_active ? 'Active' : 'Inactive'}
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
                <strong>Access Denied</strong>
              </p>
              <p>Only super administrators can view organization management.</p>
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
              <strong>Organization Management</strong>
            </div>
            <div className="level-right">
              <span className="tag is-info">{organizations.length} Organizations</span>
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
              <h2 className="title is-5">All Organizations</h2>
              {renderTableContent()}
            </div>

            {/* Help Section */}
            <div className="box">
              <h2 className="title is-6">Organization Management Guide</h2>
              <div className="content is-size-7">
                <div className="columns">
                  <div className="column">
                    <p>
                      <strong>Organization Lifecycle:</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>Creation:</strong> Organizations are created when the first user
                        registers with a new organization name
                      </li>
                      <li>
                        <strong>Growth:</strong> Additional users join via invitations sent by
                        organization admins
                      </li>
                      <li>
                        <strong>Management:</strong> Organization admins can invite users and manage
                        their organization members
                      </li>
                      <li>
                        <strong>Deletion:</strong> Organizations are automatically deleted when the
                        last user leaves or is deleted
                      </li>
                    </ul>
                  </div>
                  <div className="column">
                    <p>
                      <strong>User Roles within Organizations:</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>User:</strong> Basic member with access to organization resources
                      </li>
                      <li>
                        <strong>Admin:</strong> Can manage organization users and send invitations
                      </li>
                      <li>
                        <strong>Super Admin:</strong> System-level access, not bound to
                        organizations
                      </li>
                    </ul>
                    <p className="mt-3">
                      <strong>Statistics:</strong>
                    </p>
                    <ul>
                      <li>
                        <strong>Total Users:</strong> All users ever associated with the
                        organization
                      </li>
                      <li>
                        <strong>Active Users:</strong> Currently active users in the organization
                      </li>
                      <li>
                        <strong>Admin Users:</strong> Users with admin privileges in the
                        organization
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
