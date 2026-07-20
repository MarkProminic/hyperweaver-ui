import axios from 'axios';
import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const SmtpTestPanel = ({
  testResults,
  setTestResults,
  testLoading,
  setTestLoading,
  testEmail,
  setTestEmail,
  setMsg,
  loading,
}) => {
  const { t } = useTranslation();
  const testMailConnection = useCallback(async () => {
    const testKey = 'mail';
    if (!testEmail) {
      setMsg({ text: t('settings.smtpTestPanel.enterEmail'), variant: 'warning' });
      return;
    }

    try {
      setTestLoading(prev => ({ ...prev, [testKey]: true }));
      setTestResults(prev => ({ ...prev, [testKey]: null }));
      setMsg({ text: t('settings.smtpTestPanel.testing'), variant: 'info' });

      const response = await axios.post('/api/mail/test', { testEmail });

      if (response.data.success) {
        setTestResults(prev => ({
          ...prev,
          [testKey]: {
            success: true,
            message: response.data.message,
            details: response.data.details,
          },
        }));
        setMsg({ text: t('settings.smtpTestPanel.testSuccess'), variant: 'success' });
      } else {
        setTestResults(prev => ({
          ...prev,
          [testKey]: {
            success: false,
            message: response.data.message,
            error: response.data.error,
          },
        }));
        setMsg({
          text: t('settings.smtpTestPanel.testFailed', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Mail test error:', error);
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          success: false,
          message: t('settings.smtpTestPanel.testFailedShort'),
          error: error.response?.data?.error || error.message,
        },
      }));
      setMsg({
        text: t('settings.smtpTestPanel.testError', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setTestLoading(prev => ({ ...prev, [testKey]: false }));
    }
  }, [testEmail, setTestLoading, setTestResults, setMsg, t]);

  const isMailSuccess = testResults.mail?.success;

  return (
    <div className="card mt-4 bg-body-tertiary">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">
          <i className="fas fa-paper-plane me-2" />
          {t('settings.smtpTestPanel.testEmailConfig')}
        </h3>

        <div className="mb-3">
          <label className="form-label" htmlFor="test-email-address">
            {t('settings.smtpTestPanel.testEmailAddress')}
          </label>
          <div className="input-group">
            <input
              id="test-email-address"
              className="form-control"
              type="email"
              placeholder={t('settings.smtpTestPanel.testEmailPlaceholder')}
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              disabled={testLoading.mail || loading}
            />
            <span className="input-group-text">
              <i className="fas fa-envelope" />
            </span>
          </div>
          <p className="form-text text-muted">{t('settings.smtpTestPanel.testEmailHelp')}</p>
        </div>

        <div className="mb-3">
          <button
            type="button"
            className="btn btn-info"
            onClick={testMailConnection}
            disabled={testLoading.mail || loading || !testEmail}
          >
            {testLoading.mail && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            )}
            <i className="fas fa-paper-plane me-2" />
            <span>{t('settings.smtpTestPanel.sendTestEmail')}</span>
          </button>
          <p className="form-text text-muted">{t('settings.smtpTestPanel.sendButtonHelp')}</p>
        </div>

        {testResults.mail && (
          <div className={`alert mt-3 ${isMailSuccess ? 'alert-success' : 'alert-danger'}`}>
            <div className="d-flex">
              <div className="flex-shrink-0 me-3">
                <i
                  className={`fas fa-2x ${isMailSuccess ? 'fa-check-circle' : 'fa-times-circle'}`}
                />
              </div>
              <div className="flex-grow-1">
                <p className="fw-semibold">{testResults.mail.message}</p>
                {testResults.mail.details && (
                  <div className="mt-2">
                    <p className="small">
                      <strong>{t('settings.smtpTestPanel.hostLabel')}</strong>{' '}
                      {testResults.mail.details.host} <br />
                      <strong>{t('settings.smtpTestPanel.portLabel')}</strong>{' '}
                      {testResults.mail.details.port} <br />
                      <strong>{t('settings.smtpTestPanel.secureLabel')}</strong>{' '}
                      {testResults.mail.details.secure
                        ? t('settings.smtpTestPanel.yes')
                        : t('settings.smtpTestPanel.no')}
                    </p>
                  </div>
                )}
                {testResults.mail.error && (
                  <p className="small text-muted mt-1">
                    <strong>{t('settings.smtpTestPanel.errorLabel')}</strong>{' '}
                    {testResults.mail.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Help */}
        <div className="mt-4">
          <h4 className="fs-6 fw-bold">{t('settings.smtpTestPanel.configHelp')}</h4>
          <div className="row g-3">
            <div className="col">
              <p>
                <strong>{t('settings.smtpTestPanel.gmailLabel')}</strong>
              </p>
              <ul className="small">
                <li>{t('settings.smtpTestPanel.gmailHost')}</li>
                <li>{t('settings.smtpTestPanel.gmailPort')}</li>
                <li>{t('settings.smtpTestPanel.gmailAppPassword')}</li>
              </ul>
              <p>
                <strong>{t('settings.smtpTestPanel.outlookLabel')}</strong>
              </p>
              <ul className="small">
                <li>{t('settings.smtpTestPanel.outlookHost')}</li>
                <li>{t('settings.smtpTestPanel.outlookPort')}</li>
              </ul>
            </div>
            <div className="col">
              <p>
                <strong>{t('settings.smtpTestPanel.yahooLabel')}</strong>
              </p>
              <ul className="small">
                <li>{t('settings.smtpTestPanel.yahooHost')}</li>
                <li>{t('settings.smtpTestPanel.yahooPort')}</li>
              </ul>
              <p>
                <strong>{t('settings.smtpTestPanel.customLabel')}</strong>
              </p>
              <ul className="small">
                <li>{t('settings.smtpTestPanel.customContact')}</li>
                <li>{t('settings.smtpTestPanel.customDocs')}</li>
              </ul>
            </div>
          </div>
          <div className="alert alert-info">
            <p className="small">
              <strong>{t('settings.smtpTestPanel.noteLabel')}</strong>{' '}
              {t('settings.smtpTestPanel.noteText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

SmtpTestPanel.propTypes = {
  testResults: PropTypes.object.isRequired,
  setTestResults: PropTypes.func.isRequired,
  testLoading: PropTypes.object.isRequired,
  setTestLoading: PropTypes.func.isRequired,
  testEmail: PropTypes.string.isRequired,
  setTestEmail: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default SmtpTestPanel;
