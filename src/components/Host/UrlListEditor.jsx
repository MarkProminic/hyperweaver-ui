import PropTypes from 'prop-types';

const UrlListEditor = ({
  label,
  entries,
  placeholder,
  onEntryChange,
  onAdd,
  onRemove,
  addButtonText,
  addButtonClass,
  addButtonIcon,
}) => (
  <div>
    <span className="form-label">{label}</span>
    {entries.map(entry => (
      <div key={entry.id} className="input-group mb-3">
        <input
          className="form-control"
          type="url"
          placeholder={placeholder}
          value={entry.value}
          onChange={e => onEntryChange(entry.id, e.target.value)}
        />
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => onRemove(entry.id)}
          disabled={entries.length === 1}
        >
          <i className="fas fa-trash" />
        </button>
      </div>
    ))}
    <button type="button" className={`btn btn-sm ${addButtonClass}`} onClick={onAdd}>
      <i className={`fas ${addButtonIcon} me-2`} />
      <span>{addButtonText}</span>
    </button>
  </div>
);

UrlListEditor.propTypes = {
  label: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  placeholder: PropTypes.string.isRequired,
  onEntryChange: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  addButtonText: PropTypes.string.isRequired,
  addButtonClass: PropTypes.string.isRequired,
  addButtonIcon: PropTypes.string.isRequired,
};

export default UrlListEditor;
