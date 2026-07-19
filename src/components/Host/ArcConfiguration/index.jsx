import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../common/ConfirmModal';

import ArcStatusSection from './ArcStatusSection';
import { getValidationColor } from './arcUtils';
import HelpSection from './HelpSection';
import MemoryParametersSection from './MemoryParametersSection';
import PerformanceSection from './PerformanceSection';
import { useArcConfig } from './useArcConfig';

const ArcConfiguration = ({ server }) => {
  const { t } = useTranslation();
  const {
    currentConfig,
    formData,
    validation,
    loading,
    validationLoading,
    message,
    setMessage,
    messageType,
    handleFormChange,
    validateConfiguration,
    applyConfiguration,
    showResetConfirm,
    requestResetToDefaults,
    cancelReset,
    confirmResetToDefaults,
  } = useArcConfig(server);

  if (loading && !currentConfig) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <span className="spinner-border" role="status" aria-hidden="true" />
          <p className="mt-3">{t('hostCharts.arcConfiguration.loadingMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Status Messages */}
      {message && (
        <div className={`alert ${messageType} mb-4`}>
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
          <p>{message}</p>
        </div>
      )}

      {/* Current Status */}
      <ArcStatusSection currentConfig={currentConfig} />

      {/* Configuration Form */}
      <div className="card">
        <div className="card-body">
          <h4 className="fs-6 fw-bold mb-4">
            <i className="fas fa-cog me-2" />
            <span>{t('hostCharts.arcConfiguration.configurationTitle')}</span>
          </h4>

          <MemoryParametersSection
            formData={formData}
            currentConfig={currentConfig}
            loading={loading}
            handleFormChange={handleFormChange}
          />

          <PerformanceSection
            formData={formData}
            loading={loading}
            handleFormChange={handleFormChange}
          />

          {/* Validation Results */}
          {validation && (
            <div
              className={`alert alert-${getValidationColor(validation.errors, validation.warnings)} mt-4`}
            >
              <h5 className="fs-6 fw-bold">
                {t('hostCharts.arcConfiguration.validationResultsTitle')}
              </h5>

              {validation.errors && validation.errors.length > 0 && (
                <div>
                  <p className="fw-semibold text-danger">
                    {t('hostCharts.arcConfiguration.errorsLabel')}:
                  </p>
                  <ul>
                    {validation.errors.map(error => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings && validation.warnings.length > 0 && (
                <div>
                  <p className="fw-semibold text-warning">
                    {t('hostCharts.arcConfiguration.warningsLabel')}:
                  </p>
                  <ul>
                    {validation.warnings.map(warning => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.proposed_settings && (
                <div>
                  <p className="fw-semibold">
                    {t('hostCharts.arcConfiguration.proposedSettingsLabel')}:
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {validation.proposed_settings.arc_max_gb && (
                      <span className="badge text-bg-info">
                        Max: {validation.proposed_settings.arc_max_gb} GB
                      </span>
                    )}
                    {validation.proposed_settings.arc_min_gb && (
                      <span className="badge text-bg-info">
                        Min: {validation.proposed_settings.arc_min_gb} GB
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-2 mt-4">
            <button
              type="button"
              className="btn btn-info"
              onClick={validateConfiguration}
              disabled={loading || validationLoading}
            >
              {validationLoading && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              <i className="fas fa-check-circle me-2" />
              <span>{t('hostCharts.arcConfiguration.validateButtonLabel')}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={applyConfiguration}
              disabled={loading || validationLoading}
            >
              {loading && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              <i className="fas fa-save me-2" />
              <span>{t('hostCharts.arcConfiguration.applyButtonLabel')}</span>
            </button>

            <button
              type="button"
              className="btn btn-warning"
              onClick={requestResetToDefaults}
              disabled={loading || validationLoading}
            >
              {loading && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
              )}
              <i className="fas fa-undo me-2" />
              <span>{t('hostCharts.arcConfiguration.resetButtonLabel')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <HelpSection />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={cancelReset}
        onConfirm={confirmResetToDefaults}
        title={t('hostCharts.arcConfiguration.resetConfirmTitle')}
        message={t('hostCharts.arcConfiguration.resetConfirmMessage')}
        confirmText={t('hostCharts.arcConfiguration.resetConfirmButtonLabel')}
        confirmVariant="warning"
        loading={loading}
      />
    </div>
  );
};

ArcConfiguration.propTypes = {
  server: PropTypes.object,
};

export default ArcConfiguration;
