import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { networkTitle } from './TopologyCards';
import { rateLabels } from './topologyPalette';

/**
 * The click-a-network answer: who is on this network and how much each member
 * is consuming, with real rates when the host has a usage feed and honest
 * placeholders when it doesn't.
 */
const TopologyDrillPanel = ({ network, graph, color, onClose, onOpenMachine }) => {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    const byZone = new Map();
    network.members.forEach(member => {
      const zone = member.zone && member.zone !== '--' ? member.zone : 'global';
      if (!byZone.has(zone)) {
        byZone.set(zone, []);
      }
      byZone.get(zone).push(member.link);
    });
    const list = [...byZone.entries()].map(([zone, links]) => {
      const usage = links.reduce(
        (acc, link) => {
          const linkUsage = graph.usageByLink.get(link);
          acc.rxMbps += linkUsage?.rxMbps || 0;
          acc.txMbps += linkUsage?.txMbps || 0;
          return acc;
        },
        { rxMbps: 0, txMbps: 0 }
      );
      return { zone, links, usage, total: usage.rxMbps + usage.txMbps };
    });
    return list.sort((a, b) => b.total - a.total);
  }, [network, graph.usageByLink]);

  const maxTotal = Math.max(...rows.map(row => row.total), 0.000001);

  return (
    <div className="hw-topo-drill" style={{ borderColor: color }}>
      <div className="hw-topo-drill-head">
        <span className="hw-topo-net-band" style={{ background: color }} />
        <span className="hw-topo-card-title">
          {networkTitle(network, t)}
          {' · '}
          <span className="hw-topo-mono">{network.carrier}</span>
        </span>
        <span className="hw-topo-card-meta">
          {t('hostTools.topology.liveCount', { count: network.live })}
          {network.planned > 0 &&
            ` · ${t('hostTools.topology.plannedCount', { count: network.planned })}`}
        </span>
        <button
          type="button"
          className="hw-topo-open ms-auto"
          title={t('hostTools.topology.closeDrill')}
          onClick={onClose}
        >
          <i className="fas fa-times" />
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="hw-topo-card-sub">{t('hostTools.topology.noMembers')}</div>
      ) : (
        <div className="hw-topo-drill-rows">
          {rows.map(row => {
            const labels = rateLabels(graph.feedPresent, row.usage);
            let rateText = t('hostTools.topology.noFeed');
            if (labels) {
              rateText =
                row.total > 0 ? `↓${labels.rx} ↑${labels.tx}` : t('hostTools.topology.idle');
            }
            return (
              <div key={row.zone} className="hw-topo-drill-row">
                <button
                  type="button"
                  className="hw-topo-drill-name"
                  onClick={() => row.zone !== 'global' && onOpenMachine(row.zone)}
                  disabled={row.zone === 'global'}
                >
                  {row.zone === 'global' ? t('hostTools.topology.globalZone') : row.zone}
                </button>
                <span className="hw-topo-mono hw-topo-drill-links">{row.links.join(' · ')}</span>
                <span className="hw-topo-drill-bars">
                  {graph.feedPresent ? (
                    <>
                      <span
                        className="hw-topo-bar hw-topo-bar-tx"
                        style={{ width: `${Math.max(2, (row.usage.txMbps / maxTotal) * 100)}%` }}
                      />
                      <span
                        className="hw-topo-bar hw-topo-bar-rx"
                        style={{ width: `${Math.max(2, (row.usage.rxMbps / maxTotal) * 100)}%` }}
                      />
                    </>
                  ) : null}
                </span>
                <span className="hw-topo-drill-rate hw-topo-mono">{rateText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

TopologyDrillPanel.propTypes = {
  network: PropTypes.object.isRequired,
  graph: PropTypes.object.isRequired,
  color: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onOpenMachine: PropTypes.func.isRequired,
};

export default TopologyDrillPanel;
