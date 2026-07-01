import PropTypes from 'prop-types';

const VnicOptionsFields = ({ temporary, onChange, disabled }) => (
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
        Temporary (not persistent across reboots)
      </label>
    </div>
  </div>
);

VnicOptionsFields.propTypes = {
  temporary: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicOptionsFields;
