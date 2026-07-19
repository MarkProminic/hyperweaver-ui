import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatBytes } from './arcUtils';

const ArcStatusSection = ({ currentConfig }) => {
  const { t } = useTranslation();
  if (!currentConfig) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-info-circle me-2" />
          <span>{t('hostCharts.arcStatusSection.sectionTitle')}</span>
        </h4>

        <div className="row g-3">
          <div className="col">
            <div className="mb-3">
              <p className="form-label small">
                {t('hostCharts.arcStatusSection.currentArcSizeLabel')}
              </p>
              <p>
                <span className="badge text-bg-info">
                  {formatBytes(currentConfig.current_config?.arc_size_bytes)}
                </span>
              </p>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <p className="form-label small">{t('hostCharts.arcStatusSection.maxArcSizeLabel')}</p>
              <p>
                <span className="badge text-bg-primary">
                  {formatBytes(currentConfig.current_config?.arc_max_bytes)}
                </span>
              </p>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <p className="form-label small">{t('hostCharts.arcStatusSection.minArcSizeLabel')}</p>
              <p>
                <span className="badge text-bg-dark">
                  {formatBytes(currentConfig.current_config?.arc_min_bytes)}
                </span>
              </p>
            </div>
          </div>
          <div className="col">
            <div className="mb-3">
              <p className="form-label small">
                {t('hostCharts.arcStatusSection.physicalMemoryLabel')}
              </p>
              <p>
                <span className="badge text-bg-secondary">
                  {formatBytes(currentConfig.system_constraints?.physical_memory_bytes)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {currentConfig.system_constraints && (
          <div className="alert alert-dark mt-3">
            <h5 className="fs-6 fw-bold mb-2">
              {t('hostCharts.arcStatusSection.systemConstraintsTitle')}
            </h5>
            <div className="small">
              <p>
                <strong>{t('hostCharts.arcStatusSection.maxSafeArcLabel')}:</strong>{' '}
                {formatBytes(currentConfig.system_constraints.max_safe_arc_bytes)}
                (85% of physical memory)
              </p>
              <p>
                <strong>{t('hostCharts.arcStatusSection.minRecommendedLabel')}:</strong>{' '}
                {formatBytes(currentConfig.system_constraints.min_recommended_arc_bytes)}
                (1% of physical memory)
              </p>
              <p>
                <strong>{t('hostCharts.arcStatusSection.configurationSourceLabel')}:</strong>{' '}
                {currentConfig.config_source || 'auto-calculated'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ArcStatusSection.propTypes = {
  currentConfig: PropTypes.object,
};

export default ArcStatusSection;
