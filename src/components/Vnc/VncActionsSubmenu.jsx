import PropTypes from 'prop-types';
import { useState } from 'react';

const VncActionsSubmenu = ({
  vncRef,
  isAdmin,
  isReadOnly,
  onToggleReadOnly,
  onClipboardPaste,
  onScreenshot,
  onFullScreen,
  onNewTab,
  calculateSubmenuPosition,
  onClose,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleScreenshot = () => {
    if (onScreenshot) {
      onScreenshot();
    } else if (vncRef?.current) {
      const canvas = vncRef.current.getCanvas?.();
      if (canvas) {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vnc-screenshot-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }
    }
    onClose();
  };

  const handleFullScreen = () => {
    if (onFullScreen) {
      onFullScreen();
    }
    onClose();
  };

  const handleNewTab = () => {
    if (onNewTab) {
      onNewTab();
    }
    onClose();
  };

  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={showActions}
    >
      <div className="d-flex align-items-center">
        <i className="fas fa-tools me-2" />
        <span>Actions</span>
      </div>
      <i className="fas fa-chevron-right" />

      {showActions && (
        <div className={`dropdown-menu show ${calculateSubmenuPosition(300)}`}>
          <div>
            {isAdmin && onToggleReadOnly && (
              <>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    onToggleReadOnly();
                    onClose();
                  }}
                  onKeyDown={e =>
                    handleKeyDown(e, () => {
                      onToggleReadOnly();
                      onClose();
                    })
                  }
                  role="button"
                  tabIndex={0}
                  title={isReadOnly ? 'Enable interactive mode' : 'Enable read-only mode'}
                >
                  <i className={`fas ${isReadOnly ? 'fa-edit' : 'fa-eye'} me-2`} />
                  <span>{isReadOnly ? 'Enable Interactive' : 'Set Read-Only'}</span>
                </div>
                <hr className="dropdown-divider" />
              </>
            )}

            {(onClipboardPaste || vncRef?.current?.clipboardPaste) && (
              <>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    const handlePaste = async () => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.readText) {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            if (vncRef?.current?.clipboardPaste) {
                              vncRef.current.clipboardPaste(text);
                            } else if (onClipboardPaste) {
                              onClipboardPaste(text);
                            }
                          }
                        }
                      } catch (error) {
                        console.error('📋 VNC DROPDOWN: Error reading clipboard:', error);
                      }
                      onClose();
                    };
                    handlePaste();
                  }}
                  onKeyDown={e => handleKeyDown(e, () => {})} // Clipboard API might be blocked in keydown without user activation, but we add handler for consistency
                  role="button"
                  tabIndex={0}
                >
                  <i className="fas fa-paste me-2" />
                  <span>Paste from Browser Clipboard</span>
                </div>
                <hr className="dropdown-divider" />
              </>
            )}

            <div
              className="dropdown-item"
              onClick={handleScreenshot}
              onKeyDown={e => handleKeyDown(e, handleScreenshot)}
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-camera me-2" />
              <span>Take Screenshot</span>
            </div>

            {onFullScreen && (
              <div
                className="dropdown-item"
                onClick={handleFullScreen}
                onKeyDown={e => handleKeyDown(e, handleFullScreen)}
                role="button"
                tabIndex={0}
              >
                <i className="fas fa-expand me-2" />
                <span>Full Screen</span>
              </div>
            )}

            {onNewTab && (
              <div
                className="dropdown-item"
                onClick={handleNewTab}
                onKeyDown={e => handleKeyDown(e, handleNewTab)}
                role="button"
                tabIndex={0}
              >
                <i className="fas fa-external-link-alt me-2" />
                <span>Open in New Tab</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

VncActionsSubmenu.propTypes = {
  vncRef: PropTypes.object,
  isAdmin: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  onToggleReadOnly: PropTypes.func,
  onClipboardPaste: PropTypes.func,
  onScreenshot: PropTypes.func,
  onFullScreen: PropTypes.func,
  onNewTab: PropTypes.func,
  calculateSubmenuPosition: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VncActionsSubmenu;
