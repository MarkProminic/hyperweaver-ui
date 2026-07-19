import PropTypes from 'prop-types';

import { utilization, utilizationColor, flowPeriod } from './topologyPalette';

const packetCount = mbps => {
  if (mbps <= 0) {
    return 0;
  }
  if (mbps <= 0.01) {
    return 2;
  }
  if (mbps <= 1) {
    return 3;
  }
  if (mbps <= 100) {
    return 4;
  }
  return 5;
};

const packetDur = mbps => Math.max(0.6, 4.2 - Math.log10(mbps + 1) * 1.5);

const packetSize = mbps => {
  if (mbps <= 1) {
    return 3.4;
  }
  if (mbps <= 100) {
    return 4.4;
  }
  return 5.4;
};

const FlowStream = ({ d, mbps, reverse = false, className }) => {
  if (mbps <= 0) {
    return null;
  }
  const dur = packetDur(mbps);
  const count = packetCount(mbps);
  const head = packetSize(mbps);
  const reverseAttrs = reverse ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {};
  return (
    <>
      {[...Array(count).keys()].map(i => (
        <g key={i}>
          <animateMotion
            dur={`${dur.toFixed(2)}s`}
            repeatCount="indefinite"
            path={d}
            rotate="auto"
            begin={`${((dur * i) / count - dur).toFixed(2)}s`}
            {...reverseAttrs}
          />
          <ellipse rx={head} ry={head * 0.42} className={className} opacity="0.95" />
          <ellipse
            cx={-head * 1.6}
            rx={head * 0.72}
            ry={head * 0.3}
            className={className}
            opacity="0.55"
          />
          <ellipse
            cx={-head * 2.9}
            rx={head * 0.48}
            ry={head * 0.2}
            className={className}
            opacity="0.3"
          />
          <ellipse
            cx={-head * 4.1}
            rx={head * 0.28}
            ry={head * 0.13}
            className={className}
            opacity="0.14"
          />
        </g>
      ))}
    </>
  );
};

FlowStream.propTypes = {
  d: PropTypes.string.isRequired,
  mbps: PropTypes.number.isRequired,
  reverse: PropTypes.bool,
  className: PropTypes.string,
};

const HighTrafficPulse = ({ d, mbps }) => {
  if (mbps <= 100) {
    return null;
  }
  const dur = Math.max(0.8, packetDur(mbps) * 0.7);
  return (
    <circle r={packetSize(mbps) + 2.5} className="hw-topo-pulse-glow">
      <animateMotion dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" path={d} />
      <animate
        attributeName="r"
        values={`${packetSize(mbps) + 1};${packetSize(mbps) + 4};${packetSize(mbps) + 1}`}
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  );
};

HighTrafficPulse.propTypes = {
  d: PropTypes.string.isRequired,
  mbps: PropTypes.number.isRequired,
};

/**
 * The full realtime effect stack for one connector carrying measured traffic:
 * two counter-flowing dash rivers (tx rides the path, rx rides it reversed),
 * wave packets with fading tails in both directions (never an empty wire —
 * negative begins), a glow pulse above 100 Mbps, and the utilization
 * temperature riding the tx river's stroke. Rates come straight from the
 * usage endpoints; no measurement, no motion.
 */
export const FlowEffects = ({ path, reducedMotion }) => {
  const total = path.rx + path.tx;
  if (total <= 0) {
    return null;
  }
  const heat = utilizationColor(utilization(total, path.speedMbps));
  const width = Math.max(2, path.width * 0.45);
  if (reducedMotion) {
    return (
      <path
        d={path.d}
        className="hw-topo-wire"
        style={{ stroke: heat, strokeWidth: width, opacity: 0.8 }}
      />
    );
  }
  return (
    <>
      <path
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-tx"
        style={{
          stroke: heat,
          strokeWidth: width,
          animationDuration: `${flowPeriod(Math.max(path.tx, 0.001)).toFixed(2)}s`,
        }}
      />
      <path
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-rx"
        style={{
          strokeWidth: Math.max(1.6, width * 0.7),
          animationDuration: `${flowPeriod(Math.max(path.rx, 0.001)).toFixed(2)}s`,
        }}
      />
      <FlowStream d={path.d} mbps={path.tx} className="hw-topo-particle-tx" />
      <FlowStream d={path.d} mbps={path.rx} reverse className="hw-topo-particle-rx" />
      <HighTrafficPulse d={path.d} mbps={total} />
    </>
  );
};

FlowEffects.propTypes = {
  path: PropTypes.shape({
    d: PropTypes.string.isRequired,
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    speedMbps: PropTypes.number,
  }).isRequired,
  reducedMotion: PropTypes.bool,
};

export const compactRate = mbps => {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(1)}G`;
  }
  if (mbps >= 1) {
    return `${mbps.toFixed(1)}M`;
  }
  return `${Math.round(mbps * 1000)}K`;
};

/** The always-on Kbps label the motion grammar promises for measured traffic. */
export const FlowLabel = ({ path }) => {
  if (path.rx + path.tx <= 0 || !path.cap) {
    return null;
  }
  return (
    <g className="hw-topo-flowlabel">
      <text x={path.mx} y={path.my - 6} textAnchor="middle">
        <tspan className="hw-topo-flowlabel-rx">↓{compactRate(path.rx)}</tspan>
        <tspan dx="6" className="hw-topo-flowlabel-tx">
          ↑{compactRate(path.tx)}
        </tspan>
      </text>
    </g>
  );
};

FlowLabel.propTypes = {
  path: PropTypes.shape({
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
    mx: PropTypes.number,
    my: PropTypes.number,
    cap: PropTypes.bool,
  }).isRequired,
};
