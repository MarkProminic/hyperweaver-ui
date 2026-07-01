import PropTypes from 'prop-types';

import GravatarSkeleton from './skeleton.jsx';
import './style.scss';

export default function GravatarCard({ gravatarData, hasError, isLoading }) {
  if (hasError) {
    return <div className="gravatar-card__error">Gravatar profile not found!</div>;
  }

  if (isLoading) {
    return <GravatarSkeleton />;
  }

  if (!gravatarData) {
    return null;
  }

  return (
    <div
      className="gravatar-card"
      style={{
        backgroundColor: gravatarData.background_color,
        backgroundImage: `url(${gravatarData.header_image})`,
      }}
    >
      <div className="row">
        <div className="col-3">
          <img
            src={`${gravatarData.avatar_url}?size=256`}
            className="gravatar-card__avatar"
            alt={gravatarData.avatar_alt_text}
          />
          <img
            src={`https://api.gravatar.com/v3/qr-code/${gravatarData.hash}?size=256`}
            className="gravatar-card__qr"
            alt="QR Code"
          />
        </div>
        <div className="col">
          <h1 className="gravatar-card__name">{gravatarData.display_name}</h1>
          <div className="gravatar-card__meta">
            <div>
              <p>
                <strong>First Name:</strong> {gravatarData.first_name}
              </p>
              <p>
                <strong>Last Name:</strong> {gravatarData.last_name}
              </p>
              <p>
                <strong>Job Title:</strong> {gravatarData.job_title}{' '}
                {gravatarData.company && `at ${gravatarData.company}`}
              </p>
              <p>
                <strong>Location:</strong> {gravatarData.location}
              </p>
              <p>
                <strong>Pronouns:</strong> {gravatarData.pronouns}
              </p>
              <p>
                <strong>Timezone:</strong> {gravatarData.timezone}
              </p>
              <p>
                <strong>Last Profile Edit:</strong> {gravatarData.last_profile_edit}
              </p>
              <p>
                <strong>Registration Date:</strong> {gravatarData.registration_date}
              </p>
            </div>
          </div>
          <p className="gravatar-card__description">{gravatarData.description}</p>

          {gravatarData.links && (
            <div>
              <h2>Links</h2>
              <ul>
                {gravatarData.links.map(link => (
                  <li key={link.url}>
                    <a href={link.url}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gravatarData.interests && (
            <div>
              <h2>Interests</h2>
              <ul>
                {gravatarData.interests.map(interest => (
                  <li key={interest.id}>{interest.name}</li>
                ))}
              </ul>
            </div>
          )}

          {gravatarData.languages && (
            <div>
              <h2>Languages</h2>
              <ul>
                {gravatarData.languages.map(lang => (
                  <li key={lang.code}>
                    {lang.name} {lang.is_primary && '(Primary)'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gravatarData.verified_accounts && (
            <div className="gravatar-card__network">
              <h2>Verified Accounts</h2>
              <>
                <a href={gravatarData.profile_url}>
                  <img src="https://secure.gravatar.com/icons/gravatar.svg" alt="Gravatar" />
                </a>
                {gravatarData.verified_accounts.map(acc => (
                  <a key={acc.service_label} href={acc.url}>
                    <img src={acc.service_icon} alt={acc.service_label} />
                  </a>
                ))}
              </>
            </div>
          )}

          {gravatarData.gallery && (
            <div>
              <h2>Gallery</h2>
              <div className="gravatar-card__gallery">
                {gravatarData.gallery.map(image => (
                  <img key={image.url} src={image.url} alt={image.alt_text} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

GravatarCard.propTypes = {
  gravatarData: PropTypes.shape({
    background_color: PropTypes.string,
    header_image: PropTypes.string,
    avatar_url: PropTypes.string,
    avatar_alt_text: PropTypes.string,
    hash: PropTypes.string,
    display_name: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    job_title: PropTypes.string,
    company: PropTypes.string,
    location: PropTypes.string,
    pronouns: PropTypes.string,
    timezone: PropTypes.string,
    last_profile_edit: PropTypes.string,
    registration_date: PropTypes.string,
    description: PropTypes.string,
    links: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        label: PropTypes.string,
      })
    ),
    interests: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
      })
    ),
    languages: PropTypes.arrayOf(
      PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string,
        is_primary: PropTypes.bool,
      })
    ),
    verified_accounts: PropTypes.arrayOf(
      PropTypes.shape({
        service_label: PropTypes.string,
        url: PropTypes.string,
        service_icon: PropTypes.string,
      })
    ),
    profile_url: PropTypes.string,
    gallery: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        alt_text: PropTypes.string,
      })
    ),
  }),
  hasError: PropTypes.bool,
  isLoading: PropTypes.bool,
};
