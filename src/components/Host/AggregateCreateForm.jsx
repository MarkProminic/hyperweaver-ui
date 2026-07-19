import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * Form fields for the Aggregate Create modal.
 * Extracted to keep AggregateCreateModal under 500 lines.
 */
const AggregateCreateForm = ({
  formData,
  creating,
  newLink,
  setNewLink,
  availableLinks,
  loadingLinks,
  onInputChange,
  onAddLink,
  onRemoveLink,
  cdpServiceRunning,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-3">
        <label htmlFor="aggregate-name" className="form-label">
          {t('host.aggregateCreateForm.nameLabel')}
        </label>
        <input
          id="aggregate-name"
          className="form-control"
          type="text"
          placeholder={t('host.aggregateCreateForm.namePlaceholder')}
          value={formData.name}
          onChange={e => onInputChange('name', e.target.value)}
          disabled={creating}
          required
        />
        <p className="form-text text-muted">{t('host.aggregateCreateForm.nameHint')}</p>
      </div>

      <div className="mb-3">
        <label htmlFor="aggregate-link-select" className="form-label">
          {t('host.aggregateCreateForm.memberLinksLabel')}
        </label>
        <div className="input-group">
          <select
            id="aggregate-link-select"
            className="form-select"
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            disabled={creating || loadingLinks}
          >
            <option value="">
              {loadingLinks
                ? t('host.aggregateCreateForm.loadingLinks')
                : t('host.aggregateCreateForm.selectLink')}
            </option>
            {availableLinks
              .filter(link => !formData.links.includes(link.link))
              .map(link => (
                <option key={link.link} value={link.link}>
                  {link.link} ({link.state}, {link.speed || 'Unknown speed'})
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn-info"
            onClick={onAddLink}
            disabled={!newLink.trim() || creating}
          >
            {t('host.aggregateCreateForm.addLinkButton')}
          </button>
        </div>

        {formData.links.length > 0 && (
          <div className="mt-3">
            <p>
              <strong>{t('host.aggregateCreateForm.currentLinks')}</strong>
            </p>
            <div className="d-flex flex-wrap gap-2">
              {formData.links.map(link => (
                <span
                  key={link}
                  className="badge text-bg-info d-inline-flex align-items-center gap-1"
                >
                  {link}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label={t('host.aggregateCreateForm.removeAriaLabel')}
                    onClick={() => onRemoveLink(link)}
                    disabled={creating}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label htmlFor="aggregate-policy" className="form-label">
              {t('host.aggregateCreateForm.policyLabel')}
            </label>
            <select
              id="aggregate-policy"
              className="form-select"
              value={formData.policy}
              onChange={e => onInputChange('policy', e.target.value)}
              disabled={creating}
            >
              <option value="L2">{t('host.aggregateCreateForm.policyL2')}</option>
              <option value="L3">{t('host.aggregateCreateForm.policyL3')}</option>
              <option value="L4">{t('host.aggregateCreateForm.policyL4')}</option>
              <option value="L2L3">{t('host.aggregateCreateForm.policyL2L3')}</option>
              <option value="L2L4">{t('host.aggregateCreateForm.policyL2L4')}</option>
              <option value="L3L4">{t('host.aggregateCreateForm.policyL3L4')}</option>
              <option value="L2L3L4">{t('host.aggregateCreateForm.policyL2L3L4')}</option>
            </select>
          </div>
        </div>
        <div className="col">
          <div className="mb-3">
            <label htmlFor="aggregate-lacp-mode" className="form-label">
              {t('host.aggregateCreateForm.lacpModeLabel')}
            </label>
            <select
              id="aggregate-lacp-mode"
              className="form-select"
              value={formData.lacp_mode}
              onChange={e => onInputChange('lacp_mode', e.target.value)}
              disabled={creating}
            >
              <option value="off">{t('host.aggregateCreateForm.lacpModeOff')}</option>
              <option value="active">{t('host.aggregateCreateForm.lacpModeActive')}</option>
              <option value="passive">{t('host.aggregateCreateForm.lacpModePassive')}</option>
            </select>
          </div>
        </div>
      </div>

      {formData.lacp_mode !== 'off' && (
        <div className="mb-3">
          <label htmlFor="aggregate-lacp-timer" className="form-label">
            {t('host.aggregateCreateForm.lacpTimerLabel')}
          </label>
          <select
            id="aggregate-lacp-timer"
            className="form-select"
            value={formData.lacp_timer}
            onChange={e => onInputChange('lacp_timer', e.target.value)}
            disabled={creating}
          >
            <option value="short">{t('host.aggregateCreateForm.lacpTimerShort')}</option>
            <option value="long">{t('host.aggregateCreateForm.lacpTimerLong')}</option>
          </select>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="aggregate-mac" className="form-label">
          {t('host.aggregateCreateForm.macLabel')}
        </label>
        <input
          id="aggregate-mac"
          className="form-control"
          type="text"
          placeholder={t('host.aggregateCreateForm.macPlaceholder')}
          value={formData.unicast_address}
          onChange={e => onInputChange('unicast_address', e.target.value)}
          disabled={creating}
        />
        <p className="form-text text-muted">{t('host.aggregateCreateForm.macHint')}</p>
      </div>

      {cdpServiceRunning && (
        <div className="alert alert-warning mb-4">
          <div>
            <p>
              <strong>{t('host.aggregateCreateForm.cdpTitle')}</strong>
            </p>
            <p>{t('host.aggregateCreateForm.cdpWarning')}</p>

            <div className="mb-3 mt-3">
              <div className="form-check">
                <input
                  id="aggregate-disable-cdp"
                  className="form-check-input"
                  type="checkbox"
                  checked={formData.disableCdp}
                  onChange={e => onInputChange('disableCdp', e.target.checked)}
                  disabled={creating}
                />
                <label className="form-check-label" htmlFor="aggregate-disable-cdp">
                  <strong>{t('host.aggregateCreateForm.cdpCheckboxLabel')}</strong>
                </label>
              </div>
              <p className="form-text text-muted">{t('host.aggregateCreateForm.cdpHint')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="form-check">
          <input
            id="aggregate-temporary"
            className="form-check-input"
            type="checkbox"
            checked={formData.temporary}
            onChange={e => onInputChange('temporary', e.target.checked)}
            disabled={creating}
          />
          <label className="form-check-label" htmlFor="aggregate-temporary">
            {t('host.aggregateCreateForm.temporaryLabel')}
          </label>
        </div>
      </div>
    </>
  );
};

AggregateCreateForm.propTypes = {
  formData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    links: PropTypes.arrayOf(PropTypes.string).isRequired,
    policy: PropTypes.string.isRequired,
    lacp_mode: PropTypes.string.isRequired,
    lacp_timer: PropTypes.string.isRequired,
    unicast_address: PropTypes.string.isRequired,
    temporary: PropTypes.bool.isRequired,
    disableCdp: PropTypes.bool.isRequired,
  }).isRequired,
  creating: PropTypes.bool.isRequired,
  newLink: PropTypes.string.isRequired,
  setNewLink: PropTypes.func.isRequired,
  availableLinks: PropTypes.arrayOf(PropTypes.object).isRequired,
  loadingLinks: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onAddLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  cdpServiceRunning: PropTypes.bool,
};

export default AggregateCreateForm;
