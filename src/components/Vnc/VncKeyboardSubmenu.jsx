import PropTypes from 'prop-types';
import { useState } from 'react';

import { keysymMap, sendKeyWithModifiers } from '../../utils/vncKeyUtils';

const VncKeyboardSubmenu = ({
  vncRef,
  modifierKeys,
  setModifierKeys,
  calculateSubmenuPosition,
  onClose,
  handleCtrlAltDel,
}) => {
  const [showFunctionKeys, setShowFunctionKeys] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);

  const toggleModifier = key => {
    setModifierKeys(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const buildKeyString = baseKey => {
    const modifiers = [];
    if (modifierKeys.ctrl) {
      modifiers.push('ctrl');
    }
    if (modifierKeys.alt) {
      modifiers.push('alt');
    }
    if (modifierKeys.shift) {
      modifiers.push('shift');
    }

    if (modifiers.length > 0) {
      return `${modifiers.join('-')}-${baseKey.toLowerCase()}`;
    }
    return baseKey.toLowerCase();
  };

  const handleKeyboardShortcut = (keyCode, keysym, withModifiers = true) => {
    if (vncRef?.current?.sendKey) {
      const activeModifiers = withModifiers
        ? Object.keys(modifierKeys).filter(mod => modifierKeys[mod])
        : [];
      console.log(
        `🎹 VNC DROPDOWN: Sending key: ${keyCode} (keysym: 0x${keysym.toString(16)}) with modifiers: [${activeModifiers.join(', ')}]`
      );

      try {
        sendKeyWithModifiers(vncRef.current, keysym, keyCode, activeModifiers);
        onClose();
      } catch (error) {
        console.error(`❌ VNC DROPDOWN: Error sending keyboard shortcut:`, error);
      }
    }
  };

  const getModifierClass = (mod, isActive) => {
    if (!isActive) {
      return 'btn-light';
    }
    if (mod === 'alt') {
      return 'btn-warning';
    }
    if (mod === 'shift') {
      return 'btn-info';
    }
    return 'btn-primary';
  };

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowKeyboardInput(true)}
      onMouseLeave={() => setShowKeyboardInput(false)}
      role="button"
      tabIndex={0}
    >
      <div className="d-flex align-items-center">
        <i className="fas fa-keyboard me-2" />
        <span>Keyboard & Input</span>
      </div>
      <i className="fas fa-chevron-right" />

      {showKeyboardInput && (
        <div
          className={`dropdown-menu show has-z-index-modal-high ${calculateSubmenuPosition(350)}`}
        >
          <div>
            <div className="dropdown-item fw-semibold text-secondary">
              <i className="fas fa-keyboard me-2" />
              <span>Common Shortcuts</span>
            </div>
            <hr className="dropdown-divider" />

            <div
              className="dropdown-item"
              onClick={handleCtrlAltDel}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCtrlAltDel();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-power-off me-2" />
              <span>Ctrl+Alt+Del</span>
            </div>

            <div
              className="dropdown-item"
              onClick={() => handleKeyboardShortcut('Alt+Tab', keysymMap.tab)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleKeyboardShortcut('Alt+Tab', keysymMap.tab);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-window-restore me-2" />
              <span>Alt+Tab</span>
            </div>

            <div
              className="dropdown-item"
              onClick={() => handleKeyboardShortcut('Alt+F4', keysymMap.f4)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleKeyboardShortcut('Alt+F4', keysymMap.f4);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-times me-2" />
              <span>Alt+F4</span>
            </div>

            <hr className="dropdown-divider" />

            <div className="dropdown-item fw-semibold text-secondary">
              <i className="fas fa-hand-paper me-2" />
              <span>Modifier Keys</span>
            </div>

            <div className="dropdown-item px-3 py-2">
              <div className="d-flex gap-2">
                {['ctrl', 'alt', 'shift'].map(mod => (
                  <div key={mod}>
                    <button
                      type="button"
                      className={`btn btn-sm ${getModifierClass(mod, modifierKeys[mod])}`}
                      onClick={e => {
                        e.stopPropagation();
                        toggleModifier(mod);
                      }}
                      title={`${mod.toUpperCase()} ${modifierKeys[mod] ? 'ON' : 'OFF'} - Click to toggle`}
                    >
                      <i
                        className={`fas ${modifierKeys[mod] ? 'fa-toggle-on' : 'fa-toggle-off'} me-2`}
                      />
                      <span>{mod.toUpperCase()}</span>
                    </button>
                  </div>
                ))}
              </div>
              {(modifierKeys.ctrl || modifierKeys.alt || modifierKeys.shift) && (
                <div className="form-text mt-1">
                  Active modifiers will be combined with function keys
                </div>
              )}
            </div>

            <hr className="dropdown-divider" />

            <div
              className="dropdown-item position-relative"
              onMouseEnter={() => setShowFunctionKeys(true)}
              onMouseLeave={() => setShowFunctionKeys(false)}
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-keyboard me-2" />
              <span>Function Keys</span>
              <i className="fas fa-chevron-right ms-auto" />

              {showFunctionKeys && (
                <div className="dropdown-menu show has-z-index-modal-top hw-dropdown-function-keys">
                  <div>
                    {[...Array(12).keys()].map(i => {
                      const fKeyNum = i + 1;
                      const keyCode = `F${fKeyNum}`;
                      const keysym = keysymMap[`f${fKeyNum}`];
                      return (
                        <div
                          key={keyCode}
                          className="dropdown-item"
                          onClick={() => handleKeyboardShortcut(keyCode, keysym, true)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleKeyboardShortcut(keyCode, keysym, true);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title={`Send ${modifierKeys.ctrl || modifierKeys.alt || modifierKeys.shift ? buildKeyString(`F${fKeyNum}`) : `F${fKeyNum}`} to guest`}
                        >
                          <i className="fas fa-keyboard me-2" />
                          <span>F{fKeyNum}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

VncKeyboardSubmenu.propTypes = {
  vncRef: PropTypes.object,
  modifierKeys: PropTypes.object.isRequired,
  setModifierKeys: PropTypes.func.isRequired,
  calculateSubmenuPosition: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  handleCtrlAltDel: PropTypes.func.isRequired,
};

export default VncKeyboardSubmenu;
