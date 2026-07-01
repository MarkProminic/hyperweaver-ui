import PropTypes from 'prop-types';

import LdapTestPanel from './LdapTestPanel';
import SmtpTestPanel from './SmtpTestPanel';

const TestingPanel = ({
  values,
  testResults,
  setTestResults,
  testLoading,
  setTestLoading,
  testEmail,
  setTestEmail,
  ldapTestCredentials,
  setLdapTestCredentials,
  setMsg,
  loading,
  sectionName,
}) => (
  <>
    {sectionName === 'Authentication' && (
      <LdapTestPanel
        values={values}
        testResults={testResults}
        setTestResults={setTestResults}
        testLoading={testLoading}
        setTestLoading={setTestLoading}
        ldapTestCredentials={ldapTestCredentials}
        setLdapTestCredentials={setLdapTestCredentials}
        setMsg={setMsg}
        loading={loading}
      />
    )}

    {sectionName === 'Mail' && (
      <SmtpTestPanel
        testResults={testResults}
        setTestResults={setTestResults}
        testLoading={testLoading}
        setTestLoading={setTestLoading}
        testEmail={testEmail}
        setTestEmail={setTestEmail}
        setMsg={setMsg}
        loading={loading}
      />
    )}
  </>
);

TestingPanel.propTypes = {
  values: PropTypes.object.isRequired,
  testResults: PropTypes.object.isRequired,
  setTestResults: PropTypes.func.isRequired,
  testLoading: PropTypes.object.isRequired,
  setTestLoading: PropTypes.func.isRequired,
  testEmail: PropTypes.string.isRequired,
  setTestEmail: PropTypes.func.isRequired,
  ldapTestCredentials: PropTypes.shape({
    testUsername: PropTypes.string,
    testPassword: PropTypes.string,
  }).isRequired,
  setLdapTestCredentials: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  sectionName: PropTypes.string.isRequired,
};

export default TestingPanel;
