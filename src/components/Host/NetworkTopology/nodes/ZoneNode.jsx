import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ZoneNode = ({ data }) => {
  const { t } = useTranslation();
  const { label, status, zonename, zonepath, autoboot, brand, ipType, vnics } = data;

  const isRunning = status?.toLowerCase() === 'running';

  const tooltipContent = `
${label} (${t('hostTools.zoneNode.typeCaption')})
${t('hostTools.zoneNode.statusLabel')}: ${status || t('hostTools.zoneNode.unknown')}
${t('hostTools.zoneNode.zoneNameLabel')}: ${zonename || label}
${t('hostTools.zoneNode.zonePathLabel')}: ${zonepath || t('hostTools.zoneNode.notAvailable')}
${t('hostTools.zoneNode.brandLabel')}: ${brand || t('hostTools.zoneNode.notAvailable')}
${t('hostTools.zoneNode.ipTypeLabel')}: ${ipType || t('hostTools.zoneNode.notAvailable')}
${t('hostTools.zoneNode.autobootLabel')}: ${autoboot || t('hostTools.zoneNode.notAvailable')}
${t('hostTools.zoneNode.vnicsLabel')}: ${vnics?.length || 0}
${vnics?.length ? `${t('hostTools.zoneNode.connectedLabel')}: ${vnics.join(', ')}` : t('hostTools.zoneNode.noVnicsConnected')}
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
