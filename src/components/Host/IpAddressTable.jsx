import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const IpAddressTable = ({ ipAddresses, sectionsCollapsed, toggleSection }) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-globe me-2" />
              {t('host.ipAddressTable.title')}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('ipAddresses')}
              title={
                sectionsCollapsed.ipAddresses
                  ? t('host.ipAddressTable.expand')
                  : t('host.ipAddressTable.collapse')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.ipAddresses ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.ipAddresses &&
          (ipAddresses.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>{t('host.ipAddressTable.interface')}</th>
                    <th>{t('host.ipAddressTable.ipAddress')}</th>
                    <th>{t('host.ipAddressTable.netmaskPrefix')}</th>
                    <th>{t('host.ipAddressTable.type')}</th>
                    <th>{t('host.ipAddressTable.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ipAddresses.map(ip => (
                    <tr key={`${ip.interface}-${ip.ip_address}`}>
                      <td>
                        <strong>{ip.interface}</strong>
                      </td>
                      <td>
                        <code>{ip.ip_address}</code>
                      </td>
                      <td>
                        <code>
                          {ip.prefix_length ? `/${ip.prefix_length}` : t('host.ipAddressTable.na')}
                        </code>
                      </td>
                      <td>
                        <span className="badge text-bg-info">
                          {ip.ip_version || t('host.ipAddressTable.ipv4')}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${ip.state === 'ok' || ip.state === 'up' ? 'text-bg-success' : 'text-bg-warning'}`}
                        >
                          {ip.state || t('host.ipAddressTable.active')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p>{t('host.ipAddressTable.noData')}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

IpAddressTable.propTypes = {
  ipAddresses: PropTypes.arrayOf(
    PropTypes.shape({
      interface: PropTypes.string.isRequired,
      ip_address: PropTypes.string.isRequired,
      prefix_length: PropTypes.number,
      ip_version: PropTypes.string,
      state: PropTypes.string,
    })
  ).isRequired,
  sectionsCollapsed: PropTypes.shape({
    ipAddresses: PropTypes.bool.isRequired,
  }).isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default IpAddressTable;
