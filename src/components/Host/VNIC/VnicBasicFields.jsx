import PropTypes from 'prop-types';

const VnicBasicFields = ({ name, link, availableLinks, loadingLinks, onChange, disabled }) => (
  <div className="row">
    <div className="col">
      <div className="mb-3">
        <label className="form-label" htmlFor="vnic-create-name">
          VNIC Name *
        </label>
        <input
          id="vnic-create-name"
          className="form-control"
          type="text"
          placeholder="Auto-generated based on link"
          value={name}
          onChange={e => onChange('name', e.target.value)}
          disabled={disabled}
          required
        />
        <p className="form-text text-muted">
          Auto-generated when you select a link. Must start with a letter.
        </p>
      </div>
    </div>
    <div className="col">
      <div className="mb-3">
        <label className="form-label" htmlFor="vnic-create-link">
          Physical Link *
        </label>
        <select
          id="vnic-create-link"
          className="form-select"
          value={link}
          onChange={e => onChange('link', e.target.value)}
          disabled={disabled || loadingLinks}
          required
        >
          <option value="">
            {loadingLinks ? 'Loading available links...' : 'Select a link to attach VNIC to'}
          </option>
          {availableLinks.map(l => (
            <option key={l.name} value={l.name}>
              {l.name} ({l.type}, {l.state}, {l.speed})
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

VnicBasicFields.propTypes = {
  name: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  availableLinks: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      state: PropTypes.string,
      speed: PropTypes.string,
    })
  ).isRequired,
  loadingLinks: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default VnicBasicFields;
