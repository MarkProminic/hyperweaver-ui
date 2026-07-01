import PropTypes from 'prop-types';

const ProfileInfo = ({ user }) => (
  <div className="card">
    <div className="card-body">
      <h2 className="fs-5 fw-bold">Profile Information</h2>
      {user?.gravatar?.avatar_url && (
        <div className="text-center mb-4">
          <img
            src={user.gravatar.avatar_url}
            alt="Profile Avatar"
            className="rounded-circle"
            width={128}
            height={128}
          />
        </div>
      )}

      {user?.gravatar?.display_name && (
        <div className="mb-3">
          <label className="form-label" htmlFor="display_name">
            Display Name
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
            First Name
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
            Last Name
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
            Job Title
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
            Location
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
            Timezone
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
          <p>No Gravatar profile found for this email address.</p>
          <p className="small mt-2">
            <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer">
              Create a Gravatar profile
            </a>{' '}
            to display your profile information here.
          </p>
        </div>
      )}
    </div>
  </div>
);

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
