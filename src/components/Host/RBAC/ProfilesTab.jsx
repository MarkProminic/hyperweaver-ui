import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ProfilesTab = ({ profiles, loading, copyToClipboard }) => {
  const { t } = useTranslation();
  if (loading && profiles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('hostTools.ProfilesTab.loadingProfiles')}</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-id-card fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('hostTools.ProfilesTab.noProfilesFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>{t('hostTools.ProfilesTab.headerProfileName')}</th>
            <th>{t('hostTools.ProfilesTab.headerDescription')}</th>
            <th>{t('hostTools.ProfilesTab.headerActions')}</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(profile => (
            <tr key={profile.name}>
              <td>
                <strong>{profile.name}</strong>
              </td>
              <td className="small" title={profile.description}>
                {profile.description || t('hostTools.ProfilesTab.naFallback')}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => copyToClipboard(profile.name)}
                  title={t('hostTools.ProfilesTab.copyToClipboard')}
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

ProfilesTab.propTypes = {
  profiles: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
};

export default ProfilesTab;
