import PropTypes from 'prop-types';

const DeviceHeader = ({ selectedServer, loading, loadDeviceData }) => (
  <div className="titlebar active card-header d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
    <div className="d-flex align-items-center gap-2">
      <strong>Device Monitoring</strong>
    </div>
    <div className="d-flex align-items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => selectedServer && loadDeviceData(selectedServer)}
        disabled={loading}
      >
        {loading && (
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
        )}
        <i className="fas fa-sync me-2" />
        Refresh
      </button>
    </div>
  </div>
);

DeviceHeader.propTypes = {
  selectedServer: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  loadDeviceData: PropTypes.func.isRequired,
};

export default DeviceHeader;
