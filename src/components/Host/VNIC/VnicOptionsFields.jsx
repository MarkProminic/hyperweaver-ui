import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const VnicOptionsFields = ({ temporary, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <div className="form-check">
        <input
          id="vnic-create-temporary"
          className="form-check-input"
          type="checkbox"
          checked={temporary}
          onChange={e => onChange('temporary', e.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor="vnic-create-temporary">
          {t('hostTools.VnicOptionsFields.temporaryLabel')}
        </label>
      </div>
    </div>
  );
};

VnicOptionsFields.propTypes = {
  temporary: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicOptionsFields;
