import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { rateLabels } from './topologyPalette';

/** Whether a staged rewire may target this network (wire truth: zonecfg
 *  vlan-id can be SET but not cleared in place, so an untagged target only
 *  accepts nics that are already untagged; VBox spaces never accept drops
 *  until the re-attachment wire exists). */
export const dropAllowed = (dragging, network) => {
  if (!dragging || dragging.fromNetId === network.id) {
    return false;
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

const StateDot = ({ up, ghost }) => {
  let cls = 'hw-topo-dot-down';
  if (ghost) {
    cls = 'hw-topo-dot-ghost';
  } else if (up) {
    cls = 'hw-topo-dot-up';
  }
  return <span className={`hw-topo-dot ${cls}`} />;
};

StateDot.propTypes = {
  up: PropTypes.bool,
  ghost: PropTypes.bool,
};

const RateLine = ({ feedPresent, usage, muted }) => {
  const { t } = useTranslation();
  const labels = rateLabels(feedPresent, usage);
  if (!labels) {
    return (
      <span className="hw-topo-rate hw-topo-rate-nofeed">{t('hostTools.topology.noFeed')}</span>
    );
  }
  const idle = (usage?.rxMbps || 0) + (usage?.txMbps || 0) === 0;
  return (
    <span className={`hw-topo-rate ${idle || muted ? 'hw-topo-rate-idle' : ''}`}>
      {idle ? t('hostTools.topology.idle') : `↓${labels.rx} ↑${labels.tx}`}
    </span>
  );
};

RateLine.propTypes = {
  feedPresent: PropTypes.bool.isRequired,
  usage: PropTypes.object,
  muted: PropTypes.bool,
};

export const NicChip = ({
  nic,
  machineName = null,
  color,
  feedPresent,
  onTrace,
  registerAnchor,
  draggable = false,
  pending = false,
  hot = false,
  onDragNic = () => {},
  onOpenNetworking = null,
}) => {
  const { t } = useTranslation();
  let badge = t('hostTools.topology.untaggedBadge');
  if (nic.vlanId > 0) {
    badge = t('hostTools.topology.vlanBadge', { vlanId: nic.vlanId });
  } else if (nic.mode) {
    badge = nic.mode;
  }
  return (
    <button
      type="button"
      ref={el => registerAnchor(`nic:${nic.link}`, el)}
      className={`hw-topo-chip ${nic.ghost ? 'hw-topo-ghost' : ''} ${pending ? 'hw-topo-chip-pending' : ''} ${draggable ? 'hw-topo-chip-draggable' : ''} ${hot ? 'hw-topo-chip-hot' : ''}`}
      draggable={draggable}
      onDragStart={event => {
        event.dataTransfer.effectAllowed = 'move';
        onDragNic({
          machineName,
          link: nic.link,
          adapter: nic.adapter ?? null,
          fromNetId: nic.networkId,
          vlanId: nic.vlanId,
        });
      }}
      onDragEnd={() => onDragNic(null)}
      onClick={event => {
        event.stopPropagation();
        onTrace([nic.networkId]);
      }}
      onDoubleClick={event => {
        event.stopPropagation();
        if (onOpenNetworking) {
          onOpenNetworking(nic.link);
        }
      }}
      title={pending ? t('hostTools.topology.pendingMoveTitle') : nic.mac || undefined}
    >
      <span className="hw-topo-chip-name">{nic.link}</span>
      <span className="hw-topo-chip-net" style={{ color }}>
        {badge}
        {' · '}
        {nic.over}
      </span>
      {nic.ghost ? (
        <span className="hw-topo-chip-rate hw-topo-rate-idle">
          {t('hostTools.topology.planned')}
        </span>
      ) : (
        <span className="hw-topo-chip-rate">
          <RateLine feedPresent={feedPresent} usage={nic.usage} />
        </span>
      )}
    </button>
  );
};

NicChip.propTypes = {
  nic: PropTypes.object.isRequired,
  machineName: PropTypes.string,
  color: PropTypes.string,
  feedPresent: PropTypes.bool.isRequired,
  onTrace: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  draggable: PropTypes.bool,
  pending: PropTypes.bool,
  hot: PropTypes.bool,
  onDragNic: PropTypes.func,
  onOpenNetworking: PropTypes.func,
};

export const ConsumerCard = ({
  consumer,
  colors,
  feedPresent,
  onTrace,
  onOpen,
  registerAnchor,
  canRewire = false,
  pendingLinks = new Set(),
  onDragNic = () => {},
  onOpenNetworking = null,
  tracedSet = new Set(),
}) => {
  const { t } = useTranslation();
  const netIds = [...new Set(consumer.nics.map(nic => nic.networkId))];
  return (
    <div
      ref={el => registerAnchor(`consumer:${consumer.id}`, el)}
      className={`hw-topo-card hw-topo-consumer ${consumer.ghostOnly ? 'hw-topo-ghost' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onTrace(netIds)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTrace(netIds);
        }
      }}
    >
      <div className="hw-topo-card-head">
        <StateDot up={consumer.running} ghost={consumer.ghostOnly} />
        <span className="hw-topo-card-title">
          {consumer.type === 'global' ? t('hostTools.topology.globalZone') : consumer.name}
        </span>
        {pendingLinks.size > 0 &&
          consumer.nics.some(nic => pendingLinks.has(`${consumer.id}|${nic.link}`)) && (
            <span className="hw-topo-pending-badge">{t('hostTools.topology.pendingBadge')}</span>
          )}
        {consumer.type === 'machine' && (
          <button
            type="button"
            className="hw-topo-open"
            title={t('hostTools.topology.openMachine')}
            onClick={event => {
              event.stopPropagation();
              onOpen(consumer.name);
            }}
          >
            <i className="fas fa-arrow-up-right-from-square" />
          </button>
        )}
      </div>
      <div className="hw-topo-card-sub">
        {consumer.ghostOnly
          ? t('hostTools.topology.configuredNotRunning')
          : t('hostTools.topology.nicCount', { count: consumer.nics.length })}
      </div>
      <div className="hw-topo-chip-list">
        {consumer.nics.map(nic => (
          <NicChip
            key={nic.link}
            nic={nic}
            machineName={consumer.id}
            color={colors.get(nic.networkId)}
            feedPresent={feedPresent}
            onTrace={onTrace}
            registerAnchor={registerAnchor}
            draggable={canRewire && consumer.type === 'machine' && !nic.ghost}
            pending={pendingLinks.has(`${consumer.id}|${nic.link}`)}
            hot={tracedSet.has(nic.networkId)}
            onDragNic={onDragNic}
            onOpenNetworking={onOpenNetworking}
          />
        ))}
      </div>
    </div>
  );
};

ConsumerCard.propTypes = {
  consumer: PropTypes.object.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  feedPresent: PropTypes.bool.isRequired,
  onTrace: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  canRewire: PropTypes.bool,
  pendingLinks: PropTypes.instanceOf(Set),
  onDragNic: PropTypes.func,
  onOpenNetworking: PropTypes.func,
  tracedSet: PropTypes.instanceOf(Set),
};

export const AdapterCard = ({
  adapter,
  feedPresent,
  onTrace,
  tracedNetworks,
  registerAnchor,
  onOpenNetworking = null,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const up = adapter.state === 'up';
  const unused = up && adapter.kind === 'phys' && !adapter.memberOf && tracedNetworks.length === 0;
  return (
    <div
      ref={el => registerAnchor(`carrier:${adapter.id}`, el)}
      className={`hw-topo-card hw-topo-adapter ${unused ? 'hw-topo-unused' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onTrace(tracedNetworks)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTrace(tracedNetworks);
        }
      }}
    >
      <div className="hw-topo-card-head">
        <StateDot up={up} />
        <span className="hw-topo-card-title">{adapter.name}</span>
        <span className="hw-topo-card-meta">
          {adapter.kind === 'aggr'
            ? t('hostTools.topology.lacpAggregate')
            : t('hostTools.topology.physical')}
          {adapter.speedMbps > 0 &&
            ` · ${adapter.speedMbps >= 1000 ? `${adapter.speedMbps / 1000}G` : `${adapter.speedMbps}M`}`}
        </span>
        {onOpenNetworking && (
          <button
            type="button"
            className="hw-topo-open"
            title={t('hostTools.topology.openNetworking')}
            onClick={event => {
              event.stopPropagation();
              onOpenNetworking(adapter.id);
            }}
          >
            <i className="fas fa-arrow-up-right-from-square" />
          </button>
        )}
      </div>
      <div className="hw-topo-card-sub">
        <RateLine feedPresent={feedPresent} usage={adapter.usage} />
        {adapter.mtu ? ` · MTU ${adapter.mtu}` : ''}
      </div>
      {unused && (
        <div className="hw-topo-card-sub hw-topo-unused-note">
          {t('hostTools.topology.unusedAdapter')}
        </div>
      )}
      {adapter.ips.length > 0 && (
        <div className="hw-topo-card-sub hw-topo-mono">
          {adapter.ips.map(ip => ip.ip_address).join(' · ')}
        </div>
      )}
      {adapter.kind === 'aggr' && (
        <div className="hw-topo-members">
          <button
            type="button"
            className="hw-topo-expand"
            onClick={event => {
              event.stopPropagation();
              setExpanded(prev => !prev);
            }}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} me-1`} />
            {t('hostTools.topology.memberLinks', { count: adapter.members.length })}
          </button>
          {expanded &&
            adapter.members.map(member => (
              <div key={member.name} className="hw-topo-member-row">
                <StateDot up={member.state === 'up'} />
                <span className="hw-topo-mono">{member.name}</span>
                <span className="hw-topo-card-meta">
                  {member.speed >= 1000 ? `${member.speed / 1000}G` : `${member.speed}M`} ·{' '}
                  {member.state}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

AdapterCard.propTypes = {
  adapter: PropTypes.object.isRequired,
  feedPresent: PropTypes.bool.isRequired,
  onTrace: PropTypes.func.isRequired,
  tracedNetworks: PropTypes.array.isRequired,
  registerAnchor: PropTypes.func.isRequired,
  onOpenNetworking: PropTypes.func,
};

export const SwitchCard = ({ swtch, onTrace, tracedNetworks, registerAnchor }) => {
  const { t } = useTranslation();
  return (
    <div
      ref={el => registerAnchor(`carrier:${swtch.id}`, el)}
      className={`hw-topo-card hw-topo-switch ${swtch.ports === 0 ? 'hw-topo-empty' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onTrace(tracedNetworks)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTrace(tracedNetworks);
        }
      }}
    >
      <div className="hw-topo-card-head">
        <StateDot up={swtch.state === 'up'} />
        <span className="hw-topo-card-title">{swtch.name}</span>
        <span className="hw-topo-card-meta">{t('hostTools.topology.internalSwitch')}</span>
      </div>
      <div className="hw-topo-card-sub">
        {swtch.ports === 0
          ? t('hostTools.topology.emptySwitch')
          : t('hostTools.topology.portCount', { count: swtch.ports })}
        {swtch.mtu ? ` · MTU ${swtch.mtu}` : ''}
      </div>
    </div>
  );
};

SwitchCard.propTypes = {
  swtch: PropTypes.object.isRequired,
  onTrace: PropTypes.func.isRequired,
  tracedNetworks: PropTypes.array.isRequired,
  registerAnchor: PropTypes.func.isRequired,
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
      onClick={() => onDrill(network.id)}
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
