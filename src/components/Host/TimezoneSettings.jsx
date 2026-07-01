import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../../contexts/ServerContext';

import NTPConfirmActionModal from './NTPConfirmActionModal';

const TimezoneSettings = ({ server, onError }) => {
  const [timezoneInfo, setTimezoneInfo] = useState(null);
  const [availableTimezones, setAvailableTimezones] = useState([]);
  const [filteredTimezones, setFilteredTimezones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);

  const { makeAgentRequest } = useServers();

  const loadTimezoneInfo = useCallback(async () => {
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
        'system/timezone',
        'GET'
      );

      if (result.success) {
        setTimezoneInfo(result.data);
        setSelectedTimezone(result.data.timezone || '');
      } else {
        onError(result.message || 'Failed to load timezone information');
      }
    } catch (err) {
      onError(`Error loading timezone information: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [server, makeAgentRequest, onError]);

  const loadAvailableTimezones = useCallback(async () => {
    if (!server || !makeAgentRequest) {
      return;
    }

    try {
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/timezones',
        'GET'
      );

      if (result.success) {
        setAvailableTimezones(result.data.timezones || []);
      } else {
        // Don't show error for timezones - it's not critical
        console.warn('Failed to load available timezones:', result.message);
        setAvailableTimezones([]);
      }
    } catch (err) {
      console.warn('Error loading available timezones:', err.message);
      setAvailableTimezones([]);
    }
  }, [server, makeAgentRequest]);

  const filterTimezones = useCallback(() => {
    if (!availableTimezones || availableTimezones.length === 0) {
      setFilteredTimezones([]);
      return;
    }

    let filtered = [...availableTimezones];

    // Filter by region
    if (regionFilter) {
      filtered = filtered.filter(tz => tz.startsWith(regionFilter));
    }

    // Filter by search text
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(tz => tz.toLowerCase().includes(searchLower));
    }

    // Sort alphabetically
    filtered.sort();

    setFilteredTimezones(filtered);
  }, [availableTimezones, searchFilter, regionFilter]);

  // Load timezone information on component mount
  useEffect(() => {
    loadTimezoneInfo();
    loadAvailableTimezones();
  }, [loadTimezoneInfo, loadAvailableTimezones]);

  // Filter timezones when search or region changes
  useEffect(() => {
    filterTimezones();
  }, [filterTimezones]);

  const handleChangeTimezone = async () => {
    if (!selectedTimezone) {
      onError('Please select a timezone');
      return { success: false };
    }

    if (selectedTimezone === timezoneInfo?.timezone) {
      onError('Selected timezone is the same as current timezone');
      return { success: false };
    }

    try {
      setChanging(true);
      onError('');

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/timezone',
        'PUT',
        {
          timezone: selectedTimezone,
          created_by: 'api',
        }
      );

      if (result.success) {
        // Show success message and refresh timezone info
        console.log(`Timezone changed to ${selectedTimezone}`);
        setTimeout(() => loadTimezoneInfo(), 1000);
        return { success: true };
      }
      onError(result.message || 'Failed to change timezone');
      return { success: false };
    } catch (err) {
      onError(`Error changing timezone: ${err.message}`);
      return { success: false };
    } finally {
      setChanging(false);
    }
  };

  const getTimezoneRegions = () => {
    if (!availableTimezones || availableTimezones.length === 0) {
      return [];
    }

    const regions = [
      ...new Set(availableTimezones.filter(tz => tz.includes('/')).map(tz => tz.split('/')[0])),
    ].sort();

    return regions;
  };

  const formatTimezoneDisplay = timezone => {
    if (!timezone) {
      return 'Unknown';
    }

    // Split timezone into parts for better display
    const parts = timezone.split('/');
    if (parts.length === 1) {
      return timezone;
    }

    return `${parts[0]} → ${parts.slice(1).join(' / ')}`;
  };

  const getTimezoneDescription = timezone => {
    if (!timezone) {
      return '';
    }

    // Provide simple descriptions for common timezone regions
    const descriptions = {
      America: 'North and South American timezones',
      Europe: 'European timezones',
      Asia: 'Asian timezones',
      Africa: 'African timezones',
      Australia: 'Australian timezones',
      Pacific: 'Pacific Ocean timezones',
      Atlantic: 'Atlantic Ocean timezones',
      Indian: 'Indian Ocean timezones',
      Antarctica: 'Antarctica research station timezones',
      UTC: 'Coordinated Universal Time',
    };

    const [region] = timezone.split('/');
    return descriptions[region] || '';
  };

  const hasChanges = selectedTimezone !== timezoneInfo?.timezone;
  const regions = getTimezoneRegions();

  if (loading && !timezoneInfo) {
    return (
      <div className="text-center p-4">
        <span>
          <i className="fas fa-spinner fa-spin fa-2x" />
        </span>
        <p className="mt-2">Loading timezone information...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fs-5 fw-bold">Timezone Configuration</h2>
        <p>
          View and modify the system timezone for <strong>{server.hostname}</strong>. Timezone
          changes may require a system reboot for full effect.
        </p>
      </div>

      {/* Current Timezone Information */}
      {timezoneInfo && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Current Timezone Information</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  <tr>
                    <td>
                      <strong>Current Timezone</strong>
                    </td>
                    <td className="font-monospace">{timezoneInfo.timezone}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Display Name</strong>
                    </td>
                    <td>{formatTimezoneDisplay(timezoneInfo.timezone)}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Description</strong>
                    </td>
                    <td>
                      {getTimezoneDescription(timezoneInfo.timezone) || 'System timezone setting'}
                    </td>
                  </tr>
                  {timezoneInfo.local_time && (
                    <tr>
                      <td>
                        <strong>Current Local Time</strong>
                      </td>
                      <td>{new Date(timezoneInfo.local_time).toLocaleString()}</td>
                    </tr>
                  )}
                  {timezoneInfo.utc_offset && (
                    <tr>
                      <td>
                        <strong>UTC Offset</strong>
                      </td>
                      <td className="font-monospace">{timezoneInfo.utc_offset}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Timezone Selection */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Change Timezone</h3>

          {/* Filter Controls */}
          <div className="row mb-4">
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="timezone-search">
                  Search Timezones
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-search" />
                  </span>
                  <input
                    id="timezone-search"
                    className="form-control"
                    type="text"
                    placeholder="Search timezones..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="col">
              <div className="mb-3">
                <label className="form-label" htmlFor="timezone-region">
                  Filter by Region
                </label>
                <select
                  id="timezone-region"
                  className="form-select"
                  value={regionFilter}
                  onChange={e => setRegionFilter(e.target.value)}
                >
                  <option value="">All Regions</option>
                  {regions.map(region => (
                    <option key={region} value={region}>
                      {region} ({getTimezoneDescription(`${region}/`)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timezone Selection */}
          <div className="mb-3">
            <label className="form-label" htmlFor="timezone-select">
              Select New Timezone
              {filteredTimezones.length > 0 && (
                <span className="small text-muted ms-2">
                  ({filteredTimezones.length} available)
                </span>
              )}
            </label>
            <select
              id="timezone-select"
              className="form-select"
              value={selectedTimezone}
              onChange={e => setSelectedTimezone(e.target.value)}
              disabled={changing || filteredTimezones.length === 0}
            >
              <option value="">Choose a timezone...</option>
              {filteredTimezones.map(tz => (
                <option key={tz} value={tz}>
                  {tz} {tz === timezoneInfo?.timezone ? '(current)' : ''}
                </option>
              ))}
            </select>
            {availableTimezones.length === 0 && (
              <p className="form-text text-muted">
                Unable to load available timezones. You may need to manually enter a valid timezone.
              </p>
            )}
          </div>

          {/* Manual Entry Fallback */}
          {availableTimezones.length === 0 && (
            <div className="mb-3">
              <label className="form-label" htmlFor="timezone-manual">
                Manual Timezone Entry
              </label>
              <input
                id="timezone-manual"
                className="form-control font-monospace"
                type="text"
                placeholder="e.g., America/Chicago, Europe/London, Asia/Tokyo"
                value={selectedTimezone}
                onChange={e => setSelectedTimezone(e.target.value)}
                disabled={changing}
              />
              <p className="form-text text-muted">
                Enter a valid timezone identifier (e.g., America/New_York, Europe/London,
                Asia/Tokyo).
              </p>
            </div>
          )}

          {/* Selection Info */}
          {selectedTimezone && selectedTimezone !== timezoneInfo?.timezone && (
            <div className="alert alert-info">
              <p>
                <strong>Selected:</strong> {formatTimezoneDisplay(selectedTimezone)}
                <br />
                <strong>Description:</strong>{' '}
                {getTimezoneDescription(selectedTimezone) || 'Timezone setting'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Actions */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Timezone Actions</h3>

          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => setShowActionModal(true)}
              disabled={!hasChanges || !selectedTimezone || changing}
            >
              {changing && <span className="spinner-border spinner-border-sm" />}
              <span className="me-1">
                <i className="fas fa-clock" />
              </span>
              <span>Change Timezone</span>
            </button>
            <button
              className="btn"
              onClick={() => setSelectedTimezone(timezoneInfo?.timezone || '')}
              disabled={!hasChanges || changing}
            >
              <span className="me-1">
                <i className="fas fa-undo" />
              </span>
              <span>Reset</span>
            </button>
            <button
              className="btn btn-info"
              onClick={loadTimezoneInfo}
              disabled={loading || changing}
            >
              {loading && <span className="spinner-border spinner-border-sm" />}
              <span className="me-1">
                <i className="fas fa-sync-alt" />
              </span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Reboot Warning */}
          <div className="alert alert-warning mt-4">
            <p>
              <strong>Important:</strong> Timezone changes may require a system reboot to take full
              effect. Some services and applications may continue using the old timezone until
              restarted.
            </p>
          </div>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <NTPConfirmActionModal
          service={{
            timezone: selectedTimezone,
            current: timezoneInfo?.timezone,
          }}
          action="timezone"
          onClose={() => setShowActionModal(false)}
          onConfirm={handleChangeTimezone}
        />
      )}
    </div>
  );
};

TimezoneSettings.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default TimezoneSettings;
