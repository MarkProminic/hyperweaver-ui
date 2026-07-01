import PropTypes from 'prop-types';

const LogFileExplorer = ({ logFiles, selectedLog, onLogSelect, loading }) => {
  const getLogIcon = type => {
    switch (type) {
      case 'system':
        return 'fas fa-server';
      case 'authentication':
        return 'fas fa-key';
      case 'fault-manager':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-file-alt';
    }
  };

  // Group log files by type for the file explorer
  const groupedLogs = logFiles.reduce((acc, log) => {
    if (!acc[log.type]) {
      acc[log.type] = [];
    }
    acc[log.type].push(log);
    return acc;
  }, {});

  // Fault Manager logs aren't returned by the log-list API, so surface them as
  // static entries when the passed logFiles don't already include them.
  if (!groupedLogs['fault-manager']) {
    groupedLogs['fault-manager'] = [
      {
        name: 'faults',
        displayName: 'Faults',
        type: 'fault-manager',
        subtype: 'faults',
      },
      {
        name: 'errors',
        displayName: 'Errors',
        type: 'fault-manager',
        subtype: 'errors',
      },
      {
        name: 'info',
        displayName: 'Info',
        type: 'fault-manager',
        subtype: 'info',
      },
      {
        name: 'info-hival',
        displayName: 'Info (High Value)',
        type: 'fault-manager',
        subtype: 'info-hival',
      },
    ];
  }

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-folder-open me-2" />
          <span>Log Files</span>
        </h4>

        {loading ? (
          <div className="text-center p-4">
            <i className="fas fa-spinner fa-spin" />
            <p className="mt-2 small">Loading...</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedLogs).map(([type, logs]) => (
              <div key={type} className="mb-3">
                <p className="text-uppercase small fw-semibold text-muted">
                  {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Logs
                </p>
                <div className="list-group">
                  {logs.map(log => (
                    <button
                      key={log.name}
                      type="button"
                      className={`list-group-item list-group-item-action d-flex align-items-center${
                        selectedLog?.name === log.name ? ' active' : ''
                      }`}
                      onClick={() => {
                        onLogSelect(log);
                      }}
                    >
                      <i className={`${getLogIcon(log.type)} me-2`} />
                      <span>{log.displayName || log.name}</span>
                      {log.sizeFormatted && (
                        <span className="badge text-bg-secondary ms-auto">{log.sizeFormatted}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

LogFileExplorer.propTypes = {
  logFiles: PropTypes.array.isRequired,
  selectedLog: PropTypes.object,
  onLogSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default LogFileExplorer;
