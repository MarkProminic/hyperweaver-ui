import { getBezierPath, EdgeLabelRenderer, useInternalNode } from '@xyflow/react';
import PropTypes from 'prop-types';

import { getEdgeParams } from '../utils/edgeUtils';

const BidirectionalEdge = ({ id, source, target, data = {}, markerEnd, markerStart }) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { bandwidth = {} } = data;
  const { rxMbps = 0, txMbps = 0, totalMbps = 0 } = bandwidth;

  // Get floating edge parameters for uplink (TX)
  const {
    sx: txSx,
    sy: txSy,
    tx: txTx,
    ty: txTy,
    sourcePos: txSourcePos,
    targetPos: txTargetPos,
  } = getEdgeParams(sourceNode, targetNode, 'tx');

  // Get floating edge parameters for downlink (RX)
  const {
    sx: rxSx,
    sy: rxSy,
    tx: rxTx,
    ty: rxTy,
    sourcePos: rxSourcePos,
    targetPos: rxTargetPos,
  } = getEdgeParams(sourceNode, targetNode, 'rx');

  // Calculate paths for bidirectional flow
  const [uplinkPath, labelX, labelY] = getBezierPath({
    sourceX: txSx,
    sourceY: txSy,
    sourcePosition: txSourcePos,
    targetX: txTx,
    targetY: txTy,
    targetPosition: txTargetPos,
  });

  const [downlinkPath] = getBezierPath({
    sourceX: rxSx,
    sourceY: rxSy,
    sourcePosition: rxSourcePos,
    targetX: rxTx,
    targetY: rxTy,
    targetPosition: rxTargetPos,
  });

  // Calculate stroke width based on bandwidth (logarithmic scale)
  const getStrokeWidth = mbps => {
    if (mbps <= 0) {
      return 1;
    }
    if (mbps <= 1) {
      return 2;
    }
    if (mbps <= 10) {
      return 3;
    }
    if (mbps <= 100) {
      return 4;
    }
    if (mbps <= 1000) {
      return 5;
    }
    return 6;
  };

  // Calculate animation speed based on bandwidth
  const getAnimationDuration = mbps => {
    if (mbps <= 0) {
      return '5s';
    } // Slow for no traffic
    if (mbps <= 1) {
      return '4s';
    }
    if (mbps <= 10) {
      return '3s';
    }
    if (mbps <= 100) {
      return '2s';
    }
    if (mbps <= 1000) {
      return '1s';
    }
    return '0.5s'; // Very fast for high traffic
  };

  // Calculate opacity based on traffic
  const getOpacity = mbps => {
    if (mbps <= 0) {
      return 0.3;
    }
    if (mbps <= 1) {
      return 0.5;
    }
    if (mbps <= 10) {
      return 0.7;
    }
    return 1.0;
  };

  // Get interface speed for utilization calculation
  const getInterfaceSpeed = () => {
    // Try to get speed from the interface data
    if (data.linkSpeed) {
      return data.linkSpeed;
    }
    if (data.sourceSpeed) {
      return parseInt(data.sourceSpeed) || 1000;
    }
    if (data.targetSpeed) {
      return parseInt(data.targetSpeed) || 1000;
    }
    return 1000; // Default to 1Gbps if unknown
  };

  // Calculate temperature gradient colors (same as FloatingEdge)
  const getUtilizationColor = (mbps, maxSpeed) => {
    const utilization = Math.min((mbps / maxSpeed) * 100, 100);

    if (utilization === 0) {
      return '#3b82f6';
    } // Bright blue for idle

    // Smooth HSL interpolation for temperature gradient
    let hue;
    let saturation;
    let lightness;

    if (utilization <= 10) {
      hue = 240 - (utilization / 10) * 20;
      saturation = 85 + (utilization / 10) * 10;
      lightness = 55 + (utilization / 10) * 10;
    } else if (utilization <= 25) {
      const t = (utilization - 10) / 15;
      hue = 220 - t * 40;
      saturation = 95;
      lightness = 65 + t * 5;
    } else if (utilization <= 50) {
      const t = (utilization - 25) / 25;
      hue = 180 - t * 60;
      saturation = 95 - t * 15;
      lightness = 70;
    } else if (utilization <= 75) {
      const t = (utilization - 50) / 25;
      hue = 120 - t * 60;
      saturation = 80 + t * 15;
      lightness = 70 - t * 5;
    } else if (utilization <= 90) {
      const t = (utilization - 75) / 15;
      hue = 60 - t * 30;
      saturation = 95;
      lightness = 65 - t * 5;
    } else {
      const t = (utilization - 90) / 10;
      hue = 30 - t * 30;
      saturation = 95 + t * 5;
      lightness = 60 - t * 10;
    }

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
  };

  const interfaceSpeed = getInterfaceSpeed();
  const uplinkColor = getUtilizationColor(txMbps, interfaceSpeed);
  const downlinkColor = getUtilizationColor(rxMbps, interfaceSpeed);

  const uplinkStrokeWidth = getStrokeWidth(txMbps);
  const downlinkStrokeWidth = getStrokeWidth(rxMbps);
  const uplinkOpacity = getOpacity(txMbps);
  const downlinkOpacity = getOpacity(rxMbps);
  const uplinkAnimationDuration = getAnimationDuration(txMbps);
  const downlinkAnimationDuration = getAnimationDuration(rxMbps);

  return (
    <>
      {/* Downlink path (RX - traffic coming into target) */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={downlinkPath}
        strokeWidth={Math.max(downlinkStrokeWidth, 1)}
        stroke={downlinkColor}
        fill="none"
        opacity={Math.max(downlinkOpacity, 0.3)}
        strokeDasharray={rxMbps > 0 ? '8,4' : 'none'}
        style={{
          animation:
            rxMbps > 0 ? `flow-downlink ${downlinkAnimationDuration} linear infinite` : 'none',
          transition: `stroke-width 1s ease, opacity 1s ease, animation-duration 1s ease`,
        }}
        markerEnd={markerEnd}
      />

      {/* Uplink path (TX - traffic going out from source) */}
      <path
        className="react-flow__edge-path"
        d={uplinkPath}
        strokeWidth={Math.max(uplinkStrokeWidth, 1)}
        stroke={uplinkColor}
        fill="none"
        opacity={Math.max(uplinkOpacity, 0.3)}
        strokeDasharray={txMbps > 0 ? '8,4' : 'none'}
        style={{
          animation:
            txMbps > 0 ? `flow-uplink ${uplinkAnimationDuration} linear infinite reverse` : 'none',
          transition: `stroke-width 1s ease, opacity 1s ease, animation-duration 1s ease`,
        }}
        markerStart={markerStart}
      />

      {/* Edge label with bandwidth info */}
      {totalMbps > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="nodrag nopan hw-edge-label"
          >
            <div style={{ color: downlinkColor }}>↓{rxMbps.toFixed(1)}M</div>
            <div style={{ color: uplinkColor }}>↑{txMbps.toFixed(1)}M</div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* CSS animations */}
      <style>
        {`
        @keyframes flow-downlink {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 12;
          }
        }
        
        @keyframes flow-uplink {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -12;
          }
        }
      `}
      </style>
    </>
  );
};

BidirectionalEdge.propTypes = {
  id: PropTypes.string.isRequired,
  source: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
  data: PropTypes.object,
  markerEnd: PropTypes.any,
  markerStart: PropTypes.any,
};

export default BidirectionalEdge;
