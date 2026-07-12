import PropTypes from 'prop-types';

// VirtualBox-flavored status vocabulary rides in VALUES (sync-file ruling):
// configured | running | stopped | suspended | paused | aborted | starting | stopping | unknown.
// bhyve reports its own set (running/installed/...). Color by meaning, not by hypervisor.
const statusClass = status => {
  switch ((status || '').toLowerCase()) {
    case 'running':
      return 'text-success';
    case 'starting':
    case 'stopping':
      return 'text-info';
    case 'suspended':
    case 'paused':
    case 'configured':
      return 'text-warning';
    case 'stopped':
    case 'aborted':
    case 'incomplete':
      return 'text-danger';
    default:
      return 'text-muted';
  }
};

const MachineInfo = ({ machineDetails, monitoringHealth, getMachineStatus, selectedMachine }) => {
  if (!machineDetails || !machineDetails.machine_info) {
    return null;
  }

  const { machine_info, configuration } = machineDetails;

  // Prefer the detail payload's status (full vocabulary); fall back to the
  // stats-derived running/stopped binary when the agent doesn't report one.
  const status = machine_info.status || getMachineStatus(selectedMachine);

  const getHealthClass = healthStatus => {
    if (healthStatus === 'healthy') {
      return 'text-success';
    }
    if (healthStatus === 'warning') {
      return 'text-warning';
    }
    return 'text-danger';
  };

  const renderConfigurationRows = () => {
    // Structured rows are the zadm (bhyve) configuration shape only — the VirtualBox
    // flat showvminfo map renders via the generic table on the Machines page instead.
    if (!configuration?.zonename) {
      return null;
    }

    return (
      <>
        <tr>
          <td className="px-3 py-2">
            <strong>Name</strong>
          </td>
          <td className="px-3 py-2">
            <code className="small">{configuration.zonename}</code>
          </td>
        </tr>
        <tr>
          <td className="px-3 py-2">
            <strong>Path</strong>
          </td>
          <td className="px-3 py-2">
            <code className="small">{configuration.zonepath}</code>
          </td>
        </tr>
        {configuration.bootargs && (
          <tr>
            <td className="px-3 py-2">
              <strong>Boot Args</strong>
            </td>
            <td className="px-3 py-2">
              <code className="small">{configuration.bootargs || 'None'}</code>
            </td>
          </tr>
        )}
        {configuration.hostid && (
          <tr>
            <td className="px-3 py-2">
              <strong>Host ID</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.hostid || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration.pool && (
          <tr>
            <td className="px-3 py-2">
              <strong>Pool</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.pool || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration['scheduling-class'] && (
          <tr>
            <td className="px-3 py-2">
              <strong>Scheduling Class</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">
                {configuration['scheduling-class'] || 'None'}
              </span>
            </td>
          </tr>
        )}
        {configuration.limitpriv && (
          <tr>
            <td className="px-3 py-2">
              <strong>Limit Privileges</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">{configuration.limitpriv || 'None'}</span>
            </td>
          </tr>
        )}
        {configuration['fs-allowed'] && (
          <tr>
            <td className="px-3 py-2">
              <strong>FS Allowed</strong>
            </td>
            <td className="px-3 py-2">
              <span className="badge text-bg-secondary">
                {configuration['fs-allowed'] || 'None'}
              </span>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-info-circle me-2" />
          Machine Information
        </h4>
        <div className="table-responsive">
          <table className="table table-striped small">
            <tbody>
              <tr>
                <td className="px-3 py-2">
                  <strong>System Status</strong>
                </td>
                <td className="px-3 py-2">
                  <span className={`fw-semibold text-capitalize ${statusClass(status)}`}>
                    {status || 'Unknown'}
                  </span>
                </td>
              </tr>
              {machine_info.backing && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Backing</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="badge text-bg-secondary"
                      title="How lifecycle operations reach the hypervisor"
                    >
                      {machine_info.backing}
                    </span>
                    {machine_info.home && (
                      <code className="small ms-2" title="Vagrant project directory">
                        {machine_info.home}
                      </code>
                    )}
                  </td>
                </tr>
              )}
              {Object.keys(monitoringHealth).length > 0 && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Host Health</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`fw-semibold ${getHealthClass(monitoringHealth.status)}`}>
                      {monitoringHealth.status
                        ? monitoringHealth.status.charAt(0).toUpperCase() +
                          monitoringHealth.status.slice(1)
                        : 'Unknown'}
                    </span>
                    {(monitoringHealth.networkErrors > 0 || monitoringHealth.storageErrors > 0) && (
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {monitoringHealth.networkErrors > 0 && (
                          <span className="badge text-bg-warning">
                            Net Errors: {monitoringHealth.networkErrors}
                          </span>
                        )}
                        {monitoringHealth.storageErrors > 0 && (
                          <span className="badge text-bg-warning">
                            Storage Errors: {monitoringHealth.storageErrors}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-2">
                  <strong>Last Seen</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted">
                    {machine_info.last_seen
                      ? new Date(machine_info.last_seen).toLocaleString()
                      : 'N/A'}
                  </span>
                </td>
              </tr>
              {Array.isArray(configuration?.guest_info?.ips) &&
                configuration.guest_info.ips.length > 0 && (
                  <tr>
                    <td className="px-3 py-2">
                      <strong>Guest IP</strong>
                    </td>
                    <td className="px-3 py-2">
                      {configuration.guest_info.ips.map(ip => (
                        <code className="small me-2" key={ip}>
                          {ip}
                        </code>
                      ))}
                      <span className="text-muted small">
                        via{' '}
                        {configuration.guest_info.source === 'additions'
                          ? 'Guest Additions'
                          : 'guest agent'}
                      </span>
                    </td>
                  </tr>
                )}
              {(machine_info.is_orphaned || machine_info.auto_discovered) && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Flags</strong>
                  </td>
                  <td className="px-3 py-2">
                    <div className="d-flex flex-wrap gap-1">
                      {machine_info.is_orphaned && (
                        <span className="badge text-bg-warning">Orphaned</span>
                      )}
                      {machine_info.auto_discovered && (
                        <span className="badge text-bg-info">Auto-discovered</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {renderConfigurationRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

MachineInfo.propTypes = {
  machineDetails: PropTypes.shape({
    machine_info: PropTypes.shape({
      status: PropTypes.string,
      backing: PropTypes.string,
      home: PropTypes.string,
      last_seen: PropTypes.string,
      is_orphaned: PropTypes.bool,
      auto_discovered: PropTypes.bool,
    }),
    configuration: PropTypes.shape({
      zonename: PropTypes.string,
      zonepath: PropTypes.string,
      bootargs: PropTypes.string,
      hostid: PropTypes.string,
      pool: PropTypes.string,
      'scheduling-class': PropTypes.string,
      limitpriv: PropTypes.string,
      'fs-allowed': PropTypes.string,
      guest_info: PropTypes.shape({
        ips: PropTypes.arrayOf(PropTypes.string),
        source: PropTypes.string,
        agent_responding: PropTypes.bool,
        checked_at: PropTypes.string,
      }),
    }),
  }),
  monitoringHealth: PropTypes.shape({
    status: PropTypes.string,
    networkErrors: PropTypes.number,
    storageErrors: PropTypes.number,
  }),
  getMachineStatus: PropTypes.func.isRequired,
  selectedMachine: PropTypes.string,
};

export default MachineInfo;
