import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { compactRate } from './TopologyFlow';
import { sliceForMachine } from './topologyModel';
import { assignNetworkColors } from './topologyPalette';

/**
 * The everywhere-mini: an inline strip of colored network dots + live rate,
 * derived from the SAME graph the full renderer draws. Host mode (no
 * machineName) shows the host's networks; machine mode shows one machine's.
 * Dots pulse only on measured traffic — the motion grammar in miniature.
 */
const TopologyMini = ({ graph, machineName = null }) => {
  const { t } = useTranslation();
  const slice = machineName ? sliceForMachine(graph, machineName) : graph;
  if (!slice || slice.networks.length === 0) {
    return null;
  }
  const colors = assignNetworkColors(graph.networks);
  const source = machineName
    ? slice.consumers[0].nics.map(nic => ({ id: nic.networkId, usage: nic.usage }))
    : slice.networks.map(net => ({ id: net.id, usage: net.usage }));
  const perNet = new Map();
  source.forEach(row => {
    const prev = perNet.get(row.id) || { rx: 0, tx: 0 };
    prev.rx += row.usage?.rxMbps || 0;
    prev.tx += row.usage?.txMbps || 0;
    perNet.set(row.id, prev);
  });
  const totals = [...perNet.values()].reduce(
    (acc, rates) => ({ rx: acc.rx + rates.rx, tx: acc.tx + rates.tx }),
    { rx: 0, tx: 0 }
  );
  const total = totals.rx + totals.tx;
  const nets = [...slice.networks].sort((a, b) => b.live - a.live).slice(0, 6);
  return (
    <span className="hw-topo-mini">
      {nets.map(net => {
        const rates = perNet.get(net.id);
        const hot = (rates?.rx || 0) + (rates?.tx || 0) > 0;
        return (
          <span
            key={net.id}
            className={`hw-topo-mini-dot ${hot ? 'hw-topo-mini-hot' : ''}`}
            style={{ background: colors.get(net.id) }}
            title={
              net.vlanId > 0
                ? `${t('hostTools.topology.vlanBadge', { vlanId: net.vlanId })} · ${net.carrier}`
                : net.carrier
            }
          />
        );
      })}
      {graph.feedPresent && (
        <span className="hw-topo-mini-rate">
          {total > 0
            ? `↓${compactRate(totals.rx)} ↑${compactRate(totals.tx)}`
            : t('hostTools.topology.idle')}
        </span>
      )}
    </span>
  );
};

TopologyMini.propTypes = {
  graph: PropTypes.object.isRequired,
  machineName: PropTypes.string,
};

export default TopologyMini;
