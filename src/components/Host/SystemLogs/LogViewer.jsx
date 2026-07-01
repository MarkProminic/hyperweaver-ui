import PropTypes from 'prop-types';
import { useMemo } from 'react';

const LogViewer = ({ selectedLog, logData, loading, isStreaming, streamLines, onClearStream }) => {
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

  const getLogLevelClass = line => {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fail')) {
      return 'text-danger';
    }
    if (lower.includes('warning') || lower.includes('warn')) {
      return 'text-warning';
    }
    if (lower.includes('info')) {
      return 'text-info';
    }
    if (lower.includes('debug')) {
      return 'text-muted';
    }
    return 'text-white';
  };

  const formatTimestamp = line => {
    // Extract timestamp from beginning of line if present
    const timestampMatch = line.match(/^(?<timestamp>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
    return timestampMatch ? timestampMatch.groups.timestamp : '';
  };

  const handleDownload = () => {
    const blob = new Blob([logData.raw_output || logData.lines?.join('\n') || ''], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLog.name}-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const staticLogLines = useMemo(
    () => (logData?.lines || []).map((line, i) => ({ line, id: `static-${i}` })),
    [logData?.lines]
  );

  const renderLogContent = () => {
    const hasContent = (isStreaming && streamLines.length > 0) || (logData && logData.lines);

    if (hasContent) {
      return (
        <div>
          <pre
            className="card card-body bg-dark text-light small log-viewer"
            style={{
              height: '500px',
              overflowY: 'auto',
              lineHeight: '1.2',
            }}
            ref={el => {
              // Auto-scroll to bottom for streaming
              if (el && isStreaming) {
                el.scrollTop = el.scrollHeight;
              }
            }}
          >
            {isStreaming
              ? // Display streaming lines
                streamLines.map(item => {
                  const timestamp = formatTimestamp(item.line);
                  const content = timestamp
                    ? item.line.substring(timestamp.length).trim()
                    : item.line;

                  return (
                    <div key={`${selectedLog.name}-${item.id}`} className="log-line mb-1">
                      {timestamp && <span className="text-secondary me-2">{timestamp}</span>}
                      <span className={getLogLevelClass(content)}>{content}</span>
                    </div>
                  );
                })
              : // Display static log lines

                staticLogLines.map(item => {
                  const timestamp = formatTimestamp(item.line);
                  const content = timestamp
                    ? item.line.substring(timestamp.length).trim()
                    : item.line;
                  return (
                    <div key={`${selectedLog.name}-${item.id}`} className="log-line mb-1">
                      {timestamp && <span className="text-secondary me-2">{timestamp}</span>}
                      <span className={getLogLevelClass(content)}>{content}</span>
                    </div>
                  );
                })}
          </pre>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-center p-6">
          <i className="fas fa-spinner fa-spin fa-2x" />
          <p className="mt-2">
            {isStreaming ? 'Connecting to log stream...' : 'Loading log content...'}
          </p>
        </div>
      );
    }

    if (isStreaming) {
      return (
        <div className="text-center p-6">
          <i className="fas fa-satellite-dish fa-2x text-success" />
          <p className="mt-2 text-success">
            <strong>Live stream active</strong>
          </p>
          <p className="small text-muted">Waiting for new log entries...</p>
        </div>
      );
    }

    return (
      <div className="text-center p-6">
        <i className="fas fa-file-alt fa-2x text-muted" />
        <p className="mt-2 text-muted">
          {selectedLog ? 'Click Refresh to load log content' : 'Select a log file to view content'}
        </p>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-6 fw-bold mb-0">
              <i className={`${getLogIcon(selectedLog.type)} me-2`} />
              <span>{selectedLog.displayName || selectedLog.name}</span>
              {loading && (
                <span className="ms-2">
                  <i className="fas fa-spinner fa-spin" />
                </span>
              )}
              {isStreaming && (
                <span className="badge text-bg-primary ms-2">
                  <i className="fas fa-satellite-dish me-2" />
                  <span>Live Stream</span>
                </span>
              )}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            {isStreaming && streamLines.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={onClearStream}
                title="Clear stream buffer"
              >
                <i className="fas fa-eraser me-2" />
                <span>Clear</span>
              </button>
            )}
            <div className="d-flex gap-2">
              {isStreaming && (
                <span className="badge text-bg-primary">{streamLines.length} stream lines</span>
              )}
              {!isStreaming && logData && (
                <span className="badge text-bg-info">{logData.totalLines} lines</span>
              )}
            </div>
          </div>
        </div>

        {/* Log Display */}
        {renderLogContent()}

        {/* Log File Info */}
        {logData && logData.fileInfo && (
          <div className="alert alert-secondary mt-3 small">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="small mb-0">
                  <strong>File:</strong> {logData.path}
                  <span className="ms-3">
                    <strong>Size:</strong> {logData.fileInfo.sizeFormatted}
                  </span>
                  <span className="ms-3">
                    <strong>Modified:</strong>{' '}
                    {new Date(logData.fileInfo.modified).toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleDownload}
                  title="Download Log"
                >
                  <i className="fas fa-download me-2" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

LogViewer.propTypes = {
  selectedLog: PropTypes.object.isRequired,
  logData: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  isStreaming: PropTypes.bool.isRequired,
  streamLines: PropTypes.array.isRequired,
  onClearStream: PropTypes.func.isRequired,
};

export default LogViewer;
