import PropTypes from 'prop-types';
import { useState } from 'react';

import FormModal from '../common/FormModal';
import RevealInput from '../common/RevealInput';

const SetPasswordModal = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    forceChange: false,
    unlockAccount: true,
  });
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const passwordData = {
        password: formData.password,
        forceChange: formData.forceChange,
        unlockAccount: formData.unlockAccount,
      };

      await onSuccess(passwordData);
    } catch (err) {
      setError(`Error setting password: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Set Password for ${user.username}`}
      icon="fas fa-key"
      submitText="Set Password"
      submitIcon="fas fa-key"
      loading={loading}
      showCancelButton
      aria-label={`Set password for user ${user.username}`}
    >
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="new-password-input">
          New Password <span className="text-danger">*</span>
        </label>
        <RevealInput
          id="new-password-input"
          value={formData.password}
          onChange={e => handleInputChange('password', e.target.value)}
          required
          disabled={loading}
          placeholder="Enter new password"
        />
        <p className="form-text text-muted">Password must be at least 8 characters long</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="confirm-password-input">
          Confirm Password <span className="text-danger">*</span>
        </label>
        <RevealInput
          id="confirm-password-input"
          value={formData.confirmPassword}
          onChange={e => handleInputChange('confirmPassword', e.target.value)}
          required
          disabled={loading}
          placeholder="Confirm new password"
        />
      </div>

      <hr />

      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="set-password-force-change"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={formData.forceChange}
            onChange={e => handleInputChange('forceChange', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="set-password-force-change">
            Force password change on next login
          </label>
        </div>
        <p className="form-text text-muted">
          User will be required to change password on their next login
        </p>
      </div>

      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            id="set-password-unlock-account"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={formData.unlockAccount}
            onChange={e => handleInputChange('unlockAccount', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="set-password-unlock-account">
            Unlock account if locked
          </label>
        </div>
        <p className="form-text text-muted">
          Automatically unlock the account when setting the password
        </p>
      </div>
    </FormModal>
  );
};

SetPasswordModal.propTypes = {
  user: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default SetPasswordModal;
