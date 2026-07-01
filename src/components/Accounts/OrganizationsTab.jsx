import PropTypes from 'prop-types';

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
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <h2 className="fs-5 fw-bold">Organizations Overview</h2>
      {orgMsg && (
        <div className={`alert ${getNotificationClass(orgMsg)} mb-4`}>
          <p>{orgMsg}</p>
        </div>
      )}

      {orgLoading ? (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading organizations...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Description</th>
                <th>Total Users</th>
                <th>Active Users</th>
                <th>Admins</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
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
                        placeholder="Organization name"
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
                        placeholder="Organization description (optional)"
                        disabled={orgLoading}
                      />
                    ) : (
                      org.description || (
                        <span className="text-muted fst-italic">No description</span>
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
                      {org.is_active ? 'Active' : 'Inactive'}
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
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={handleCancelEditOrg}
                            disabled={orgLoading}
                          >
                            Cancel
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
                              title="Edit organization name and description"
                            >
                              Edit
                            </button>
                          )}
                          {canModifyOrg(org) && org.is_active && (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning"
                              onClick={() => handleDeactivateOrg(org.id)}
                              disabled={orgLoading || editingOrg !== null}
                              title="Deactivate organization"
                            >
                              Deactivate
                            </button>
                          )}
                          {canModifyOrg(org) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteModalOrg(org)}
                              disabled={orgLoading || editingOrg !== null}
                              title="Permanently delete organization (and all users)"
                            >
                              Delete
                            </button>
                          )}
                          {!canEditOrg(user, org) && !canModifyOrg(org) && (
                            <span className="text-muted small">No permission</span>
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
                    No organizations found
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
