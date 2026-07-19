import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const VlanDetailsModal = ({ vlan, onClose }) => {
  const { t } = useTranslation();
  const renderDetailRow = (label, value, monospace = false) => (
    <div className="row">
      <div className="col-4">
        <strong>{label}:</strong>
      </div>
      <div className="col">
        <span className={monospace ? 'font-monospace' : ''}>
          {value || t('host.vlanDetailsModal.notAvailable')}
        </span>
      </div>
    </div>
  );

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <span className="badge text-bg-success">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return (
          <span className="badge text-bg-secondary">
            {state || t('host.vlanDetailsModal.unknown')}
          </span>
        );
    }
  };

  const getVlanTag = vid => {
    if (vid === undefined || vid === null || vid === '') {
      return <span className="badge text-bg-dark">{t('host.vlanDetailsModal.noVid')}</span>;
    }

    // Assign colors based on VLAN ID to make each VLAN visually distinct
    const colors = [
      'text-bg-primary', // Blue
      'text-bg-info', // Cyan
      'text-bg-success', // Green
      'text-bg-warning', // Yellow
      'text-bg-danger', // Red
      'text-bg-primary', // Blue-ish
      'text-bg-primary', // Repeat for more VLANs
      'text-bg-info',
      'text-bg-success',
    ];

    const colorIndex = parseInt(vid) % colors.length;
    const colorClass = colors[colorIndex];

    return <span className={`badge ${colorClass}`}>{vid}</span>;
  };

  const formatTimestamp = timestamp => {
    if (!timestamp) {
      return t('host.vlanDetailsModal.notAvailable');
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.vlanDetailsModal.vlanDetailsTitle', { link: vlan.link })}
      icon="fas fa-tags"
    >
      <div>
        {/* Basic VLAN Information */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-info-circle me-2" />
              <span>{t('host.vlanDetailsModal.basicInformation')}</span>
            </h4>

            {renderDetailRow(t('host.vlanDetailsModal.vlanName'), vlan.link, true)}

            <div className="row">
              <div className="col-4">
                <strong>{t('host.vlanDetailsModal.vlanIdLabel')}:</strong>
              </div>
              <div className="col">{getVlanTag(vlan.vid)}</div>
            </div>

            {renderDetailRow(t('host.vlanDetailsModal.physicalLink'), vlan.over, true)}

            <div className="row">
              <div className="col-4">
                <strong>{t('host.vlanDetailsModal.state')}:</strong>
              </div>
              <div className="col">{getStateTag(vlan.state)}</div>
            </div>

            {renderDetailRow(t('host.vlanDetailsModal.class'), vlan.class)}
            {renderDetailRow(t('host.vlanDetailsModal.mtu'), vlan.mtu || '1500')}
            {renderDetailRow(t('host.vlanDetailsModal.flags'), vlan.flags)}
          </div>
        </div>

        {/* Technical Details */}
        {vlan.details && (
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="fs-6 fw-bold mb-3">
                <i className="fas fa-cogs me-2" />
                <span>{t('host.vlanDetailsModal.technicalDetails')}</span>
              </h4>

              {vlan.details.link &&
                renderDetailRow(t('host.vlanDetailsModal.linkName'), vlan.details.link, true)}
              {vlan.details.class &&
                renderDetailRow(t('host.vlanDetailsModal.linkClass'), vlan.details.class)}
              {vlan.details.vid &&
                renderDetailRow(t('host.vlanDetailsModal.vlanIdLabel'), vlan.details.vid)}
              {vlan.details.over &&
                renderDetailRow(t('host.vlanDetailsModal.overLink'), vlan.details.over, true)}
              {vlan.details.state && (
                <div className="row">
                  <div className="col-4">
                    <strong>{t('host.vlanDetailsModal.currentState')}:</strong>
                  </div>
                  <div className="col">{getStateTag(vlan.details.state)}</div>
                </div>
              )}
              {vlan.details.mtu &&
                renderDetailRow(t('host.vlanDetailsModal.mtuSize'), vlan.details.mtu)}
              {vlan.details.flags &&
                renderDetailRow(t('host.vlanDetailsModal.interfaceFlags'), vlan.details.flags)}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="fs-6 fw-bold mb-3">
              <i className="fas fa-clock me-2" />
              <span>{t('host.vlanDetailsModal.metadata')}</span>
            </h4>

            {vlan.scan_timestamp &&
              renderDetailRow(
                t('host.vlanDetailsModal.lastScanned'),
                formatTimestamp(vlan.scan_timestamp)
              )}
            {vlan.created_at &&
              renderDetailRow(
                t('host.vlanDetailsModal.createdAt'),
                formatTimestamp(vlan.created_at)
              )}
            {vlan.updated_at &&
              renderDetailRow(
                t('host.vlanDetailsModal.updatedAt'),
                formatTimestamp(vlan.updated_at)
              )}

            <div className="row">
              <div className="col-4">
                <strong>{t('host.vlanDetailsModal.dataSource')}:</strong>
              </div>
              <div className="col">
                <span className="badge text-bg-info">{vlan.source || 'database'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Data for Debugging */}
        {import.meta.env.MODE === 'development' && (
          <div className="card mb-3">
            <div className="card-body">
              <h4 className="fs-6 fw-bold mb-3">
                <i className="fas fa-code me-2" />
                <span>{t('host.vlanDetailsModal.rawDataDevelopment')}</span>
              </h4>

              <pre className="bg-body-tertiary p-3 small">{JSON.stringify(vlan, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </ContentModal>
  );
};

VlanDetailsModal.propTypes = {
  vlan: PropTypes.shape({
    link: PropTypes.string,
    vid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    over: PropTypes.string,
    state: PropTypes.string,
    class: PropTypes.string,
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    flags: PropTypes.string,
    details: PropTypes.object,
    scan_timestamp: PropTypes.string,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
    source: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VlanDetailsModal;
