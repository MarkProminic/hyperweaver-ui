import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import PropTypes from 'prop-types';

import { getVlanColor } from '../utils/topologyAutoMapper';

const BandwidthEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const { type, bandwidth, vlanId, linkSpeed: dataLinkSpeed } = data || {};

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge color based on utilization percentage with temperature gradient
  const getEdgeColor = () => {
    // Get interface speed for utilization calculation
    const linkSpeed = dataLinkSpeed || 1000; // Default to 1Gbps
    const currentMbps = bandwidth?.totalMbps || 0;

    // Calculate utilization percentage
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

  // Determine edge thickness based on link speed capacity
  const getEdgeThickness = () => {
    // Try to get speed from the data or estimate from interface type
    const linkSpeed = dataLinkSpeed || data?.speed || bandwidth?.linkSpeed || 1000; // Default 1G

    if (linkSpeed >= 100000) {
      return 12;
    } // 100G
    if (linkSpeed >= 40000) {
      return 10;
    } // 40G
    if (linkSpeed >= 10000) {
      return 8;
    } // 10G
    if (linkSpeed >= 1000) {
      return 4;
    } // 1G
    if (linkSpeed >= 100) {
      return 2;
    } // 100M
    return 1; // < 100M
  };

  // Determine edge style based on type
  const getEdgeStyle = () => {
    const baseStyle = {
      stroke: getEdgeColor(),
      strokeWidth: getEdgeThickness(),
    };

    switch (type) {
      case 'vlan':
        return {
          ...baseStyle,
          strokeDasharray: '8,4',
          opacity: 0.8,
        };
      case 'aggregation':
        return {
          ...baseStyle,
          strokeWidth: Math.max(baseStyle.strokeWidth, 4),
          opacity: 0.9,
        };
      default:
        return {
          ...baseStyle,
          opacity: 0.7,
        };
    }
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

  const getLabelText = () => {
    switch (type) {
      case 'vlan':
        return `VLAN ${vlanId}`;
      case 'aggregation':
        return 'LACP Bond';
      case 'direct':
        return 'Direct';
      case 'assignment':
        return 'Interface';
      default:
        return 'Connected';
    }
  };

  const edgeStyle = getEdgeStyle();

  return (
    <>
      {/* Base Edge with enhanced styling */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...edgeStyle,
          strokeDasharray: bandwidth && bandwidth.totalMbps > 0 ? undefined : '5,5',
          animation: bandwidth && bandwidth.totalMbps > 0 ? undefined : 'dash 1s linear infinite',
        }}
      />

      {/* Animated flow effects */}
      <g>
        {/* Always show subtle animation for active links */}
        {bandwidth && bandwidth.totalMbps > 0 ? (
          <>
            {/* RX Traffic Animation (Green particles flowing forward) */}
            {bandwidth.rxMbps > 0 && (
              <>
                <circle r="3" fill="#48c78e" opacity="0.9">
                  <animateMotion
                    dur={`${Math.max(2, 8 - bandwidth.rxMbps / 10)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                  />
                </circle>
                <circle r="2" fill="#48c78e" opacity="0.7">
                  <animateMotion
                    dur={`${Math.max(2, 8 - bandwidth.rxMbps / 10)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="0.3s"
                  />
                </circle>
              </>
            )}

            {/* TX Traffic Animation (Blue particles flowing reverse) */}
            {bandwidth.txMbps > 0 && (
              <>
                <circle r="3" fill="#3273dc" opacity="0.9">
                  <animateMotion
                    dur={`${Math.max(2, 8 - bandwidth.txMbps / 10)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="0.5s"
                  />
                </circle>
                <circle r="2" fill="#3273dc" opacity="0.7">
                  <animateMotion
                    dur={`${Math.max(2, 8 - bandwidth.txMbps / 10)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="0.8s"
                  />
                </circle>
              </>
            )}

            {/* High traffic gets gradient flow effect */}
            {bandwidth.totalMbps > 10 && (
              <>
                <circle r="4" fill={getEdgeColor()} opacity="0.4">
                  <animateMotion
                    dur={`${Math.max(1, 5 - bandwidth.totalMbps / 20)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="1s"
                  />
                </circle>
                <circle r="3" fill={getEdgeColor()} opacity="0.5">
                  <animateMotion
                    dur={`${Math.max(1, 5 - bandwidth.totalMbps / 20)}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="1.2s"
                  />
                </circle>
              </>
            )}
          </>
        ) : (
          /* Subtle pulse for idle connections */
          <circle r="2" fill={getEdgeColor()} opacity="0.3">
            <animateMotion dur="4s" repeatCount="indefinite" path={edgePath} />
            <animate
              attributeName="opacity"
              values="0.1;0.4;0.1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </g>

      {/* CSS for dashed line animation */}
      <style>
        {`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}
      </style>

      {/* Edge Label with bandwidth and VLAN info */}
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            border: `1px solid ${getEdgeColor()}`,
            color: getEdgeColor(),
          }}
          className="nodrag nopan hw-edge-label text-center"
        >
          {/* Primary Label Based on Type */}
          <div>
            {/* Show bandwidth if available and > 0 */}
            {bandwidth && bandwidth.totalMbps > 0 ? (
              <>
                <div>{formatBandwidth(bandwidth.totalMbps)}</div>
                {bandwidth.totalMbps > 1 && (
                  <div>
                    ↓{formatBandwidth(bandwidth.rxMbps)} ↑{formatBandwidth(bandwidth.txMbps)}
                  </div>
                )}
              </>
            ) : (
              /* Show connection type when no bandwidth */
              <div className="fs-5">{getLabelText()}</div>
            )}

            {/* Secondary labels */}
            {type === 'vlan' && vlanId && bandwidth && bandwidth.totalMbps > 0 && (
              <div
                className="hw-edge-label-secondary"
                style={{
                  color: getVlanColor(vlanId),
                }}
              >
                VLAN {vlanId}
              </div>
            )}

            {type === 'aggregation' && bandwidth && bandwidth.totalMbps > 0 && (
              <div className="hw-edge-label-secondary" style={{ color: '#3273dc' }}>
                LACP
              </div>
            )}

            {/* Idle indicator */}
            {bandwidth && bandwidth.totalMbps === 0 && (
              <div className="hw-edge-label-idle">idle</div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

BandwidthEdge.propTypes = {
  id: PropTypes.string.isRequired,
  sourceX: PropTypes.number.isRequired,
  sourceY: PropTypes.number.isRequired,
  targetX: PropTypes.number.isRequired,
  targetY: PropTypes.number.isRequired,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
  data: PropTypes.object,
  markerEnd: PropTypes.any,
};

export default BandwidthEdge;
