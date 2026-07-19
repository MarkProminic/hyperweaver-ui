import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ConfigTemplates = ({
  configInfo,
  selectedTemplate,
  setSelectedTemplate,
  onLoadTemplate,
  onRefresh,
  loading,
  saving,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">{t('hostTime.timeSyncConfigTemplates.heading')}</h3>

        <div className="d-flex gap-2">
          <select
            className="form-select flex-grow-1"
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
          >
            <option value="">{t('hostTime.timeSyncConfigTemplates.selectPlaceholder')}</option>
            {configInfo?.suggested_defaults?.config_template && (
              <option value="default">
                {t('hostTime.timeSyncConfigTemplates.defaultPoolOption')}
              </option>
            )}
          </select>
          <button
            type="button"
            className="btn btn-info"
            onClick={onLoadTemplate}
            disabled={!selectedTemplate || loading}
          >
            <i className="fas fa-download me-2" />
            <span>{t('hostTime.timeSyncConfigTemplates.loadTemplate')}</span>
          </button>
          <button
            type="button"
            className="btn btn-info"
            onClick={onRefresh}
            disabled={loading || saving}
          >
            {loading ? (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <i className="fas fa-refresh me-2" />
            )}
            <span>{t('hostTime.timeSyncConfigTemplates.refresh')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ConfigTemplates.propTypes = {
  configInfo: PropTypes.object,
  selectedTemplate: PropTypes.string.isRequired,
  setSelectedTemplate: PropTypes.func.isRequired,
  onLoadTemplate: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
};

export default ConfigTemplates;
