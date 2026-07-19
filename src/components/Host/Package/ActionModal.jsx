import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../../common';

const PackageActionModal = ({ package: pkg, action, onClose, onConfirm }) => {
  const { t } = useTranslation();
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
          title: t('host.packageActionModal.installPackage'),
          icon: 'fa-download',
          buttonClass: 'has-background-success-dark has-text-success-light',
          description: t('host.packageActionModal.installPackageDescription', { name: pkg.name }),
          warning: t('host.packageActionModal.installWarning'),
        };
      case 'uninstall':
        return {
          title: t('host.packageActionModal.uninstallPackage'),
          icon: 'fa-trash',
          buttonClass: 'has-background-danger-dark has-text-danger-light',
          description: t('host.packageActionModal.uninstallPackageDescription', {
            name: pkg.name,
          }),
          warning: t('host.packageActionModal.uninstallWarning'),
        };
      default:
        return {
          title: t('host.packageActionModal.packageAction'),
          icon: 'fa-cube',
          buttonClass: 'is-info',
          description: t('host.packageActionModal.performActionDescription', {
            action,
            name: pkg.name,
          }),
          warning: t('host.packageActionModal.confirmAction'),
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
      submitText={loading ? t('host.packageActionModal.processing') : actionDetails.title}
      submitVariant={getSubmitVariant()}
      loading={loading}
    >
      {/* Package Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.packageActionModal.packageInformation')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.packageActionModal.packageName')}</strong>
                  </td>
                  <td className="font-monospace">{pkg.name}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.packageActionModal.publisher')}</strong>
                  </td>
                  <td>
                    <span className="badge text-bg-info">
                      {pkg.publisher || t('host.packageActionModal.unknown')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.packageActionModal.version')}</strong>
                  </td>
                  <td className="font-monospace">
                    {pkg.version || t('host.packageActionModal.latest')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Description */}
      <div className="alert alert-info">
        <p>
          <strong>{t('host.packageActionModal.action')}</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Options */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.packageActionModal.options')}</h3>

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
                <strong>{t('host.packageActionModal.dryRun')}</strong> -{' '}
                {t('host.packageActionModal.dryRunDescription')}
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
                  <strong>{t('host.packageActionModal.acceptLicenses')}</strong> -{' '}
                  {t('host.packageActionModal.acceptLicensesDescription')}
                </label>
              </div>
            </div>
          )}

          {/* Boot Environment Name */}
          <div className="mb-3">
            <label className="form-label" htmlFor="beName">
              {t('host.packageActionModal.bootEnvironmentName')}
            </label>
            <input
              id="beName"
              className="form-control"
              type="text"
              placeholder={t('host.packageActionModal.leaveEmptyToUseDefault')}
              value={options.beName}
              onChange={e => handleOptionChange('beName', e.target.value)}
            />
            <p className="form-text text-muted">
              {t('host.packageActionModal.bootEnvironmentDescription')}
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
