import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BridgeTable = ({ bridges, loading, onDelete, onViewDetails }) => {
  const { t } = useTranslation();
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async bridge => {
    const key = bridge.name;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(bridge.name);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getProtectionTag = protection => {
    switch (protection?.toLowerCase()) {
      case 'stp':
        return <span className="badge text-bg-success">{t('host.bridgeTable.protectionStp')}</span>;
      case 'rstp':
        return <span className="badge text-bg-info">{t('host.bridgeTable.protectionRstp')}</span>;
      case 'none':
        return <span className="badge text-bg-secondary">{t('host.bridgeTable.none')}</span>;
      default:
        return (
          <span className="badge text-bg-secondary">
            {protection || t('host.bridgeTable.unknown')}
          </span>
        );
    }
  };

  const formatLinks = links => {
    if (!links || !Array.isArray(links)) {
      return t('host.bridgeTable.notAvailable');
    }
    if (links.length === 0) {
      return t('host.bridgeTable.none');
    }
    if (links.length <= 2) {
      return links.join(', ');
    }
    return `${links.slice(0, 2).join(', ')} +${links.length - 2}`;
  };

  if (loading && bridges.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.bridgeTable.loading')}</p>
      </div>
    );
  }

  if (bridges.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-bridge-water fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.bridgeTable.empty')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>{t('host.bridgeTable.nameHeader')}</th>
            <th>{t('host.bridgeTable.protectionHeader')}</th>
            <th>{t('host.bridgeTable.priorityHeader')}</th>
            <th>{t('host.bridgeTable.memberLinksHeader')}</th>
            <th>{t('host.bridgeTable.maxAgeHeader')}</th>
            <th>{t('host.bridgeTable.helloTimeHeader')}</th>
            <th>{t('host.bridgeTable.forwardDelayHeader')}</th>
            <th width="120">{t('host.bridgeTable.actionsHeader')}</th>
          </tr>
        </thead>
        <tbody>
          {bridges.map((bridge, index) => {
            const isDeleting = deleteLoading[bridge.name];

            return (
              <tr key={bridge.name || index}>
                <td>
                  <strong className="font-monospace">{bridge.name}</strong>
                </td>
                <td>{getProtectionTag(bridge.protection)}</td>
                <td>
                  <span className="badge text-bg-secondary">
                    {bridge.priority !== undefined
                      ? bridge.priority
                      : t('host.bridgeTable.notAvailable')}
                  </span>
                </td>
                <td>
                  <span className="font-monospace small" title={bridge.links?.join(', ')}>
                    {formatLinks(bridge.links)}
                  </span>
                  {bridge.links && bridge.links.length > 0 && (
                    <div className="small text-muted">
                      {t('host.bridgeTable.linkCount', { count: bridge.links.length })}
                    </div>
                  )}
                </td>
                <td>
                  <span className="small">
                    {bridge.max_age !== undefined
                      ? `${bridge.max_age}s`
                      : t('host.bridgeTable.notAvailable')}
                  </span>
                </td>
                <td>
                  <span className="small">
                    {bridge.hello_time !== undefined
                      ? `${bridge.hello_time}s`
                      : t('host.bridgeTable.notAvailable')}
                  </span>
                </td>
                <td>
                  <span className="small">
                    {bridge.forward_delay !== undefined
                      ? `${bridge.forward_delay}s`
                      : t('host.bridgeTable.notAvailable')}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewDetails(bridge)}
                      disabled={loading || isDeleting}
                      title={t('host.bridgeTable.viewDetailsTitle')}
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(bridge)}
                      disabled={loading || isDeleting}
                      title={t('host.bridgeTable.deleteButtonTitle')}
                    >
                      {isDeleting && (
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                      )}
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

BridgeTable.propTypes = {
  bridges: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      protection: PropTypes.string,
      priority: PropTypes.number,
      links: PropTypes.arrayOf(PropTypes.string),
      max_age: PropTypes.number,
      hello_time: PropTypes.number,
      forward_delay: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default BridgeTable;
