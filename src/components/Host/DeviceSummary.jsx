import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const DeviceSummary = ({
  deviceCategories,
  devicesSummary,
  pptStatus,
  sectionsCollapsed,
  toggleSection,
}) => {
  const { t } = useTranslation();

  if (Object.keys(deviceCategories).length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-chart-pie me-2" />
              {t('host.deviceSummary.title')}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('summary')}
              title={
                sectionsCollapsed.summary
                  ? t('host.deviceSummary.expand')
                  : t('host.deviceSummary.collapse')
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
                {Object.entries(deviceCategories).map(([category, stats]) => (
                  <div key={category} className="d-inline-flex">
                    <span className="badge text-bg-secondary rounded-end-0">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                    <span className="badge text-bg-info rounded-start-0">{stats.total || 0}</span>
                  </div>
                ))}
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">
                    {t('host.deviceSummary.pptCapableLabel')}
                  </span>
                  <span className="badge text-bg-success rounded-start-0">
                    {devicesSummary.ppt_capable ||
                      Object.values(deviceCategories).reduce(
                        (total, cat) => total + (cat.ppt_capable || 0),
                        0
                      )}
                  </span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">
                    {t('host.deviceSummary.pptAvailableLabel')}
                  </span>
                  <span className="badge text-bg-warning rounded-start-0">
                    {pptStatus.summary?.available || 0}
                  </span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">
                    {t('host.deviceSummary.pptAssignedLabel')}
                  </span>
                  <span className="badge text-bg-danger rounded-start-0">
                    {devicesSummary.ppt_assigned || 0}
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

DeviceSummary.propTypes = {
  deviceCategories: PropTypes.object.isRequired,
  devicesSummary: PropTypes.object.isRequired,
  pptStatus: PropTypes.object.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default DeviceSummary;
