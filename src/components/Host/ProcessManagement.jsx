import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { hasHypervisor } from '../../utils/capabilities';
import { useDebounce } from '../../utils/debounce';

import ProcessActionModals from './ProcessActionModals';
import ProcessDetailsModal from './ProcessDetailsModal';
import ProcessTable from './ProcessTable';

const ProcessManagement = ({ server }) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableZones, setAvailableZones] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filters, setFilters] = useState({
    pattern: '',
    zone: '',
    user: '',
    detailed: true,
  });

  // Modal states
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showKillModal, setShowKillModal] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showBatchKillModal, setShowBatchKillModal] = useState(false);

  const { makeAgentRequest } = useServers();

  // The zone filter is an illumos concept — the Go agent has no `zone`
  // field and ignores `?zone=`.
  const isBhyve = hasHypervisor(server, 'bhyve');
  // gopsutil on a Windows host delivers only TERM/KILL signals.
  const limitedSignals = server?.capabilities?.platform === 'windows';

  // Debounce the pattern filter to avoid excessive API calls
  const debouncedPattern = useDebounce(filters.pattern, 500);

  const loadZones = useCallback(async () => {
    if (!server || !makeAgentRequest || !isBhyve) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'machines',
        'GET'
      );

      if (result.success && result.data?.machines) {
        const zones = result.data.machines.map(machine => machine.name).filter(Boolean);
        const uniqueZones = [...new Set(zones)].sort();
        setAvailableZones(['global', ...uniqueZones]);
      }
    } catch (err) {
      console.error('Error loading zones:', err);
    }
  }, [server, makeAgentRequest, isBhyve]);

  const loadProcesses = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = {};
      if (debouncedPattern) {
        params.command = debouncedPattern;
      }
      if (filters.zone) {
        params.zone = filters.zone;
      }
      if (filters.user) {
        params.user = filters.user;
      }
      if (filters.detailed) {
        params.detailed = true;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/processes',
        'GET',
        null,
        params
      );

      if (result.success) {
        const processData = result.data || [];
        setProcesses(processData);

        // Extract unique users for filter dropdown
        const users = [...new Set(processData.map(p => p.username).filter(Boolean))].sort();
        setAvailableUsers(users);
      } else {
        setError(result.message || 'Failed to load processes');
        setProcesses([]);
      }
    } catch (err) {
      setError(`Error loading processes: ${err.message}`);
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, debouncedPattern, filters.zone, filters.user, filters.detailed]);

  // Load processes on component mount and when filters change
  useEffect(() => {
    loadProcesses();
    loadZones();
  }, [loadProcesses, loadZones]);

  const handleProcessAction = async (pid, action, options = {}) => {
    if (!server || !makeAgentRequest) {
      return { success: false, message: 'Server not available' };
    }

    try {
      setLoading(true);
      setError('');

      let endpoint;
      let method;
      let body;

      if (action === 'kill') {
        endpoint = `system/processes/${pid}/kill`;
        method = 'POST';
        body = { force: options.force || false };
      } else if (action === 'signal') {
        endpoint = `system/processes/${pid}/signal`;
        method = 'POST';
        body = { signal: options.signal || 'TERM' };
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        endpoint,
        method,
        body
      );

      if (result.success) {
        // Refresh processes list after action
        await loadProcesses();
        return { success: true, message: result.message };
      }
      setError(result.message || `Failed to ${action} process`);
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = `Error performing ${action}: ${err.message}`;
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const handleBatchKill = async (pattern, signal = 'TERM', zone = '') => {
    if (!server || !makeAgentRequest) {
      return { success: false, message: 'Server not available' };
    }

    try {
      setLoading(true);
      setError('');

      const body = { pattern, signal };
      if (zone) {
        body.zone = zone;
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/processes/batch-kill',
        'POST',
        body
      );

      if (result.success) {
        await loadProcesses();
        return {
          success: true,
          message: result.message,
          killed: result.killed || [],
        };
      }
      setError(result.message || 'Failed to perform batch kill');
      return { success: false, message: result.message };
    } catch (err) {
      const errorMsg = `Error performing batch kill: ${err.message}`;
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async process => {
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
        `system/processes/${process.pid}`,
        'GET'
      );

      if (result.success) {
        setSelectedProcess({ ...process, details: result.data });
        setShowDetailsModal(true);
      } else {
        setError(result.message || 'Failed to load process details');
      }
    } catch (err) {
      setError(`Error loading process details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      pattern: '',
      zone: '',
      user: '',
      detailed: true,
    });
  };

  return (
    <div>
      {/* Process Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="command-filter">
                  Filter by Command
                </label>
                <input
                  id="command-filter"
                  className="form-control"
                  type="text"
                  placeholder="Enter command pattern..."
                  value={filters.pattern}
                  onChange={e => handleFilterChange('pattern', e.target.value)}
                />
              </div>
            </div>
            {isBhyve && (
              <div className="col">
                <div className="mb-3">
                  <label className="form-label" htmlFor="zone-filter">
                    Filter by Zone
                  </label>
                  <select
                    id="zone-filter"
                    className="form-select"
                    value={filters.zone}
                    onChange={e => handleFilterChange('zone', e.target.value)}
                  >
                    <option value="">All Zones</option>
                    {availableZones.map(zone => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="user-filter">
                  Filter by User
                </label>
                <select
                  id="user-filter"
                  className="form-select"
                  value={filters.user}
                  onChange={e => handleFilterChange('user', e.target.value)}
                >
                  <option value="">All Users</option>
                  {availableUsers.map(user => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="detailed-view-toggle">
                  Detailed View
                </label>
                <div className="form-check form-switch">
                  <input
                    id="detailed-view-toggle"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={filters.detailed}
                    onChange={e => handleFilterChange('detailed', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="detailed-view-toggle">
                    Show CPU/Memory
                  </label>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="refresh-button">
                  Refresh
                </label>
                <div>
                  <button
                    id="refresh-button"
                    type="button"
                    className="btn btn-info"
                    onClick={loadProcesses}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="clear-filters-button">
                  Clear
                </label>
                <div>
                  <button
                    id="clear-filters-button"
                    type="button"
                    className="btn btn-secondary"
                    onClick={clearFilters}
                    disabled={loading}
                  >
                    <i className="fas fa-times me-2" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="mb-3">
                <label className="form-label" htmlFor="batch-kill-button">
                  Actions
                </label>
                <div>
                  <button
                    id="batch-kill-button"
                    type="button"
                    className="btn btn-warning"
                    onClick={() => setShowBatchKillModal(true)}
                    disabled={loading}
                  >
                    <i className="fas fa-stop-circle me-2" />
                    <span>Batch Kill</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      {/* Processes Table */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fs-6 fw-bold">
              Processes ({processes.length})
              {loading && (
                <span className="ml-2">
                  <i className="fas fa-spinner fa-spin" />
                </span>
              )}
            </h3>
          </div>

          <ProcessTable
            processes={processes}
            loading={loading}
            onViewDetails={handleViewDetails}
            onKillProcess={process => {
              setSelectedProcess(process);
              setShowKillModal(true);
            }}
            onSendSignal={process => {
              setSelectedProcess(process);
              setShowSignalModal(true);
            }}
            showDetailedView={filters.detailed}
          />
        </div>
      </div>

      {/* Process Details Modal */}
      {showDetailsModal && selectedProcess && (
        <ProcessDetailsModal
          process={selectedProcess}
          server={server}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProcess(null);
          }}
        />
      )}

      {/* Action Modals */}
      <ProcessActionModals
        selectedProcess={selectedProcess}
        showKillModal={showKillModal}
        showSignalModal={showSignalModal}
        showBatchKillModal={showBatchKillModal}
        availableZones={availableZones}
        limitedSignals={limitedSignals}
        onCloseKillModal={() => {
          setShowKillModal(false);
          setSelectedProcess(null);
        }}
        onCloseSignalModal={() => {
          setShowSignalModal(false);
          setSelectedProcess(null);
        }}
        onCloseBatchKillModal={() => setShowBatchKillModal(false)}
        onProcessAction={handleProcessAction}
        onBatchKill={handleBatchKill}
      />
    </div>
  );
};

ProcessManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    protocol: PropTypes.string.isRequired,
    capabilities: PropTypes.shape({
      platform: PropTypes.string,
    }),
  }).isRequired,
};

export default ProcessManagement;
