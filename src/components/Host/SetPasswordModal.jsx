import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import FormModal from '../common/FormModal';
import RevealInput from '../common/RevealInput';

const SetPasswordModal = ({ user, onClose, onSuccess }) => {
  const { t } = useTranslation();
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
      setError(t('host.setPasswordModal.passwordRequired'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('host.setPasswordModal.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('host.setPasswordModal.passwordTooShort'));
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
      title={t('host.setPasswordModal.title', { username: user.username })}
      icon="fas fa-key"
      submitText={t('host.setPasswordModal.submit')}
      submitIcon="fas fa-key"
      loading={loading}
      showCancelButton
      aria-label={t('host.setPasswordModal.ariaLabel', { username: user.username })}
    >
      {error && (
        <div className="alert alert-danger mb-4">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="new-password-input">
          {t('host.setPasswordModal.newPassword')} <span className="text-danger">*</span>
        </label>
        <RevealInput
          id="new-password-input"
          value={formData.password}
          onChange={e => handleInputChange('password', e.target.value)}
          required
          disabled={loading}
          placeholder={t('host.setPasswordModal.newPasswordPlaceholder')}
        />
        <p className="form-text text-muted">{t('host.setPasswordModal.passwordHelp')}</p>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="confirm-password-input">
          {t('host.setPasswordModal.confirmPassword')} <span className="text-danger">*</span>
        </label>
        <RevealInput
          id="confirm-password-input"
          value={formData.confirmPassword}
          onChange={e => handleInputChange('confirmPassword', e.target.value)}
          required
          disabled={loading}
          placeholder={t('host.setPasswordModal.confirmPasswordPlaceholder')}
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
            {t('host.setPasswordModal.forceChange')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.setPasswordModal.forceChangeHelp')}</p>
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
            {t('host.setPasswordModal.unlockAccount')}
          </label>
        </div>
        <p className="form-text text-muted">{t('host.setPasswordModal.unlockAccountHelp')}</p>
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
