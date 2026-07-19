import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const AggregateNode = ({ data }) => {
  const { t } = useTranslation();
  const { label, members, policy, lacpActivity, lacpTimeout, flags, bandwidth, ipAddresses } = data;

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
${label} (${t('hostTools.aggregateNode.typeCaption')})
${t('hostTools.aggregateNode.membersLabel')}: ${members?.join(', ') || t('hostTools.aggregateNode.none')}
${t('hostTools.aggregateNode.policyLabel')}: ${policy || t('hostTools.aggregateNode.unknown')}
${t('hostTools.aggregateNode.lacpActivityLabel')}: ${lacpActivity || t('hostTools.aggregateNode.notAvailable')}
${t('hostTools.aggregateNode.lacpTimeoutLabel')}: ${lacpTimeout || t('hostTools.aggregateNode.notAvailable')}
${bandwidth ? `${t('hostTools.aggregateNode.bandwidthLabel')}: ${formatBandwidth(bandwidth.totalMbps)} (↓${formatBandwidth(bandwidth.rxMbps)} ↑${formatBandwidth(bandwidth.txMbps)})` : t('hostTools.aggregateNode.noBandwidthData')}
${ipAddresses?.length ? `${t('hostTools.aggregateNode.ipLabel')}: ${ipAddresses.map(ip => ip.ip_address).join(', ')}` : t('hostTools.aggregateNode.noIpAddresses')}
${flags && flags !== '--' ? `${t('hostTools.aggregateNode.flagsLabel')}: ${flags}` : ''}
  `.trim();

  return (
    <div className="react-flow__node-default hw-node-base hw-aggregate-bg" title={tooltipContent}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="hw-node-handle hw-aggregate-bg" />

      <Handle type="source" position={Position.Right} className="hw-node-handle hw-aggregate-bg" />

      {/* Icon */}
      <i className="fas fa-link hw-node-icon" />

      {/* Label below */}
      <div className="hw-node-label">{label}</div>
    </div>
  );
};

AggregateNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    members: PropTypes.arrayOf(PropTypes.string),
    policy: PropTypes.string,
    lacpActivity: PropTypes.string,
    lacpTimeout: PropTypes.string,
    flags: PropTypes.string,
    bandwidth: PropTypes.shape({
      totalMbps: PropTypes.number,
      rxMbps: PropTypes.number,
      txMbps: PropTypes.number,
    }),
    ipAddresses: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

export default AggregateNode;
