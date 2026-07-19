import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../../common';

const PackageDetailsModal = ({ package: pkg, onClose }) => {
  const { t } = useTranslation();
  const formatDetails = details => {
    if (!details) {
      return [];
    }

    // Handle the package info string format from the API
    if (typeof details === 'string') {
      const lines = details.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          return {
            label: key,
            value,
          };
        }
        return {
          label: 'Info',
          value: line.trim(),
        };
      });
    }

    // Convert details object to array of key-value pairs for display
    return Object.entries(details).map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    }));
  };

  const detailsArray = formatDetails(pkg.details);

  const getStatusInfo = () => {
    const status = [];

    if (pkg.installed) {
      status.push({
        label: t('host.packageDetailsModal.installationStatus'),
        value: t('host.packageDetailsModal.installed'),
      });
    } else {
      status.push({
        label: t('host.packageDetailsModal.installationStatus'),
        value: t('host.packageDetailsModal.notInstalled'),
      });
    }

    if (pkg.frozen) {
      status.push({
        label: t('host.packageDetailsModal.frozen'),
        value: t('host.packageDetailsModal.yes'),
      });
    }

    if (pkg.manually_installed) {
      status.push({
        label: t('host.packageDetailsModal.manuallyInstalled'),
        value: t('host.packageDetailsModal.yes'),
      });
    }

    if (pkg.obsolete) {
      status.push({
        label: t('host.packageDetailsModal.obsolete'),
        value: t('host.packageDetailsModal.yes'),
      });
    }

    if (pkg.renamed) {
      status.push({
        label: t('host.packageDetailsModal.renamed'),
        value: t('host.packageDetailsModal.yes'),
      });
    }

    return status;
  };

  const statusInfo = getStatusInfo();

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.packageDetailsModal.packageDetails')}
      icon="fas fa-cube"
    >
      {/* Package Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.packageDetailsModal.basicInformation')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.packageDetailsModal.packageName')}</strong>
                  </td>
                  <td className="font-monospace">{pkg.name}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.packageDetailsModal.publisher')}</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-info">
                      {pkg.publisher || t('host.packageDetailsModal.unknown')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.packageDetailsModal.version')}</strong>
                  </td>
                  <td className="font-monospace">
                    {pkg.version || t('host.packageDetailsModal.notAvailable')}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.packageDetailsModal.flags')}</strong>
                  </td>
                  <td className="font-monospace">
                    {pkg.flags || t('host.packageDetailsModal.notAvailable')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Package Status */}
      {statusInfo.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.packageDetailsModal.packageStatus')}</h3>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  {statusInfo.map(info => (
                    <tr key={info.label}>
                      <td>
                        <strong>{info.label}</strong>
                      </td>
                      <td>{info.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {detailsArray.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.packageDetailsModal.detailedInformation')}</h3>
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
                          <pre className="small bg-body-tertiary p-2">{detail.value}</pre>
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
          <p>{t('host.packageDetailsModal.noDetailedInformation')}</p>
        </div>
      )}
    </ContentModal>
  );
};

PackageDetailsModal.propTypes = {
  package: PropTypes.shape({
    name: PropTypes.string,
    publisher: PropTypes.string,
    version: PropTypes.string,
    flags: PropTypes.string,
    installed: PropTypes.bool,
    frozen: PropTypes.bool,
    manually_installed: PropTypes.bool,
    obsolete: PropTypes.bool,
    renamed: PropTypes.bool,
    details: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PackageDetailsModal;
