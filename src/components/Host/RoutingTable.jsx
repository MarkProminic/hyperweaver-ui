import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const RoutingTable = ({ routes, sectionsCollapsed, toggleSection }) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-route me-2" />
              {t('host.routingTable.routingTable')}
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('routingTable')}
              title={
                sectionsCollapsed.routingTable
                  ? t('host.routingTable.expandSection')
                  : t('host.routingTable.collapseSection')
              }
            >
              <i
                className={`fas ${sectionsCollapsed.routingTable ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.routingTable &&
          (routes.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>{t('host.routingTable.interface')}</th>
                    <th>{t('host.routingTable.destination')}</th>
                    <th>{t('host.routingTable.gateway')}</th>
                    <th>{t('host.routingTable.metric')}</th>
                    <th>{t('host.routingTable.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route, index) => (
                    <tr key={route.destination || index}>
                      <td>
                        <strong>{route.interface || t('host.routingTable.notAvailable')}</strong>
                      </td>
                      <td>
                        <code>{route.destination || t('host.routingTable.notAvailable')}</code>
                      </td>
                      <td>
                        <code>{route.gateway || t('host.routingTable.notAvailable')}</code>
                      </td>
                      <td>{t('host.routingTable.notAvailable')}</td>
                      <td>
                        <span className="badge text-bg-dark">{t('host.routingTable.static')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p>{t('host.routingTable.noRoutingTableData')}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

RoutingTable.propTypes = {
  routes: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default RoutingTable;
