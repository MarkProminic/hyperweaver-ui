import PropTypes from 'prop-types';
import { useState } from 'react';

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
          title: 'Activate Boot Environment',
          icon: 'fa-power-off',
          buttonClass: 'btn-success',
          description: `Activate boot environment "${bootEnvironment.name}" for next reboot.`,
          warning: 'The system will boot from this environment on next restart.',
        };
      case 'mount':
        return {
          title: 'Mount Boot Environment',
          icon: 'fa-folder-open',
          buttonClass: 'btn-info',
          description: `Mount boot environment "${bootEnvironment.name}" to access its filesystem.`,
          warning:
            'This will make the boot environment filesystem accessible for inspection or modification.',
        };
      case 'unmount':
        return {
          title: 'Unmount Boot Environment',
          icon: 'fa-folder',
          buttonClass: 'btn-warning',
          description: `Unmount boot environment "${bootEnvironment.name}".`,
          warning: 'This will disconnect the boot environment filesystem.',
        };
      case 'delete':
        return {
          title: 'Delete Boot Environment',
          icon: 'fa-trash',
          buttonClass: 'btn-danger',
          description: `Permanently delete boot environment "${bootEnvironment.name}".`,
          warning: 'This action cannot be undone. All data in this boot environment will be lost.',
        };
      default:
        return {
          title: 'Boot Environment Action',
          icon: 'fa-layer-group',
          buttonClass: 'btn-info',
          description: `Perform ${action} on boot environment "${bootEnvironment.name}".`,
          warning: 'Please confirm this action.',
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
      submitText={loading ? 'Processing...' : actionDetails.title}
      submitVariant={getSubmitVariant(actionDetails.buttonClass)}
      loading={loading}
    >
      {/* Boot Environment Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Boot Environment Information</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>Name</strong>
                  </td>
                  <td className="font-monospace">{bootEnvironment.name}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Active Status</strong>
                  </td>
                  <td>
                    {bootEnvironment.is_active_now && bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-success">Active Now + Reboot</span>
                    )}
                    {bootEnvironment.is_active_now && !bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-success">Active Now</span>
                    )}
                    {!bootEnvironment.is_active_now && bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-info">Active on Reboot</span>
                    )}
                    {!bootEnvironment.is_active_now && !bootEnvironment.is_active_on_reboot && (
                      <span className="badge text-bg-secondary">Inactive</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Mountpoint</strong>
                  </td>
                  <td className="font-monospace">
                    {bootEnvironment.mountpoint === '-'
                      ? 'Not Mounted'
                      : bootEnvironment.mountpoint}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Space Used</strong>
                  </td>
                  <td>{bootEnvironment.space || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Description */}
      <div className={`alert ${action === 'delete' ? 'alert-danger' : 'alert-info'}`}>
        <p>
          <strong>Action:</strong> {actionDetails.description}
        </p>
        <p className="mt-2">{actionDetails.warning}</p>
      </div>

      {/* Action-specific Options */}
      {action === 'activate' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Activation Options</h3>

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
                  <strong>Temporary Activation</strong> - Only activate for one boot cycle
                </label>
              </div>
              <p className="form-text text-muted">
                If checked, the system will revert to the previous BE after the next reboot.
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'mount' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Mount Options</h3>

            <div className="mb-3">
              <label className="form-label" htmlFor="mountpoint-input">
                Mountpoint
              </label>
              <input
                id="mountpoint-input"
                className="form-control"
                type="text"
                value={options.mountpoint}
                onChange={e => handleOptionChange('mountpoint', e.target.value)}
              />
              <p className="form-text text-muted">
                Directory where the boot environment will be mounted
              </p>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="shared-mode-select">
                Shared Mode
              </label>
              <select
                id="shared-mode-select"
                className="form-select"
                value={options.sharedMode}
                onChange={e => handleOptionChange('sharedMode', e.target.value)}
              >
                <option value="ro">Read-Only</option>
                <option value="rw">Read-Write</option>
              </select>
              <p className="form-text text-muted">Mount access mode</p>
            </div>
          </div>
        </div>
      )}

      {action === 'unmount' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Unmount Options</h3>

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
                  <strong>Force Unmount</strong> - Force unmount even if busy
                </label>
              </div>
              <p className="form-text text-muted">
                Use this if the normal unmount fails due to busy files.
              </p>
            </div>
          </div>
        </div>
      )}

      {action === 'delete' && (
        <div className="card">
          <div className="card-body">
            <h3 className="fs-6 fw-bold">Delete Options</h3>

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
                  <strong>Force Delete</strong> - Required for non-interactive deletion
                  (recommended)
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
                  <strong>Delete Snapshots</strong> - Also delete all associated snapshots
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
