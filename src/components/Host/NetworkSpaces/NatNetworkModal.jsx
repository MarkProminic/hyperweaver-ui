import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../../common';

/**
 * The NAT-network editor: knobs (cidr/enabled/dhcp/ipv6) plus the
 * port-forward manager. Existing forwards mark for removal; new rows stage
 * an add — the PUT carries remove_port_forwards then add_port_forwards, so a
 * same-named rule replaces in one call. Loopback mappings ride the wire as
 * {address, offset, ipv6} objects (agent structured-JSON pass) — not
 * surfaced here yet.
 */
const NatNetworkModal = ({ space = null, busy, error, onSave, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(space?.name || '');
  const [cidr, setCidr] = useState(space?.cidr || '');
  const [enabled, setEnabled] = useState(space ? space.enabled !== false : true);
  const [dhcp, setDhcp] = useState(space ? Boolean(space.dhcp_enabled) : true);
  const [ipv6, setIpv6] = useState(space ? Boolean(space.ipv6) : false);
  const [removedForwards, setRemovedForwards] = useState([]);
  const [addedForwards, setAddedForwards] = useState([]);
  const [draft, setDraft] = useState({
    name: '',
    protocol: 'tcp',
    host_ip: '',
    host_port: '',
    guest_ip: '',
    guest_port: '',
    ipv6: false,
  });

  const existingForwards = (space?.port_forwards || []).filter(
    fw => !removedForwards.some(gone => gone.name === fw.name && gone.ipv6 === fw.ipv6)
  );

  const stageForward = () => {
    setAddedForwards(prev => [
      ...prev,
      {
        ...draft,
        host_port: parseInt(draft.host_port, 10) || 0,
        guest_port: parseInt(draft.guest_port, 10) || 0,
      },
    ]);
    setDraft({
      name: '',
      protocol: 'tcp',
      host_ip: '',
      host_port: '',
      guest_ip: '',
      guest_port: '',
      ipv6: false,
    });
  };

  const submit = () => {
    onSave({
      ...(space ? {} : { name: name.trim() }),
      cidr,
      enabled,
      dhcp,
      ipv6,
      ...(removedForwards.length > 0 ? { remove_port_forwards: removedForwards } : {}),
      ...(addedForwards.length > 0 ? { add_port_forwards: addedForwards } : {}),
    });
  };

  const draftReady =
    draft.name.trim() && parseInt(draft.host_port, 10) > 0 && parseInt(draft.guest_port, 10) > 0;

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={submit}
      title={space ? space.name : t('host.networkSpaces.newNat')}
      icon="fas fa-shuffle"
      submitText={space ? t('host.networkSpaces.save') : t('host.networkSpaces.createBtn')}
      loading={busy}
      disabled={(!space && !name.trim()) || !cidr}
      showCancelButton
    >
      <div className="row g-3">
        {!space && (
          <div className="col-6">
            <label className="form-label" htmlFor="hw-nat-name">
              {t('host.networkSpaces.name')}
            </label>
            <input
              id="hw-nat-name"
              className="form-control hw-topo-mono"
              value={name}
              required
              onChange={event => setName(event.target.value)}
            />
          </div>
        )}
        <div className="col-6">
          <label className="form-label" htmlFor="hw-nat-cidr">
            {t('host.networkSpaces.cidr')}
          </label>
          <input
            id="hw-nat-cidr"
            className="form-control hw-topo-mono"
            value={cidr}
            required
            onChange={event => setCidr(event.target.value)}
            placeholder="10.0.5.0/24"
          />
        </div>
        <div className="col-12 d-flex gap-4 flex-wrap">
          {[
            {
              id: 'hw-nat-enabled',
              label: t('host.networkSpaces.enabledLabel'),
              value: enabled,
              set: setEnabled,
            },
            {
              id: 'hw-nat-dhcp',
              label: t('host.networkSpaces.dhcpToggle'),
              value: dhcp,
              set: setDhcp,
            },
            {
              id: 'hw-nat-ipv6',
              label: t('host.networkSpaces.ipv6Label'),
              value: ipv6,
              set: setIpv6,
            },
          ].map(toggle => (
            <div className="form-check form-switch" key={toggle.id}>
              <input
                id={toggle.id}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={toggle.value}
                onChange={event => toggle.set(event.target.checked)}
              />
              <label className="form-check-label" htmlFor={toggle.id}>
                {toggle.label}
              </label>
            </div>
          ))}
        </div>

        {space && (
          <div className="col-12">
            <h6 className="h6 mb-2">{t('host.networkSpaces.forwards')}</h6>
            {existingForwards.length === 0 && addedForwards.length === 0 && (
              <p className="text-muted small mb-2">{t('host.networkSpaces.noForwards')}</p>
            )}
            {existingForwards.map(fw => (
              <div
                key={`${fw.name}|${fw.ipv6}`}
                className="d-flex align-items-center gap-2 hw-topo-mono small py-1"
              >
                <span className="badge text-bg-secondary">{fw.protocol}</span>
                {fw.ipv6 && <span className="badge text-bg-info">v6</span>}
                <span className="text-truncate">
                  {fw.name}: {fw.host_ip || '*'}:{fw.host_port} → {fw.guest_ip || '*'}:
                  {fw.guest_port}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={() =>
                    setRemovedForwards(prev => [...prev, { name: fw.name, ipv6: Boolean(fw.ipv6) }])
                  }
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
            {addedForwards.map((fw, index) => (
              <div
                key={`${fw.name}|${String(index)}`}
                className="d-flex align-items-center gap-2 hw-topo-mono small py-1 text-warning"
              >
                <span className="badge text-bg-warning">{fw.protocol}</span>
                {fw.ipv6 && <span className="badge text-bg-info">v6</span>}
                <span className="text-truncate">
                  {fw.name}: {fw.host_ip || '*'}:{fw.host_port} → {fw.guest_ip || '*'}:
                  {fw.guest_port}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={() =>
                    setAddedForwards(prev => [...prev.slice(0, index), ...prev.slice(index + 1)])
                  }
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
            <div className="row g-2 align-items-end mt-1">
              <div className="col-3">
                <input
                  className="form-control form-control-sm hw-topo-mono"
                  placeholder={t('host.networkSpaces.fwName')}
                  aria-label={t('host.networkSpaces.fwName')}
                  value={draft.name}
                  onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="col-2">
                <select
                  className="form-select form-select-sm"
                  aria-label={t('host.networkSpaces.fwProto')}
                  value={draft.protocol}
                  onChange={event => setDraft(prev => ({ ...prev, protocol: event.target.value }))}
                >
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                </select>
              </div>
              <div className="col-2">
                <input
                  className="form-control form-control-sm hw-topo-mono"
                  placeholder={t('host.networkSpaces.fwHostPort')}
                  aria-label={t('host.networkSpaces.fwHostPort')}
                  value={draft.host_port}
                  onChange={event => setDraft(prev => ({ ...prev, host_port: event.target.value }))}
                />
              </div>
              <div className="col-2">
                <input
                  className="form-control form-control-sm hw-topo-mono"
                  placeholder={t('host.networkSpaces.fwGuestIp')}
                  aria-label={t('host.networkSpaces.fwGuestIp')}
                  value={draft.guest_ip}
                  onChange={event => setDraft(prev => ({ ...prev, guest_ip: event.target.value }))}
                />
              </div>
              <div className="col-2">
                <input
                  className="form-control form-control-sm hw-topo-mono"
                  placeholder={t('host.networkSpaces.fwGuestPort')}
                  aria-label={t('host.networkSpaces.fwGuestPort')}
                  value={draft.guest_port}
                  onChange={event =>
                    setDraft(prev => ({ ...prev, guest_port: event.target.value }))
                  }
                />
              </div>
              <div className="col-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={!draftReady}
                  title={t('host.networkSpaces.addForward')}
                  onClick={stageForward}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-danger mb-0">{error}</p>}
      </div>
    </FormModal>
  );
};

NatNetworkModal.propTypes = {
  space: PropTypes.object,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default NatNetworkModal;
