import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import RevealInput from '../common/RevealInput';

const PasswordManagement = ({
  showPasswordChange,
  setShowPasswordChange,
  passwordData,
  setPasswordData,
  handlePasswordChange,
  loading,
  setMsg,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="fs-5 fw-bold">{t('auth.passwordManagement.title')}</h2>

        {!showPasswordChange ? (
          <div>
            <p className="mb-3">{t('auth.passwordManagement.description')}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowPasswordChange(true)}
            >
              {t('auth.passwordManagement.changePassword')}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <div className="mb-3">
              <label className="form-label" htmlFor="currentPassword">
                {t('auth.passwordManagement.currentPassword')}
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
                {t('auth.passwordManagement.newPassword')}
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
              <p className="form-text text-muted">{t('auth.passwordManagement.minLengthHint')}</p>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="confirmPassword">
                {t('auth.passwordManagement.confirmPassword')}
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
                {t('auth.passwordManagement.updatePassword')}
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
                {t('auth.passwordManagement.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

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
