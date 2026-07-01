import PropTypes from 'prop-types';

const StorageSummary = ({
  storagePools,
  storageDatasets,
  storageDisks,
  sectionsCollapsed,
  toggleSection,
}) => {
  if (storagePools.length === 0 && storageDatasets.length === 0 && storageDisks.length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-chart-pie me-2" />
              Storage Summary
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
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">Total Pools</span>
                  <span className="badge text-bg-info rounded-start-0">{storagePools.length}</span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">Total Datasets</span>
                  <span className="badge text-bg-info rounded-start-0">
                    {storageDatasets.length}
                  </span>
                </div>
                <div className="d-inline-flex">
                  <span className="badge text-bg-secondary rounded-end-0">Physical Disks</span>
                  <span className="badge text-bg-info rounded-start-0">{storageDisks.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

StorageSummary.propTypes = {
  storagePools: PropTypes.array.isRequired,
  storageDatasets: PropTypes.array.isRequired,
  storageDisks: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default StorageSummary;
