import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { computeSliderBackground, formatGbValue, safeBytesToGb, safeParseFloat } from './arcUtils';

const MemoryParametersSection = ({ formData, currentConfig, loading, handleFormChange }) => {
  const { t } = useTranslation();
  const constraints = currentConfig?.system_constraints;

  // ARC Max slider bounds (computed once, used in slider attrs + help text + gradient)
  const arcMaxMin = constraints
    ? Math.max(
        safeParseFloat(formData.arc_min_gb) || 0,
        safeBytesToGb(constraints.min_recommended_arc_bytes)
      ).toFixed(2)
    : '1';
  const arcMaxMax = constraints ? safeBytesToGb(constraints.max_safe_arc_bytes).toFixed(2) : '100';
  const arcMaxValue =
    formData.arc_max_gb ||
    (constraints ? safeBytesToGb(constraints.max_safe_arc_bytes).toFixed(2) : '50');

  // ARC Min slider bounds
  const arcMinMin = constraints
    ? safeBytesToGb(constraints.min_recommended_arc_bytes).toFixed(2)
    : '0.5';
  const maxSafeArc = constraints ? safeBytesToGb(constraints.max_safe_arc_bytes) : 100;
  const arcMinMax = formData.arc_max_gb
    ? Math.min(parseFloat(formData.arc_max_gb), maxSafeArc).toFixed(2)
    : maxSafeArc.toFixed(2);
  const arcMinValue =
    formData.arc_min_gb ||
    (constraints ? safeBytesToGb(constraints.min_recommended_arc_bytes).toFixed(2) : '1');

  return (
    <>
      <h5 className="fs-6 fw-bold mb-3 text-primary">
        <i className="fas fa-memory me-2" />
        <span>{t('hostCharts.memoryParametersSection.sectionTitle')}</span>
      </h5>

      {/* ARC Max / ARC Min */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="mb-4">
            <label className="form-label">
              {t('hostCharts.memoryParametersSection.maximumArcSizeLabel')}:{' '}
              {formatGbValue(formData.arc_max_gb)
                ? `${formatGbValue(formData.arc_max_gb)} GB`
                : 'Auto'}
            </label>
            <div className="mt-4 mb-4">
              <input
                className="form-range hw-range-slider-primary"
                type="range"
                min={arcMaxMin}
                max={arcMaxMax}
                step="0.25"
                value={arcMaxValue}
                onChange={e => handleFormChange('arc_max_gb', e.target.value)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  background: computeSliderBackground(
                    formData.arc_max_gb,
                    parseFloat(arcMaxMin),
                    parseFloat(arcMaxMax),
                    '#007bff'
                  ),
                }}
              />
            </div>
            <div className="form-text text-muted">
              Range: {arcMaxMin} GB to {arcMaxMax} GB
              <br />
              Leave unset for auto-calculation based on system memory.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleFormChange('arc_max_gb', '')}
                disabled={loading}
                title={t('hostCharts.memoryParametersSection.resetToAutoTitle')}
              >
                <i className="fas fa-undo me-2" />
                <span>{t('hostCharts.memoryParametersSection.autoLabel')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="mb-4">
            <label className="form-label">
              {t('hostCharts.memoryParametersSection.minimumArcSizeLabel')}:{' '}
              {formatGbValue(formData.arc_min_gb)
                ? `${formatGbValue(formData.arc_min_gb)} GB`
                : 'Auto'}
            </label>
            <div className="mt-4 mb-4">
              <input
                className="form-range hw-range-slider-info"
                type="range"
                min={arcMinMin}
                max={arcMinMax}
                step="0.25"
                value={arcMinValue}
                onChange={e => handleFormChange('arc_min_gb', e.target.value)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  background: computeSliderBackground(
                    formData.arc_min_gb,
                    parseFloat(arcMinMin),
                    parseFloat(arcMinMax),
                    '#17a2b8'
                  ),
                }}
              />
            </div>
            <div className="form-text text-muted">
              Range: {arcMinMin} GB to {arcMinMax} GB
              <br />
              Leave unset for auto-calculation based on system memory.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleFormChange('arc_min_gb', '')}
                disabled={loading}
                title={t('hostCharts.memoryParametersSection.resetToAutoTitle')}
              >
                <i className="fas fa-undo me-2" />
                <span>{t('hostCharts.memoryParametersSection.autoLabel')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ARC Max Percent / User Reserve Hint */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="mb-4">
            <label className="form-label">
              {t('hostCharts.memoryParametersSection.arcMaxPercentLabel')}:{' '}
              {formData.arc_max_percent
                ? `${formData.arc_max_percent}%`
                : t('hostCharts.memoryParametersSection.autoValue')}
              <span className="badge text-bg-success ms-2">
                {t('hostCharts.memoryParametersSection.dynamicBadge')}
              </span>
            </label>
            <div className="mt-4 mb-4">
              <input
                className="form-range hw-range-slider-primary"
                type="range"
                min="1"
                max="100"
                step="1"
                value={formData.arc_max_percent || '90'}
                onChange={e => handleFormChange('arc_max_percent', e.target.value)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  background: computeSliderBackground(formData.arc_max_percent, 0, 100, '#007bff'),
                }}
              />
            </div>
            <div className="form-text text-muted">
              Alternative to ARC max GB - sets ARC as percentage of physical memory (1-100%).
              <br />
              Takes effect immediately without reboot.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleFormChange('arc_max_percent', '')}
                disabled={loading}
                title={t('hostCharts.memoryParametersSection.resetToAutoTitle')}
              >
                <i className="fas fa-undo me-2" />
                <span>{t('hostCharts.memoryParametersSection.autoLabel')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="mb-4">
            <label className="form-label">
              {t('hostCharts.memoryParametersSection.userReserveHintLabel')}:{' '}
              {formData.user_reserve_hint_pct
                ? `${formData.user_reserve_hint_pct}%`
                : t('hostCharts.memoryParametersSection.noneValue')}
              <span className="badge text-bg-success ms-2">
                {t('hostCharts.memoryParametersSection.dynamicBadge')}
              </span>
            </label>
            <div className="mt-4 mb-4">
              <input
                className="form-range hw-range-slider-info"
                type="range"
                min="0"
                max="99"
                step="1"
                value={formData.user_reserve_hint_pct || '0'}
                onChange={e => handleFormChange('user_reserve_hint_pct', e.target.value)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  background: computeSliderBackground(
                    formData.user_reserve_hint_pct,
                    0,
                    100,
                    '#17a2b8'
                  ),
                }}
              />
            </div>
            <div className="form-text text-muted">
              Memory reserved for applications (0-99%). Alternative to setting ARC max.
              <br />
              Recommended for database servers. Takes effect immediately.
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleFormChange('user_reserve_hint_pct', '')}
                disabled={loading}
                title={t('hostCharts.memoryParametersSection.resetToNoneTitle')}
              >
                <i className="fas fa-undo me-2" />
                <span>{t('hostCharts.memoryParametersSection.noneLabel')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

MemoryParametersSection.propTypes = {
  formData: PropTypes.object.isRequired,
  currentConfig: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default MemoryParametersSection;
