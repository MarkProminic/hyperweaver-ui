import PropTypes from 'prop-types';

const DeviceSummary = ({
  deviceCategories,
  devicesSummary,
  pptStatus,
  sectionsCollapsed,
  toggleSection,
}) => {
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
              Device Categories Summary
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('summary')}
              title={sectionsCollapsed.summary ? 'Expand section' : 'Collapse section'}
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
                  <span className="badge text-bg-secondary rounded-end-0">PPT Capable</span>
                  <span className="badge text-bg-success rounded-start-0">
                    {devicesSummary.ppt_capable ||
                      Object.values(deviceCategories).reduce(
                        (total, cat) => total + (cat.ppt_capable || 0),
                        0
                      )}
                  </span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">PPT Available</span>
                  <span className="badge text-bg-warning rounded-start-0">
                    {pptStatus.summary?.available || 0}
                  </span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">PPT Assigned</span>
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
