import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getGuestProperties } from '../../api/machineAPI';
import { hasHypervisor } from '../../utils/capabilities';

/**
 * Guest-properties card (catalog §6): what the guest additions report about
 * a RUNNING machine. The gold: live guest IPs (/VirtualBox/GuestInfo/Net/N/
 * V4/IP) lead the card; /Hyperweaver/CloudInit/* shows what the agent
 * seeded; everything else sits behind a collapsed details block. Self-hides
 * when the endpoint answers nothing — and never even CALLS it on bhyve
 * (zoneweaver has no guest-properties route, it 404s; the Guest Agent card
 * carries the QGA equivalent there).
 */

const IP_PATTERN = /^\/VirtualBox\/GuestInfo\/Net\/(?<nic>\d+)\/V4\/IP$/u;
const CLOUD_INIT_PREFIX = '/Hyperweaver/CloudInit/';

const MachineGuestInfo = ({ currentServer, machineName, colClass = 'col-12' }) => {
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const isBhyve = hasHypervisor(currentServer, 'bhyve');

  const load = useCallback(async () => {
    if (!currentServer || !machineName || isBhyve) {
      return;
    }
    const result = await getGuestProperties(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    setProperties(
      result.success && Array.isArray(result.data?.properties) ? result.data.properties : []
    );
    setLoaded(true);
  }, [currentServer, machineName, isBhyve]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded || properties.length === 0) {
    return null;
  }

  const ips = properties
    .map(property => {
      const match = IP_PATTERN.exec(property.name || '');
      return match ? { nic: match.groups.nic, ip: property.value } : null;
    })
    .filter(Boolean);
  const cloudInit = properties.filter(property =>
    (property.name || '').startsWith(CLOUD_INIT_PREFIX)
  );

  return (
    <div className={colClass}>
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="fs-6 fw-bold mb-0">
              <i className="fas fa-network-wired me-2" />
              {t('machine.machineGuestInfo.heading')}
            </h4>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={load}
              title={t('machine.machineGuestInfo.refreshTooltip')}
            >
              <i className="fas fa-sync-alt" />
            </button>
          </div>

          {ips.length > 0 ? (
            <div className="mb-2">
              {ips.map(entry => (
                <div key={entry.nic}>
                  <span className="text-muted small me-2">
                    {t('machine.machineGuestInfo.nicLabel', { nic: entry.nic })}
                  </span>
                  <code>{entry.ip}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted small mb-2">{t('machine.machineGuestInfo.noGuestIps')}</p>
          )}

          {cloudInit.length > 0 && (
            <details className="mb-2">
              <summary className="small fw-semibold">
                {t('machine.machineGuestInfo.cloudInitSeeds', { count: cloudInit.length })}
              </summary>
              <table className="table table-sm small mb-0">
                <tbody>
                  {cloudInit.map(property => (
                    <tr key={property.name}>
                      <td>{property.name.slice(CLOUD_INIT_PREFIX.length)}</td>
                      <td>
                        <code className="small">{property.value}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <details>
            <summary className="small text-muted">
              {t('machine.machineGuestInfo.allGuestProperties', { count: properties.length })}
            </summary>
            <div className="table-responsive" style={{ maxHeight: '240px', overflow: 'auto' }}>
              <table className="table table-sm small mb-0">
                <tbody>
                  {properties.map(property => (
                    <tr key={property.name}>
                      <td>{property.name}</td>
                      <td>
                        <code className="small">{property.value}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

MachineGuestInfo.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  colClass: PropTypes.string,
};

export default MachineGuestInfo;
