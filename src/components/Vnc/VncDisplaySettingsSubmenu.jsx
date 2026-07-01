import PropTypes from 'prop-types';
import { useState } from 'react';

const VncDisplaySettingsSubmenu = ({
  quality,
  compression,
  resize,
  showDot,
  onQualityChange,
  onCompressionChange,
  onResizeChange,
  onShowDotChange,
  calculateSubmenuPosition,
}) => {
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  const getSelectValue = () => {
    if (resize === 'scale') {
      return 'local';
    }
    if (resize === 'remote') {
      return 'remote';
    }
    return 'none';
  };

  const handleSelectChange = e => {
    if (onResizeChange) {
      const val = e.target.value;
      let newValue = 'none';
      if (val === 'local') {
        newValue = 'scale';
      } else if (val === 'remote') {
        newValue = 'remote';
      }
      onResizeChange(newValue);
    }
  };

  return (
    <div
      className="dropdown-item position-relative d-flex justify-content-between align-items-center"
      onMouseEnter={() => setShowDisplaySettings(true)}
      onMouseLeave={() => setShowDisplaySettings(false)}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={showDisplaySettings}
    >
      <div className="d-flex align-items-center">
        <i className="fas fa-desktop me-2" />
        <span>Display Settings</span>
      </div>
      <i className="fas fa-chevron-right" />

      {showDisplaySettings && (
        <div className={`dropdown-menu show ${calculateSubmenuPosition(350)}`}>
          <div>
            <div className="dropdown-item">
              <div className="mb-2">
                <label className="form-label" htmlFor="vnc-scaling-mode">
                  Scaling Mode
                </label>
                <select
                  className="form-select form-select-sm"
                  id="vnc-scaling-mode"
                  value={getSelectValue()}
                  onChange={handleSelectChange}
                  onClick={e => e.stopPropagation()}
                >
                  <option value="none">None (1:1)</option>
                  <option value="local">Local Scaling</option>
                  <option value="remote">Remote Resizing</option>
                </select>
              </div>
            </div>

            <div className="dropdown-item">
              <div className="mb-4">
                <label className="form-label">Quality Level: {quality}</label>
                <div className="mt-5 mb-5">
                  <input
                    className="hw-range-slider-primary"
                    type="range"
                    min="0"
                    max="9"
                    value={quality}
                    onChange={e => {
                      if (onQualityChange) {
                        onQualityChange(parseInt(e.target.value));
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: `linear-gradient(to right, #007bff 0%, #007bff ${(quality / 9) * 100}%, #ccc ${(quality / 9) * 100}%, #ccc 100%)`,
                    }}
                  />
                </div>
                <div className="form-text mt-2 mb-2">0 = Lowest quality, 9 = Highest quality</div>
              </div>
            </div>

            <div className="dropdown-item">
              <div className="mb-4">
                <label className="form-label">Compression Level: {compression}</label>
                <div className="mt-5 mb-5">
                  <input
                    className="hw-range-slider-info"
                    type="range"
                    min="0"
                    max="9"
                    value={compression}
                    onChange={e => {
                      if (onCompressionChange) {
                        onCompressionChange(parseInt(e.target.value));
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: `linear-gradient(to right, #17a2b8 0%, #17a2b8 ${(compression / 9) * 100}%, #ccc ${(compression / 9) * 100}%, #ccc 100%)`,
                    }}
                  />
                </div>
                <div className="form-text mt-2 mb-2">0 = No compression, 9 = Max compression</div>
              </div>
            </div>

            <div className="dropdown-item">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="vnc-show-dot"
                  checked={showDot}
                  onChange={e => {
                    if (onShowDotChange) {
                      onShowDotChange(e.target.checked);
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                />
                <label className="form-check-label" htmlFor="vnc-show-dot">
                  Show cursor dot when no cursor
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

VncDisplaySettingsSubmenu.propTypes = {
  quality: PropTypes.number,
  compression: PropTypes.number,
  resize: PropTypes.string,
  showDot: PropTypes.bool,
  onQualityChange: PropTypes.func,
  onCompressionChange: PropTypes.func,
  onResizeChange: PropTypes.func,
  onShowDotChange: PropTypes.func,
  calculateSubmenuPosition: PropTypes.func.isRequired,
};

export default VncDisplaySettingsSubmenu;
