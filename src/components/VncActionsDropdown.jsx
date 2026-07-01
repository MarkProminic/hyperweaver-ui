import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

import VncActionsSubmenu from './Vnc/VncActionsSubmenu';
import VncDisplaySettingsSubmenu from './Vnc/VncDisplaySettingsSubmenu';
import VncKeyboardSubmenu from './Vnc/VncKeyboardSubmenu';

const VncActionsDropdown = ({
  vncRef,
  onScreenshot,
  onFullScreen,
  onNewTab,
  onKillSession,
  onToggleViewOnly, // Kept for backward compatibility: why though? just clutter otherwise right?
  onToggleReadOnly,
  isViewOnly, // Kept for backward compatibility: why? just clutter otherwise right?
  isReadOnly,
  isAdmin = false,
  className = '',
  variant = 'default', // 'default' or 'button'
  quality = 6,
  compression = 2,
  resize = 'scale',
  showDot = true,
  onQualityChange = null,
  onCompressionChange = null,
  onResizeChange = null,
  onShowDotChange = null,
  onClipboardPaste = null,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [modifierKeys, setModifierKeys] = useState({
    ctrl: false,
    alt: false,
    shift: false,
  });
  const dropdownRef = useRef(null);

  // Dynamic submenu positioning to prevent viewport overflow
  const calculateSubmenuPosition = (submenuWidth = 300) => {
    if (!dropdownRef.current) {
      return 'hw-dropdown-submenu-right';
    }

    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const containerRect =
      dropdownRef.current.closest('.column')?.getBoundingClientRect() ||
      dropdownRef.current.closest('.hw-console-container')?.getBoundingClientRect() ||
      document.body.getBoundingClientRect();

    // Check available space within the actual container, not just viewport
    const rightSpace = Math.min(
      window.innerWidth - dropdownRect.right,
      containerRect.right - dropdownRect.right
    );

    const shouldFlipLeft = rightSpace < submenuWidth + 40; // 40px buffer for scrollbars/padding

    return shouldFlipLeft ? 'hw-dropdown-submenu-left' : 'hw-dropdown-submenu-right';
  };

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCtrlAltDel = () => {
    if (vncRef?.current?.sendCtrlAltDel) {
      vncRef.current.sendCtrlAltDel();
      setIsActive(false);
    }
  };

  const handleKillSession = () => {
    if (onKillSession) {
      onKillSession();
    }
    setIsActive(false);
  };

  // Use new props if available, fall back to old ones for backward compatibility
  const actualIsReadOnly = isReadOnly !== undefined ? isReadOnly : isViewOnly;
  const actualToggleHandler = onToggleReadOnly || onToggleViewOnly;

  const dropdownContent = (
    <div className="hw-dropdown-content">
      <VncKeyboardSubmenu
        vncRef={vncRef}
        modifierKeys={modifierKeys}
        setModifierKeys={setModifierKeys}
        calculateSubmenuPosition={calculateSubmenuPosition}
        onClose={() => setIsActive(false)}
        handleCtrlAltDel={handleCtrlAltDel}
      />

      <VncDisplaySettingsSubmenu
        quality={quality}
        compression={compression}
        resize={resize}
        showDot={showDot}
        onQualityChange={onQualityChange}
        onCompressionChange={onCompressionChange}
        onResizeChange={onResizeChange}
        onShowDotChange={onShowDotChange}
        calculateSubmenuPosition={calculateSubmenuPosition}
      />

      <VncActionsSubmenu
        vncRef={vncRef}
        isAdmin={isAdmin}
        isReadOnly={actualIsReadOnly}
        onToggleReadOnly={actualToggleHandler}
        onClipboardPaste={onClipboardPaste}
        onScreenshot={onScreenshot}
        onFullScreen={onFullScreen}
        onNewTab={onNewTab}
        calculateSubmenuPosition={calculateSubmenuPosition}
        onClose={() => setIsActive(false)}
      />

      {onKillSession && (
        <>
          <hr className="dropdown-divider" />
          <div
            className="dropdown-item text-danger"
            onClick={handleKillSession}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleKillSession();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-skull me-2" />
            <span>Kill VNC Session</span>
          </div>
        </>
      )}
    </div>
  );

  if (variant === 'button') {
    return (
      <div className={`dropdown ${className}`} ref={dropdownRef}>
        <button
          type="button"
          className="btn btn-sm btn-light"
          aria-haspopup="true"
          aria-controls="vnc-dropdown-menu"
          onClick={() => setIsActive(!isActive)}
        >
          <i className="fas fa-ellipsis-v" />
        </button>
        <div
          className={`dropdown-menu dropdown-menu-end ${isActive ? 'show' : ''}`}
          id="vnc-dropdown-menu"
          role="menu"
        >
          {dropdownContent}
        </div>
      </div>
    );
  }

  // Default variant (text with arrow)
  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <span
        className="text-primary small"
        style={{ cursor: 'pointer' }}
        aria-haspopup="true"
        aria-controls="vnc-dropdown-menu"
        onClick={() => setIsActive(!isActive)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsActive(!isActive);
          }
        }}
        role="button"
        tabIndex={0}
      >
        VNC Actions
        <i className="fas fa-angle-down ms-1" aria-hidden="true" />
      </span>
      <div
        className={`dropdown-menu dropdown-menu-end ${isActive ? 'show' : ''}`}
        id="vnc-dropdown-menu"
        role="menu"
      >
        {dropdownContent}
      </div>
    </div>
  );
};

VncActionsDropdown.propTypes = {
  vncRef: PropTypes.object,
  onScreenshot: PropTypes.func,
  onFullScreen: PropTypes.func,
  onNewTab: PropTypes.func,
  onKillSession: PropTypes.func,
  onToggleViewOnly: PropTypes.func,
  onToggleReadOnly: PropTypes.func,
  isViewOnly: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  isAdmin: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.string,
  quality: PropTypes.number,
  compression: PropTypes.number,
  resize: PropTypes.string,
  showDot: PropTypes.bool,
  onQualityChange: PropTypes.func,
  onCompressionChange: PropTypes.func,
  onResizeChange: PropTypes.func,
  onShowDotChange: PropTypes.func,
  onClipboardPaste: PropTypes.func,
};

export default VncActionsDropdown;
