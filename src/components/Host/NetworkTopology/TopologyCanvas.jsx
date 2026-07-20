import PropTypes from 'prop-types';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ConsumerCard, AdapterCard, SwitchCard } from './TopologyCards';
import { FlowEffects, FlowLabel } from './TopologyFlow';
import { buildTopologyPaths, plannedNetworksFor } from './topologyMeasure';
import { NetworkCard } from './TopologyNetworkCard';
import { assignNetworkColors, MOTION_NO_FEED } from './topologyPalette';
import WireSparkline from './TopologySparkline';

const DENSE_THRESHOLD = 16;

const TopologyCanvas = ({
  host,
  lens,
  isolatedNet,
  onIsolate,
  onDrill,
  onOpenMachine,
  canRewire = false,
  dragging = null,
  pendingMoves = [],
  onDragNic = () => {},
  onDropNic = () => {},
  onDropCarrier = () => {},
  onOpenNetworking = null,
  onOpenSettings = null,
  onWireChart = null,
  sharedNetIds = null,
  effectStyle = 'comets',
  pulse = 0,
}) => {
  const { t } = useTranslation();
  const { graph } = host;
  const containerRef = useRef(null);
  const anchorsRef = useRef(new Map());
  const [paths, setPaths] = useState([]);
  const [pendingPaths, setPendingPaths] = useState([]);
  const [traceNets, setTraceNets] = useState([]);
  const [layoutTick, setLayoutTick] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [hoverWire, setHoverWire] = useState(null);

  const colors = useMemo(() => assignNetworkColors(graph.networks), [graph.networks]);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const pendingByNic = useMemo(
    () => new Map(pendingMoves.map(move => [`${move.machineName}|${move.link}`, move])),
    [pendingMoves]
  );
  const pendingLinks = useMemo(() => new Set(pendingByNic.keys()), [pendingByNic]);
  const plannedNetworks = useMemo(
    () => plannedNetworksFor(graph, pendingMoves),
    [graph, pendingMoves]
  );

  const registerAnchor = useCallback((key, el) => {
    if (el) {
      anchorsRef.current.set(key, el);
    } else {
      anchorsRef.current.delete(key);
    }
  }, []);

  const visibleNetworks = useMemo(
    () => (isolatedNet ? graph.networks.filter(net => net.id === isolatedNet) : graph.networks),
    [graph.networks, isolatedNet]
  );
  const visibleConsumers = useMemo(() => {
    let list = isolatedNet
      ? graph.consumers.filter(consumer => consumer.nics.some(nic => nic.networkId === isolatedNet))
      : graph.consumers;
    if (filterText.trim()) {
      const needle = filterText.trim().toLowerCase();
      list = list.filter(
        consumer =>
          consumer.name.toLowerCase().includes(needle) ||
          consumer.nics.some(nic => nic.link.toLowerCase().includes(needle))
      );
    }
    return list;
  }, [graph.consumers, isolatedNet, filterText]);
  const visibleCarrierIds = useMemo(() => {
    if (!isolatedNet) {
      return null;
    }
    const net = graph.networks.find(n => n.id === isolatedNet);
    return net ? new Set([net.carrier]) : new Set();
  }, [graph.networks, isolatedNet]);

  const dense = graph.consumers.length > DENSE_THRESHOLD;
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const consumerGroups = useMemo(() => {
    if (!dense) {
      return null;
    }
    const groups = new Map();
    visibleConsumers.forEach(consumer => {
      const primary = consumer.nics[0]?.networkId || 'none';
      if (!groups.has(primary)) {
        groups.set(primary, []);
      }
      groups.get(primary).push(consumer);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [dense, visibleConsumers]);

  const hasAggr = graph.adapters.some(a => a.kind === 'aggr');

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const built = buildTopologyPaths({
      container,
      anchors: anchorsRef.current,
      visibleConsumers,
      visibleNetworks,
      isolatedNet,
      colors,
      graph,
      pendingByNic,
      pendingMoves,
    });
    setPaths(built.paths);
    setPendingPaths(built.pending);
  }, [visibleConsumers, visibleNetworks, isolatedNet, colors, graph, pendingByNic, pendingMoves]);

  useEffect(() => {
    measure();
  }, [measure, layoutTick, expandedGroups]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => setLayoutTick(tick => tick + 1));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        setTraceNets([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const traceSet = useMemo(() => new Set(traceNets), [traceNets]);
  const traced = traceSet.size > 0;
  const isDim = netIds => traced && !netIds.some(id => traceSet.has(id));
  const isHot = netIds => traced && netIds.some(id => traceSet.has(id));
  const slotClass = netIds =>
    `hw-topo-slot ${isDim(netIds) ? 'hw-topo-dim' : ''} ${isHot(netIds) ? 'hw-topo-hot' : ''}`;

  const handleTrace = useCallback(
    netIds => {
      setTraceNets(prev => (prev.join(' ') === netIds.join(' ') ? [] : netIds));
    },
    [setTraceNets]
  );

  const lensDim = useCallback(
    (kind, item) => {
      if (lens === 'traffic') {
        if (kind === 'network') {
          return (item.usage?.rxMbps || 0) + (item.usage?.txMbps || 0) === 0;
        }
        if (kind === 'consumer') {
          return !item.nics.some(nic => (nic.usage?.rxMbps || 0) + (nic.usage?.txMbps || 0) > 0);
        }
        if (kind === 'adapter') {
          return (item.usage?.rxMbps || 0) + (item.usage?.txMbps || 0) === 0;
        }
      }
      if (lens === 'debug') {
        if (kind === 'adapter') {
          return !(item.state === 'down');
        }
        if (kind === 'switch') {
          return item.ports > 0;
        }
        if (kind === 'consumer') {
          return !(item.ghostOnly || (item.running && item.nics.length === 0));
        }
        if (kind === 'network') {
          return item.live > 0;
        }
      }
      return false;
    },
    [lens]
  );

  const renderConsumer = consumer => (
    <div
      key={consumer.id}
      className={`${slotClass(consumer.nics.map(n => n.networkId))} ${
        lensDim('consumer', consumer) ? 'hw-topo-lens-dim' : ''
      }`}
    >
      <ConsumerCard
        consumer={consumer}
        colors={colors}
        feedPresent={graph.feedPresent}
        onTrace={handleTrace}
        onOpen={onOpenMachine}
        registerAnchor={registerAnchor}
        canRewire={canRewire}
        pendingLinks={pendingLinks}
        pendingAdds={pendingMoves.filter(move => move.isAdd && move.machineName === consumer.id)}
        onDragNic={onDragNic}
        onOpenNetworking={onOpenNetworking}
        onOpenSettings={onOpenSettings}
        tracedSet={traceSet}
      />
    </div>
  );

  const shownAdapters = graph.adapters.filter(adapter => {
    if (adapter.memberOf) {
      return false;
    }
    if (visibleCarrierIds) {
      return visibleCarrierIds.has(adapter.id);
    }
    return true;
  });
  const downAdapters = shownAdapters.filter(a => a.kind === 'phys' && a.state === 'down');
  const activeAdapters = shownAdapters.filter(a => !(a.kind === 'phys' && a.state === 'down'));
  const shownSwitches = visibleCarrierIds
    ? graph.switches.filter(s => visibleCarrierIds.has(s.id))
    : graph.switches;

  return (
    <div className={`hw-topo-canvas ${traced ? 'hw-topo-traced' : ''}`} ref={containerRef}>
      <svg className="hw-topo-overlay" aria-hidden="true">
        {paths.map(path => (
          <g key={path.id} className={isDim([path.netId]) ? 'hw-topo-dim' : ''}>
            <path
              d={path.d}
              className="hw-topo-wire-hit"
              onClick={() => {
                handleTrace([path.netId]);
                if (onWireChart) {
                  onWireChart(path.netId);
                }
              }}
              onMouseEnter={() => setHoverWire(path.id)}
              onMouseLeave={() => setHoverWire(prev => (prev === path.id ? null : prev))}
            />
            <path
              d={path.d}
              className={`hw-topo-wire ${path.ghost ? 'hw-topo-wire-ghost' : ''} ${
                path.struck ? 'hw-topo-wire-struck' : ''
              }`}
              style={{ stroke: path.color, strokeWidth: path.width }}
            />
            {!path.struck && (
              <FlowEffects path={path} style={effectStyle} reducedMotion={reducedMotion} />
            )}
            <FlowLabel path={path} />
            {path.cap && path.motion === MOTION_NO_FEED && !path.ghost && (
              <circle
                className="hw-topo-cap"
                style={{ stroke: path.color }}
                r="4"
                cx={path.ex}
                cy={path.ey}
              />
            )}
          </g>
        ))}
        {pendingPaths.map(path => (
          <path key={path.id} d={path.d} className="hw-topo-wire hw-topo-wire-pending" />
        ))}
        <WireSparkline paths={paths} hoveredId={hoverWire} pulse={pulse} />
      </svg>

      <div className={`hw-topo-columns ${hasAggr ? 'hw-topo-columns-4' : ''}`}>
        <div className="hw-topo-col">
          <div className="hw-topo-col-title">{t('hostTools.topology.machinesColumn')}</div>
          {dense && (
            <input
              type="text"
              className="form-control form-control-sm hw-topo-filter"
              placeholder={t('hostTools.topology.filterPlaceholder')}
              value={filterText}
              onChange={event => setFilterText(event.target.value)}
            />
          )}
          {dense && consumerGroups
            ? consumerGroups.map(([netId, group]) => {
                const expanded = expandedGroups.has(netId) || filterText.trim().length > 0;
                const net = graph.networks.find(n => n.id === netId);
                return (
                  <div key={netId} className="hw-topo-group">
                    <button
                      type="button"
                      className="hw-topo-group-head"
                      style={{ borderColor: colors.get(netId) }}
                      onClick={() =>
                        setExpandedGroups(prev => {
                          const nextSet = new Set(prev);
                          if (nextSet.has(netId)) {
                            nextSet.delete(netId);
                          } else {
                            nextSet.add(netId);
                          }
                          return nextSet;
                        })
                      }
                    >
                      <span
                        className="hw-topo-group-band"
                        style={{ background: colors.get(netId) }}
                      />
                      <span className="hw-topo-card-title">
                        {net && net.vlanId > 0
                          ? t('hostTools.topology.vlanBadge', { vlanId: net.vlanId })
                          : t('hostTools.topology.untaggedBadge')}
                      </span>
                      <span className="hw-topo-card-meta">
                        {t('hostTools.topology.machineCount', { count: group.length })}
                      </span>
                      <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} ms-auto`} />
                    </button>
                    {expanded && group.map(renderConsumer)}
                    {!expanded && (
                      <div className="hw-topo-group-preview hw-topo-mono">
                        {group
                          .slice(0, 2)
                          .map(c => c.name)
                          .join(' · ')}
                        {group.length > 2 &&
                          ` ${t('hostTools.topology.moreCount', { count: group.length - 2 })}`}
                      </div>
                    )}
                  </div>
                );
              })
            : visibleConsumers.map(renderConsumer)}
        </div>

        <div className="hw-topo-col">
          <div className="hw-topo-col-title">{t('hostTools.topology.carriersColumn')}</div>
          {activeAdapters.map(adapter => (
            <div
              key={adapter.id}
              className={`${slotClass(
                graph.networks.filter(n => n.carrier === adapter.id).map(n => n.id)
              )} ${lensDim('adapter', adapter) ? 'hw-topo-lens-dim' : ''}`}
            >
              <AdapterCard
                adapter={adapter}
                feedPresent={graph.feedPresent}
                onTrace={handleTrace}
                tracedNetworks={graph.networks.filter(n => n.carrier === adapter.id).map(n => n.id)}
                registerAnchor={registerAnchor}
                onOpenNetworking={onOpenNetworking}
                dragging={canRewire ? dragging : null}
                onDropCarrier={onDropCarrier}
              />
            </div>
          ))}
          {shownSwitches.map(swtch => (
            <div
              key={swtch.id}
              className={`${slotClass(
                graph.networks.filter(n => n.carrier === swtch.id).map(n => n.id)
              )} ${lensDim('switch', swtch) ? 'hw-topo-lens-dim' : ''}`}
            >
              <SwitchCard
                swtch={swtch}
                onTrace={handleTrace}
                tracedNetworks={graph.networks.filter(n => n.carrier === swtch.id).map(n => n.id)}
                registerAnchor={registerAnchor}
                dragging={canRewire ? dragging : null}
                onDropCarrier={onDropCarrier}
              />
            </div>
          ))}
          {downAdapters.length > 0 &&
            !isolatedNet &&
            (canRewire && dragging ? (
              downAdapters.map(adapter => (
                <div key={adapter.id} className="hw-topo-slot">
                  <AdapterCard
                    adapter={adapter}
                    feedPresent={graph.feedPresent}
                    onTrace={handleTrace}
                    tracedNetworks={[]}
                    registerAnchor={registerAnchor}
                    onOpenNetworking={onOpenNetworking}
                    dragging={dragging}
                    onDropCarrier={onDropCarrier}
                  />
                </div>
              ))
            ) : (
              <div
                className={`hw-topo-card hw-topo-downgroup ${lens === 'debug' ? '' : 'hw-topo-quiet'}`}
              >
                <div className="hw-topo-card-sub">
                  {t('hostTools.topology.downAdapters', { count: downAdapters.length })}
                </div>
                <div className="hw-topo-card-sub hw-topo-mono">
                  {downAdapters.map(a => a.name).join(' · ')}
                </div>
              </div>
            ))}
        </div>

        <div className="hw-topo-col">
          <div className="hw-topo-col-title">{t('hostTools.topology.networksColumn')}</div>
          {visibleNetworks.map(network => (
            <div
              key={network.id}
              className={`${slotClass([network.id])} ${
                lensDim('network', network) ? 'hw-topo-lens-dim' : ''
              }`}
            >
              <NetworkCard
                network={network}
                color={colors.get(network.id)}
                feedPresent={graph.feedPresent}
                onDrill={onDrill}
                onTrace={netIds => onIsolate(netIds[0])}
                registerAnchor={registerAnchor}
                dragging={canRewire ? dragging : null}
                onDropNic={onDropNic}
                shared={sharedNetIds ? sharedNetIds.has(network.id) : false}
              />
            </div>
          ))}
          {plannedNetworks.map(network => (
            <div key={network.id} className="hw-topo-slot">
              <NetworkCard
                network={network}
                color="var(--hw-topo-pending)"
                feedPresent={graph.feedPresent}
                onDrill={() => {}}
                onTrace={() => {}}
                registerAnchor={registerAnchor}
              />
            </div>
          ))}
        </div>

        {hasAggr && (
          <div className="hw-topo-col">
            <div className="hw-topo-col-title">{t('hostTools.topology.upstreamColumn')}</div>
            <div className="hw-topo-card hw-topo-upstream">
              <div className="hw-topo-card-sub">{t('hostTools.topology.upstreamHeading')}</div>
              <div className="hw-topo-card-sub hw-topo-mono">
                {t('hostTools.topology.upstreamBody')}
              </div>
            </div>
          </div>
        )}
      </div>

      {!graph.feedPresent && (
        <div className="hw-topo-nofeed-chip">
          <span className="hw-topo-cap-inline" />
          {t('hostTools.topology.noFeedBanner')}
        </div>
      )}
    </div>
  );
};

TopologyCanvas.propTypes = {
  host: PropTypes.shape({
    server: PropTypes.object.isRequired,
    graph: PropTypes.object.isRequired,
  }).isRequired,
  lens: PropTypes.string,
  isolatedNet: PropTypes.string,
  onIsolate: PropTypes.func.isRequired,
  onDrill: PropTypes.func.isRequired,
  onOpenMachine: PropTypes.func.isRequired,
  canRewire: PropTypes.bool,
  dragging: PropTypes.object,
  pendingMoves: PropTypes.array,
  onDragNic: PropTypes.func,
  onDropNic: PropTypes.func,
  onDropCarrier: PropTypes.func,
  onOpenNetworking: PropTypes.func,
  onOpenSettings: PropTypes.func,
  onWireChart: PropTypes.func,
  sharedNetIds: PropTypes.instanceOf(Set),
  effectStyle: PropTypes.string,
  pulse: PropTypes.number,
};

export default TopologyCanvas;
