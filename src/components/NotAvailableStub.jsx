import { Helmet } from '@dr.pogodin/react-helmet';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * "Not available on this host" page for capability-gated routes — the deep-link
 * guard: hiding a tab never guarded its URL, so a typed/bookmarked path on an
 * agent without the capability lands here instead of a page of failing fetches.
 */
const NotAvailableStub = ({ title, tokenLabel }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{`${title} - Hyperweaver`}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
            <strong>{title}</strong>
          </div>
          <div className="px-4">
            <div className="alert alert-info">
              <p className="mb-0">
                {t('chrome.notAvailableStub.bodyPrefix', { title })} <code>{tokenLabel}</code>{' '}
                {t('chrome.notAvailableStub.bodySuffix')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

NotAvailableStub.propTypes = {
  title: PropTypes.string.isRequired,
  tokenLabel: PropTypes.string.isRequired,
};

export default NotAvailableStub;
