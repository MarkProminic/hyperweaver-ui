import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

/**
 * zlogin Console Actions Dropdown
 * Provides actions for zlogin console sessions with consistent styling to VNC dropdown
 */
const ZloginActionsDropdown = ({
  variant = 'dropdown',
  onToggleReadOnly,
  onKillSession,
  onScreenshot,
  isReadOnly = true,
  isAdmin = false,
  style = {},
  disabled = false,
  className = '',
}) => {
  const [isActive, setIsActive] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = action => {
    setIsActive(false);
    action();
  };

  const itemProps = {
    className: 'dropdown-item',
    type: 'button',
    style: {
      border: 'none',
      background: 'transparent',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: 'inherit',
      color: 'inherit',
    },
  };

  const dropdownContent = (
    <div>
      {isAdmin && onToggleReadOnly && (
        <>
          <button
            {...itemProps}
            onClick={() => handleAction(onToggleReadOnly)}
            title={isReadOnly ? 'Enable interactive mode' : 'Enable read-only mode'}
          >
            <i className={`fas ${isReadOnly ? 'fa-edit' : 'fa-eye'} me-2`} />
            <span>{isReadOnly ? 'Enable Interactive' : 'Set Read-Only'}</span>
          </button>
          <hr className="dropdown-divider" />
        </>
      )}

      <div className="dropdown-item fw-semibold text-secondary">
        <i className="fas fa-tools me-2" />
        <span>Actions</span>
      </div>
      <hr className="dropdown-divider" />

      {onScreenshot && (
        <button
          {...itemProps}
          onClick={() => handleAction(onScreenshot)}
          title="Capture terminal output as text"
        >
          <i className="fas fa-camera me-2" />
          <span>Capture Output</span>
        </button>
      )}

      {onKillSession && (
        <>
          <hr className="dropdown-divider" />
          <button
            {...itemProps}
            className="dropdown-item text-danger"
            onClick={() => handleAction(onKillSession)}
            title="Terminate zlogin session"
          >
            <i className="fas fa-skull me-2" />
            <span>Kill zlogin Session</span>
          </button>
        </>
      )}
    </div>
  );

  if (variant === 'button') {
    return (
      <div className={`dropdown ${className}`} style={style} ref={dropdownRef}>
        <button
          type="button"
          className="btn btn-sm btn-light"
          aria-haspopup="true"
          aria-controls="zlogin-dropdown-menu"
          onClick={() => setIsActive(!isActive)}
          disabled={disabled}
          title="zlogin Console Actions"
        >
          <i className="fas fa-ellipsis-v" />
        </button>
        <div
          className={`dropdown-menu dropdown-menu-end ${isActive ? 'show' : ''}`}
          id="zlogin-dropdown-menu"
          role="menu"
        >
          {dropdownContent}
        </div>
      </div>
    );
  }

  // Default dropdown variant (text with arrow)
  return (
    <div className={`dropdown ${className}`} style={style} ref={dropdownRef}>
      <span
        className="text-primary small"
        style={{ cursor: 'pointer' }}
        aria-haspopup="true"
        aria-controls="zlogin-dropdown-menu"
        onClick={() => !disabled && setIsActive(!isActive)}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsActive(!isActive);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        zlogin Actions
        <i className="fas fa-angle-down ms-1" aria-hidden="true" />
      </span>
      <div
        className={`dropdown-menu dropdown-menu-end ${isActive ? 'show' : ''}`}
        id="zlogin-dropdown-menu"
        role="menu"
      >
        {dropdownContent}
      </div>
    </div>
  );
};

ZloginActionsDropdown.propTypes = {
  variant: PropTypes.string,
  onToggleReadOnly: PropTypes.func,
  onKillSession: PropTypes.func,
  onScreenshot: PropTypes.func,
  isReadOnly: PropTypes.bool,
  isAdmin: PropTypes.bool,
  style: PropTypes.object,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ZloginActionsDropdown;
