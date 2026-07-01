import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';

const PhysicalNicNode = ({ data }) => {
  const { label, state, speed, bandwidth, ipAddresses, mtu, flags } = data;

  const isActive = state?.toLowerCase() === 'up';

  const formatSpeed = speedValue => {
    const speedNum = parseInt(speedValue) || 0;
    if (speedNum >= 1000) {
      return `${speedNum / 1000}G`;
    }
    return `${speedNum}M`;
  };

  const formatBandwidth = bw => {
    if (!bw) {
      return '0 Mbps';
    }
    if (bw >= 1000) {
      return `${(bw / 1000).toFixed(1)}G`;
    }
    return `${bw.toFixed(1)}M`;
  };

  const tooltipContent = `
${label} (Physical NIC)
Status: ${state || 'unknown'}
Speed: ${formatSpeed(speed)}
MTU: ${mtu || 'N/A'}
${bandwidth ? `Bandwidth: ${formatBandwidth(bandwidth.totalMbps)} (↓${formatBandwidth(bandwidth.rxMbps)} ↑${formatBandwidth(bandwidth.txMbps)})` : 'No bandwidth data'}
${ipAddresses?.length ? `IP: ${ipAddresses.map(ip => ip.ip_address).join(', ')}` : 'No IP addresses'}
${flags && flags !== '--' ? `Flags: ${flags}` : ''}
  `.trim();

  return (
    <div
      className={`react-flow__node-default hw-node-base ${isActive ? 'hw-nic-active-bg' : 'hw-nic-inactive-bg'}`}
      title={tooltipContent}
    >
      {/* Handles - Top for input (from network), Bottom for output (to VNICs) */}
      <Handle
        type="target"
        position={Position.Top}
        className={`hw-node-handle ${isActive ? 'hw-nic-active-bg' : 'hw-nic-inactive-bg'}`}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className={`hw-node-handle ${isActive ? 'hw-nic-active-bg' : 'hw-nic-inactive-bg'}`}
      />

      {/* Icon */}
      <i className="fas fa-ethernet hw-node-icon" />

      {/* Label below */}
      <div className="hw-node-label">{label}</div>
    </div>
  );
};

PhysicalNicNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    state: PropTypes.string,
    speed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bandwidth: PropTypes.shape({
      totalMbps: PropTypes.number,
      rxMbps: PropTypes.number,
      txMbps: PropTypes.number,
    }),
    ipAddresses: PropTypes.arrayOf(PropTypes.object),
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    flags: PropTypes.string,
  }).isRequired,
};

export default PhysicalNicNode;
