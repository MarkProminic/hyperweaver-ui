import PropTypes from 'prop-types';
import { useState } from 'react';

import { FormModal } from '../../common';

const PackageActionModal = ({ package: pkg, action, onClose, onConfirm }) => {
  const [options, setOptions] = useState({
    dryRun: false,
    acceptLicenses: false,
    beName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await onConfirm(pkg.name, action, options);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (field, value) => {
    setOptions(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getActionDetails = () => {
    switch (action) {
      case 'install':
        return {
          title: 'Install Package',
          icon: 'fa-download',
          buttonClass: 'has-background-success-dark has-text-success-light',
          description: `Install package "${pkg.name}" on the system.`,
          warning: 'This will install the package and any required dependencies.',
        };
      case 'uninstall':
        return {
          title: 'Uninstall Package',
          icon: 'fa-trash',
          buttonClass: 'has-background-danger-dark has-text-danger-light',
          description: `Uninstall package "${pkg.name}" from the system.`,
          warning: 'This will remove the package and may affect dependent packages.',
        };
      default:
        return {
          title: 'Package Action',
          icon: 'fa-cube',
          buttonClass: 'is-info',
          description: `Perform ${action} on package "${pkg.name}".`,
          warning: 'Please confirm this action.',
        };
    }
  };

  const actionDetails = getActionDetails();

  const getSubmitVariant = () => {
    if (actionDetails.buttonClass.includes('danger')) {
      return 'is-danger';
    }
    if (actionDetails.buttonClass.includes('success')) {
      return 'is-success';
    }
    return 'is-info';
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={actionDetails.title}
      icon={`fas ${actionDetails.icon}`}
      submitText={loading ? 'Processing...' : actionDetails.title}
      submitVariant={getSubmitVariant()}
      loading={loading}
    >
      {/* Package Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Package Information</h3>
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
                  <td className="font-monospace">{pkg.version || 'Latest'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Description */}
      <div className="alert alert-info">
        <p>
          <strong>Action:</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Options */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Options</h3>

          {/* Dry Run Option */}
          <div className="mb-3">
            <div className="form-check">
              <input
                id="dry-run-option"
                className="form-check-input"
                type="checkbox"
                checked={options.dryRun}
                onChange={e => handleOptionChange('dryRun', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="dry-run-option">
                <strong>Dry Run</strong> - Show what would be done without actually performing the
                action
              </label>
            </div>
          </div>

          {/* Accept Licenses Option (for install only) */}
          {action === 'install' && (
            <div className="mb-3">
              <div className="form-check">
                <input
                  id="accept-licenses-option"
                  className="form-check-input"
                  type="checkbox"
                  checked={options.acceptLicenses}
                  onChange={e => handleOptionChange('acceptLicenses', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="accept-licenses-option">
                  <strong>Accept Licenses</strong> - Automatically accept any required package
                  licenses
                </label>
              </div>
            </div>
          )}

          {/* Boot Environment Name */}
          <div className="mb-3">
            <label className="form-label" htmlFor="beName">
              Boot Environment Name (Optional)
            </label>
            <input
              id="beName"
              className="form-control"
              type="text"
              placeholder="Leave empty to use default"
              value={options.beName}
              onChange={e => handleOptionChange('beName', e.target.value)}
            />
            <p className="form-text text-muted">
              Specify a boot environment name to create a backup before the operation.
            </p>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

PackageActionModal.propTypes = {
  package: PropTypes.shape({
    name: PropTypes.string,
    publisher: PropTypes.string,
    version: PropTypes.string,
  }).isRequired,
  action: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default PackageActionModal;
