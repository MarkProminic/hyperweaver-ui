import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const RolesTab = ({ roles, loading, copyToClipboard }) => {
  const { t } = useTranslation();
  if (loading && roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('hostTools.RolesTab.loadingRoles')}</p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-user-shield fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('hostTools.RolesTab.noRolesFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('hostTools.RolesTab.headerRoleName')}</th>
            <th>{t('hostTools.RolesTab.headerDescription')}</th>
            <th>{t('hostTools.RolesTab.headerActions')}</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.name}>
              <td>
                <div className="d-flex align-items-center">
                  <i className="fas fa-user-shield text-warning me-2" />
                  <span>
                    <strong>{role.name}</strong>
                  </span>
                </div>
              </td>
              <td className="small" title={role.description}>
                {role.description || t('hostTools.RolesTab.naFallback')}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(role.name)}
                  title={t('hostTools.RolesTab.copyToClipboard')}
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

RolesTab.propTypes = {
  roles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default RolesTab;
