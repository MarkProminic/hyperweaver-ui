import PropTypes from 'prop-types';

const ExpandedChartControls = ({ visibility, setVisibility, labels }) => (
  <div className="mb-4">
    <div className="d-flex gap-2 justify-content-center">
      {Object.entries(labels).map(([key, { label, className }]) => (
        <div key={key}>
          <button
            className={`btn btn-sm ${visibility[key] ? className : 'btn-dark'}`}
            onClick={() => setVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
            title={`Toggle ${label} visibility`}
          >
            <i className={`fas ${visibility[key] ? 'fa-eye' : 'fa-eye-slash'} me-1`} />
            <span>{label}</span>
          </button>
        </div>
      ))}
    </div>
  </div>
);

ExpandedChartControls.propTypes = {
  visibility: PropTypes.object.isRequired,
  setVisibility: PropTypes.func.isRequired,
  labels: PropTypes.object.isRequired,
};

export default ExpandedChartControls;
