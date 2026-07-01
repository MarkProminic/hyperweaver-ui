import PropTypes from 'prop-types';

const hostActionOptionsPropType = PropTypes.shape({
  restartType: PropTypes.string.isRequired,
  powerType: PropTypes.string.isRequired,
  gracePeriod: PropTypes.number.isRequired,
  message: PropTypes.string.isRequired,
  bootEnvironment: PropTypes.string.isRequired,
}).isRequired;

export const HostRestartOptions = ({ hostActionOptions, setHostActionOptions }) => (
  <div>
    <div className="mb-3">
      <label className="form-label" htmlFor="restart-type">
        Restart Type
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
        <option value="standard">Standard Restart</option>
        <option value="fast">Fast Reboot (x86 only)</option>
      </select>
      <p className="form-text">
        Fast reboot only works on x86 systems and skips firmware initialization
      </p>
    </div>

    {hostActionOptions.restartType === 'fast' && (
      <div className="mb-3">
        <label className="form-label" htmlFor="restart-boot-env">
          Boot Environment (Optional)
        </label>
        <input
          id="restart-boot-env"
          className="form-control"
          type="text"
          placeholder="Leave empty for current BE"
          value={hostActionOptions.bootEnvironment}
          onChange={e =>
            setHostActionOptions(prev => ({
              ...prev,
              bootEnvironment: e.target.value,
            }))
          }
        />
        <p className="form-text">Specify boot environment name to use after reboot</p>
      </div>
    )}

    {hostActionOptions.restartType === 'standard' && (
      <div className="mb-3">
        <label className="form-label" htmlFor="restart-grace-period">
          Grace Period (seconds)
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
        <p className="form-text">Delay before restart (0-7200 seconds)</p>
      </div>
    )}

    <div className="mb-3">
      <label className="form-label" htmlFor="restart-message">
        Message (Optional)
      </label>
      <input
        id="restart-message"
        className="form-control"
        type="text"
        placeholder="Custom restart message"
        maxLength="200"
        value={hostActionOptions.message}
        onChange={e =>
          setHostActionOptions(prev => ({
            ...prev,
            message: e.target.value,
          }))
        }
      />
      <p className="form-text">Optional message for system logs (max 200 characters)</p>
    </div>
  </div>
);

HostRestartOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
};

export const HostShutdownOptions = ({ hostActionOptions, setHostActionOptions }) => (
  <div>
    <div className="mb-3">
      <label className="form-label" htmlFor="shutdown-type">
        Shutdown Type
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
        <option value="shutdown">Shutdown (to single-user mode)</option>
        <option value="poweroff">Power Off (complete shutdown)</option>
        <option value="halt">Emergency Halt (immediate)</option>
      </select>
      <p className="form-text">
        {hostActionOptions.powerType === 'shutdown' && 'Graceful shutdown to single-user mode'}
        {hostActionOptions.powerType === 'poweroff' &&
          'Complete power off - requires manual restart'}
        {hostActionOptions.powerType === 'halt' && 'Emergency halt - immediate, no grace period'}
      </p>
    </div>

    {hostActionOptions.powerType !== 'halt' && (
      <div className="mb-3">
        <label className="form-label" htmlFor="shutdown-grace-period">
          Grace Period (seconds)
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
        <p className="form-text">Delay before shutdown (0-7200 seconds)</p>
      </div>
    )}

    {hostActionOptions.powerType !== 'halt' && (
      <div className="mb-3">
        <label className="form-label" htmlFor="shutdown-message">
          Message (Optional)
        </label>
        <input
          id="shutdown-message"
          className="form-control"
          type="text"
          placeholder="Custom shutdown message"
          maxLength="200"
          value={hostActionOptions.message}
          onChange={e =>
            setHostActionOptions(prev => ({
              ...prev,
              message: e.target.value,
            }))
          }
        />
        <p className="form-text">Optional message for system logs (max 200 characters)</p>
      </div>
    )}
  </div>
);

HostShutdownOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
};
