import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';

const HostnameSettings = ({ server, onError }) => {
  const [hostnameInfo, setHostnameInfo] = useState(null);
  const [newHostname, setNewHostname] = useState('');
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [applyImmediately, setApplyImmediately] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadHostnameInfo = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      setLoading(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/hostname',
        'GET'
      );

      if (result.success) {
        setHostnameInfo(result.data);
        setNewHostname(result.data.hostname || '');
      } else {
        onError(result.message || 'Failed to load hostname information');
      }
    } catch (err) {
      onError(`Error loading hostname information: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [makeAgentRequest, server, onError]);

  // Load current hostname information
  useEffect(() => {
    loadHostnameInfo();
  }, [loadHostnameInfo]);

  const handleChangeHostname = async e => {
    e.preventDefault();

    if (!newHostname.trim()) {
      onError('Hostname cannot be empty');
      return;
    }

    if (newHostname === hostnameInfo?.hostname) {
      onError('New hostname is the same as current hostname');
      return;
    }

    try {
      setChanging(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'network/hostname',
        'PUT',
        {
          hostname: newHostname.trim(),
          apply_immediately: applyImmediately,
        }
      );

      if (result.success) {
        // Refresh hostname info after successful change
        await loadHostnameInfo();

        // Show success message
        const message = applyImmediately
          ? `Hostname changed to "${newHostname}" and applied immediately`
          : `Hostname change to "${newHostname}" scheduled (requires reboot)`;

        // You might want to show a success notification here
        console.log(message);
      } else {
        onError(result.message || 'Failed to change hostname');
      }
    } catch (err) {
      onError(`Error changing hostname: ${err.message}`);
    } finally {
      setChanging(false);
    }
  };

  const isHostnameValid = hostname => {
    // RFC compliant hostname/FQDN validation
    if (!hostname || hostname.length === 0 || hostname.length > 253) {
      return false;
    }

    // Split into labels (parts separated by dots)
    const labels = hostname.split('.');

    // Each label must be valid
    for (const label of labels) {
      // Label length check (1-63 characters)
      if (label.length === 0 || label.length > 63) {
        return false;
      }

      // Label format check: start/end with alphanumeric, hyphens allowed in middle
      const labelRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
      if (!labelRegex.test(label)) {
        return false;
      }
    }

    return true;
  };

  const hasChanges = newHostname !== hostnameInfo?.hostname;

  if (loading && !hostnameInfo) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-spinner fa-spin fa-2x" />
        </span>
        <p className="mt-2">Loading hostname information...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Hostname Configuration</h2>
        <p>
          View and modify the system hostname for <strong>{server.hostname}</strong>.
        </p>
      </div>

      {/* Current Hostname Information */}
      {hostnameInfo && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Current Hostname Information</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  <tr>
                    <td>
                      <strong>Current Hostname</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.hostname}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Nodename File</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.nodename_file}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>System Hostname</strong>
                    </td>
                    <td className="font-monospace">{hostnameInfo.system_hostname}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Configuration Match</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${hostnameInfo.matches ? 'text-bg-success' : 'text-bg-warning'}`}
                      >
                        {hostnameInfo.matches ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {!hostnameInfo.matches && (
              <div className="alert alert-warning">
                <p>
                  <strong>Warning:</strong> The system hostname does not match the configuration
                  file. This may indicate a pending hostname change that requires a reboot.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Hostname Form */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Change Hostname</h3>

          <form onSubmit={handleChangeHostname}>
            <div className="mb-3">
              <label className="form-label" htmlFor="new-hostname-input">
                New Hostname
              </label>
              <input
                id="new-hostname-input"
                className={`form-control ${newHostname && !isHostnameValid(newHostname) ? 'is-invalid' : ''}`}
                type="text"
                placeholder="Enter new hostname"
                value={newHostname}
                onChange={e => setNewHostname(e.target.value)}
                disabled={changing}
              />
              {newHostname && !isHostnameValid(newHostname) && (
                <p className="form-text text-danger">
                  Invalid hostname. Must be a valid hostname or FQDN
                </p>
              )}
            </div>

            <div className="mb-3">
              <label className="form-check-label">
                <input
                  type="checkbox"
                  checked={applyImmediately}
                  onChange={e => setApplyImmediately(e.target.checked)}
                  disabled={changing}
                />
                <span className="ms-2">Apply immediately (no reboot required)</span>
              </label>
              <p className="form-text text-muted">
                {applyImmediately
                  ? 'The hostname will be changed immediately without requiring a reboot.'
                  : 'The hostname will be changed in configuration files and applied after next reboot.'}
              </p>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!hasChanges || !isHostnameValid(newHostname) || changing}
              >
                {changing && <span className="spinner-border spinner-border-sm" />}
                Change Hostname
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setNewHostname(hostnameInfo?.hostname || '')}
                disabled={!hasChanges || changing}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-info"
                onClick={loadHostnameInfo}
                disabled={loading || changing}
              >
                {loading && <span className="spinner-border spinner-border-sm" />}
                <span className="me-1">
                  <i className="fas fa-sync-alt" />
                </span>
                <span>Refresh</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

HostnameSettings.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string.isRequired,
    port: PropTypes.number.isRequired,
    protocol: PropTypes.string.isRequired,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default HostnameSettings;
