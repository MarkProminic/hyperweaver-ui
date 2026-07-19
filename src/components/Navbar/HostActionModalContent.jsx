import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const hostActionOptionsPropType = PropTypes.shape({
  restartType: PropTypes.string.isRequired,
  powerType: PropTypes.string.isRequired,
  gracePeriod: PropTypes.number.isRequired,
  message: PropTypes.string.isRequired,
  bootEnvironment: PropTypes.string.isRequired,
}).isRequired;

export const HostRestartOptions = ({ hostActionOptions, setHostActionOptions }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-3">
        <label className="form-label" htmlFor="restart-type">
          {t('navbar.hostRestartOptions.restartType')}
        </label>
        <select
          id="restart-type"
          className="form-select"
          value={hostActionOptions.restartType}
          onChange={e =>
            setHostActionOptions(prev => ({
              ...prev,
              restartType: e.target.value,
            }))
          }
        >
          <option value="standard">{t('navbar.hostRestartOptions.standardRestart')}</option>
          <option value="fast">{t('navbar.hostRestartOptions.fastReboot')}</option>
        </select>
        <p className="form-text">{t('navbar.hostRestartOptions.fastRebootNote')}</p>
      </div>

      {hostActionOptions.restartType === 'fast' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="restart-boot-env">
            {t('navbar.hostRestartOptions.bootEnvironment')}
          </label>
          <input
            id="restart-boot-env"
            className="form-control"
            type="text"
            placeholder={t('navbar.hostRestartOptions.bootEnvironmentPlaceholder')}
            value={hostActionOptions.bootEnvironment}
            onChange={e =>
              setHostActionOptions(prev => ({
                ...prev,
                bootEnvironment: e.target.value,
              }))
            }
          />
          <p className="form-text">{t('navbar.hostRestartOptions.bootEnvironmentNote')}</p>
        </div>
      )}

      {hostActionOptions.restartType === 'standard' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="restart-grace-period">
            {t('navbar.hostRestartOptions.gracePeriod')}
          </label>
          <input
            id="restart-grace-period"
            className="form-control"
            type="number"
            min="0"
            max="7200"
            value={hostActionOptions.gracePeriod}
            onChange={e =>
              setHostActionOptions(prev => ({
                ...prev,
                gracePeriod: parseInt(e.target.value) || 60,
              }))
            }
          />
          <p className="form-text">{t('navbar.hostRestartOptions.gracePeriodNote')}</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="restart-message">
          {t('navbar.hostRestartOptions.message')}
        </label>
        <input
          id="restart-message"
          className="form-control"
          type="text"
          placeholder={t('navbar.hostRestartOptions.messagePlaceholder')}
          maxLength="200"
          value={hostActionOptions.message}
          onChange={e =>
            setHostActionOptions(prev => ({
              ...prev,
              message: e.target.value,
            }))
          }
        />
        <p className="form-text">{t('navbar.hostRestartOptions.messageNote')}</p>
      </div>
    </div>
  );
};

HostRestartOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
};

export const HostShutdownOptions = ({ hostActionOptions, setHostActionOptions }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-3">
        <label className="form-label" htmlFor="shutdown-type">
          {t('navbar.hostShutdownOptions.shutdownType')}
        </label>
        <select
          id="shutdown-type"
          className="form-select"
          value={hostActionOptions.powerType}
          onChange={e =>
            setHostActionOptions(prev => ({
              ...prev,
              powerType: e.target.value,
            }))
          }
        >
          <option value="shutdown">{t('navbar.hostShutdownOptions.shutdown')}</option>
          <option value="poweroff">{t('navbar.hostShutdownOptions.powerOff')}</option>
          <option value="halt">{t('navbar.hostShutdownOptions.emergencyHalt')}</option>
        </select>
        <p className="form-text">
          {hostActionOptions.powerType === 'shutdown' &&
            t('navbar.hostShutdownOptions.shutdownNote')}
          {hostActionOptions.powerType === 'poweroff' &&
            t('navbar.hostShutdownOptions.powerOffNote')}
          {hostActionOptions.powerType === 'halt' &&
            t('navbar.hostShutdownOptions.emergencyHaltNote')}
        </p>
      </div>

      {hostActionOptions.powerType !== 'halt' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="shutdown-grace-period">
            {t('navbar.hostShutdownOptions.gracePeriod')}
          </label>
          <input
            id="shutdown-grace-period"
            className="form-control"
            type="number"
            min="0"
            max="7200"
            value={hostActionOptions.gracePeriod}
            onChange={e =>
              setHostActionOptions(prev => ({
                ...prev,
                gracePeriod: parseInt(e.target.value) || 60,
              }))
            }
          />
          <p className="form-text">{t('navbar.hostShutdownOptions.gracePeriodNote')}</p>
        </div>
      )}

      {hostActionOptions.powerType !== 'halt' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="shutdown-message">
            {t('navbar.hostShutdownOptions.message')}
          </label>
          <input
            id="shutdown-message"
            className="form-control"
            type="text"
            placeholder={t('navbar.hostShutdownOptions.messagePlaceholder')}
            maxLength="200"
            value={hostActionOptions.message}
            onChange={e =>
              setHostActionOptions(prev => ({
                ...prev,
                message: e.target.value,
              }))
            }
          />
          <p className="form-text">{t('navbar.hostShutdownOptions.messageNote')}</p>
        </div>
      )}
    </div>
  );
};

HostShutdownOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
};
