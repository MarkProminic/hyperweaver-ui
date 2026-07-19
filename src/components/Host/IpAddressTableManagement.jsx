import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const IpAddressTable = ({ addresses, loading, onDelete, onToggle }) => {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (address, action) => {
    const key = `${address.addrobj}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      if (action === 'delete') {
        await onDelete(address);
      } else {
        await onToggle(address, action);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getStateIcon = state => {
    switch (state?.toLowerCase()) {
      case 'ok':
        return <i className="fas fa-check-circle text-success me-2" />;
      case 'disabled':
        return <i className="fas fa-pause-circle text-warning me-2" />;
      case 'down':
        return <i className="fas fa-times-circle text-danger me-2" />;
      case 'duplicate':
        return <i className="fas fa-exclamation-triangle text-danger me-2" />;
      default:
        return <i className="fas fa-question-circle text-muted me-2" />;
    }
  };

  const getStateTag = state => {
    switch (state?.toLowerCase()) {
      case 'ok':
        return <span className="badge text-bg-success">{state}</span>;
      case 'disabled':
        return <span className="badge text-bg-warning">{state}</span>;
      case 'down':
        return <span className="badge text-bg-danger">{state}</span>;
      case 'duplicate':
        return <span className="badge text-bg-danger">{state}</span>;
      default:
        return <span className="badge text-bg-secondary">{state || 'Unknown'}</span>;
    }
  };

  const getTypeTag = type => {
    switch (type?.toLowerCase()) {
      case 'static':
        return <span className="badge text-bg-info">{type}</span>;
      case 'dhcp':
        return <span className="badge text-bg-primary">{type}</span>;
      case 'addrconf':
        return (
          <span className="badge text-bg-primary">{t('host.ipAddressTableManagement.auto')}</span>
        );
      default:
        return (
          <span className="badge text-bg-secondary">
            {type || t('host.ipAddressTableManagement.unknown')}
          </span>
        );
    }
  };

  const getVersionTag = version => {
    switch (version?.toLowerCase()) {
      case 'v4':
        return (
          <span className="badge text-bg-info">{t('host.ipAddressTableManagement.ipv4')}</span>
        );
      case 'v6':
        return (
          <span className="badge text-bg-dark">{t('host.ipAddressTableManagement.ipv6')}</span>
        );
      default:
        return (
          <span className="badge text-bg-secondary">
            {version || t('host.ipAddressTableManagement.unknown')}
          </span>
        );
    }
  };

  const formatAddress = (addr, ipAddress, prefixLength) => {
    if (addr) {
      return addr;
    }
    if (ipAddress && prefixLength) {
      return `${ipAddress}/${prefixLength}`;
    }
    return ipAddress || t('host.ipAddressTableManagement.na');
  };

  const canEnable = address => address.state?.toLowerCase() === 'disabled';

  const canDisable = address => address.state?.toLowerCase() === 'ok';

  if (loading && addresses.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.ipAddressTableManagement.loading')}</p>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-globe fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.ipAddressTableManagement.noData')}</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover table-sm">
        <thead>
          <tr>
            <th>{t('host.ipAddressTableManagement.interface')}</th>
            <th>{t('host.ipAddressTableManagement.addressObject')}</th>
            <th>{t('host.ipAddressTableManagement.ipAddress')}</th>
            <th>{t('host.ipAddressTableManagement.type')}</th>
            <th>{t('host.ipAddressTableManagement.version')}</th>
            <th>{t('host.ipAddressTableManagement.state')}</th>
            <th width="140">{t('host.ipAddressTableManagement.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {addresses.map(address => {
            const enableLoading = actionLoading[`${address.addrobj}-enable`];
            const disableLoading = actionLoading[`${address.addrobj}-disable`];
            const deleteLoading = actionLoading[`${address.addrobj}-delete`];

            return (
              <tr key={`${address.addrobj}|${address.ip_address || address.addr || ''}`}>
                <td>
                  <div className="d-flex align-items-center">
                    {getStateIcon(address.state)}
                    <span>
                      <strong className="font-monospace">{address.interface}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="font-monospace small">{address.addrobj}</span>
                </td>
                <td>
                  <div>
                    <span className="font-monospace">
                      {formatAddress(address.addr, address.ip_address, address.prefix_length)}
                    </span>
                  </div>
                </td>
                <td>{getTypeTag(address.type)}</td>
                <td>{getVersionTag(address.ip_version)}</td>
                <td>{getStateTag(address.state)}</td>
                <td>
                  <div className="d-flex gap-2">
                    {/* Enable Button */}
                    {canEnable(address) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => handleAction(address, 'enable')}
                        disabled={loading || enableLoading || disableLoading || deleteLoading}
                        title={t('host.ipAddressTableManagement.enableAddress')}
                      >
                        {enableLoading && (
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                        )}
                        <i className="fas fa-play" />
                      </button>
                    )}

                    {/* Disable Button */}
                    {canDisable(address) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-warning"
                        onClick={() => handleAction(address, 'disable')}
                        disabled={loading || enableLoading || disableLoading || deleteLoading}
                        title={t('host.ipAddressTableManagement.disableAddress')}
                      >
                        {disableLoading && (
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                        )}
                        <i className="fas fa-pause" />
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleAction(address, 'delete')}
                      disabled={loading || enableLoading || disableLoading || deleteLoading}
                      title={t('host.ipAddressTableManagement.deleteAddress')}
                    >
                      {deleteLoading && (
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

IpAddressTable.propTypes = {
  addresses: PropTypes.arrayOf(
    PropTypes.shape({
      addrobj: PropTypes.string.isRequired,
      interface: PropTypes.string.isRequired,
      addr: PropTypes.string,
      ip_address: PropTypes.string,
      prefix_length: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.string,
      ip_version: PropTypes.string,
      state: PropTypes.string,
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default IpAddressTable;
