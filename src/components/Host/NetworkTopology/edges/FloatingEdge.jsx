import { getBezierPath, useInternalNode, EdgeLabelRenderer } from '@xyflow/react';
import PropTypes from 'prop-types';

import { getEdgeParams } from '../utils/edgeUtils';

const FloatingEdge = ({ id, source, target, markerEnd, style = {}, data = {} }) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { bandwidth = {}, flowDirection = 'rx', linkSpeed = 1000 } = data;
  const currentMbps = bandwidth?.totalMbps || 0;

  // Calculate utilization-based color with temperature gradient
  const getUtilizationColor = () => {
    const utilization = Math.min((currentMbps / linkSpeed) * 100, 100);

    // Temperature gradient: Blue (cold) -> Cyan -> Green -> Yellow -> Orange -> Red (hot)
    // Brightened for better visibility on dark backgrounds
    if (utilization === 0) {
      return '#3b82f6';
    } // Bright blue for idle

    // Smooth HSL interpolation for temperature gradient
    let hue;
    let saturation;
    let lightness;

    if (utilization <= 10) {
      // Bright blue to blue (240° to 220°)
      hue = 240 - (utilization / 10) * 20;
      saturation = 85 + (utilization / 10) * 10;
      lightness = 55 + (utilization / 10) * 10;
    } else if (utilization <= 25) {
      // Blue to cyan (220° to 180°)
      const t = (utilization - 10) / 15;
      hue = 220 - t * 40;
      saturation = 95;
      lightness = 65 + t * 5;
    } else if (utilization <= 50) {
      // Cyan to green (180° to 120°)
      const t = (utilization - 25) / 25;
      hue = 180 - t * 60;
      saturation = 95 - t * 15;
      lightness = 70;
    } else if (utilization <= 75) {
      // Green to yellow (120° to 60°)
      const t = (utilization - 50) / 25;
      hue = 120 - t * 60;
      saturation = 80 + t * 15;
      lightness = 70 - t * 5;
    } else if (utilization <= 90) {
      // Yellow to orange (60° to 30°)
      const t = (utilization - 75) / 15;
      hue = 60 - t * 30;
      saturation = 95;
      lightness = 65 - t * 5;
    } else {
      // Orange to red (30° to 0°)
      const t = (utilization - 90) / 10;
      hue = 30 - t * 30;
      saturation = 95 + t * 5;
      lightness = 60 - t * 10;
    }

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
  };

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
    flowDirection
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  // Calculate stroke width based on utilization percentage
  const getStrokeWidth = () => {
    const utilization = (currentMbps / linkSpeed) * 100;
    if (utilization <= 0) {
      return 1;
    }
    if (utilization <= 10) {
      return 2;
    }
    if (utilization <= 25) {
      return 3;
    }
    if (utilization <= 50) {
      return 4;
    }
    if (utilization <= 75) {
      return 5;
    }
    if (utilization <= 90) {
      return 6;
    }
    return 8; // Overloaded
  };

  // Calculate animation duration based on actual bandwidth (more traffic = faster)
  const getAnimationDuration = () => {
    if (currentMbps <= 0) {
      return '6s';
    }
    // Logarithmic scale for smoother transitions
    const speed = Math.max(0.5, 4 - Math.log10(currentMbps + 1) * 1.5);
    return `${speed.toFixed(1)}s`;
  };

  // Calculate particle size based on bandwidth
  const getParticleSize = () => {
    if (currentMbps <= 0) {
      return 2;
    }
    if (currentMbps <= 1) {
      return 2.5;
    }
    if (currentMbps <= 10) {
      return 3;
    }
    if (currentMbps <= 100) {
      return 4;
    }
    if (currentMbps <= 1000) {
      return 5;
    }
    return 6;
  };

  // Calculate number of particles based on traffic intensity
  const getParticleCount = () => {
    if (currentMbps <= 0) {
      return 1;
    }
    if (currentMbps <= 1) {
      return 1;
    }
    if (currentMbps <= 10) {
      return 2;
    }
    if (currentMbps <= 100) {
      return 3;
    }
    if (currentMbps <= 1000) {
      return 4;
    }
    return 5;
  };

  const formatBandwidth = bw => {
    if (!bw) {
      return '0';
    }
    if (bw >= 1000) {
      return `${(bw / 1000).toFixed(1)}G`;
    }
    return `${bw.toFixed(1)}M`;
  };

  const edgeColor = getUtilizationColor();
  const strokeWidth = getStrokeWidth();
  const animationDuration = getAnimationDuration();
  const directionSymbol = flowDirection === 'rx' ? '↓' : '↑';
  const directionColor = flowDirection === 'rx' ? '#48c78e' : '#3273dc';

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth,
          fill: 'none',
          opacity: currentMbps > 0 ? 0.8 : 0.4,
          strokeDasharray: currentMbps > 0 ? 'none' : '5,5',
          transition: 'stroke 1s ease, stroke-width 1s ease, opacity 1s ease',
          ...style,
        }}
      />

      {/* Animated flow indicators - multiple particles based on bandwidth */}
      {currentMbps > 0 && (
        <g>
          {(() => {
            const particles = [];
            const count = getParticleCount();
            for (let i = 0; i < count; i += 1) {
              const particleSize = getParticleSize() - i * 0.5;
              const delay = (i * 0.4).toFixed(1);
              const opacity = 0.9 - i * 0.15;
              particles.push(
                <circle
                  key={`particle-${i}`}
                  r={Math.max(1, particleSize)}
                  fill={directionColor}
                  opacity={Math.max(0.3, opacity)}
                >
                  <animateMotion
                    dur={animationDuration}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin={`${delay}s`}
                  />
                </circle>
              );
            }
            return particles;
          })()}

          {/* Additional pulse effect for high traffic */}
          {currentMbps > 100 && (
            <circle r={getParticleSize() + 2} fill={edgeColor} opacity="0.3">
              <animateMotion
                dur={`${parseFloat(animationDuration) * 0.7}s`}
                repeatCount="indefinite"
                path={edgePath}
                begin="0.1s"
              />
              <animate
                attributeName="r"
                values={`${getParticleSize()};${getParticleSize() + 3};${getParticleSize()}`}
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      )}

      {/* Edge label with bandwidth info */}
      {currentMbps > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              border: `1px solid ${edgeColor}`,
              color: directionColor,
            }}
            className="nodrag nopan hw-floating-edge-label"
          >
            {directionSymbol}
            {formatBandwidth(currentMbps)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

FloatingEdge.propTypes = {
  id: PropTypes.string.isRequired,
  source: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
  markerEnd: PropTypes.any,
  style: PropTypes.object,
  data: PropTypes.object,
};

export default FloatingEdge;
