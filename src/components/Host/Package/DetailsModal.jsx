import PropTypes from 'prop-types';

import { ContentModal } from '../../common';

const PackageDetailsModal = ({ package: pkg, onClose }) => {
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
      status.push({ label: 'Installation Status', value: 'Installed' });
    } else {
      status.push({ label: 'Installation Status', value: 'Not Installed' });
    }

    if (pkg.frozen) {
      status.push({ label: 'Frozen', value: 'Yes' });
    }

    if (pkg.manually_installed) {
      status.push({ label: 'Manually Installed', value: 'Yes' });
    }

    if (pkg.obsolete) {
      status.push({ label: 'Obsolete', value: 'Yes' });
    }

    if (pkg.renamed) {
      status.push({ label: 'Renamed', value: 'Yes' });
    }

    return status;
  };

  const statusInfo = getStatusInfo();

  return (
    <ContentModal isOpen onClose={onClose} title="Package Details" icon="fas fa-cube">
      {/* Package Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Basic Information</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Package Name</strong>
                  </td>
                  <td className="font-monospace">{pkg.name}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Publisher</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-info">{pkg.publisher || 'Unknown'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Version</strong>
                  </td>
                  <td className="font-monospace">{pkg.version || 'N/A'}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Flags</strong>
                  </td>
                  <td className="font-monospace">{pkg.flags || 'N/A'}</td>
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
            <h3 className="fs-6 fw-bold">Package Status</h3>
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
            <h3 className="fs-6 fw-bold">Detailed Information</h3>
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
          <p>No detailed information available for this package.</p>
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
