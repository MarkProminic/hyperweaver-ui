import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RateLine } from './TopologyCards';

/** Whether a staged rewire may target this network (wire truth: zonecfg
 *  vlan-id can be SET but not cleared in place, so an untagged target only
 *  accepts nics that are already untagged; VBox spaces never accept drops
 *  until the re-attachment wire exists). */
export const dropAllowed = (dragging, network) => {
  if (!dragging || dragging.fromNetId === network.id) {
    return false;
  }
  if (dragging.addNew && dragging.hostKind === 'vbox') {
    return network.kind === 'bridged';
  }
  if (dragging.hostKind === 'vbox') {
    return ['bridged', 'hostonly', 'hostonlynet', 'internal', 'natnetwork', 'nat'].includes(
      network.kind
    );
  }
  if (!['vlan', 'untagged', 'internal'].includes(network.kind)) {
    return false;
  }
  if (network.vlanId === 0 && dragging.vlanId > 0) {
    return false;
  }
  return true;
};

export const networkTitle = (network, t) => {
  if (network.kind === 'internal') {
    return t('hostTools.topology.internalNetwork', { name: network.carrier });
  }
  if (network.kind === 'bridged') {
    return t('hostTools.topology.bridgedNetwork', { name: network.carrier });
  }
  if (network.kind === 'hostonly') {
    return t('hostTools.topology.hostOnlyNetwork', { name: network.carrier });
  }
  if (network.kind === 'hostonlynet') {
    return t('hostTools.topology.hostOnlyNetNetwork', { name: network.carrier });
  }
  if (network.kind === 'natnetwork') {
    return t('hostTools.topology.natNetwork', { name: network.carrier });
  }
  if (network.kind === 'nat') {
    return t('hostTools.topology.natShared');
  }
  if (network.vlanId > 0) {
    return t('hostTools.topology.vlanNetwork', { vlanId: network.vlanId });
  }
  return t('hostTools.topology.untaggedNetwork');
};

export const NetworkCard = ({
  network,
  color,
  feedPresent,
  onDrill,
  onTrace,
  registerAnchor,
  dragging = null,
  onDropNic = () => {},
  shared = false,
}) => {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const title = networkTitle(network, t);
  const validTarget = dropAllowed(dragging, network);
  return (
    <div
      ref={el => registerAnchor(`network:${network.id}`, el)}
      className={`hw-topo-card hw-topo-network ${network.live === 0 ? 'hw-topo-ghost' : ''} ${
        validTarget ? 'hw-topo-drop-valid' : ''
      } ${validTarget && dragOver ? 'hw-topo-drop-over' : ''}`}
      style={{ borderColor: color }}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (dragging?.pinnedCarrier && validTarget) {
          onDropNic(network);
          return;
        }
        onDrill(network.id);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onDrill(network.id);
        }
      }}
      onDragOver={event => {
        if (validTarget) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={event => {
        event.preventDefault();
        setDragOver(false);
        if (validTarget) {
          onDropNic(network);
        }
      }}
    >
      <span className="hw-topo-net-band" style={{ background: color }} />
      <div className="hw-topo-card-head">
        <span className="hw-topo-card-title">{title}</span>
        {shared && (
          <span className="hw-topo-shared-badge">{t('hostTools.topology.sharedBadge')}</span>
        )}
        <button
          type="button"
          className="hw-topo-open"
          title={t('hostTools.topology.isolateNetwork')}
          onClick={event => {
            event.stopPropagation();
            onTrace([network.id]);
          }}
        >
          <i className="fas fa-filter" />
        </button>
      </div>
      <div className="hw-topo-card-sub hw-topo-mono">
        {network.detail || t('hostTools.topology.overCarrier', { carrier: network.carrier })}
      </div>
      <div className="hw-topo-card-sub">
        {t('hostTools.topology.liveCount', { count: network.live })}
        {network.planned > 0 &&
          ` · ${t('hostTools.topology.plannedCount', { count: network.planned })}`}
        {' · '}
        <RateLine feedPresent={feedPresent} usage={network.usage} muted={network.live === 0} />
      </div>
    </div>
  );
};

NetworkCard.propTypes = {
  network: PropTypes.object.isRequired,
  color: PropTypes.string,
  feedPresent: PropTypes.bool.isRequired,
  onDrill: PropTypes.func.isRequired,
  onTrace: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  dragging: PropTypes.object,
  onDropNic: PropTypes.func,
  shared: PropTypes.bool,
};
