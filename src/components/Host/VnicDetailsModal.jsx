import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const VnicDetailsModal = ({ vnic, onClose }) => {
  const { t } = useTranslation();
  const formatDetails = details => {
    if (!details) {
      return [];
    }

    // Convert details object to array of key-value pairs for display
    return Object.entries(details).map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    }));
  };

  const formatMac = mac => {
    if (!mac) {
      return t('host.vnicDetailsModal.notAvailable');
    }
    // Format MAC address with colons if not already formatted
    if (mac.includes(':')) {
      return mac;
    }
    return mac.match(/.{2}/g)?.join(':') || mac;
  };

  const formatSpeed = speed => {
    if (!speed) {
      return t('host.vnicDetailsModal.notAvailable');
    }
    if (speed >= 1000) {
      return `${speed / 1000} Gbps`;
    }
    return `${speed} Mbps`;
  };

  const getStateTagClass = state => {
    if (state === 'up') {
      return 'text-bg-success';
    }
    if (state === 'down') {
      return 'text-bg-danger';
    }
    return 'text-bg-secondary';
  };

  const detailsArray = formatDetails(vnic.details);

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.vnicDetailsModal.vnicDetails')}
      icon="fas fa-network-wired"
    >
      {/* VNIC Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.vnicDetailsModal.basicInformation')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.vnicName')}</strong>
                  </td>
                  <td className="font-monospace">{vnic.link}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.physicalLink')}</strong>
                  </td>
                  <td className="font-monospace">
                    {vnic.over || t('host.vnicDetailsModal.notAvailable')}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.state')}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getStateTagClass(vnic.state)}`}>
                      {vnic.state || t('host.vnicDetailsModal.unknown')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.macAddress')}</strong>
                  </td>
                  <td className="font-monospace">{formatMac(vnic.macaddress)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.macAddressType')}</strong>
                  </td>
                  <td>{vnic.macaddrtype || t('host.vnicDetailsModal.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.vlanId')}</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-secondary">
                      {vnic.vid !== undefined ? vnic.vid : t('host.vnicDetailsModal.notAvailable')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.zoneAssignment')}</strong>
                  </td>
                  <td className="font-monospace">
                    {vnic.zone && vnic.zone !== '--'
                      ? vnic.zone
                      : t('host.vnicDetailsModal.globalZone')}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.speed')}</strong>
                  </td>
                  <td>{formatSpeed(vnic.speed)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.mtu')}</strong>
                  </td>
                  <td>{vnic.mtu || t('host.vnicDetailsModal.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.mediaType')}</strong>
                  </td>
                  <td>{vnic.media || t('host.vnicDetailsModal.notAvailable')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.vnicDetailsModal.duplex')}</strong>
                  </td>
                  <td>{vnic.duplex || t('host.vnicDetailsModal.notAvailable')}</td>
                </tr>
                {vnic.device && (
                  <tr>
                    <td>
                      <strong>{t('host.vnicDetailsModal.device')}</strong>
                    </td>
                    <td className="font-monospace">{vnic.device}</td>
                  </tr>
                )}
                {vnic.bridge && vnic.bridge !== '--' && (
                  <tr>
                    <td>
                      <strong>{t('host.vnicDetailsModal.bridge')}</strong>
                    </td>
                    <td className="font-monospace">{vnic.bridge}</td>
                  </tr>
                )}
                {vnic.pause && (
                  <tr>
                    <td>
                      <strong>{t('host.vnicDetailsModal.pause')}</strong>
                    </td>
                    <td>{vnic.pause}</td>
                  </tr>
                )}
                {vnic.auto && (
                  <tr>
                    <td>
                      <strong>{t('host.vnicDetailsModal.autoNegotiation')}</strong>
                    </td>
                    <td>{vnic.auto}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      {detailsArray.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.vnicDetailsModal.additionalDetails')}</h3>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>{t('host.vnicDetailsModal.property')}</th>
                    <th>{t('host.vnicDetailsModal.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsArray.map((detail, index) => (
                    <tr key={detail.label || index}>
                      <td>
                        <strong>{detail.label}</strong>
                      </td>
                      <td>
                        {detail.value.includes('\n') ? (
                          <pre className="small bg-dark text-light p-2">{detail.value}</pre>
                        ) : (
                          <span className="font-monospace small">{detail.value}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no additional details available */}
      {detailsArray.length === 0 && (
        <div className="alert alert-info">
          <p>{t('host.vnicDetailsModal.noAdditionalDetails')}</p>
        </div>
      )}

      {/* Timestamps */}
      {(vnic.created_at || vnic.updated_at) && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.vnicDetailsModal.timestamps')}</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {vnic.created_at && (
                    <tr>
                      <td>
                        <strong>{t('host.vnicDetailsModal.created')}</strong>
                      </td>
                      <td>{new Date(vnic.created_at).toLocaleString()}</td>
                    </tr>
                  )}
                  {vnic.updated_at && (
                    <tr>
                      <td>
                        <strong>{t('host.vnicDetailsModal.lastUpdated')}</strong>
                      </td>
                      <td>{new Date(vnic.updated_at).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ContentModal>
  );
};

VnicDetailsModal.propTypes = {
  vnic: PropTypes.shape({
    link: PropTypes.string,
    over: PropTypes.string,
    state: PropTypes.string,
    macaddress: PropTypes.string,
    macaddrtype: PropTypes.string,
    vid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    zone: PropTypes.string,
    speed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    mtu: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    media: PropTypes.string,
    duplex: PropTypes.string,
    device: PropTypes.string,
    bridge: PropTypes.string,
    pause: PropTypes.string,
    auto: PropTypes.string,
    details: PropTypes.object,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VnicDetailsModal;
