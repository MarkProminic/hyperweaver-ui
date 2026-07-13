import PropTypes from 'prop-types';

import { HardwareDeviceTree } from './CurrentHardware';

/**
 * The machine's hardware in ONE card: its SPECS (the zadm knob values — what
 * the machine is configured as) on top, its DEVICES (what is actually plugged
 * into it) beneath. VirtualBox machines carry no zadm specs, so they show the
 * device tree alone; the flat showvminfo map renders elsewhere.
 */

const renderStatusBadge = (value, trueCondition, onLabel = 'Enabled', offLabel = 'Disabled') => (
  <span className={`fw-semibold ${value === trueCondition ? 'text-success' : 'text-danger'}`}>
    {value === trueCondition ? onLabel : offLabel}
  </span>
);

const MachineHardware = ({ machineDetails, currentHardware, colClass = 'col-12' }) => {
  const configuration = machineDetails?.configuration;
  const isZone = !!configuration?.zonename;
  const hasDevices = !!(
    currentHardware?.zone ||
    currentHardware?.controllers?.length > 0 ||
    currentHardware?.attachments?.length > 0 ||
    currentHardware?.nics?.length > 0
  );

  if (!isZone && !hasDevices) {
    return null;
  }

  // The noVNC web port: a PINNED port (the consoleport attr) is what every
  // session gets; without one the agent hands out the next free port from its
  // pool, so only a live session has a number to show.
  const renderVncPort = () => {
    const pinned = machineDetails.knob_current?.consoleport;
    if (pinned) {
      return (
        <>
          <span className="text-muted font-monospace">{pinned}</span>
          <span className="badge text-bg-secondary ms-2" title="Pinned by the consoleport attr">
            pinned
          </span>
        </>
      );
    }

    const livePort =
      machineDetails.vnc_session_info?.web_port || machineDetails.machine_info?.vnc_port;
    if (livePort) {
      return (
        <>
          <span className="text-muted font-monospace">{livePort}</span>
          <span className="text-muted small ms-2">(this session)</span>
        </>
      );
    }

    return <span className="fw-semibold text-success">Auto (agent pool)</span>;
  };

  return (
    <div className={colClass}>
      <div className="card h-100">
        <div className="card-body">
          <h4 className="fs-6 fw-bold mb-3">
            <i className="fas fa-microchip me-2" />
            Hardware
          </h4>

          {isZone && (
            <div className="table-responsive">
              <table className="table table-striped small mb-0">
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
                    <td className="px-3 py-2">
                      {renderStatusBadge(configuration.autoboot, 'true')}
                    </td>
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
                      <span className="text-muted font-monospace">
                        {configuration.type || 'N/A'}
                      </span>
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
                    <td className="px-3 py-2" colSpan={3}>
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
          )}

          {hasDevices && (
            <div className={isZone ? 'mt-3' : ''}>
              <HardwareDeviceTree currentHardware={currentHardware} />
            </div>
          )}
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
    }),
    vnc_session_info: PropTypes.shape({
      web_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    machine_info: PropTypes.shape({
      vnc_port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    knob_current: PropTypes.shape({
      consoleport: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    zlogin_session: PropTypes.object,
  }),
  currentHardware: PropTypes.object,
  colClass: PropTypes.string,
};

export default MachineHardware;
