import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../../common';

/**
 * The host-only halves of the spaces editor: the INTERFACE modal (static IP +
 * optional DHCP server; VirtualBox names new interfaces itself, and dhcp:null
 * on save removes an existing server) and the 7.x host-only NETWORK modal
 * (named at create; netmask + range + enabled).
 */
export const HostOnlyIfModal = ({ space = null, busy, error, onSave, onClose }) => {
  const { t } = useTranslation();
  const [ip, setIp] = useState(space?.ip_address || '');
  const [netmask, setNetmask] = useState(space?.network_mask || '255.255.255.0');
  const [dhcpOn, setDhcpOn] = useState(Boolean(space?.dhcp?.exists));
  const [serverIp, setServerIp] = useState(space?.dhcp?.server_ip || '');
  const [lowerIp, setLowerIp] = useState(space?.dhcp?.lower_ip || '');
  const [upperIp, setUpperIp] = useState(space?.dhcp?.upper_ip || '');

  const submit = () => {
    const body = { ...(ip ? { ip, netmask } : {}) };
    if (dhcpOn) {
      body.dhcp = { server_ip: serverIp, netmask, lower_ip: lowerIp, upper_ip: upperIp };
    } else if (space?.dhcp?.exists) {
      body.dhcp = null;
    }
    onSave(body);
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={submit}
      title={space ? space.name : t('host.networkSpaces.newHostonlyIf')}
      icon="fas fa-network-wired"
      submitText={space ? t('host.networkSpaces.save') : t('host.networkSpaces.createBtn')}
      loading={busy}
      disabled={dhcpOn && (!serverIp || !lowerIp || !upperIp)}
      showCancelButton
    >
      <div className="row g-3">
        <div className="col-6">
          <label className="form-label" htmlFor="hw-hoif-ip">
            {t('host.networkSpaces.ip')}
          </label>
          <input
            id="hw-hoif-ip"
            className="form-control hw-topo-mono"
            value={ip}
            onChange={event => setIp(event.target.value)}
            placeholder="192.168.56.1"
          />
        </div>
        <div className="col-6">
          <label className="form-label" htmlFor="hw-hoif-mask">
            {t('host.networkSpaces.netmask')}
          </label>
          <input
            id="hw-hoif-mask"
            className="form-control hw-topo-mono"
            value={netmask}
            onChange={event => setNetmask(event.target.value)}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="hw-hoif-dhcp"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={dhcpOn}
              onChange={event => setDhcpOn(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="hw-hoif-dhcp">
              {t('host.networkSpaces.dhcpToggle')}
            </label>
          </div>
        </div>
        {dhcpOn && (
          <>
            <div className="col-4">
              <label className="form-label" htmlFor="hw-hoif-dhcpip">
                {t('host.networkSpaces.dhcpServerIp')}
              </label>
              <input
                id="hw-hoif-dhcpip"
                className="form-control hw-topo-mono"
                value={serverIp}
                onChange={event => setServerIp(event.target.value)}
              />
            </div>
            <div className="col-4">
              <label className="form-label" htmlFor="hw-hoif-lower">
                {t('host.networkSpaces.lowerIp')}
              </label>
              <input
                id="hw-hoif-lower"
                className="form-control hw-topo-mono"
                value={lowerIp}
                onChange={event => setLowerIp(event.target.value)}
              />
            </div>
            <div className="col-4">
              <label className="form-label" htmlFor="hw-hoif-upper">
                {t('host.networkSpaces.upperIp')}
              </label>
              <input
                id="hw-hoif-upper"
                className="form-control hw-topo-mono"
                value={upperIp}
                onChange={event => setUpperIp(event.target.value)}
              />
            </div>
          </>
        )}
        {error && <p className="text-danger mb-0">{error}</p>}
      </div>
    </FormModal>
  );
};

HostOnlyIfModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export const HostOnlyNetModal = ({ space = null, busy, error, onSave, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(space?.name || '');
  const [netmask, setNetmask] = useState(space?.network_mask || '255.255.255.0');
  const [lowerIp, setLowerIp] = useState(space?.lower_ip || '');
  const [upperIp, setUpperIp] = useState(space?.upper_ip || '');
  const [enabled, setEnabled] = useState(space ? space.enabled !== false : true);

  const submit = () => {
    onSave({
      ...(space ? {} : { name: name.trim() }),
      netmask,
      lower_ip: lowerIp,
      upper_ip: upperIp,
      enabled,
    });
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={submit}
      title={space ? space.name : t('host.networkSpaces.newHostonlyNet')}
      icon="fas fa-network-wired"
      submitText={space ? t('host.networkSpaces.save') : t('host.networkSpaces.createBtn')}
      loading={busy}
      disabled={(!space && !name.trim()) || !netmask || !lowerIp || !upperIp}
      showCancelButton
    >
      <div className="row g-3">
        {!space && (
          <div className="col-12">
            <label className="form-label" htmlFor="hw-honet-name">
              {t('host.networkSpaces.name')}
            </label>
            <input
              id="hw-honet-name"
              className="form-control hw-topo-mono"
              value={name}
              required
              onChange={event => setName(event.target.value)}
            />
          </div>
        )}
        <div className="col-4">
          <label className="form-label" htmlFor="hw-honet-mask">
            {t('host.networkSpaces.netmask')}
          </label>
          <input
            id="hw-honet-mask"
            className="form-control hw-topo-mono"
            value={netmask}
            onChange={event => setNetmask(event.target.value)}
          />
        </div>
        <div className="col-4">
          <label className="form-label" htmlFor="hw-honet-lower">
            {t('host.networkSpaces.lowerIp')}
          </label>
          <input
            id="hw-honet-lower"
            className="form-control hw-topo-mono"
            value={lowerIp}
            onChange={event => setLowerIp(event.target.value)}
          />
        </div>
        <div className="col-4">
          <label className="form-label" htmlFor="hw-honet-upper">
            {t('host.networkSpaces.upperIp')}
          </label>
          <input
            id="hw-honet-upper"
            className="form-control hw-topo-mono"
            value={upperIp}
            onChange={event => setUpperIp(event.target.value)}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="hw-honet-enabled"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={event => setEnabled(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="hw-honet-enabled">
              {t('host.networkSpaces.enabledLabel')}
            </label>
          </div>
        </div>
        {error && <p className="text-danger mb-0">{error}</p>}
      </div>
    </FormModal>
  );
};

HostOnlyNetModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
