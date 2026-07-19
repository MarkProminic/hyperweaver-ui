import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal } from '../common';

const getSubmitVariant = buttonClass => {
  if (buttonClass.includes('danger')) {
    return 'danger';
  }
  if (buttonClass.includes('warning')) {
    return 'warning';
  }
  if (buttonClass.includes('success')) {
    return 'success';
  }
  return 'info';
};

const ConfirmActionModal = ({ bootEnvironment, action, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState({
    temporary: false,
    force: true,
    snapshots: false,
    mountpoint: `/mnt/${bootEnvironment.name}`,
    sharedMode: 'ro',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await onConfirm(bootEnvironment.name, action, options);
      if (result.success) {
        onClose();
      }
    } catch {
      // error handled by parent via onConfirm return value
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
      case 'activate':
        return {
          title: t('host.confirmActionModal.titleActivate'),
          icon: 'fa-power-off',
          buttonClass: 'btn-success',
          description: t('host.confirmActionModal.descriptionActivate', {
            name: bootEnvironment.name,
          }),
          warning: t('host.confirmActionModal.warningActivate'),
        };
      case 'mount':
        return {
          title: t('host.confirmActionModal.titleMount'),
          icon: 'fa-folder-open',
          buttonClass: 'btn-info',
          description: t('host.confirmActionModal.descriptionMount', {
            name: bootEnvironment.name,
          }),
          warning: t('host.confirmActionModal.warningMount'),
        };
      case 'unmount':
        return {
          title: t('host.confirmActionModal.titleUnmount'),
          icon: 'fa-folder',
          buttonClass: 'btn-warning',
          description: t('host.confirmActionModal.descriptionUnmount', {
            name: bootEnvironment.name,
          }),
          warning: t('host.confirmActionModal.warningUnmount'),
        };
      case 'delete':
        return {
          title: t('host.confirmActionModal.titleDelete'),
          icon: 'fa-trash',
          buttonClass: 'btn-danger',
          description: t('host.confirmActionModal.descriptionDelete', {
            name: bootEnvironment.name,
          }),
          warning: t('host.confirmActionModal.warningDelete'),
        };
      default:
        return {
          title: t('host.confirmActionModal.titleDefault'),
          icon: 'fa-layer-group',
          buttonClass: 'btn-info',
          description: t('host.confirmActionModal.descriptionDefault', {
            action,
            name: bootEnvironment.name,
          }),
          warning: t('host.confirmActionModal.warningDefault'),
        };
    }
  };

  const actionDetails = getActionDetails();

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={actionDetails.title}
      icon={`fas ${actionDetails.icon}`}
      submitText={loading ? t('host.confirmActionModal.processingText') : actionDetails.title}
      submitVariant={getSubmitVariant(actionDetails.buttonClass)}
      loading={loading}
    >
      {/* Boot Environment Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.confirmActionModal.infoCardTitle')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.confirmActionModal.nameLabel')}</strong>
                  </td>
                  <td className="font-monospace">{bootEnvironment.name}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.confirmActionModal.activeStatusLabel')}</strong>
                  </td>
                  <td>
                    {bootEnvironment.is_active_now && bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-success">
                        {t('host.confirmActionModal.statusActiveNowReboot')}
                      </span>
                    )}
                    {bootEnvironment.is_active_now && !bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-success">
                        {t('host.confirmActionModal.statusActiveNow')}
                      </span>
                    )}
                    {!bootEnvironment.is_active_now && bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-info">
                        {t('host.confirmActionModal.statusActiveOnReboot')}
                      </span>
                    )}
                    {!bootEnvironment.is_active_now && !bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-secondary">
                        {t('host.confirmActionModal.statusInactive')}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.confirmActionModal.mountpointLabel')}</strong>
                  </td>
                  <td className="font-monospace">
                    {bootEnvironment.mountpoint === '-'
                      ? t('host.confirmActionModal.notMounted')
                      : bootEnvironment.mountpoint}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.confirmActionModal.spaceUsedLabel')}</strong>
                  </td>
                  <td>{bootEnvironment.space || t('host.confirmActionModal.notAvailable')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Description */}
      <div className={`alert ${action === 'delete' ? 'alert-danger' : 'alert-info'}`}>
        <p>
          <strong>{t('host.confirmActionModal.actionLabel')}</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Action-specific Options */}
      {action === 'activate' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.confirmActionModal.activationOptionsTitle')}</h3>

            <div className="mb-3">
              <div className="form-check">
                <input
                  id="option-temporary"
                  className="form-check-input"
                  type="checkbox"
                  checked={options.temporary}
                  onChange={e => handleOptionChange('temporary', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="option-temporary">
                  <strong>{t('host.confirmActionModal.temporaryActivationTitle')}</strong> -{' '}
                  {t('host.confirmActionModal.temporaryActivationDesc')}
                </label>
              </div>
              <p className="form-text text-muted">
                {t('host.confirmActionModal.temporaryActivationHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'mount' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.confirmActionModal.mountOptionsTitle')}</h3>

            <div className="mb-3">
              <label className="form-label" htmlFor="mountpoint-input">
                {t('host.confirmActionModal.mountpointLabel')}
              </label>
              <input
                id="mountpoint-input"
                className="form-control"
                type="text"
                value={options.mountpoint}
                onChange={e => handleOptionChange('mountpoint', e.target.value)}
              />
              <p className="form-text text-muted">
                {t('host.confirmActionModal.mountpointInputHint')}
              </p>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="shared-mode-select">
                {t('host.confirmActionModal.sharedModeLabel')}
              </label>
              <select
                id="shared-mode-select"
                className="form-select"
                value={options.sharedMode}
                onChange={e => handleOptionChange('sharedMode', e.target.value)}
              >
                <option value="ro">{t('host.confirmActionModal.readOnlyOption')}</option>
                <option value="rw">{t('host.confirmActionModal.readWriteOption')}</option>
              </select>
              <p className="form-text text-muted">
                {t('host.confirmActionModal.mountAccessModeHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'unmount' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.confirmActionModal.unmountOptionsTitle')}</h3>

            <div className="mb-3">
              <div className="form-check">
                <input
                  id="option-force-unmount"
                  className="form-check-input"
                  type="checkbox"
                  checked={options.force}
                  onChange={e => handleOptionChange('force', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="option-force-unmount">
                  <strong>{t('host.confirmActionModal.forceUnmountTitle')}</strong> -{' '}
                  {t('host.confirmActionModal.forceUnmountDesc')}
                </label>
              </div>
              <p className="form-text text-muted">
                {t('host.confirmActionModal.forceUnmountHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'delete' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">{t('host.confirmActionModal.deleteOptionsTitle')}</h3>

            <div className="mb-3">
              <div className="form-check">
                <input
                  id="option-force-delete"
                  className="form-check-input"
                  type="checkbox"
                  checked={options.force}
                  onChange={e => handleOptionChange('force', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="option-force-delete">
                  <strong>{t('host.confirmActionModal.forceDeleteTitle')}</strong> -{' '}
                  {t('host.confirmActionModal.forceDeleteDesc')}
                </label>
              </div>
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  id="option-snapshots"
                  className="form-check-input"
                  type="checkbox"
                  checked={options.snapshots}
                  onChange={e => handleOptionChange('snapshots', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="option-snapshots">
                  <strong>{t('host.confirmActionModal.deleteSnapshotsTitle')}</strong> -{' '}
                  {t('host.confirmActionModal.deleteSnapshotsDesc')}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </FormModal>
  );
};

ConfirmActionModal.propTypes = {
  bootEnvironment: PropTypes.shape({
    name: PropTypes.string.isRequired,
    is_active_now: PropTypes.bool,
    is_active_on_reboot: PropTypes.bool,
    mountpoint: PropTypes.string,
    space: PropTypes.string,
  }).isRequired,
  action: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmActionModal;
