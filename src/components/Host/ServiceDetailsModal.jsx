import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const ServiceDetailsModal = ({ service, onClose }) => {
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

  const detailsArray = formatDetails(service.details);

  const getStateTagClass = state => {
    switch (state) {
      case 'online':
        return 'text-bg-success';
      case 'disabled':
        return 'text-bg-secondary';
      case 'offline':
        return 'text-bg-danger';
      case 'legacy_run':
        return 'text-bg-info';
      case 'maintenance':
        return 'text-bg-warning';
      default:
        return 'text-bg-light';
    }
  };

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.serviceDetailsModal.title')}
      icon="fas fa-cogs"
    >
      {/* Service Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.serviceDetailsModal.basicInfo')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.serviceDetailsModal.fmri')}</strong>
                  </td>
                  <td className="font-monospace">{service.fmri}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.serviceDetailsModal.state')}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getStateTagClass(service.state)}`}>
                      {service.state}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.serviceDetailsModal.startTime')}</strong>
                  </td>
                  <td>{service.stime || t('host.serviceDetailsModal.notAvailable')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      {detailsArray.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.serviceDetailsModal.detailedInfo')}</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {detailsArray.map(detail => (
                    <tr key={detail.label}>
                      <td>
                        <strong>{detail.label}</strong>
                      </td>
                      <td>
                        {detail.value.includes('\n') ? (
                          <pre className="small p-2">{detail.value}</pre>
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

      {/* Show message if no details available */}
      {detailsArray.length === 0 && (
        <div className="alert alert-info">
          <p>{t('host.serviceDetailsModal.noDetails')}</p>
        </div>
      )}
    </ContentModal>
  );
};

ServiceDetailsModal.propTypes = {
  service: PropTypes.shape({
    fmri: PropTypes.string,
    state: PropTypes.string,
    stime: PropTypes.string,
    details: PropTypes.object,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ServiceDetailsModal;
