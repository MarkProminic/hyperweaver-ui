import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { HardwareDeviceTree } from './CurrentHardware';

/**
 * The machine's hardware in ONE card: its SPECS (the zadm knob values — what
 * the machine is configured as) on top, its DEVICES (what is actually plugged
 * into it) beneath. VirtualBox machines carry no zadm specs, so they show the
 * device tree alone; the flat showvminfo map renders elsewhere.
 */

const renderStatusBadge = (value, trueCondition, onLabel, offLabel) => (
  <span className={`fw-semibold ${value === trueCondition ? 'text-success' : 'text-danger'}`}>
    {value === trueCondition ? onLabel : offLabel}
  </span>
);

const MachineHardware = ({ machineDetails, currentHardware, colClass = 'col-12' }) => {
  const { t } = useTranslation();
  const configuration = machineDetails?.configuration;
  const isZone = !!configuration?.zonename;
  const hasDevices = !!(
    currentHardware?.zone ||
    currentHardware?.controllers?.length > 0 ||
    currentHardware?.attachments?.length > 0 ||
    currentHardware?.nics?.length > 0
  );
  const natForwards = Array.isArray(configuration?.nat_forwards) ? configuration.nat_forwards : [];

  if (!isZone && !hasDevices && natForwards.length === 0) {
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
          <span
            className="badge text-bg-secondary ms-2"
            title={t('machine.machineHardware.pinnedTooltip')}
          >
            {t('machine.machineHardware.pinnedBadge')}
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
          <span className="text-muted small ms-2">{t('machine.machineHardware.thisSession')}</span>
        </>
      );
    }

    return (
      <span className="fw-semibold text-success">{t('machine.machineHardware.autoAgentPool')}</span>
    );
  };

  return (
    <div className={colClass}>
      <div className="card h-100">
        <div className="card-body">
          <h4 className="fs-6 fw-bold mb-3">
            <i className="fas fa-microchip me-2" />
            {t('machine.machineHardware.heading')}
          </h4>

          {isZone && (
            <div className="table-responsive">
              <table className="table table-striped small mb-0">
                <tbody>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.ramLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">{configuration.ram}</td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.acpiLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration.acpi,
                        'true',
                        t('machine.machineHardware.enabledLabel'),
                        t('machine.machineHardware.disabledLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.vcpusLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">{configuration.vcpus}</td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.autoBootLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration.autoboot,
                        'true',
                        t('machine.machineHardware.enabledLabel'),
                        t('machine.machineHardware.disabledLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.bootromLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">{configuration.bootrom}</span>
                    </td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.uefiVarsLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration.uefivars,
                        'on',
                        t('machine.machineHardware.onLabel'),
                        t('machine.machineHardware.offLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.hostBridgeLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">{configuration.hostbridge}</span>
                    </td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.xhciLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration.xhci,
                        'on',
                        t('machine.machineHardware.onLabel'),
                        t('machine.machineHardware.offLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.brandLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">{configuration.brand}</span>
                    </td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.rngLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration.rng,
                        'on',
                        t('machine.machineHardware.onLabel'),
                        t('machine.machineHardware.offLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.typeLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-muted font-monospace">
                        {configuration.type || t('machine.machineHardware.notApplicable')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.cloudInitLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {renderStatusBadge(
                        configuration['cloud-init'],
                        'on',
                        t('machine.machineHardware.onLabel'),
                        t('machine.machineHardware.offLabel')
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.vncConsoleLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`fw-semibold ${machineDetails.vnc_session_info ? 'text-success' : 'text-danger'}`}
                      >
                        {machineDetails.vnc_session_info
                          ? t('machine.machineHardware.activeStatus')
                          : t('machine.machineHardware.inactiveStatus')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.vncPortLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">{renderVncPort()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('machine.machineHardware.zloginLabel')}</strong>
                    </td>
                    <td className="px-3 py-2" colSpan={3}>
                      <span
                        className={`fw-semibold ${machineDetails.zlogin_session ? 'text-success' : 'text-danger'}`}
                      >
                        {machineDetails.zlogin_session
                          ? t('machine.machineHardware.activeStatus')
                          : t('machine.machineHardware.inactiveStatus')}
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

          {natForwards.length > 0 && (
            <div className={isZone || hasDevices ? 'mt-3' : ''}>
              <h5 className="fs-6 fw-bold mb-2">
                {t('machine.machineHardware.natForwardsHeading')}
              </h5>
              {natForwards.map(fw => (
                <div
                  key={`${fw.name}|${fw.adapter ?? ''}`}
                  className="d-flex align-items-center gap-2 font-monospace small py-1"
                >
                  <span className="badge text-bg-secondary">{fw.protocol}</span>
                  {fw.adapter !== undefined && fw.adapter !== null && (
                    <span className="badge text-bg-light">nic{fw.adapter}</span>
                  )}
                  <span className="text-truncate">
                    {fw.name}: {fw.host_ip || '*'}:{fw.host_port} → {fw.guest_ip || '*'}:
                    {fw.guest_port}
                  </span>
                </div>
              ))}
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
      nat_forwards: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          protocol: PropTypes.string,
          host_ip: PropTypes.string,
          host_port: PropTypes.number,
          guest_ip: PropTypes.string,
          guest_port: PropTypes.number,
          adapter: PropTypes.number,
        })
      ),
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
