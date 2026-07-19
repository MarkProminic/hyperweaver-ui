import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

// Check if a section is orchestration-related
export const isOrchestrationSection = sectionName =>
  sectionName === 'zones' ||
  sectionName.includes('orchestration') ||
  sectionName.includes('zone_management');

/**
 * Zone orchestration control panel — shown above orchestration-related settings
 * sections. Enable/disable/test actions and the priority-group summary.
 */
const AgentSettingsOrchestration = ({
  orchestrationStatus,
  zonePriorities,
  orchestrationLoading,
  onEnable,
  onDisable,
  onTest,
  onRefreshPriorities,
}) => {
  const { t } = useTranslation();
  return (
    <div className="card mb-4 bg-dark text-light">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-layer-group text-info me-2" />
          <span>{t('agentSettings.agentSettingsOrchestration.controlTitle')}</span>
        </h4>

        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="mb-3">
              <p className="form-label small">
                {t('agentSettings.agentSettingsOrchestration.statusLabel')}
              </p>
              <div>
                <span
                  className={`badge ${orchestrationStatus?.orchestration_enabled ? 'text-bg-success' : 'text-bg-secondary'}`}
                >
                  {orchestrationStatus?.orchestration_enabled
                    ? t('agentSettings.agentSettingsOrchestration.enabledStatus')
                    : t('agentSettings.agentSettingsOrchestration.disabledStatus')}
                </span>
                <span className="badge text-bg-info ms-2">
                  {t('agentSettings.agentSettingsOrchestration.controllerLabel', {
                    controller:
                      orchestrationStatus?.controller ||
                      t('agentSettings.agentSettingsOrchestration.unknownValue'),
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={onEnable}
                disabled={orchestrationLoading || orchestrationStatus?.orchestration_enabled}
              >
                <i className="fas fa-play me-2" />
                <span>{t('agentSettings.agentSettingsOrchestration.enableButton')}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={onDisable}
                disabled={orchestrationLoading || !orchestrationStatus?.orchestration_enabled}
              >
                <i className="fas fa-pause me-2" />
                <span>{t('agentSettings.agentSettingsOrchestration.disableButton')}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => onTest()}
                disabled={orchestrationLoading}
              >
                <i className="fas fa-vial me-2" />
                <span>{t('agentSettings.agentSettingsOrchestration.testButton')}</span>
              </button>
            </div>
          </div>
        </div>

        {zonePriorities && (
          <div className="mt-4">
            <p className="form-label small">
              {t('agentSettings.agentSettingsOrchestration.zonePrioritiesLabel')}
            </p>
            <div className="mb-3">
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(zonePriorities.priority_groups || {}).map(
                  ([priority, machines]) => (
                    <span key={priority} className="badge text-bg-light">
                      {t('agentSettings.agentSettingsOrchestration.priorityMachineCount', {
                        priority,
                        count: machines.length,
                      })}
                    </span>
                  )
                )}
              </div>
            </div>
            <p className="form-text text-muted">
              {t('agentSettings.agentSettingsOrchestration.totalMachines', {
                count: zonePriorities.total_machines || 0,
              })}{' '}
              |
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={onRefreshPriorities}
                disabled={orchestrationLoading}
              >
                {t('agentSettings.agentSettingsOrchestration.refreshButton')}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

AgentSettingsOrchestration.propTypes = {
  orchestrationStatus: PropTypes.shape({
    orchestration_enabled: PropTypes.bool,
    controller: PropTypes.string,
  }),
  zonePriorities: PropTypes.shape({
    priority_groups: PropTypes.object,
    total_machines: PropTypes.number,
  }),
  orchestrationLoading: PropTypes.bool,
  onEnable: PropTypes.func.isRequired,
  onDisable: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  onRefreshPriorities: PropTypes.func.isRequired,
};

export default AgentSettingsOrchestration;
