import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const getPermissionCategories = t => [
  { key: 'owner', label: t('hostTools.PermissionEditor.ownerLabel') },
  { key: 'group', label: t('hostTools.PermissionEditor.groupLabel') },
  { key: 'other', label: t('hostTools.PermissionEditor.otherLabel') },
];

const PERMISSION_TYPES = ['read', 'write', 'execute'];

const getPermissionPresets = t => [
  {
    mode: '644',
    label: t('hostTools.PermissionEditor.preset644'),
    permissions: {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: true, write: false, execute: false },
    },
  },
  {
    mode: '755',
    label: t('hostTools.PermissionEditor.preset755'),
    permissions: {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    },
  },
  {
    mode: '600',
    label: t('hostTools.PermissionEditor.preset600'),
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
}) => {
  const { t } = useTranslation();
  const PERMISSION_CATEGORIES = getPermissionCategories(t);
  const PERMISSION_PRESETS = getPermissionPresets(t);

  return (
    <div className="col">
      <h5 className="h6">{t('hostTools.PermissionEditor.permissionsHeading')}</h5>

      {/* Permission checkboxes */}
      <div className="mb-3">
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th />
                <th>{t('hostTools.PermissionEditor.readHeader')}</th>
                <th>{t('hostTools.PermissionEditor.writeHeader')}</th>
                <th>{t('hostTools.PermissionEditor.executeHeader')}</th>
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
            {t('hostTools.PermissionEditor.useCustomOctalLabel')}
          </label>
        </div>
        <div>
          <input
            id="file-props-octal"
            className="form-control"
            type="text"
            value={useCustomMode ? customMode : currentOctal}
            onChange={e => onCustomModeChange(e.target.value)}
            placeholder={t('hostTools.PermissionEditor.octalPlaceholder')}
            disabled={!useCustomMode}
            pattern="[0-7]{3,4}"
          />
        </div>
        <p className="form-text text-muted">
          {t('hostTools.PermissionEditor.octalHelp', {
            currentOctal,
            originalOctal: originalOctal || 'Unknown',
          })}
        </p>
      </div>

      {/* Common permission presets */}
      <div className="mb-3">
        <span className="form-label" aria-hidden="true">
          {t('hostTools.PermissionEditor.quickPresetsLabel')}
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
};

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
