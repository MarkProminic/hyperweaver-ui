import PropTypes from 'prop-types';

/**
 * Provisioner-metadata-driven form fields (sync item 10). The field contract
 * is the shared custom-provisioner format BOTH agents serve verbatim:
 * metadata.configuration.basicFields[]/advancedFields[] entries carry
 * {name, label, type, defaultValue?, …} with type ∈ text | number |
 * checkbox | dropdown — unknown types render as text. Values are keyed by
 * each field's EXACT unprefixed name (basicFields → properties,
 * advancedFields → advanced_properties); the agent-side generator applies
 * them by that same name. metadata.roles[] rows are advisory display
 * metadata: an enabled toggle plus the free-typed installer/fixpack/hotfix
 * file fields (file pickers arrive with the assets/file-cache phase).
 */

// The role files vocabulary (wire keys → labels), grouped for layout.
const ROLE_FILE_GROUPS = [
  [
    ['installer', 'Installer'],
    ['installer_hash', 'Installer SHA-256'],
    ['installer_version', 'Installer Version'],
  ],
  [
    ['fixpack', 'Fixpack'],
    ['fixpack_hash', 'Fixpack SHA-256'],
    ['fixpack_version', 'Fixpack Version'],
  ],
  [
    ['hotfix', 'Hotfix'],
    ['hotfix_hash', 'Hotfix SHA-256'],
    ['hotfix_version', 'Hotfix Version'],
  ],
];

/**
 * Extract a metadata field group ('basicFields' | 'advancedFields') as a
 * clean array — package manifests are author-controlled, so shape-check
 * every entry.
 */
export const configurationFields = (version, group) => {
  const list = version?.metadata?.configuration?.[group];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter(field => field && typeof field === 'object' && field.name);
};

/**
 * Seed the roles editor state from a version's metadata.roles — one row per
 * role, toggles pre-seeded from any defaultEnabled-style hint (advisory).
 */
export const seedRoles = version => {
  const list = version?.metadata?.roles;
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter(role => role && typeof role === 'object' && role.name)
    .map(role => ({
      name: role.name,
      enabled: !!(role.defaultEnabled ?? role.default_enabled ?? role.enabled ?? false),
      files: {},
    }));
};

const MetadataField = ({ field, value, onChange, loading }) => {
  const current = value !== undefined ? value : field.defaultValue;
  const fieldId = `prov-field-${field.name}`;

  if (field.type === 'checkbox') {
    return (
      <div className="col-12 col-md-6">
        <div className="form-check form-switch">
          <input
            id={fieldId}
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={!!current}
            onChange={e => onChange(field.name, e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor={fieldId}>
            {field.label || field.name}
          </label>
        </div>
      </div>
    );
  }

  let input;
  if (field.type === 'dropdown') {
    const options = Array.isArray(field.options) ? field.options : [];
    input = (
      <select
        id={fieldId}
        className="form-select"
        value={current ?? ''}
        onChange={e => onChange(field.name, e.target.value)}
        disabled={loading}
      >
        {options.map(option => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? (option.label ?? option.value) : option;
          return (
            <option key={String(optionValue)} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    );
  } else if (field.type === 'number') {
    input = (
      <input
        id={fieldId}
        className="form-control"
        type="number"
        value={current ?? ''}
        onChange={e => onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
        disabled={loading}
      />
    );
  } else {
    // text and every unknown type
    input = (
      <input
        id={fieldId}
        className="form-control"
        type="text"
        value={current ?? ''}
        onChange={e => onChange(field.name, e.target.value)}
        disabled={loading}
      />
    );
  }

  return (
    <div className="col-12 col-md-6">
      <label className="form-label" htmlFor={fieldId}>
        {field.label || field.name}
      </label>
      {input}
      {field.description && <p className="form-text text-muted mb-0">{field.description}</p>}
    </div>
  );
};

MetadataField.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    type: PropTypes.string,
    defaultValue: PropTypes.any,
    options: PropTypes.array,
    description: PropTypes.string,
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export const MetadataFieldGroup = ({ fields, values, onChange, loading }) => (
  <div className="row g-3">
    {fields.map(field => (
      <MetadataField
        key={field.name}
        field={field}
        value={values[field.name]}
        onChange={onChange}
        loading={loading}
      />
    ))}
  </div>
);

MetadataFieldGroup.propTypes = {
  fields: PropTypes.array.isRequired,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const RoleFileInput = ({ roleName, fileKey, label, value, onChange, loading }) => {
  const inputId = `role-${roleName}-${fileKey}`;
  return (
    <div className="col-12 col-md-4">
      <label className="form-label small mb-1" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="form-control form-control-sm"
        type="text"
        value={value ?? ''}
        onChange={e => onChange(fileKey, e.target.value)}
        disabled={loading}
      />
    </div>
  );
};

RoleFileInput.propTypes = {
  roleName: PropTypes.string.isRequired,
  fileKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export const RolesEditor = ({ roles, onRolesChange, loading }) => {
  const setRole = (index, patch) => {
    onRolesChange(roles.map((role, i) => (i === index ? { ...role, ...patch } : role)));
  };

  if (roles.length === 0) {
    return <p className="text-muted mb-0">This provisioner version declares no roles.</p>;
  }

  return (
    <div className="d-flex flex-column gap-2">
      {roles.map((role, index) => (
        <div key={role.name} className="border rounded p-2">
          <div className="form-check form-switch mb-0">
            <input
              id={`role-enabled-${role.name}`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={role.enabled}
              onChange={e => setRole(index, { enabled: e.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label fw-semibold" htmlFor={`role-enabled-${role.name}`}>
              {role.name}
            </label>
          </div>
          {role.enabled && (
            <div className="mt-2">
              {ROLE_FILE_GROUPS.map(group => (
                <div className="row g-2 mb-1" key={group[0][0]}>
                  {group.map(([fileKey, label]) => (
                    <RoleFileInput
                      key={fileKey}
                      roleName={role.name}
                      fileKey={fileKey}
                      label={label}
                      value={role.files?.[fileKey]}
                      onChange={(key, value) =>
                        setRole(index, { files: { ...role.files, [key]: value } })
                      }
                      loading={loading}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

RolesEditor.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      enabled: PropTypes.bool,
      files: PropTypes.object,
    })
  ).isRequired,
  onRolesChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
