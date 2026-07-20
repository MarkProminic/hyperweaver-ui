import PropTypes from 'prop-types';

import {
  Equalizer,
  PacketField,
  WaveForm,
  lanePath,
  lanePathReversed,
  rateWidth,
} from './TopologyFlowMotion';
import { utilization, utilizationColor, flowPeriod } from './topologyPalette';

export const EFFECT_STYLES = ['comets', 'weathermap', 'wave', 'bars', 'rivers'];

const ArrowLane = ({ id, d, mbps, speedMbps }) => {
  if (mbps <= 0) {
    return null;
  }
  const color = utilizationColor(utilization(mbps, speedMbps));
  const width = rateWidth(mbps);
  const head = Math.min(16, Math.max(9, width * 1.1 + 3));
  const markerId = `hw-arrow-${id}`;
  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth={head}
          markerHeight={head}
          refX={head - 1}
          refY={head / 2}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M0,${(head * 0.18).toFixed(1)} L${(head - 1).toFixed(1)},${(head / 2).toFixed(1)} L0,${(head * 0.82).toFixed(1)} Z`}
            fill={color}
          />
        </marker>
      </defs>
      <path
        d={d}
        className="hw-topo-wire hw-topo-lane"
        style={{
          stroke: color,
          strokeWidth: width,
          animationDuration: `${flowPeriod(mbps).toFixed(2)}s`,
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
};

ArrowLane.propTypes = {
  id: PropTypes.string.isRequired,
  d: PropTypes.string.isRequired,
  mbps: PropTypes.number.isRequired,
  speedMbps: PropTypes.number,
};

const Weathermap = ({ path }) => (
  <>
    <ArrowLane
      id={`${path.id}-tx`}
      d={lanePath(path.d, -Math.max(4, rateWidth(path.tx) * 0.8))}
      mbps={path.tx}
      speedMbps={path.speedMbps}
    />
    <ArrowLane
      id={`${path.id}-rx`}
      d={lanePathReversed(path.d, Math.max(4, rateWidth(path.rx) * 0.8))}
      mbps={path.rx}
      speedMbps={path.speedMbps}
    />
  </>
);

Weathermap.propTypes = {
  path: PropTypes.object.isRequired,
};

const Rivers = ({ path }) => {
  const heat = utilizationColor(utilization(path.rx + path.tx, path.speedMbps));
  return (
    <>
      <path
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-tx"
        style={{
          stroke: heat,
          strokeWidth: Math.max(2, rateWidth(path.tx) * 0.6),
          animationDuration: `${flowPeriod(Math.max(path.tx, 0.001)).toFixed(2)}s`,
        }}
      />
      <path
        d={path.d}
        className="hw-topo-wire hw-topo-river hw-topo-river-rx"
        style={{
          strokeWidth: Math.max(1.6, rateWidth(path.rx) * 0.5),
          animationDuration: `${flowPeriod(Math.max(path.rx, 0.001)).toFixed(2)}s`,
        }}
      />
    </>
  );
};

Rivers.propTypes = {
  path: PropTypes.object.isRequired,
};

/**
 * The pluggable realtime effect stack. Every style reads the SAME live
 * rx/tx endpoint rates; width, amplitude, cadence and heat all breathe with
 * the measurement. No measurement, no motion — callers gate on that.
 */
export const FlowEffects = ({ path, style = 'comets', reducedMotion }) => {
  const total = path.rx + path.tx;
  if (reducedMotion) {
    if (total <= 0) {
      return null;
    }
    return (
      <path
        d={path.d}
        className="hw-topo-wire"
        style={{
          stroke: utilizationColor(utilization(total, path.speedMbps)),
          strokeWidth: rateWidth(total) * 0.6,
          opacity: 0.8,
        }}
      />
    );
  }
  if (style === 'comets') {
    return (
      <>
        <PacketField d={path.d} mbps={path.tx} offset={-4} className="hw-topo-particle-tx" />
        <PacketField d={path.d} mbps={path.rx} reverse offset={4} className="hw-topo-particle-rx" />
      </>
    );
  }
  if (total <= 0) {
    return null;
  }
  if (style === 'wave') {
    return <WaveForm path={path} />;
  }
  if (style === 'bars') {
    return <Equalizer path={path} />;
  }
  if (style === 'rivers') {
    return <Rivers path={path} />;
  }
  return <Weathermap path={path} />;
};

FlowEffects.propTypes = {
  path: PropTypes.shape({
    id: PropTypes.string,
    d: PropTypes.string.isRequired,
    rx: PropTypes.number.isRequired,
    tx: PropTypes.number.isRequired,
    width: PropTypes.number,
    speedMbps: PropTypes.number,
  }).isRequired,
  style: PropTypes.string,
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

/** The always-on rate label the motion grammar promises for measured traffic. */
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
