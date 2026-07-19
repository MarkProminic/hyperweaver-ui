import axios from 'axios';
import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LdapTestPanel = ({
  values,
  testResults,
  setTestResults,
  testLoading,
  setTestLoading,
  ldapTestCredentials,
  setLdapTestCredentials,
  setMsg,
  loading,
}) => {
  const { t } = useTranslation();
  const testLdapConnection = useCallback(async () => {
    const testKey = 'ldap';
    try {
      setTestLoading(prev => ({ ...prev, [testKey]: true }));
      setTestResults(prev => ({ ...prev, [testKey]: null }));
      setMsg(t('settings.ldapTestPanel.testing'));

      const payload = {};
      if (ldapTestCredentials.testUsername && ldapTestCredentials.testPassword) {
        payload.testUsername = ldapTestCredentials.testUsername;
        payload.testPassword = ldapTestCredentials.testPassword;
      }

      const response = await axios.post('/api/auth/ldap/test', payload);

      if (response.data.success) {
        setTestResults(prev => ({
          ...prev,
          [testKey]: {
            success: true,
            message: response.data.message,
            details: response.data.details,
          },
        }));
        setMsg(t('settings.ldapTestPanel.testSuccess'));
      } else {
        setTestResults(prev => ({
          ...prev,
          [testKey]: {
            success: false,
            message: response.data.message,
            error: response.data.error,
          },
        }));
        setMsg(t('settings.ldapTestPanel.testFailed', { message: response.data.message }));
      }
    } catch (error) {
      console.error('LDAP test error:', error);
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          success: false,
          message: t('settings.ldapTestPanel.testFailedShort'),
          error: error.response?.data?.error || error.message,
        },
      }));
      setMsg(
        t('settings.ldapTestPanel.testError', {
          error: error.response?.data?.message || error.message,
        })
      );
    } finally {
      setTestLoading(prev => ({ ...prev, [testKey]: false }));
    }
  }, [
    ldapTestCredentials.testUsername,
    ldapTestCredentials.testPassword,
    setTestLoading,
    setTestResults,
    setMsg,
    t,
  ]);

  if (!values['authentication.ldap_enabled']) {
    return null;
  }

  const isLdapSuccess = testResults.ldap?.success;

  return (
    <div className="card mt-4 bg-body-tertiary">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">
          <i className="fas fa-vial me-2" />
          {t('settings.ldapTestPanel.testLdapConnection')}
        </h3>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="mb-3">
              <label className="form-label" htmlFor="ldap-test-username">
                {t('settings.ldapTestPanel.testUsername')}
              </label>
              <input
                id="ldap-test-username"
                className="form-control"
                type="text"
                placeholder={t('settings.ldapTestPanel.testUsernamePlaceholder')}
                value={ldapTestCredentials.testUsername}
                onChange={e =>
                  setLdapTestCredentials(prev => ({
                    ...prev,
                    testUsername: e.target.value,
                  }))
                }
                disabled={testLoading.ldap || loading}
              />
              <p className="form-text text-muted">{t('settings.ldapTestPanel.testUsernameHelp')}</p>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="mb-3">
              <label className="form-label" htmlFor="ldap-test-password">
                {t('settings.ldapTestPanel.testPassword')}
              </label>
              <input
                id="ldap-test-password"
                className="form-control"
                type="password"
                placeholder={t('settings.ldapTestPanel.testPasswordPlaceholder')}
                value={ldapTestCredentials.testPassword}
                onChange={e =>
                  setLdapTestCredentials(prev => ({
                    ...prev,
                    testPassword: e.target.value,
                  }))
                }
                disabled={testLoading.ldap || loading}
              />
              <p className="form-text text-muted">{t('settings.ldapTestPanel.testPasswordHelp')}</p>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <button
            type="button"
            className="btn btn-info"
            onClick={testLdapConnection}
            disabled={testLoading.ldap || loading}
          >
            {testLoading.ldap && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-plug me-2" />
            <span>{t('settings.ldapTestPanel.testLdapConnection')}</span>
          </button>
          <p className="form-text text-muted">{t('settings.ldapTestPanel.testButtonHelp')}</p>
        </div>

        {testResults.ldap && (
          <div className={`alert mt-3 ${isLdapSuccess ? 'alert-success' : 'alert-danger'}`}>
            <div className="d-flex">
              <div className="flex-shrink-0 me-3">
                <i
                  className={`fas fa-2x ${isLdapSuccess ? 'fa-check-circle' : 'fa-times-circle'}`}
                />
              </div>
              <div className="flex-grow-1">
                <p className="fw-semibold">{testResults.ldap.message}</p>
                {testResults.ldap.details && (
                  <div className="mt-2">
                    <ul className="small">
                      <li>
                        <i
                          className={`fas me-1 ${testResults.ldap.details.connectionTest ? 'fa-check text-success' : 'fa-times text-danger'}`}
                        />
                        <span>{t('settings.ldapTestPanel.serverConnection')}</span>
                      </li>
                      <li>
                        <i
                          className={`fas me-1 ${testResults.ldap.details.bindTest ? 'fa-check text-success' : 'fa-times text-danger'}`}
                        />
                        <span>{t('settings.ldapTestPanel.bindServiceAccount')}</span>
                      </li>
                      <li>
                        <i
                          className={`fas me-1 ${testResults.ldap.details.searchTest ? 'fa-check text-success' : 'fa-times text-danger'}`}
                        />
                        <span>{t('settings.ldapTestPanel.directorySearch')}</span>
                      </li>
                      {testResults.ldap.details.authTest !== null && (
                        <li>
                          <i
                            className={`fas me-1 ${testResults.ldap.details.authTest ? 'fa-check text-success' : 'fa-exclamation-triangle text-warning'}`}
                          />
                          <span>{t('settings.ldapTestPanel.userAuthTest')}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {testResults.ldap.error && (
                  <p className="small text-muted mt-1">
                    <strong>{t('settings.ldapTestPanel.errorLabel')}</strong>{' '}
                    {testResults.ldap.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

LdapTestPanel.propTypes = {
  values: PropTypes.object.isRequired,
  testResults: PropTypes.object.isRequired,
  setTestResults: PropTypes.func.isRequired,
  testLoading: PropTypes.object.isRequired,
  setTestLoading: PropTypes.func.isRequired,
  ldapTestCredentials: PropTypes.shape({
    testUsername: PropTypes.string,
    testPassword: PropTypes.string,
  }).isRequired,
  setLdapTestCredentials: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default LdapTestPanel;
