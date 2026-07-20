import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../../common';

/**
 * The add-nic popup: opens when a bhyve add-chip lands on a network or
 * carrier — asks the vnic name (required; the agent creates it on-demand)
 * and the VLAN id, then hands the answers to the staging tray.
 */
const TopologyAddNicModal = ({ draft, onStage, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [vlan, setVlan] = useState(draft.vlanId || 0);
  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={() => onStage({ name: name.trim(), vlanId: vlan })}
      title={t('hostTools.topology.addModalTitle', { machine: draft.drag.machineName })}
      icon="fas fa-plus"
      submitText={t('hostTools.topology.addModalStage')}
      disabled={!name.trim()}
      showCancelButton
    >
      <p className="hw-topo-mono mb-3">
        {t('hostTools.topology.overCarrier', { carrier: draft.carrier })}
      </p>
      <div className="mb-3">
        <label className="form-label" htmlFor="hw-add-nic-name">
          {t('hostTools.topology.trayName')}
        </label>
        <input
          id="hw-add-nic-name"
          className="form-control hw-topo-mono"
          type="text"
          required
          value={name}
          onChange={event => setName(event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="hw-add-nic-vlan">
          {t('hostTools.topology.trayVlan')}
        </label>
        <input
          id="hw-add-nic-vlan"
          className="form-control hw-topo-mono"
          type="number"
          min={0}
          max={4094}
          value={vlan}
          onChange={event =>
            setVlan(Math.max(0, Math.min(4094, parseInt(event.target.value, 10) || 0)))
          }
        />
        <div className="form-text">{t('hostTools.topology.addModalVlanHelp')}</div>
      </div>
      <div className="form-text">{t('hostTools.topology.trayNote')}</div>
    </FormModal>
  );
};

TopologyAddNicModal.propTypes = {
  draft: PropTypes.shape({
    carrier: PropTypes.string.isRequired,
    vlanId: PropTypes.number,
    drag: PropTypes.shape({ machineName: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
  onStage: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TopologyAddNicModal;
