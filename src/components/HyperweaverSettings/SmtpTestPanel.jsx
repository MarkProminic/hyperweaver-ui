import axios from 'axios';
import PropTypes from 'prop-types';
import { useCallback } from 'react';

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
  const testMailConnection = useCallback(async () => {
    const testKey = 'mail';
    if (!testEmail) {
      setMsg('Please enter a test email address');
      return;
    }

    try {
      setTestLoading(prev => ({ ...prev, [testKey]: true }));
      setTestResults(prev => ({ ...prev, [testKey]: null }));
      setMsg('Testing SMTP connection and sending test email...');

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
        setMsg('Test email sent successfully! Check your inbox.');
      } else {
        setTestResults(prev => ({
          ...prev,
          [testKey]: {
            success: false,
            message: response.data.message,
            error: response.data.error,
          },
        }));
        setMsg(`Mail test failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Mail test error:', error);
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          success: false,
          message: 'Mail test failed',
          error: error.response?.data?.error || error.message,
        },
      }));
      setMsg(`Mail test error: ${error.response?.data?.message || error.message}`);
    } finally {
      setTestLoading(prev => ({ ...prev, [testKey]: false }));
    }
  }, [testEmail, setTestLoading, setTestResults, setMsg]);

  const isMailSuccess = testResults.mail?.success;

  return (
    <div className="card mt-4 bg-body-tertiary">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">
          <i className="fas fa-paper-plane me-2" />
          Test Email Configuration
        </h3>

        <div className="mb-3">
          <label className="form-label" htmlFor="test-email-address">
            Test Email Address
          </label>
          <div className="input-group">
            <input
              id="test-email-address"
              className="form-control"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              disabled={testLoading.mail || loading}
            />
            <span className="input-group-text">
              <i className="fas fa-envelope" />
            </span>
          </div>
          <p className="form-text text-muted">Send a test email to verify SMTP configuration</p>
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
            <span>Send Test Email</span>
          </button>
          <p className="form-text text-muted">
            Tests SMTP server connection and sends a test email
          </p>
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
                      <strong>Host:</strong> {testResults.mail.details.host} <br />
                      <strong>Port:</strong> {testResults.mail.details.port} <br />
                      <strong>Secure:</strong> {testResults.mail.details.secure ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
                {testResults.mail.error && (
                  <p className="small text-muted mt-1">
                    <strong>Error:</strong> {testResults.mail.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Help */}
        <div className="mt-4">
          <h4 className="fs-6 fw-bold">Configuration Help</h4>
          <div className="row g-3">
            <div className="col">
              <p>
                <strong>Gmail:</strong>
              </p>
              <ul className="small">
                <li>Host: smtp.gmail.com</li>
                <li>Port: 587 (TLS) or 465 (SSL)</li>
                <li>Use App Password (not regular password)</li>
              </ul>
              <p>
                <strong>Outlook/Hotmail:</strong>
              </p>
              <ul className="small">
                <li>Host: smtp-mail.outlook.com</li>
                <li>Port: 587</li>
              </ul>
            </div>
            <div className="col">
              <p>
                <strong>Yahoo:</strong>
              </p>
              <ul className="small">
                <li>Host: smtp.mail.yahoo.com</li>
                <li>Port: 587 or 465</li>
              </ul>
              <p>
                <strong>Custom SMTP:</strong>
              </p>
              <ul className="small">
                <li>Contact your hosting provider</li>
                <li>Check documentation for settings</li>
              </ul>
            </div>
          </div>
          <div className="alert alert-info">
            <p className="small">
              <strong>Note:</strong> Save settings first, then use the test button to verify
              configuration.
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
