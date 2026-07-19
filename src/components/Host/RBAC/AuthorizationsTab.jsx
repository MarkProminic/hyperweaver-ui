import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const AuthorizationsTab = ({ authorizations, loading, copyToClipboard }) => {
  const { t } = useTranslation();
  if (loading && authorizations.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('hostTools.AuthorizationsTab.loadingAuthorizations')}</p>
      </div>
    );
  }

  if (authorizations.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-shield-alt fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('hostTools.AuthorizationsTab.noAuthorizationsFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('hostTools.AuthorizationsTab.headerAuthorization')}</th>
            <th>{t('hostTools.AuthorizationsTab.headerShortDescription')}</th>
            <th>{t('hostTools.AuthorizationsTab.headerLongDescription')}</th>
            <th>{t('hostTools.AuthorizationsTab.headerActions')}</th>
          </tr>
        </thead>
        <tbody>
          {authorizations.map(auth => (
            <tr key={auth.name}>
              <td>
                <code className="small">{auth.name}</code>
              </td>
              <td className="small">
                {auth.short_description || t('hostTools.AuthorizationsTab.naFallback')}
              </td>
              <td className="small" title={auth.long_description}>
                {auth.long_description && auth.long_description.length > 50
                  ? `${auth.long_description.substring(0, 50)}...`
                  : auth.long_description || t('hostTools.AuthorizationsTab.naFallback')}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(auth.name)}
                  title={t('hostTools.AuthorizationsTab.copyToClipboard')}
                >
                  <i className="fas fa-copy" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

AuthorizationsTab.propTypes = {
  authorizations: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default AuthorizationsTab;
