import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const VnicTable = ({ vnics, loading, onDelete, onViewDetails }) => {
  const { t } = useTranslation();
  const [deleteLoading, setDeleteLoading] = useState({});

  const handleDelete = async vnic => {
    const key = vnic.link;
    setDeleteLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onDelete(vnic.link);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStateIcon = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <i className="fas fa-check-circle text-success" />;
      case 'down':
        return <i className="fas fa-times-circle text-danger" />;
      default:
        return <i className="fas fa-question-circle text-muted" />;
    }
  };

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'up':
        return <span className="badge text-bg-success">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return (
          <span className="badge text-bg-secondary">{state || t('host.vnicTable.unknown')}</span>
        );
    }
  };

  const formatSpeed = speed => {
    if (!speed) {
      return t('host.vnicTable.notAvailable');
    }
    if (speed >= 1000) {
      return `${speed / 1000}G`;
    }
    return `${speed}M`;
  };

  const formatMac = mac => {
    if (!mac) {
      return t('host.vnicTable.notAvailable');
    }
    // Format MAC address with colons if not already formatted
    if (mac.includes(':')) {
      return mac;
    }
    return mac.match(/.{2}/g)?.join(':') || mac;
  };

  const getVlanTag = vid => {
    if (vid === undefined || vid === null || vid === '') {
      return <span className="badge text-bg-secondary">{t('host.vnicTable.noVlan')}</span>;
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

  const formatZoneName = zoneName => {
    if (!zoneName || zoneName === '--') {
      return t('host.vnicTable.global');
    }
    if (zoneName.length > 20) {
      return `${zoneName.substring(0, 20)}...`;
    }
    return zoneName;
  };

  if (loading && vnics.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.vnicTable.loadingVnics')}</p>
      </div>
    );
  }

  if (vnics.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-network-wired fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.vnicTable.noVnicsFound')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>{t('host.vnicTable.vnic')}</th>
            <th>{t('host.vnicTable.physicalLink')}</th>
            <th>{t('host.vnicTable.state')}</th>
            <th>{t('host.vnicTable.macAddress')}</th>
            <th>{t('host.vnicTable.vlan')}</th>
            <th>{t('host.vnicTable.zone')}</th>
            <th>{t('host.vnicTable.speed')}</th>
            <th>{t('host.vnicTable.mtu')}</th>
            <th width="120">{t('host.vnicTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {vnics.map((vnic, index) => {
            const isDeleting = deleteLoading[vnic.link];

            return (
              <tr key={vnic.id || vnic.link || index}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStateIcon(vnic.state)}
                    <span className="ms-2">
                      <strong className="font-monospace">{vnic.link}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-monospace">
                    {vnic.over || t('host.vnicTable.notAvailable')}
                  </span>
                </td>
                <td>{getStateTag(vnic.state)}</td>
                <td>
                  <span className="font-monospace small">{formatMac(vnic.macaddress)}</span>
                  {vnic.macaddrtype && <div className="small text-muted">{vnic.macaddrtype}</div>}
                </td>
                <td>{getVlanTag(vnic.vid)}</td>
                <td>
                  <span className="small" title={vnic.zone}>
                    {formatZoneName(vnic.zone)}
                  </span>
                </td>
                <td>
                  <span className="badge text-bg-info">{formatSpeed(vnic.speed)}</span>
                </td>
                <td>
                  <span className="small">{vnic.mtu || t('host.vnicTable.notAvailable')}</span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onViewDetails(vnic)}
                      disabled={loading || isDeleting}
                      title={t('host.vnicTable.viewDetails')}
                    >
                      <i className="fas fa-info-circle" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(vnic)}
                      disabled={loading || isDeleting}
                      title={t('host.vnicTable.deleteVnic')}
                    >
                      {isDeleting ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                      ) : (
                        <i className="fas fa-trash" />
                      )}
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

VnicTable.propTypes = {
  vnics: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onDelete: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default VnicTable;
