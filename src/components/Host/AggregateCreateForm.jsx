import PropTypes from 'prop-types';

/**
 * Form fields for the Aggregate Create modal.
 * Extracted to keep AggregateCreateModal under 500 lines.
 */
const AggregateCreateForm = ({
  formData,
  creating,
  newLink,
  setNewLink,
  availableLinks,
  loadingLinks,
  onInputChange,
  onAddLink,
  onRemoveLink,
  cdpServiceRunning,
}) => (
  <>
    <div className="mb-3">
      <label htmlFor="aggregate-name" className="form-label">
        Aggregate Name *
      </label>
      <input
        id="aggregate-name"
        className="form-control"
        type="text"
        placeholder="e.g., aggr0"
        value={formData.name}
        onChange={e => onInputChange('name', e.target.value)}
        disabled={creating}
        required
      />
      <p className="form-text text-muted">
        Must start with a letter and contain only letters, numbers, and underscores
      </p>
    </div>

    <div className="mb-3">
      <label htmlFor="aggregate-link-select" className="form-label">
        Member Links *
      </label>
      <div className="input-group">
        <select
          id="aggregate-link-select"
          className="form-select"
          value={newLink}
          onChange={e => setNewLink(e.target.value)}
          disabled={creating || loadingLinks}
        >
          <option value="">
            {loadingLinks ? 'Loading physical links...' : 'Select a physical link to add'}
          </option>
          {availableLinks
            .filter(link => !formData.links.includes(link.link))
            .map(link => (
              <option key={link.link} value={link.link}>
                {link.link} ({link.state}, {link.speed || 'Unknown speed'})
              </option>
            ))}
        </select>
        <button
          type="button"
          className="btn btn-info"
          onClick={onAddLink}
          disabled={!newLink.trim() || creating}
        >
          Add Link
        </button>
      </div>

      {formData.links.length > 0 && (
        <div className="mt-3">
          <p>
            <strong>Current Links:</strong>
          </p>
          <div className="d-flex flex-wrap gap-2">
            {formData.links.map(link => (
              <span
                key={link}
                className="badge text-bg-info d-inline-flex align-items-center gap-1"
              >
                {link}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Remove"
                  onClick={() => onRemoveLink(link)}
                  disabled={creating}
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="row g-3">
      <div className="col">
        <div className="mb-3">
          <label htmlFor="aggregate-policy" className="form-label">
            Load Balancing Policy
          </label>
          <select
            id="aggregate-policy"
            className="form-select"
            value={formData.policy}
            onChange={e => onInputChange('policy', e.target.value)}
            disabled={creating}
          >
            <option value="L2">L2 - MAC based</option>
            <option value="L3">L3 - IP based</option>
            <option value="L4">L4 - IP + Port based</option>
            <option value="L2L3">L2L3 - MAC + IP</option>
            <option value="L2L4">L2L4 - MAC + IP + Port</option>
            <option value="L3L4">L3L4 - IP + Port</option>
            <option value="L2L3L4">L2L3L4 - All layers</option>
          </select>
        </div>
      </div>
      <div className="col">
        <div className="mb-3">
          <label htmlFor="aggregate-lacp-mode" className="form-label">
            LACP Mode
          </label>
          <select
            id="aggregate-lacp-mode"
            className="form-select"
            value={formData.lacp_mode}
            onChange={e => onInputChange('lacp_mode', e.target.value)}
            disabled={creating}
          >
            <option value="off">Off</option>
            <option value="active">Active</option>
            <option value="passive">Passive</option>
          </select>
        </div>
      </div>
    </div>

    {formData.lacp_mode !== 'off' && (
      <div className="mb-3">
        <label htmlFor="aggregate-lacp-timer" className="form-label">
          LACP Timer
        </label>
        <select
          id="aggregate-lacp-timer"
          className="form-select"
          value={formData.lacp_timer}
          onChange={e => onInputChange('lacp_timer', e.target.value)}
          disabled={creating}
        >
          <option value="short">Short (1 second)</option>
          <option value="long">Long (30 seconds)</option>
        </select>
      </div>
    )}

    <div className="mb-3">
      <label htmlFor="aggregate-mac" className="form-label">
        MAC Address (Optional)
      </label>
      <input
        id="aggregate-mac"
        className="form-control"
        type="text"
        placeholder="XX:XX:XX:XX:XX:XX"
        value={formData.unicast_address}
        onChange={e => onInputChange('unicast_address', e.target.value)}
        disabled={creating}
      />
      <p className="form-text text-muted">Leave empty to auto-generate</p>
    </div>

    {cdpServiceRunning && (
      <div className="alert alert-warning mb-4">
        <div>
          <p>
            <strong>CDP Service Conflict</strong>
          </p>
          <p>
            The Cisco Discovery Protocol (CDP) service is currently running and must be disabled
            before creating link aggregates.
          </p>

          <div className="mb-3 mt-3">
            <div className="form-check">
              <input
                id="aggregate-disable-cdp"
                className="form-check-input"
                type="checkbox"
                checked={formData.disableCdp}
                onChange={e => onInputChange('disableCdp', e.target.checked)}
                disabled={creating}
              />
              <label className="form-check-label" htmlFor="aggregate-disable-cdp">
                <strong>Disable CDP service before creating aggregate</strong>
              </label>
            </div>
            <p className="form-text text-muted">
              This will stop the CDP service to allow aggregate creation. You can re-enable it later
              from the Services page.
            </p>
          </div>
        </div>
      </div>
    )}

    <div className="mb-3">
      <div className="form-check">
        <input
          id="aggregate-temporary"
          className="form-check-input"
          type="checkbox"
          checked={formData.temporary}
          onChange={e => onInputChange('temporary', e.target.checked)}
          disabled={creating}
        />
        <label className="form-check-label" htmlFor="aggregate-temporary">
          Temporary (not persistent across reboots)
        </label>
      </div>
    </div>
  </>
);

AggregateCreateForm.propTypes = {
  formData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    links: PropTypes.arrayOf(PropTypes.string).isRequired,
    policy: PropTypes.string.isRequired,
    lacp_mode: PropTypes.string.isRequired,
    lacp_timer: PropTypes.string.isRequired,
    unicast_address: PropTypes.string.isRequired,
    temporary: PropTypes.bool.isRequired,
    disableCdp: PropTypes.bool.isRequired,
  }).isRequired,
  creating: PropTypes.bool.isRequired,
  newLink: PropTypes.string.isRequired,
  setNewLink: PropTypes.func.isRequired,
  availableLinks: PropTypes.arrayOf(PropTypes.object).isRequired,
  loadingLinks: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onAddLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  cdpServiceRunning: PropTypes.bool,
};

export default AggregateCreateForm;
