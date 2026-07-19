import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { DismissibleAlert, ResourceIssueList } from '../common';

/** The Settings tab's top status stack: error + resource issues + the
 *  running-machine apply choice + the working spinner. */
const MachineSettingsStatus = ({
  error,
  onDismissError,
  errorDetails = [],
  phase,
  step,
  machineName,
  onRestart,
  onQueue,
  onBack,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {error && <DismissibleAlert variant="alert-danger" text={error} onHide={onDismissError} />}
      {errorDetails.length > 0 && <ResourceIssueList details={errorDetails} />}

      {phase === 'choice' && (
        <div className="alert alert-warning">
          <p className="fw-bold mb-2">
            {t('machine.machineSettingsStatus.runningWarning', { machineName })}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-warning" onClick={onRestart}>
              <i className="fas fa-rotate me-2" />
              {t('machine.machineSettingsStatus.stopApplyStart')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onQueue}>
              {t('machine.machineSettingsStatus.applyNextCycle')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
              {t('machine.machineSettingsStatus.back')}
            </button>
          </div>
        </div>
      )}

      {phase === 'working' && (
        <div className="alert alert-info d-flex align-items-center gap-2">
          <i className="fas fa-spinner fa-spin" />
          <span>{step || t('machine.machineSettingsStatus.working')}</span>
        </div>
      )}
    </>
  );
};

MachineSettingsStatus.propTypes = {
  error: PropTypes.string,
  onDismissError: PropTypes.func.isRequired,
  errorDetails: PropTypes.array,
  phase: PropTypes.string,
  step: PropTypes.string,
  machineName: PropTypes.string,
  onRestart: PropTypes.func.isRequired,
  onQueue: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default MachineSettingsStatus;
