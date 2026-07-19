import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        <span>{t('console.vncDisplaySettingsSubmenu.displaySettings')}</span>
      </div>
      <i className="fas fa-chevron-right" />

      {showDisplaySettings && (
        <div className={`dropdown-menu show ${calculateSubmenuPosition(350)}`}>
          <div>
            <div className="dropdown-item">
              <div className="mb-2">
                <label className="form-label" htmlFor="vnc-scaling-mode">
                  {t('console.vncDisplaySettingsSubmenu.scalingMode')}
                </label>
                <select
                  className="form-select form-select-sm"
                  id="vnc-scaling-mode"
                  value={getSelectValue()}
                  onChange={handleSelectChange}
                  onClick={e => e.stopPropagation()}
                >
                  <option value="none">{t('console.vncDisplaySettingsSubmenu.scalingNone')}</option>
                  <option value="local">
                    {t('console.vncDisplaySettingsSubmenu.scalingLocal')}
                  </option>
                  <option value="remote">
                    {t('console.vncDisplaySettingsSubmenu.scalingRemote')}
                  </option>
                </select>
              </div>
            </div>

            <div className="dropdown-item">
              <div className="mb-4">
                <label className="form-label">
                  {t('console.vncDisplaySettingsSubmenu.qualityLevel', { value: quality })}
                </label>
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
                <div className="form-text mt-2 mb-2">
                  {t('console.vncDisplaySettingsSubmenu.qualityHint')}
                </div>
              </div>
            </div>

            <div className="dropdown-item">
              <div className="mb-4">
                <label className="form-label">
                  {t('console.vncDisplaySettingsSubmenu.compressionLevel', { value: compression })}
                </label>
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
                <div className="form-text mt-2 mb-2">
                  {t('console.vncDisplaySettingsSubmenu.compressionHint')}
                </div>
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
                  {t('console.vncDisplaySettingsSubmenu.showCursorDot')}
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
