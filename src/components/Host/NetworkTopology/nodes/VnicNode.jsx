import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';

const VnicNode = ({ data }) => {
  const {
    label,
    over,
    vlanId,
    zone,
    macaddress,
    macaddrtype,
    state,
    speed,
    mtu,
    bandwidth,
    ipAddresses,
  } = data;

  const formatBandwidth = bw => {
    if (!bw) {
      return '0 Mbps';
    }
    if (bw >= 1000) {
      return `${(bw / 1000).toFixed(1)}G`;
    }
    return `${bw.toFixed(1)}M`;
  };

  const formatSpeed = speedValue => {
    const speedNum = parseInt(speedValue) || 0;
    if (speedNum >= 1000) {
      return `${speedNum / 1000}G`;
    }
    return `${speedNum}M`;
  };

  const tooltipContent = `
${label} (Virtual NIC)
State: ${state || 'unknown'}
Over: ${over || 'N/A'}
${vlanId ? `VLAN: ${vlanId}` : 'No VLAN'}
Zone: ${zone || 'global'}
MAC: ${macaddress || 'N/A'}
MAC Type: ${macaddrtype || 'N/A'}
Speed: ${formatSpeed(speed)}
MTU: ${mtu || 'N/A'}
${bandwidth ? `Bandwidth: ${formatBandwidth(bandwidth.totalMbps)} (↓${formatBandwidth(bandwidth.rxMbps)} ↑${formatBandwidth(bandwidth.txMbps)})` : 'No bandwidth data'}
${ipAddresses?.length ? `IP: ${ipAddresses.map(ip => ip.ip_address).join(', ')}` : 'No IP addresses'}
  `.trim();

  // Color based on VLAN or status
  const getColor = () => {
    if (vlanId) {
      // Different colors for VLANs
      const colors = ['#ff9f43', '#e67e22', '#f39c12', '#d35400'];
      return colors[parseInt(vlanId) % colors.length];
    }
    return state?.toLowerCase() === 'up' ? '#ff9f43' : '#6b7280';
  };

  return (
    <div
      className="react-flow__node-default hw-node-base"
      style={{ backgroundColor: getColor() }}
      title={tooltipContent}
    >
      {/* Handles - Top for input (from physical/aggregates), Bottom for output (to zones) */}
      <Handle type="target" position={Position.Top} className="hw-node-handle hw-vnic-bg" />

      <Handle type="source" position={Position.Bottom} className="hw-node-handle hw-vnic-bg" />

      {/* Icon */}
      <i className="fas fa-network-wired hw-node-icon" />

      {/* VLAN badge if present */}
      {vlanId && <div className="hw-vlan-badge">{vlanId}</div>}

      {/* Label below */}
      <div className="hw-node-label">{label}</div>
    </div>
  );
};

VnicNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    over: PropTypes.string,
    vlanId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    zone: PropTypes.string,
    macaddress: PropTypes.string,
    macaddrtype: PropTypes.string,
    state: PropTypes.string,
    speed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bandwidth: PropTypes.shape({
      totalMbps: PropTypes.number,
      rxMbps: PropTypes.number,
      txMbps: PropTypes.number,
    }),
    ipAddresses: PropTypes.array,
  }).isRequired,
};

export default VnicNode;
