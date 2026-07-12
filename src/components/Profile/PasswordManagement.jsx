import PropTypes from 'prop-types';

import RevealInput from '../common/RevealInput';

const PasswordManagement = ({
  showPasswordChange,
  setShowPasswordChange,
  passwordData,
  setPasswordData,
  handlePasswordChange,
  loading,
  setMsg,
}) => (
  <div className="card">
    <div className="card-body">
      <h2 className="fs-5 fw-bold">Password Management</h2>

      {!showPasswordChange ? (
        <div>
          <p className="mb-3">Change your account password for enhanced security.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowPasswordChange(true)}
          >
            Change Password
          </button>
        </div>
      ) : (
        <form onSubmit={handlePasswordChange}>
          <div className="mb-3">
            <label className="form-label" htmlFor="currentPassword">
              Current Password
            </label>
            <RevealInput
              id="currentPassword"
              autoComplete="current-password"
              value={passwordData.currentPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="newPassword">
              New Password
            </label>
            <RevealInput
              id="newPassword"
              value={passwordData.newPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              required
              minLength="8"
            />
            <p className="form-text text-muted">Must be at least 8 characters long</p>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <RevealInput
              id="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              Update Password
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowPasswordChange(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setMsg('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);

PasswordManagement.propTypes = {
  showPasswordChange: PropTypes.bool.isRequired,
  setShowPasswordChange: PropTypes.func.isRequired,
  passwordData: PropTypes.object.isRequired,
  setPasswordData: PropTypes.func.isRequired,
  handlePasswordChange: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  setMsg: PropTypes.func.isRequired,
};

export default PasswordManagement;
