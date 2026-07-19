import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { computeSliderBackground } from './arcUtils';

const PerformanceSection = ({ formData, loading, handleFormChange }) => {
  const { t } = useTranslation();

  return (
    <>
      <hr />
      <h5 className="fs-6 fw-bold mb-3 text-info">
        <i className="fas fa-tachometer-alt me-2" />
        <span>{t('hostCharts.performanceSection.sectionTitle')}</span>
      </h5>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="mb-4">
            <label className="form-label">
              {t('hostCharts.performanceSection.vdevMaxPendingLabel')}:{' '}
              {formData.vdev_max_pending
                ? formData.vdev_max_pending
                : t('hostCharts.performanceSection.autoValue')}
              <span className="badge text-bg-success ms-2">
                {t('hostCharts.performanceSection.dynamicBadge')}
              </span>
            </label>
            <div className="mt-4 mb-4">
              <input
                className="form-range hw-range-slider-primary"
                type="range"
                min="1"
                max="100"
                step="1"
                value={formData.vdev_max_pending || '10'}
                onChange={e => handleFormChange('vdev_max_pending', e.target.value)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
                style={{
                  background: computeSliderBackground(formData.vdev_max_pending, 0, 100, '#007bff'),
                }}
              />
            </div>
            <div className="form-text text-muted">
              Max concurrent I/Os per device (1-100). Higher values for storage arrays.
              <br />
              Typical: 10 (default), 35-50 (high-performance storage).
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleFormChange('vdev_max_pending', '')}
                disabled={loading}
                title={t('hostCharts.performanceSection.resetToDefaultTitle')}
              >
                <i className="fas fa-undo me-2" />
                <span>{t('hostCharts.performanceSection.defaultLabel')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <p className="form-label">
              {t('hostCharts.performanceSection.zfsPrefetchingLabel')}
              <span className="badge text-bg-success ms-2">
                {t('hostCharts.performanceSection.dynamicBadge')}
              </span>
            </p>
            <div className="form-check">
              <input
                id="prefetch-enable"
                className="form-check-input"
                type="checkbox"
                checked={!formData.prefetch_disable}
                onChange={e => handleFormChange('prefetch_disable', !e.target.checked)}
                disabled={loading}
                onClick={e => e.stopPropagation()}
              />
              <label className="form-check-label" htmlFor="prefetch-enable">
                {t('hostCharts.performanceSection.enablePrefetchingLabel')}
              </label>
            </div>
            <div className="form-text text-muted mt-2">
              Prefetching improves sequential read performance by predicting future reads.
              <br />
              Keep enabled for most workloads. Disable only for specific use cases.
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <label className="form-label" htmlFor="apply-method">
              {t('hostCharts.performanceSection.applyMethodLabel')}
            </label>
            <select
              id="apply-method"
              className="form-select"
              value={formData.apply_method}
              onChange={e => handleFormChange('apply_method', e.target.value)}
              disabled={loading}
            >
              <option value="runtime">
                {t('hostCharts.performanceSection.runtimeOnlyOption')}
              </option>
              <option value="persistent">
                {t('hostCharts.performanceSection.persistentOnlyOption')}
              </option>
              <option value="both">{t('hostCharts.performanceSection.bothOption')}</option>
            </select>
            <p className="form-text text-muted">Choose how to apply the changes.</p>
          </div>
        </div>
        <div className="col-12 col-lg-6">{/* Empty column for layout balance */}</div>
      </div>
    </>
  );
};

PerformanceSection.propTypes = {
  formData: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  handleFormChange: PropTypes.func.isRequired,
};

export default PerformanceSection;
