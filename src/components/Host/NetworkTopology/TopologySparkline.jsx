import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

const HISTORY_CAP = 30;
const SPARK_W = 84;
const SPARK_H = 30;

/**
 * Hover sparkline for the SVG overlay: keeps a rolling per-wire rx/tx history
 * (one sample per usage pulse) and renders a small two-line chart at the
 * hovered wire's midpoint. Rendered inside the overlay svg.
 */
const WireSparkline = ({ paths, hoveredId, pulse }) => {
  const historyRef = useRef(new Map());
  const pathsRef = useRef(paths);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    const live = new Set();
    pathsRef.current.forEach(path => {
      live.add(path.id);
      if (!historyRef.current.has(path.id)) {
        historyRef.current.set(path.id, []);
      }
      const samples = historyRef.current.get(path.id);
      samples.push({ rx: path.rx, tx: path.tx });
      if (samples.length > HISTORY_CAP) {
        samples.shift();
      }
    });
    [...historyRef.current.keys()].forEach(id => {
      if (!live.has(id)) {
        historyRef.current.delete(id);
      }
    });
  }, [pulse]);

  if (!hoveredId) {
    return null;
  }
  const path = paths.find(p => p.id === hoveredId);
  const samples = historyRef.current.get(hoveredId) || [];
  if (!path || samples.length < 2) {
    return null;
  }
  const max = Math.max(...samples.map(s => Math.max(s.rx, s.tx)), 0.001);
  const line = key =>
    samples
      .map((s, index) => {
        const x = path.mx - SPARK_W / 2 + (index / (samples.length - 1)) * SPARK_W;
        const y = path.my + 24 + SPARK_H - (s[key] / max) * SPARK_H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  return (
    <g className="hw-topo-spark">
      <rect
        x={path.mx - SPARK_W / 2 - 6}
        y={path.my + 18}
        width={SPARK_W + 12}
        height={SPARK_H + 12}
        rx="4"
      />
      <polyline points={line('rx')} className="hw-topo-spark-rx" />
      <polyline points={line('tx')} className="hw-topo-spark-tx" />
    </g>
  );
};

WireSparkline.propTypes = {
  paths: PropTypes.array.isRequired,
  hoveredId: PropTypes.string,
  pulse: PropTypes.number,
};

export default WireSparkline;
