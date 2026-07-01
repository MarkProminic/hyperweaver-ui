import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';

import LogControls from './SystemLogs/LogControls';
import LogFileExplorer from './SystemLogs/LogFileExplorer';
import LogViewer from './SystemLogs/LogViewer';

const SystemLogs = ({ server }) => {
  const [logFiles, setLogFiles] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logData, setLogData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSession, setStreamSession] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [streamLines, setStreamLines] = useState([]);
  const [filters, setFilters] = useState({
    lines: 100,
    tail: true,
    grep: '',
    since: '',
  });

  const { makeAgentRequest } = useServers();

  const loadLogFiles = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/logs/list',
        'GET'
      );

      if (result.success) {
        setLogFiles(result.data?.log_files || []);
      } else {
        setError(result.message || 'Failed to load log files');
        setLogFiles([]);
      }
    } catch (err) {
      setError(`Error loading log files: ${err.message}`);
      setLogFiles([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest]);

  const loadLogContent = useCallback(async () => {
    if (!server || !selectedLog || !makeAgentRequest) {
      return;
    }

    try {
      setLogLoading(true);
      setError('');

      const params = {
        lines: filters.lines,
        tail: filters.tail,
      };
      if (filters.grep) {
        params.grep = filters.grep;
      }
      if (filters.since) {
        params.since = filters.since;
      }

      let endpoint = '';
      if (selectedLog.type === 'fault-manager') {
        endpoint = `system/logs/fault-manager/${selectedLog.subtype}`;
      } else {
        endpoint = `system/logs/${selectedLog.name}`;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        'GET',
        null,
        params
      );

      if (result.success) {
        setLogData(result.data);
      } else {
        setError(result.message || 'Failed to load log content');
        setLogData(null);
      }
    } catch (err) {
      setError(`Error loading log content: ${err.message}`);
      setLogData(null);
    } finally {
      setLogLoading(false);
    }
  }, [server, selectedLog, makeAgentRequest, filters]);

  const stopLogStream = useCallback(async () => {
    if (!streamSession || !makeAgentRequest) {
      return;
    }

    try {
      // Close WebSocket first
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/logs/stream/${streamSession.session_id}/stop`,
        'DELETE'
      );

      setIsStreaming(false);
      setStreamSession(null);
      setStreamLines([]);

      if (!result.success) {
        console.warn('Failed to stop stream session:', result.message);
      }
    } catch (err) {
      console.error('Error stopping log stream:', err);
    }
  }, [streamSession, makeAgentRequest, server, websocket]);

  const connectToWebSocket = useCallback(
    session => {
      const protocol = server.protocol === 'https' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${server.hostname}:${server.port}/logs/stream/${session.session_id}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to log stream:', session.session_id);
        setIsStreaming(true);
        setWebsocket(ws);
      };

      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'status':
              console.log('Stream status:', message.message);
              break;
            case 'log_line':
              setStreamLines(prev => {
                const newLines = [
                  ...prev,
                  {
                    line: message.line,
                    timestamp: message.timestamp,
                    id: Date.now() + Math.random(),
                  },
                ];
                // Keep only last 1000 lines to prevent memory issues
                return newLines.slice(-1000);
              });
              break;
            case 'error':
              setError(`Stream error: ${message.message}`);
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = event => {
        console.log('Log stream disconnected:', event.code, event.reason);
        setIsStreaming(false);
        setWebsocket(null);
        if (event.code !== 1000) {
          // Not a normal closure
          setError('Log stream connection lost');
        }
      };

      ws.onerror = err => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
        setIsStreaming(false);
      };
    },
    [server]
  );

  const startLogStream = async () => {
    if (!server || !selectedLog || !makeAgentRequest) {
      return;
    }
    if (selectedLog.type === 'fault-manager') {
      setError('Real-time streaming is not available for Fault Manager logs');
      return;
    }

    try {
      setLogLoading(true);
      setError('');

      const payload = {
        follow_lines: filters.lines,
        grep_pattern: filters.grep || null,
      };

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `system/logs/${selectedLog.name}/stream/start`,
        'POST',
        payload
      );

      if (result.success) {
        const session = result.data;
        setStreamSession(session);
        setStreamLines([]);
        connectToWebSocket(session);
      } else {
        setError(result.message || 'Failed to start log stream');
      }
    } catch (err) {
      setError(`Error starting log stream: ${err.message}`);
    } finally {
      setLogLoading(false);
    }
  };

  // Load log files on component mount
  useEffect(() => {
    loadLogFiles();
  }, [loadLogFiles]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh && selectedLog && !isStreaming) {
      const interval = setInterval(() => {
        loadLogContent();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, selectedLog, filters, isStreaming, loadLogContent]);

  // Auto-load content when selectedLog changes
  useEffect(() => {
    if (selectedLog) {
      loadLogContent();
    }
  }, [selectedLog, loadLogContent]);

  // Cleanup WebSocket on unmount or server change
  useEffect(
    () => () => {
      if (websocket) {
        websocket.close();
      }
      if (streamSession) {
        // We can't call stopLogStream here easily because it's async and depends on state that might be stale or unmounted
        // But we should try to clean up if possible, or rely on server timeout
      }
    },
    [server, websocket, streamSession]
  );

  const handleLogSelect = log => {
    // Stop any active streaming when switching logs
    if (isStreaming) {
      stopLogStream();
    }

    // Reset state for new log selection
    setSelectedLog(log);
    setLogData(null);
    setStreamLines([]);
    setError('');
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  const toggleStreaming = () => {
    if (isStreaming) {
      stopLogStream();
    } else {
      startLogStream();
    }
  };

  const clearStreamLines = () => {
    setStreamLines([]);
  };

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4 d-flex justify-content-between align-items-center">
          <p className="mb-0">{error}</p>
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      <div className="row g-3">
        {/* Left Panel - File Explorer */}
        <div className="col-lg-3">
          <LogFileExplorer
            logFiles={logFiles}
            selectedLog={selectedLog}
            onLogSelect={handleLogSelect}
            loading={loading}
          />
        </div>

        {/* Right Panel - Log Viewer */}
        <div className="col-lg-9">
          {selectedLog ? (
            <div>
              <LogControls
                filters={filters}
                onFilterChange={handleFilterChange}
                onRefresh={loadLogContent}
                loading={logLoading}
                autoRefresh={autoRefresh}
                onToggleAutoRefresh={toggleAutoRefresh}
                isStreaming={isStreaming}
                onToggleStreaming={toggleStreaming}
                selectedLog={selectedLog}
              />

              <LogViewer
                selectedLog={selectedLog}
                logData={logData}
                loading={logLoading}
                isStreaming={isStreaming}
                streamLines={streamLines}
                onClearStream={clearStreamLines}
              />
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center p-6">
                <i className="fas fa-file-alt fa-3x text-info" />
                <h4 className="fs-5 fw-bold mt-4">System Log Viewer</h4>
                <p>
                  Select a log file from the left panel to view its contents. Use filters to search
                  specific entries, limit line count, or view recent activity.
                </p>
                <div className="small text-muted">
                  <p>
                    <strong>Available Logs:</strong>
                  </p>
                  <ul>
                    <li>
                      <strong>System Logs:</strong> messages, syslog
                    </li>
                    <li>
                      <strong>Authentication:</strong> authlog
                    </li>
                    <li>
                      <strong>Fault Manager:</strong> faults, errors, info
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SystemLogs.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
};

export default SystemLogs;
