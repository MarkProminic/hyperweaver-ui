import PropTypes from 'prop-types';
import { useState } from 'react';

const RevealInput = ({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  autoComplete = 'new-password',
  minLength,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <input
        id={id}
        className="form-control"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setShow(prev => !prev)}
        title={show ? 'Hide the password' : 'Show the password'}
        disabled={disabled}
      >
        <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
    </div>
  );
};

RevealInput.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  autoComplete: PropTypes.string,
  minLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default RevealInput;
