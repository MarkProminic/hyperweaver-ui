import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Select-with-custom — the Image picker's "Custom…" switcher pattern,
 * generalized: pick from the live list, or flip to free text and back.
 * A value the list doesn't know keeps the text input showing.
 */
const PickOrType = ({ id, value, onChange, options, blankLabel, placeholder, small, disabled }) => {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(false);
  const visibleOptions = options.filter(
    option => String(option.value) !== blankLabel && String(option.label) !== blankLabel
  );
  const blankText =
    visibleOptions.length === options.length
      ? blankLabel
      : t('machineEdit.common.blankLabelDefault', { label: blankLabel });
  const known = visibleOptions.some(option => option.value === value);
  if (custom || (value && !known)) {
    return (
      <>
        <input
          id={id}
          className={`form-control ${small ? 'form-control-sm' : ''}`}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-link btn-sm p-0"
          onClick={() => {
            setCustom(false);
            onChange('');
          }}
        >
          {t('machineEdit.pickOrType.backToList')}
        </button>
      </>
    );
  }
  return (
    <select
      id={id}
      className={`form-select ${small ? 'form-select-sm' : ''}`}
      value={value}
      onChange={e => {
        if (e.target.value === '__custom__') {
          setCustom(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      disabled={disabled}
    >
      <option value="">{blankText}</option>
      {visibleOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      <option value="__custom__">{t('machineEdit.pickOrType.custom')}</option>
    </select>
  );
};

PickOrType.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  blankLabel: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  small: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default PickOrType;
