import PropTypes from 'prop-types';

const NetworkSummary = ({ networkInterfaces, sectionsCollapsed, toggleSection }) => {
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
              Network Summary
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
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">Total Interfaces</span>
                  <span className="badge text-bg-info">{networkInterfaces.length}</span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">Physical</span>
                  <span className="badge text-bg-primary">
                    {networkInterfaces.filter(i => i.class === 'phys').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">Virtual</span>
                  <span className="badge text-bg-info">
                    {networkInterfaces.filter(i => i.class === 'vnic').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">Up</span>
                  <span className="badge text-bg-success">
                    {networkInterfaces.filter(i => i.state === 'up').length}
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge text-bg-secondary">Down</span>
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
