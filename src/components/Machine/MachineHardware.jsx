import PropTypes from 'prop-types';

const MachineHardware = ({ machineDetails }) => {
  // Structured hardware rows are the zadm (bhyve) configuration shape only — the
  // VirtualBox flat showvminfo map renders via the generic table on the Machines page.
  if (!machineDetails?.configuration?.zonename) {
    return null;
  }

  const { configuration } = machineDetails;

  const renderStatusBadge = (value, trueCondition, onLabel = 'Enabled', offLabel = 'Disabled') => (
    <span className={`fw-semibold ${value === trueCondition ? 'text-success' : 'text-danger'}`}>
      {value === trueCondition ? onLabel : offLabel}
    </span>
  );

  const renderVncPort = () => {
    if (machineDetails.vnc_session_info?.web_port) {
      return (
        <span className="text-muted font-monospace">
          {machineDetails.vnc_session_info.web_port}
        </span>
      );
    }

    const configPort = configuration?.vnc?.port;
    const infoPort = machineDetails.machine_info?.vnc_port;

    if (configPort || infoPort) {
      return <span className="text-muted font-monospace">{configPort || infoPort}</span>;
    }

    return <span className="fw-semibold text-success">Auto</span>;
  };

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-microchip me-2" />
          Hardware & System
        </h4>
        <div className="table-responsive">
          <table className="table table-striped small">
            <tbody>
              <tr>
                <td className="px-3 py-2">
                  <strong>RAM</strong>
                </td>
                <td className="px-3 py-2">{configuration.ram}</td>
                <td className="px-3 py-2">
                  <strong>ACPI</strong>
                </td>
                <td className="px-3 py-2">{renderStatusBadge(configuration.acpi, 'true')}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>vCPUs</strong>
                </td>
                <td className="px-3 py-2">{configuration.vcpus}</td>
                <td className="px-3 py-2">
                  <strong>Auto Boot</strong>
                </td>
                <td className="px-3 py-2">{renderStatusBadge(configuration.autoboot, 'true')}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>Boot ROM</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted font-monospace">{configuration.bootrom}</span>
                </td>
                <td className="px-3 py-2">
                  <strong>UEFI Vars</strong>
                </td>
                <td className="px-3 py-2">
                  {renderStatusBadge(configuration.uefivars, 'on', 'On', 'Off')}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>Host Bridge</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted font-monospace">{configuration.hostbridge}</span>
                </td>
                <td className="px-3 py-2">
                  <strong>xHCI</strong>
                </td>
                <td className="px-3 py-2">
                  {renderStatusBadge(configuration.xhci, 'on', 'On', 'Off')}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>Brand</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted font-monospace">{configuration.brand}</span>
                </td>
                <td className="px-3 py-2">
                  <strong>RNG</strong>
                </td>
                <td className="px-3 py-2">
                  {renderStatusBadge(configuration.rng, 'on', 'On', 'Off')}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>Type</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted font-monospace">{configuration.type || 'N/A'}</span>
                </td>
                <td className="px-3 py-2">
                  <strong>Cloud Init</strong>
                </td>
                <td className="px-3 py-2">
                  {renderStatusBadge(configuration['cloud-init'], 'on', 'On', 'Off')}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>VNC Console</strong>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`fw-semibold ${machineDetails.vnc_session_info ? 'text-success' : 'text-danger'}`}
                  >
                    {machineDetails.vnc_session_info ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <strong>VNC Port</strong>
                </td>
                <td className="px-3 py-2">{renderVncPort()}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <strong>zlogin</strong>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`fw-semibold ${machineDetails.zlogin_session ? 'text-success' : 'text-danger'}`}
                  >
                    {machineDetails.zlogin_session ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

MachineHardware.propTypes = {
  machineDetails: PropTypes.shape({
    configuration: PropTypes.shape({
      zonename: PropTypes.string,
      ram: PropTypes.string,
      acpi: PropTypes.string,
      vcpus: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      autoboot: PropTypes.string,
      bootrom: PropTypes.string,
      uefivars: PropTypes.string,
      hostbridge: PropTypes.string,
      xhci: PropTypes.string,
      brand: PropTypes.string,
      rng: PropTypes.string,
      type: PropTypes.string,
      'cloud-init': PropTypes.string,
      vnc: PropTypes.shape({
        port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    }),
    vnc_session_info: PropTypes.shape({
      web_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    machine_info: PropTypes.shape({
      vnc_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    zlogin_session: PropTypes.object,
  }),
};

export default MachineHardware;
