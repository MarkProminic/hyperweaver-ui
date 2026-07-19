import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const LogFileExplorer = ({ logFiles, selectedLog, onLogSelect, loading }) => {
  const { t } = useTranslation();

  const typeHeading = type =>
    t('host.logFileExplorer.typeLogs', {
      type: t(`host.logFileExplorer.logType.${type}`, {
        defaultValue: type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      }),
    });

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
        displayName: t('host.logFileExplorer.faults'),
        type: 'fault-manager',
        subtype: 'faults',
      },
      {
        name: 'errors',
        displayName: t('host.logFileExplorer.errors'),
        type: 'fault-manager',
        subtype: 'errors',
      },
      {
        name: 'info',
        displayName: t('host.logFileExplorer.info'),
        type: 'fault-manager',
        subtype: 'info',
      },
      {
        name: 'info-hival',
        displayName: t('host.logFileExplorer.infoHival'),
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
          <span>{t('host.logFileExplorer.logFiles')}</span>
        </h4>

        {loading ? (
          <div className="text-center p-4">
            <i className="fas fa-spinner fa-spin" />
            <p className="mt-2 small">{t('host.logFileExplorer.loading')}</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedLogs).map(([type, logs]) => (
              <div key={type} className="mb-3">
                <p className="text-uppercase small fw-semibold text-muted">{typeHeading(type)}</p>
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
