import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ProfileInfo = ({ user }) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="fs-5 fw-bold">{t('auth.profileInfo.title')}</h2>
        {user?.gravatar?.avatar_url && (
          <div className="text-center mb-4">
            <img
              src={user.gravatar.avatar_url}
              alt={t('auth.profileInfo.avatarAlt')}
              className="rounded-circle"
              width={128}
              height={128}
            />
          </div>
        )}

        {user?.gravatar?.display_name && (
          <div className="mb-3">
            <label className="form-label" htmlFor="display_name">
              {t('auth.profileInfo.displayName')}
            </label>
            <input
              id="display_name"
              className="form-control"
              type="text"
              value={user.gravatar.display_name}
              disabled
            />
          </div>
        )}

        {user?.gravatar?.first_name && (
          <div className="mb-3">
            <label className="form-label" htmlFor="first_name">
              {t('auth.profileInfo.firstName')}
            </label>
            <input
              id="first_name"
              className="form-control"
              type="text"
              value={user.gravatar.first_name}
              disabled
            />
          </div>
        )}

        {user?.gravatar?.last_name && (
          <div className="mb-3">
            <label className="form-label" htmlFor="last_name">
              {t('auth.profileInfo.lastName')}
            </label>
            <input
              id="last_name"
              className="form-control"
              type="text"
              value={user.gravatar.last_name}
              disabled
            />
          </div>
        )}

        {user?.gravatar?.job_title && (
          <div className="mb-3">
            <label className="form-label" htmlFor="job_title">
              {t('auth.profileInfo.jobTitle')}
            </label>
            <input
              id="job_title"
              className="form-control"
              type="text"
              value={user.gravatar.job_title}
              disabled
            />
          </div>
        )}

        {user?.gravatar?.location && (
          <div className="mb-3">
            <label className="form-label" htmlFor="location">
              {t('auth.profileInfo.location')}
            </label>
            <input
              id="location"
              className="form-control"
              type="text"
              value={user.gravatar.location}
              disabled
            />
          </div>
        )}

        {user?.gravatar?.timezone && (
          <div className="mb-3">
            <label className="form-label" htmlFor="timezone">
              {t('auth.profileInfo.timezone')}
            </label>
            <input
              id="timezone"
              className="form-control"
              type="text"
              value={user.gravatar.timezone}
              disabled
            />
          </div>
        )}

        {(!user?.gravatar || Object.keys(user.gravatar).length === 0) && (
          <div className="alert alert-info">
            <p>{t('auth.profileInfo.noGravatar')}</p>
            <p className="small mt-2">
              <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer">
                {t('auth.profileInfo.createGravatar')}
              </a>{' '}
              {t('auth.profileInfo.createGravatarSuffix')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

ProfileInfo.propTypes = {
  user: PropTypes.shape({
    gravatar: PropTypes.shape({
      avatar_url: PropTypes.string,
      display_name: PropTypes.string,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      job_title: PropTypes.string,
      location: PropTypes.string,
      timezone: PropTypes.string,
    }),
  }),
};

export default ProfileInfo;
