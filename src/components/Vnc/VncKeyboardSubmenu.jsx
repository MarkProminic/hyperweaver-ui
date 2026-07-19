import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { keysymMap, sendKeyWithModifiers } from '../../utils/vncKeyUtils';

const VncKeyboardSubmenu = ({
  vncRef,
  modifierKeys,
  setModifierKeys,
  calculateSubmenuPosition,
  onClose,
  handleCtrlAltDel,
}) => {
  const { t } = useTranslation();
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
        <span>{t('console.vncKeyboardSubmenu.keyboardInput')}</span>
      </div>
      <i className="fas fa-chevron-right" />

      {showKeyboardInput && (
        <div
          className={`dropdown-menu show has-z-index-modal-high ${calculateSubmenuPosition(350)}`}
        >
          <div>
            <div className="dropdown-item fw-semibold text-secondary">
              <i className="fas fa-keyboard me-2" />
              <span>{t('console.vncKeyboardSubmenu.commonShortcuts')}</span>
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
              <span>{t('console.vncKeyboardSubmenu.ctrlAltDel')}</span>
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
              <span>{t('console.vncKeyboardSubmenu.altTab')}</span>
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
              <span>{t('console.vncKeyboardSubmenu.altF4')}</span>
            </div>

            <hr className="dropdown-divider" />

            <div className="dropdown-item fw-semibold text-secondary">
              <i className="fas fa-hand-paper me-2" />
              <span>{t('console.vncKeyboardSubmenu.modifierKeys')}</span>
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
                      title={t('console.vncKeyboardSubmenu.modifierToggleTitle', {
                        mod: mod.toUpperCase(),
                        state: modifierKeys[mod]
                          ? t('console.vncKeyboardSubmenu.stateOn')
                          : t('console.vncKeyboardSubmenu.stateOff'),
                      })}
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
                  {t('console.vncKeyboardSubmenu.activeModifiersHint')}
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
              <span>{t('console.vncKeyboardSubmenu.functionKeys')}</span>
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
                          title={t('console.vncKeyboardSubmenu.sendToGuest', {
                            key:
                              modifierKeys.ctrl || modifierKeys.alt || modifierKeys.shift
                                ? buildKeyString(`F${fKeyNum}`)
                                : `F${fKeyNum}`,
                          })}
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
