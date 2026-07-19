import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const EtherstubDetailsModal = ({ etherstub, etherstubDetails, onClose }) => {
  const { t } = useTranslation();

  const formatValue = value => {
    if (value === null || value === undefined) {
      return t('host.etherstubDetailsModal.na');
    }
    if (typeof value === 'boolean') {
      return value ? t('host.etherstubDetailsModal.yes') : t('host.etherstubDetailsModal.no');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <span className="badge text-bg-success">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return (
          <span className="badge text-bg-secondary">
            {state || t('host.etherstubDetailsModal.unknown')}
          </span>
        );
    }
  };

  const etherstubName = etherstub.name || etherstub.link;

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.etherstubDetailsModal.title')}
      icon="fas fa-network-wired"
    >
      <h5 className="fs-6 fw-bold">{t('host.etherstubDetailsModal.basicInfo')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.name')}</strong>
              </td>
              <td>
                <span className="font-monospace">{etherstubName}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.class')}</strong>
              </td>
              <td>
                <span className="badge text-bg-info">
                  {etherstub.class || t('host.etherstubDetailsModal.defaultClass')}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.state')}</strong>
              </td>
              <td>{getStateTag(etherstub.state)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.mtu')}</strong>
              </td>
              <td>{formatValue(etherstub.mtu)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.over')}</strong>
              </td>
              <td>{formatValue(etherstub.over)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.zone')}</strong>
              </td>
              <td>{formatValue(etherstub.zone)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {etherstubDetails && etherstubDetails.vnics && etherstubDetails.vnics.length > 0 && (
        <>
          <h5 className="fs-6 fw-bold mt-5">{t('host.etherstubDetailsModal.associatedVnics')}</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>{t('host.etherstubDetailsModal.vnicName')}</th>
                  <th>{t('host.etherstubDetailsModal.over')}</th>
                  <th>{t('host.etherstubDetailsModal.state')}</th>
                  <th>{t('host.etherstubDetailsModal.zone')}</th>
                </tr>
              </thead>
              <tbody>
                {etherstubDetails.vnics.map(vnic => (
                  <tr key={vnic.link || vnic.name}>
                    <td>
                      <span className="font-monospace">{vnic.link || vnic.name}</span>
                    </td>
                    <td>{formatValue(vnic.over)}</td>
                    <td>{getStateTag(vnic.state)}</td>
                    <td>{formatValue(vnic.zone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h5 className="fs-6 fw-bold mt-5">{t('host.etherstubDetailsModal.technicalDetails')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.macAddress')}</strong>
              </td>
              <td>
                <span className="font-monospace">{formatValue(etherstub.macaddress)}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.macAddressType')}</strong>
              </td>
              <td>{formatValue(etherstub.macaddrtype)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.vlanId')}</strong>
              </td>
              <td>{formatValue(etherstub.vid)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.speed')}</strong>
              </td>
              <td>{formatValue(etherstub.speed)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.media')}</strong>
              </td>
              <td>{formatValue(etherstub.media)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.duplex')}</strong>
              </td>
              <td>{formatValue(etherstub.duplex)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.device')}</strong>
              </td>
              <td>{formatValue(etherstub.device)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.bridge')}</strong>
              </td>
              <td>{formatValue(etherstub.bridge)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.pause')}</strong>
              </td>
              <td>{formatValue(etherstub.pause)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.auto')}</strong>
              </td>
              <td>{formatValue(etherstub.auto)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h5 className="fs-6 fw-bold mt-5">{t('host.etherstubDetailsModal.timestamps')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.lastScan')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {etherstub.scan_timestamp
                    ? new Date(etherstub.scan_timestamp).toLocaleString()
                    : t('host.etherstubDetailsModal.na')}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.created')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {etherstub.createdAt
                    ? new Date(etherstub.createdAt).toLocaleString()
                    : t('host.etherstubDetailsModal.na')}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.etherstubDetailsModal.updated')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {etherstub.updatedAt
                    ? new Date(etherstub.updatedAt).toLocaleString()
                    : t('host.etherstubDetailsModal.na')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ContentModal>
  );
};

EtherstubDetailsModal.propTypes = {
  etherstub: PropTypes.object.isRequired,
  etherstubDetails: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default EtherstubDetailsModal;
