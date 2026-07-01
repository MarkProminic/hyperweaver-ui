import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';

const ZoneNode = ({ data }) => {
  const { label, status, zonename, zonepath, autoboot, brand, ipType, vnics } = data;

  const isRunning = status?.toLowerCase() === 'running';

  const tooltipContent = `
${label} (Zone)
Status: ${status || 'unknown'}
Zone Name: ${zonename || label}
Zone Path: ${zonepath || 'N/A'}
Brand: ${brand || 'N/A'}
IP Type: ${ipType || 'N/A'}
Autoboot: ${autoboot || 'N/A'}
VNICs: ${vnics?.length || 0}
${vnics?.length ? `Connected: ${vnics.join(', ')}` : 'No VNICs connected'}
  `.trim();

  return (
    <div
      className={`react-flow__node-default hw-node-base ${isRunning ? 'hw-zone-running' : 'hw-zone-stopped'}`}
      title={tooltipContent}
    >
      {/* Handles - Both target and source for bidirectional traffic */}
      <Handle type="target" position={Position.Top} className="hw-node-handle hw-zone-active-bg" />
      <Handle type="source" position={Position.Top} className="hw-node-handle hw-zone-active-bg" />

      {/* Icon */}
      <i className="fas fa-server hw-node-icon" />

      {/* Status indicator */}
      <div
        className={`hw-zone-status-indicator ${isRunning ? 'hw-nic-active-bg' : 'hw-zone-active-bg'}`}
      />

      {/* Label below */}
      <div className="hw-node-label">{label}</div>
    </div>
  );
};

ZoneNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    status: PropTypes.string,
    zonename: PropTypes.string,
    zonepath: PropTypes.string,
    autoboot: PropTypes.string,
    brand: PropTypes.string,
    ipType: PropTypes.string,
    vnics: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default ZoneNode;
