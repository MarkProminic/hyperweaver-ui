import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const NetworkSummary = ({ networkInterfaces, sectionsCollapsed, toggleSection }) => {
  const { t } = useTranslation();
  if (networkInterfaces.length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-chart-pie me-2" />
              {t('host.networkSummary.title')}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('summary')}
              title={
                sectionsCollapsed.summary
                  ? t('host.networkSummary.expand')
                  : t('host.networkSummary.collapse')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.summary ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.summary && (
          <div className="row g-3">
            <div className="col">
              <div className="d-flex flex-wrap gap-2">
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">
                    {t('host.networkSummary.totalInterfaces')}
                  </span>
                  <span className="badge text-bg-info">{networkInterfaces.length}</span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">
                    {t('host.networkSummary.physical')}
                  </span>
                  <span className="badge text-bg-primary">
                    {networkInterfaces.filter(i => i.class === 'phys').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">
                    {t('host.networkSummary.virtual')}
                  </span>
                  <span className="badge text-bg-info">
                    {networkInterfaces.filter(i => i.class === 'vnic').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">{t('host.networkSummary.up')}</span>
                  <span className="badge text-bg-success">
                    {networkInterfaces.filter(i => i.state === 'up').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">{t('host.networkSummary.down')}</span>
                  <span className="badge text-bg-danger">
                    {networkInterfaces.filter(i => i.state === 'down').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

NetworkSummary.propTypes = {
  networkInterfaces: PropTypes.arrayOf(
    PropTypes.shape({
      class: PropTypes.string,
      state: PropTypes.string,
    })
  ).isRequired,
  sectionsCollapsed: PropTypes.shape({
    summary: PropTypes.bool.isRequired,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default NetworkSummary;
