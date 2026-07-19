import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const AggregateTable = ({ aggregates, loading, onDelete, onViewDetails }) => {
  const { t } = useTranslation();
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async aggregate => {
    const key = aggregate.name || aggregate.link;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(aggregate.name || aggregate.link);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStateIcon = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <i className="fas fa-check-circle text-success me-2" />;
      case 'down':
        return <i className="fas fa-times-circle text-danger me-2" />;
      default:
        return <i className="fas fa-question-circle text-muted me-2" />;
    }
  };

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <span className="badge text-bg-success">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return <span className="badge text-bg-secondary">{state || 'Unknown'}</span>;
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
    return <span className={`badge ${colorClass}`}>{policy || 'Unknown'}</span>;
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
        return <span className="badge text-bg-secondary">{mode || 'N/A'}</span>;
    }
  };

  const formatLinks = linksData => {
    // Handle both array format and comma-separated string format
    let links;
    if (Array.isArray(linksData)) {
      links = linksData;
    } else if (typeof linksData === 'string' && linksData) {
      links = linksData.split(',').map(link => link.trim());
    } else {
      return 'N/A';
    }

    if (links.length === 0) {
      return t('host.aggregateTable.none');
    }
    if (links.length <= 2) {
      return links.join(', ');
    }
    return `${links.slice(0, 2).join(', ')} +${links.length - 2}`;
  };

  const getLinksArray = linksData => {
    if (Array.isArray(linksData)) {
      return linksData;
    } else if (typeof linksData === 'string' && linksData) {
      return linksData.split(',').map(link => link.trim());
    }
    return [];
  };

  if (loading && aggregates.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.aggregateTable.loading')}</p>
      </div>
    );
  }

  if (aggregates.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-link fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.aggregateTable.empty')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-sm">
        <thead>
          <tr>
            <th>{t('host.aggregateTable.aggregate')}</th>
            <th>{t('host.aggregateTable.policy')}</th>
            <th>{t('host.aggregateTable.memberLinks')}</th>
            <th>{t('host.aggregateTable.state')}</th>
            <th>{t('host.aggregateTable.lacpMode')}</th>
            <th>{t('host.aggregateTable.timer')}</th>
            <th width="120">{t('host.aggregateTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {aggregates.map((aggregate, index) => {
            const aggregateName = aggregate.name || aggregate.link;
            const memberLinks = aggregate.links || aggregate.over;
            const isDeleting = deleteLoading[aggregateName];

            return (
              <tr key={aggregateName || index}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStateIcon(aggregate.state)}
                    <span className="ms-2">
                      <strong className="font-monospace">{aggregateName}</strong>
                    </span>
                  </div>
                </td>
                <td>{getPolicyTag(aggregate.policy)}</td>
                <td>
                  <span
                    className="font-monospace small"
                    title={getLinksArray(memberLinks).join(', ')}
                  >
                    {formatLinks(memberLinks)}
                  </span>
                  {getLinksArray(memberLinks).length > 0 && (
                    <div className="small text-muted">
                      {t('host.aggregateTable.linkCount', {
                        count: getLinksArray(memberLinks).length,
                      })}
                    </div>
                  )}
                </td>
                <td>{getStateTag(aggregate.state)}</td>
                <td>{getLacpModeTag(aggregate.lacp_mode)}</td>
                <td>
                  <span className="small">{aggregate.lacp_timer || 'N/A'}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewDetails(aggregate)}
                      disabled={loading || isDeleting}
                      title={t('host.aggregateTable.viewDetails')}
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(aggregate)}
                      disabled={loading || isDeleting}
                      title={t('host.aggregateTable.deleteAggregate')}
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

AggregateTable.propTypes = {
  aggregates: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default AggregateTable;
