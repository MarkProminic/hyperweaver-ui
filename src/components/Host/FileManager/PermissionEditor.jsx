import PropTypes from 'prop-types';

const PERMISSION_CATEGORIES = [
  { key: 'owner', label: 'Owner' },
  { key: 'group', label: 'Group' },
  { key: 'other', label: 'Other' },
];

const PERMISSION_TYPES = ['read', 'write', 'execute'];

const PERMISSION_PRESETS = [
  {
    mode: '644',
    label: '644 (rw-r--r--)',
    permissions: {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    },
  },
  {
    mode: '755',
    label: '755 (rwxr-xr-x)',
    permissions: {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    },
  },
  {
    mode: '600',
    label: '600 (rw-------)',
    permissions: {
      owner: { read: true, write: true, execute: false },
      group: { read: false, write: false, execute: false },
      other: { read: false, write: false, execute: false },
    },
  },
];

/**
 * Permission Editor Component
 * Renders permission checkbox table, octal mode editor, and quick presets
 */
const PermissionEditor = ({
  permissions,
  onPermissionChange,
  useCustomMode,
  setUseCustomMode,
  customMode,
  currentOctal,
  onCustomModeChange,
  originalOctal,
  setPermissions,
}) => (
  <div className="col">
    <h5 className="h6">Permissions</h5>

    {/* Permission checkboxes */}
    <div className="mb-3">
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr>
              <th />
              <th>Read</th>
              <th>Write</th>
              <th>Execute</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map(({ key, label }) => (
              <tr key={key}>
                <td>
                  <strong>{label}</strong>
                </td>
                {PERMISSION_TYPES.map(perm => (
                  <td key={perm}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={permissions[key][perm]}
                      onChange={e => onPermissionChange(key, perm, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Octal mode display/editor */}
    <div className="mb-3">
      <div className="form-check mb-2">
        <input
          id="file-props-use-custom-mode"
          type="checkbox"
          className="form-check-input"
          checked={useCustomMode}
          onChange={e => setUseCustomMode(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="file-props-use-custom-mode">
          Use custom octal mode
        </label>
      </div>
      <div>
        <input
          id="file-props-octal"
          className="form-control"
          type="text"
          value={useCustomMode ? customMode : currentOctal}
          onChange={e => onCustomModeChange(e.target.value)}
          placeholder="644"
          disabled={!useCustomMode}
          pattern="[0-7]{3,4}"
        />
      </div>
      <p className="form-text text-muted">
        Current calculated: {currentOctal} | Original: {originalOctal || 'Unknown'}
      </p>
    </div>

    {/* Common permission presets */}
    <div className="mb-3">
      <span className="form-label" aria-hidden="true">
        Quick Presets
      </span>
      <div className="d-flex gap-2">
        {PERMISSION_PRESETS.map(preset => (
          <button
            key={preset.mode}
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setPermissions(preset.permissions);
              setUseCustomMode(false);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

PermissionEditor.propTypes = {
  permissions: PropTypes.object.isRequired,
  onPermissionChange: PropTypes.func.isRequired,
  useCustomMode: PropTypes.bool.isRequired,
  setUseCustomMode: PropTypes.func.isRequired,
  customMode: PropTypes.string.isRequired,
  currentOctal: PropTypes.string.isRequired,
  onCustomModeChange: PropTypes.func.isRequired,
  originalOctal: PropTypes.string,
  setPermissions: PropTypes.func.isRequired,
};

export default PermissionEditor;
