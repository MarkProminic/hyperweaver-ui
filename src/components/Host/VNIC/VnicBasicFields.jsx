import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const VnicBasicFields = ({ name, link, availableLinks, loadingLinks, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row">
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-name">
            {t('hostTools.VnicBasicFields.vnicNameLabel')}
          </label>
          <input
            id="vnic-create-name"
            className="form-control"
            type="text"
            placeholder={t('hostTools.VnicBasicFields.vnicNamePlaceholder')}
            value={name}
            onChange={e => onChange('name', e.target.value)}
            disabled={disabled}
            required
          />
          <p className="form-text text-muted">{t('hostTools.VnicBasicFields.vnicNameHelp')}</p>
        </div>
      </div>
      <div className="col">
        <div className="mb-3">
          <label className="form-label" htmlFor="vnic-create-link">
            {t('hostTools.VnicBasicFields.physicalLinkLabel')}
          </label>
          <select
            id="vnic-create-link"
            className="form-select"
            value={link}
            onChange={e => onChange('link', e.target.value)}
            disabled={disabled || loadingLinks}
            required
          >
            <option value="">
              {loadingLinks
                ? t('hostTools.VnicBasicFields.loadingAvailableLinks')
                : t('hostTools.VnicBasicFields.selectLinkOption')}
            </option>
            {availableLinks.map(l => (
              <option key={l.name} value={l.name}>
                {l.name} ({l.type}, {l.state}, {l.speed})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

VnicBasicFields.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  availableLinks: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      state: PropTypes.string,
      speed: PropTypes.string,
    })
  ).isRequired,
  loadingLinks: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicBasicFields;
