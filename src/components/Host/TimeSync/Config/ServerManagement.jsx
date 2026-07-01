import PropTypes from 'prop-types';

const ServerManagement = ({
  serverList,
  newServer,
  setNewServer,
  onAddServer,
  onRemoveServer,
  saving,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <h3 className="fs-6 fw-bold">Server Management</h3>

      {/* Add Server */}
      <div className="input-group mb-4">
        <input
          className="form-control"
          type="text"
          placeholder="Add NTP server (e.g., 0.pool.ntp.org)"
          value={newServer}
          onChange={e => setNewServer(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && onAddServer()}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddServer}
          disabled={!newServer.trim() || saving}
        >
          <i className="fas fa-plus me-2" />
          <span>Add Server</span>
        </button>
      </div>

      {/* Current Servers */}
      {serverList.length > 0 && (
        <div>
          <p className="text-muted">Current Servers ({serverList.length})</p>
          <div className="d-flex flex-wrap gap-2">
            {serverList.map(srv => (
              <span
                key={srv}
                className="badge text-bg-secondary d-inline-flex align-items-center gap-1"
              >
                <i className="fas fa-server" />
                <span className="font-monospace">{srv}</span>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  onClick={() => onRemoveServer(srv)}
                  disabled={saving}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

ServerManagement.propTypes = {
  serverList: PropTypes.arrayOf(PropTypes.string).isRequired,
  newServer: PropTypes.string.isRequired,
  setNewServer: PropTypes.func.isRequired,
  onAddServer: PropTypes.func.isRequired,
  onRemoveServer: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

export default ServerManagement;
