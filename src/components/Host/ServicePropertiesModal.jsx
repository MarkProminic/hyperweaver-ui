import PropTypes from 'prop-types';

import { ContentModal } from '../common';

const ServicePropertiesModal = ({ service, onClose }) => {
  const formatProperties = properties => {
    if (!properties) {
      return [];
    }

    // Convert properties object to array of key-value pairs for display
    return Object.entries(properties).map(([key, value]) => ({
      property: key,
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    }));
  };

  const propertiesArray = formatProperties(service.properties);

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

  const renderPropertyValue = value => {
    // Handle different types of property values
    if (value.includes('\n') || value.length > 100) {
      return <pre className="small bg-body-tertiary p-2">{value}</pre>;
    } else if (value.startsWith('http://') || value.startsWith('https://')) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="small">
          {value}
        </a>
      );
    }
    return <span className="font-monospace small">{value}</span>;
  };

  return (
    <ContentModal isOpen onClose={onClose} title="Service Properties" icon="fas fa-cog">
      {/* Service Basic Info */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Service Information</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>FMRI</strong>
                  </td>
                  <td className="font-monospace">{service.fmri}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Current State</strong>
                  </td>
                  <td>
                    <span className={`badge ${getStateTagClass(service.state)}`}>
                      {service.state}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Properties */}
      {propertiesArray.length > 0 && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Configuration Properties</h3>
            <div className="mb-3">
              <p className="form-text text-muted">
                These are the service configuration properties as returned by{' '}
                <code>svccfg listprop</code>.
              </p>
            </div>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {propertiesArray.map(prop => (
                    <tr key={prop.property}>
                      <td>
                        <code className="small">{prop.property}</code>
                      </td>
                      <td>{renderPropertyValue(prop.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no properties available */}
      {propertiesArray.length === 0 && (
        <div className="alert alert-info">
          <p>No configuration properties available for this service.</p>
        </div>
      )}
    </ContentModal>
  );
};

ServicePropertiesModal.propTypes = {
  service: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ServicePropertiesModal;
