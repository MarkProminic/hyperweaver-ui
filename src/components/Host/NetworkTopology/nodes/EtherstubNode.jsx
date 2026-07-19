import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const EtherstubNode = ({ data }) => {
  const { t } = useTranslation();
  const { label, connectedVnics, class: deviceClass, flags } = data;

  const tooltipContent = `
${label} (${t('hostTools.etherstubNode.typeCaption')})
${t('hostTools.etherstubNode.typeLabel')}: ${t('hostTools.etherstubNode.typeValue')}
${t('hostTools.etherstubNode.connectedVnicsLabel')}: ${connectedVnics?.length || 0}
${connectedVnics?.length ? `${t('hostTools.etherstubNode.vnicsLabel')}: ${connectedVnics.join(', ')}` : t('hostTools.etherstubNode.noConnectedVnics')}
${t('hostTools.etherstubNode.classLabel')}: ${deviceClass || 'etherstub'}
${flags && flags !== '--' ? `${t('hostTools.etherstubNode.flagsLabel')}: ${flags}` : ''}
  `.trim();

  return (
    <div className="react-flow__node-default hw-node-base hw-etherstub-bg" title={tooltipContent}>
      {/* Handles */}
      <Handle type="target" position={Position.Left} className="hw-node-handle hw-etherstub-bg" />

      <Handle type="source" position={Position.Right} className="hw-node-handle hw-etherstub-bg" />

      {/* Icon */}
      <i className="fas fa-sitemap hw-node-icon" />

      {/* Label below */}
      <div className="hw-node-label">{label}</div>
    </div>
  );
};

EtherstubNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    connectedVnics: PropTypes.arrayOf(PropTypes.string),
    class: PropTypes.string,
    flags: PropTypes.string,
  }).isRequired,
};

export default EtherstubNode;
