import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const AggregateDetailsModal = ({ aggregate, aggregateDetails, onClose }) => {
  const { t } = useTranslation();
  const formatValue = value => {
    if (value === null || value === undefined) {
      return t('host.aggregateDetailsModal.notAvailable');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
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
            {state || t('host.aggregateDetailsModal.unknown')}
          </span>
        );
    }
  };

  const getPolicyTag = policy => {
    const policyColors = {
      L2: 'text-bg-info',
      L3: 'text-bg-primary',
      L4: 'text-bg-primary',
      L2L3: 'text-bg-success',
      L2L4: 'text-bg-warning',
      L3L4: 'text-bg-danger',
      L2L3L4: 'text-bg-dark',
    };

    const colorClass = policyColors[policy] || 'text-bg-secondary';
    return (
      <span className={`badge ${colorClass}`}>
        {policy || t('host.aggregateDetailsModal.unknown')}
      </span>
    );
  };

  const getLacpModeTag = mode => {
    switch (mode?.toLowerCase()) {
      case 'active':
        return <span className="badge text-bg-success">{mode}</span>;
      case 'passive':
        return <span className="badge text-bg-info">{mode}</span>;
      case 'off':
        return <span className="badge text-bg-secondary">{mode}</span>;
      default:
        return (
          <span className="badge text-bg-secondary">
            {mode || t('host.aggregateDetailsModal.notAvailable')}
          </span>
        );
    }
  };

  const formatLinks = linksData => {
    let links;
    if (Array.isArray(linksData)) {
      links = linksData;
    } else if (typeof linksData === 'string' && linksData) {
      links = linksData.split(',').map(link => link.trim());
    } else {
      return [];
    }
    return links;
  };

  const aggregateName = aggregate.name || aggregate.link;
  const memberLinks = formatLinks(aggregate.links || aggregate.over);

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.aggregateDetailsModal.title')}
      icon="fas fa-network-wired"
    >
      <h5 className="fs-6 fw-bold">{t('host.aggregateDetailsModal.basicInformation')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.name')}</strong>
              </td>
              <td>
                <span className="font-monospace">{aggregateName}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.class')}</strong>
              </td>
              <td>
                <span className="badge text-bg-info">{aggregate.class || 'aggr'}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.state')}</strong>
              </td>
              <td>{getStateTag(aggregate.state)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.policy')}</strong>
              </td>
              <td>{getPolicyTag(aggregate.policy)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.lacpMode')}</strong>
              </td>
              <td>{getLacpModeTag(aggregate.lacp_mode)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.lacpTimer')}</strong>
              </td>
              <td>{formatValue(aggregate.lacp_timer)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.mtu')}</strong>
              </td>
              <td>{formatValue(aggregate.mtu)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.speed')}</strong>
              </td>
              <td>{formatValue(aggregate.speed)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {memberLinks.length > 0 && (
        <>
          <h5 className="fs-6 fw-bold mt-5">{t('host.aggregateDetailsModal.memberLinks')}</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>{t('host.aggregateDetailsModal.linkName')}</th>
                  <th>{t('host.aggregateDetailsModal.status')}</th>
                </tr>
              </thead>
              <tbody>
                {memberLinks.map(link => (
                  <tr key={link}>
                    <td>
                      <span className="font-monospace">{link}</span>
                    </td>
                    <td>
                      <span className="badge text-bg-success">
                        {t('host.aggregateDetailsModal.active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aggregateDetails && aggregateDetails.lacp && (
        <>
          <h5 className="fs-6 fw-bold mt-5">{t('host.aggregateDetailsModal.lacpDetails')}</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.aggregateDetailsModal.lacpActivity')}</strong>
                  </td>
                  <td>{formatValue(aggregateDetails.lacp.activity)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.aggregateDetailsModal.lacpTimeout')}</strong>
                  </td>
                  <td>{formatValue(aggregateDetails.lacp.timeout)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.aggregateDetailsModal.lacpAggregation')}</strong>
                  </td>
                  <td>{formatValue(aggregateDetails.lacp.aggregation)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.aggregateDetailsModal.lacpSync')}</strong>
                  </td>
                  <td>{formatValue(aggregateDetails.lacp.synchronization)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <h5 className="fs-6 fw-bold mt-5">{t('host.aggregateDetailsModal.technicalDetails')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.macAddress')}</strong>
              </td>
              <td>
                <span className="font-monospace">{formatValue(aggregate.macaddress)}</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.macAddressType')}</strong>
              </td>
              <td>{formatValue(aggregate.macaddrtype)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.vlanId')}</strong>
              </td>
              <td>{formatValue(aggregate.vid)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.zone')}</strong>
              </td>
              <td>{formatValue(aggregate.zone)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.media')}</strong>
              </td>
              <td>{formatValue(aggregate.media)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.duplex')}</strong>
              </td>
              <td>{formatValue(aggregate.duplex)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.device')}</strong>
              </td>
              <td>{formatValue(aggregate.device)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.bridge')}</strong>
              </td>
              <td>{formatValue(aggregate.bridge)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.pause')}</strong>
              </td>
              <td>{formatValue(aggregate.pause)}</td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.auto')}</strong>
              </td>
              <td>{formatValue(aggregate.auto)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h5 className="fs-6 fw-bold mt-5">{t('host.aggregateDetailsModal.timestamps')}</h5>
      <div className="table-responsive">
        <table className="table table-striped">
          <tbody>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.lastScan')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {aggregate.scan_timestamp
                    ? new Date(aggregate.scan_timestamp).toLocaleString()
                    : t('host.aggregateDetailsModal.notAvailable')}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.created')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {aggregate.createdAt
                    ? new Date(aggregate.createdAt).toLocaleString()
                    : t('host.aggregateDetailsModal.notAvailable')}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t('host.aggregateDetailsModal.updated')}</strong>
              </td>
              <td>
                <span className="font-monospace">
                  {aggregate.updatedAt
                    ? new Date(aggregate.updatedAt).toLocaleString()
                    : t('host.aggregateDetailsModal.notAvailable')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ContentModal>
  );
};

AggregateDetailsModal.propTypes = {
  aggregate: PropTypes.object.isRequired,
  aggregateDetails: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default AggregateDetailsModal;
