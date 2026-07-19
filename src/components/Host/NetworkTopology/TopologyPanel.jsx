import PropTypes from 'prop-types';
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useServers } from '../../../contexts/ServerContext';
import { hasFeature } from '../../../utils/capabilities';

import TopologyCanvas from './TopologyCanvas';
import TopologyDrillPanel from './TopologyDrillPanel';
import TopologyHeader from './TopologyHeader';
import { detectSharedNetworks } from './topologyModel';
import { vboxModeForKind } from './topologyModelVBox';
import { assignNetworkColors } from './topologyPalette';
import { useTopologyFeed } from './useTopologyFeed';

const hostKeyOf = server => `${server.hostname}:${server.port}`;

const TopologyPanel = ({ preloaded = null, reloadPreloaded = null, fixedScope = null }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getServers, selectMachine, makeAgentRequest } = useServers();

  const [scope, setScope] = useState(fixedScope || 'host');
  const [lens, setLens] = useState(null);
  const [isolation, setIsolation] = useState(null);
  const [drill, setDrill] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [pendingMoves, setPendingMoves] = useState([]);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyResults, setApplyResults] = useState([]);

  const { hosts, loading, error, refresh } = useTopologyFeed({
    scope,
    preloaded,
    reloadPreloaded,
  });

  const multiHostAvailable = getServers().length > 1;
  const feedLive = hosts.some(host => host.graph.feedPresent);

  const handleOpenMachine = useCallback(
    machineName => {
      selectMachine(machineName);
      navigate('/ui/machines');
    },
    [selectMachine, navigate]
  );

  const handleOpenNetworking = useCallback(() => {
    if (window.location.pathname.includes('host-networking')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/ui/host-networking');
  }, [navigate]);

  const handleWireChart = useCallback(() => {
    const charts = document.getElementById('hw-network-charts');
    if (charts) {
      charts.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate('/ui/host-networking');
  }, [navigate]);

  const colorMaps = useMemo(
    () =>
      new Map(
        hosts.map(host => [hostKeyOf(host.server), assignNetworkColors(host.graph.networks)])
      ),
    [hosts]
  );

  const shared = useMemo(
    () => (scope === 'all' && hosts.length > 1 ? detectSharedNetworks(hosts) : []),
    [scope, hosts]
  );
  const sharedIdsByHost = useMemo(() => {
    const map = new Map();
    shared.forEach(entry => {
      entry.refs.forEach(ref => {
        if (!map.has(ref.hostKey)) {
          map.set(ref.hostKey, new Set());
        }
        map.get(ref.hostKey).add(ref.netId);
      });
    });
    return map;
  }, [shared]);

  const issueTotals = useMemo(
    () =>
      hosts.reduce(
        (acc, host) => {
          const { issues } = host.graph;
          acc.down += issues.downAdapters.length;
          acc.empty += issues.emptySwitches.length;
          acc.ghosts += issues.staleUsageLinks.length;
          acc.disconnected += issues.disconnectedMachines.length;
          acc.unassigned += issues.unassignedVnics.length;
          return acc;
        },
        { down: 0, empty: 0, ghosts: 0, disconnected: 0, unassigned: 0 }
      ),
    [hosts]
  );

  const stageMove = useCallback((hostKey, network, drag) => {
    setPendingMoves(prev => [
      ...prev.filter(move => !(move.machineName === drag.machineName && move.link === drag.link)),
      {
        hostKey,
        hostKind: drag.hostKind,
        machineName: drag.machineName,
        link: drag.link,
        adapter: drag.adapter,
        fromNetId: drag.fromNetId,
        toNetId: network.id,
        toCarrier: network.carrier,
        toVlanId: network.vlanId,
        toMode: vboxModeForKind[network.kind] || null,
      },
    ]);
    setDragging(null);
  }, []);

  const applyMoves = useCallback(async () => {
    setApplyBusy(true);
    const results = [];
    const byMachine = new Map();
    pendingMoves.forEach(move => {
      const key = `${move.hostKey}|${move.machineName}`;
      if (!byMachine.has(key)) {
        byMachine.set(key, []);
      }
      byMachine.get(key).push(move);
    });
    const serverByKey = new Map(hosts.map(host => [hostKeyOf(host.server), host.server]));
    const applied = [];
    await Promise.all(
      [...byMachine.entries()].map(async ([key, moves]) => {
        const [hostKey] = key.split('|');
        const machineName = key.slice(hostKey.length + 1);
        const server = serverByKey.get(hostKey);
        if (!server) {
          results.push({ machineName, ok: false, message: t('hostTools.topology.applyNoHost') });
          return;
        }
        const body =
          moves[0].hostKind === 'vbox'
            ? {
                nics: moves.map(move => ({
                  adapter: move.adapter,
                  mode: move.toMode,
                  ...(move.toMode === 'nat' ? {} : { network: move.toCarrier }),
                })),
              }
            : {
                update_nics: moves.map(move => ({
                  physical: move.link,
                  global_nic: move.toCarrier,
                  ...(move.toVlanId > 0 ? { vlan_id: move.toVlanId } : {}),
                })),
              };
        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          `machines/${encodeURIComponent(machineName)}`,
          'PUT',
          body
        );
        if (result?.success) {
          applied.push(...moves);
          const status = result.data?.status || '';
          const restart = result.data?.requires_restart || status === 'pending_power_cycle';
          results.push({
            machineName,
            ok: true,
            message: restart
              ? t('hostTools.topology.applyReboot')
              : result.data?.message || t('hostTools.topology.applyOk'),
          });
        } else {
          results.push({
            machineName,
            ok: false,
            message: result?.message || t('hostTools.topology.applyFail'),
          });
        }
      })
    );
    setApplyResults(results);
    setPendingMoves(prev =>
      prev.filter(
        move =>
          !applied.some(done => done.machineName === move.machineName && done.link === move.link)
      )
    );
    setApplyBusy(false);
    refresh();
  }, [pendingMoves, hosts, makeAgentRequest, refresh, t]);

  return (
    <div className={isFullscreen ? 'hw-topo-fullscreen' : ''}>
      <TopologyHeader
        scope={scope}
        onScopeChange={next => {
          setScope(next);
          setIsolation(null);
          setDrill(null);
        }}
        multiHostAvailable={multiHostAvailable && !fixedScope}
        lens={lens}
        onLensChange={setLens}
        isolatedNet={isolation ? isolation.netId : null}
        onClearIsolation={() => setIsolation(null)}
        feedLive={feedLive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
      />

      {error && (
        <div className="alert alert-warning mt-2 mb-0 py-2">
          {t('hostTools.topology.hostsUnreachable', { hosts: error })}
          <button type="button" className="btn btn-sm btn-light ms-3" onClick={refresh}>
            {t('hostTools.topology.retry')}
          </button>
        </div>
      )}

      {shared.length > 0 && (
        <div className="hw-topo-shared-strip">
          <span className="fw-semibold">{t('hostTools.topology.sharedNetworks')}</span>
          {shared.map(entry => (
            <span key={entry.key} className="hw-topo-mono">
              {entry.vlanId > 0 ? `VLAN ${entry.vlanId} · ` : ''}
              {entry.subnet} — {entry.hosts.join(', ')}
            </span>
          ))}
        </div>
      )}

      {lens === 'debug' && (
        <div className="hw-topo-issues-strip">
          <span>{t('hostTools.topology.issueDown', { count: issueTotals.down })}</span>
          <span>{t('hostTools.topology.issueEmpty', { count: issueTotals.empty })}</span>
          <span>{t('hostTools.topology.issueStale', { count: issueTotals.ghosts })}</span>
          <span>
            {t('hostTools.topology.issueDisconnected', { count: issueTotals.disconnected })}
          </span>
          <span>{t('hostTools.topology.issueUnassigned', { count: issueTotals.unassigned })}</span>
        </div>
      )}

      {pendingMoves.length > 0 && (
        <div className="hw-topo-tray">
          <div className="hw-topo-tray-head">
            <span className="fw-semibold">
              {t('hostTools.topology.stagedHeading', { count: pendingMoves.length })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-warning ms-auto"
              disabled={applyBusy}
              onClick={applyMoves}
            >
              {applyBusy ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                t('hostTools.topology.applyChanges')
              )}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              disabled={applyBusy}
              onClick={() => {
                setPendingMoves([]);
                setApplyResults([]);
              }}
            >
              {t('hostTools.topology.discard')}
            </button>
          </div>
          {pendingMoves.map(move => (
            <div key={`${move.machineName}|${move.link}`} className="hw-topo-tray-row hw-topo-mono">
              {t('hostTools.topology.moveLine', {
                machine: move.machineName,
                link: move.link,
                carrier: move.toCarrier,
                vlan: move.toVlanId > 0 ? ` VLAN ${move.toVlanId}` : '',
              })}
            </div>
          ))}
          <div className="hw-topo-tray-note">{t('hostTools.topology.trayNote')}</div>
        </div>
      )}
      {applyResults.length > 0 && (
        <div className="hw-topo-tray">
          {applyResults.map(result => (
            <div
              key={result.machineName + result.message}
              className={`hw-topo-tray-row ${result.ok ? '' : 'hw-topo-tray-fail'}`}
            >
              <span className="fw-semibold">{result.machineName}</span> — {result.message}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-light mt-1"
            onClick={() => setApplyResults([])}
          >
            {t('hostTools.topology.closeDrill')}
          </button>
        </div>
      )}

      {loading && hosts.length === 0 ? (
        <div className="text-center p-4">
          <i className="fas fa-spinner fa-spin" />
          <p className="mt-2 small">{t('hostTools.topology.loading')}</p>
        </div>
      ) : (
        hosts.map(host => {
          const hostKey = hostKeyOf(host.server);
          const canRewire = hasFeature(host.server, 'machine-modify');
          const hostKind = hasFeature(host.server, 'network-spaces') ? 'vbox' : 'bhyve';
          const drillNet =
            drill && drill.hostKey === hostKey
              ? host.graph.networks.find(net => net.id === drill.netId)
              : null;
          return (
            <div key={hostKey} className="hw-topo-host">
              {(scope === 'all' || multiHostAvailable) && (
                <div className="hw-topo-host-title">
                  <i className="fas fa-server me-2" />
                  <span>{host.server.entityName || host.server.hostname}</span>
                  {!canRewire && (
                    <span className="hw-topo-card-meta ms-2">
                      {t('hostTools.topology.rewireNeedsModify')}
                    </span>
                  )}
                </div>
              )}
              <div className="hw-topo-chipbar">
                {host.graph.networks
                  .filter(net => net.live > 0)
                  .sort((a, b) => b.live - a.live)
                  .map(net => (
                    <button
                      key={net.id}
                      type="button"
                      className={`hw-topo-netchip ${
                        isolation && isolation.hostKey === hostKey && isolation.netId === net.id
                          ? 'hw-topo-netchip-active'
                          : ''
                      }`}
                      onClick={() =>
                        setIsolation(prev =>
                          prev && prev.hostKey === hostKey && prev.netId === net.id
                            ? null
                            : { hostKey, netId: net.id }
                        )
                      }
                    >
                      <span
                        className="hw-topo-netchip-dot"
                        style={{ background: colorMaps.get(hostKey)?.get(net.id) }}
                      />
                      {net.vlanId > 0
                        ? t('hostTools.topology.vlanBadge', { vlanId: net.vlanId })
                        : net.carrier}
                      <span className="hw-topo-netchip-count">{net.live}</span>
                    </button>
                  ))}
              </div>
              <TopologyCanvas
                host={host}
                lens={lens}
                isolatedNet={isolation && isolation.hostKey === hostKey ? isolation.netId : null}
                onIsolate={netId =>
                  setIsolation(prev =>
                    prev && prev.hostKey === hostKey && prev.netId === netId
                      ? null
                      : { hostKey, netId }
                  )
                }
                onDrill={netId =>
                  setDrill(prev =>
                    prev && prev.hostKey === hostKey && prev.netId === netId
                      ? null
                      : { hostKey, netId }
                  )
                }
                onOpenMachine={handleOpenMachine}
                canRewire={canRewire}
                dragging={dragging && dragging.hostKey === hostKey ? dragging.drag : null}
                pendingMoves={pendingMoves.filter(move => move.hostKey === hostKey)}
                onDragNic={drag =>
                  setDragging(drag ? { hostKey, drag: { ...drag, hostKind } } : null)
                }
                onDropNic={network => {
                  if (dragging && dragging.hostKey === hostKey) {
                    stageMove(hostKey, network, dragging.drag);
                  }
                }}
                onOpenNetworking={handleOpenNetworking}
                onWireChart={handleWireChart}
                sharedNetIds={sharedIdsByHost.get(hostKey) || null}
              />
              {drillNet && (
                <TopologyDrillPanel
                  network={drillNet}
                  graph={host.graph}
                  color={colorMaps.get(hostKey)?.get(drillNet.id)}
                  onClose={() => setDrill(null)}
                  onOpenMachine={handleOpenMachine}
                />
              )}
            </div>
          );
        })
      )}

      <div className="hw-topo-legend">
        <span>{t('hostTools.topology.legendWidth')}</span>
        <span>{t('hostTools.topology.legendMotion')}</span>
        <span>{t('hostTools.topology.legendGhost')}</span>
        <span>{t('hostTools.topology.legendClick')}</span>
        <span>{t('hostTools.topology.legendDrag')}</span>
      </div>
    </div>
  );
};

TopologyPanel.propTypes = {
  preloaded: PropTypes.object,
  reloadPreloaded: PropTypes.func,
  fixedScope: PropTypes.string,
};

export default TopologyPanel;
