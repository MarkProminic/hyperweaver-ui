import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getProvisioners, createMachine, modifyMachine } from '../../api/provisioningAPI';
import { resourceLabel } from '../../utils/resourceLabel';
import { FormModal } from '../common';

import {
  configurationFields,
  seedRoles,
  MetadataFieldGroup,
  RolesEditor,
} from './ProvisionerFormFields';

/**
 * Machine create/modify wizard (sync item 10) — provisioner-driven, BOTH
 * agents: rendered wherever the `machine-create` + `provisioning` tokens are
 * advertised (the caller gates), never keyed to a hypervisor. The form is
 * built from the selected provisioner version's own metadata (roles +
 * basicFields/advancedFields), so hypervisor divergence lives in the
 * package, not here. Create posts {name} + spec; modify (editMachine set)
 * PUTs the replacement spec and surfaces the requires_restart answer.
 */

// The shared settings vocabulary rendered as first-class fields. Everything
// else already present in an edited spec's settings is preserved untouched.
const BASE_SETTINGS = [
  { key: 'hostname', label: 'Hostname', required: true },
  { key: 'domain', label: 'Domain' },
  { key: 'server_id', label: 'Server ID (blank = auto)' },
  { key: 'vcpus', label: 'vCPUs', type: 'number' },
  { key: 'memory', label: 'Memory (MB)', type: 'number' },
  { key: 'box', label: 'Base Box' },
];

const emptySettings = () => Object.fromEntries(BASE_SETTINGS.map(field => [field.key, '']));

/** Merge metadata-declared roles with an edited spec's role rows (spec wins). */
const mergeRoles = (metadataRoles, specRoles) => {
  const bySpec = new Map((specRoles || []).map(role => [role.name, role]));
  const merged = metadataRoles.map(role => {
    const existing = bySpec.get(role.name);
    bySpec.delete(role.name);
    return existing ? { ...role, ...existing, files: { ...existing.files } } : role;
  });
  // Spec roles the metadata no longer declares still render (data-driven).
  bySpec.forEach(role => merged.push({ ...role, files: { ...role.files } }));
  return merged;
};

const MachineCreateModal = ({ isOpen, onClose, currentServer, editMachine, onCompleted }) => {
  const [provisioners, setProvisioners] = useState([]);
  const [familyName, setFamilyName] = useState('');
  const [versionKey, setVersionKey] = useState('');
  const [name, setName] = useState('');
  const [settings, setSettings] = useState(emptySettings);
  const [extraSettings, setExtraSettings] = useState({});
  const [networks, setNetworks] = useState([]);
  const [roles, setRoles] = useState([]);
  const [properties, setProperties] = useState({});
  const [advancedProperties, setAdvancedProperties] = useState({});
  const [syncMethod, setSyncMethod] = useState('rsync');
  const [safeIdPath, setSafeIdPath] = useState('');
  const [startAfterCreate, setStartAfterCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editMachine;
  const editSpec = editMachine?.machine_info?.spec || null;
  const singular = resourceLabel(currentServer, { plural: false });

  const family = useMemo(
    () => provisioners.find(collection => collection.name === familyName) || null,
    [provisioners, familyName]
  );
  const version = useMemo(
    () => family?.versions?.find(v => v.version === versionKey || v.dir === versionKey) || null,
    [family, versionKey]
  );

  const basicFields = useMemo(() => configurationFields(version, 'basicFields'), [version]);
  const advancedFields = useMemo(() => configurationFields(version, 'advancedFields'), [version]);

  // Seed the form from scratch (create) or from the machine's stored spec
  // (modify — unknown settings keys are preserved for the round-trip).
  const seedForm = useCallback(() => {
    setError('');
    if (!editSpec) {
      setFamilyName('');
      setVersionKey('');
      setName('');
      setSettings(emptySettings());
      setExtraSettings({});
      setNetworks([]);
      setRoles([]);
      setProperties({});
      setAdvancedProperties({});
      setSyncMethod('rsync');
      setSafeIdPath('');
      setStartAfterCreate(false);
      setShowAdvanced(false);
      return;
    }
    const specSettings = editSpec.settings || {};
    const base = emptySettings();
    const extra = {};
    Object.entries(specSettings).forEach(([key, value]) => {
      if (key in base) {
        base[key] = value ?? '';
      } else {
        extra[key] = value;
      }
    });
    setFamilyName(editSpec.provisioner?.name || '');
    setVersionKey(editSpec.provisioner?.version || '');
    setName(editMachine.machine_info?.name || '');
    setSettings(base);
    setExtraSettings(extra);
    setNetworks(Array.isArray(editSpec.networks) ? editSpec.networks : []);
    setRoles(Array.isArray(editSpec.roles) ? editSpec.roles : []);
    setProperties(editSpec.properties || {});
    setAdvancedProperties(editSpec.advanced_properties || {});
    setSyncMethod(editSpec.sync_method || 'rsync');
    setSafeIdPath(editSpec.safe_id_path || '');
    setStartAfterCreate(false);
    setShowAdvanced(Object.keys(editSpec.advanced_properties || {}).length > 0);
  }, [editSpec, editMachine]);

  useEffect(() => {
    if (!isOpen || !currentServer) {
      return;
    }
    seedForm();
    getProvisioners(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        if (result.success) {
          setProvisioners(result.data?.provisioners || []);
        } else {
          setError(`Failed to load provisioners: ${result.message}`);
        }
      }
    );
  }, [isOpen, currentServer, seedForm]);

  // A (re)selected version seeds the roles editor from its metadata; in edit
  // mode the stored spec's role rows win over the metadata defaults.
  const handleVersionChange = value => {
    setVersionKey(value);
    const nextVersion = family?.versions?.find(v => v.version === value || v.dir === value) || null;
    const metadataRoles = seedRoles(nextVersion);
    setRoles(isEdit ? mergeRoles(metadataRoles, editSpec?.roles) : metadataRoles);
  };

  const handleFamilyChange = value => {
    setFamilyName(value);
    setVersionKey('');
    setRoles([]);
  };

  const buildSpec = () => {
    const mergedSettings = { ...extraSettings };
    BASE_SETTINGS.forEach(({ key }) => {
      const value = settings[key];
      if (value !== '' && value !== undefined && value !== null) {
        mergedSettings[key] = value;
      }
    });
    return {
      provisioner: { name: familyName, version: version?.version || versionKey },
      settings: mergedSettings,
      networks,
      roles,
      properties,
      advanced_properties: advancedProperties,
      sync_method: syncMethod,
      safe_id_path: safeIdPath,
      start_after_create: isEdit ? false : startAfterCreate,
    };
  };

  const handleSubmit = async () => {
    if (!currentServer || !familyName || !versionKey) {
      setError('Select a provisioner and version first.');
      return;
    }
    if (!isEdit && !name.trim()) {
      setError(`A ${singular.toLowerCase()} name is required.`);
      return;
    }
    if (!settings.hostname) {
      setError('A hostname is required.');
      return;
    }
    setLoading(true);
    setError('');
    const spec = buildSpec();
    const result = isEdit
      ? await modifyMachine(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          editMachine.machine_info.name,
          spec
        )
      : await createMachine(currentServer.hostname, currentServer.port, currentServer.protocol, {
          name: name.trim(),
          ...spec,
        });
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onCompleted({
      message: result.data?.message || (isEdit ? 'Configuration updated' : 'Created'),
      machineName: result.data?.machine_name || (isEdit ? editMachine.machine_info.name : name),
      taskId: result.data?.task_id || null,
      requiresRestart: !!result.data?.requires_restart,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEdit ? `Modify ${singular}: ${editMachine?.machine_info?.name}` : `New ${singular}`}
      icon={isEdit ? 'fas fa-pen-to-square' : 'fas fa-plus'}
      submitText={isEdit ? 'Save Configuration' : 'Create'}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3 mb-3">
        {!isEdit && (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="machine-create-name">
              Name
            </label>
            <input
              id="machine-create-name"
              className="form-control"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        )}
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-create-provisioner">
            Provisioner
          </label>
          <select
            id="machine-create-provisioner"
            className="form-select"
            value={familyName}
            onChange={e => handleFamilyChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Select…</option>
            {provisioners.map(collection => (
              <option key={collection.name} value={collection.name}>
                {/* metadata.label = optional display name (sync convention,
                    2026-07-06); the slug `name` stays the wire identity. */}
                {collection.metadata?.label || collection.name}
                {collection.valid ? '' : ' (invalid)'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-create-version">
            Version
          </label>
          <select
            id="machine-create-version"
            className="form-select"
            value={versionKey}
            onChange={e => handleVersionChange(e.target.value)}
            disabled={loading || !family}
          >
            <option value="">Select…</option>
            {(family?.versions || []).map(v => (
              <option key={v.dir} value={v.version}>
                {v.version}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isEdit && !version && familyName && (
        <div className="alert alert-warning py-2">
          Provisioner {familyName}/{versionKey} is not in this host&apos;s registry — role and field
          metadata cannot render, but the stored values below still save.
        </div>
      )}
      {version?.description && <p className="form-text text-muted">{version.description}</p>}

      <h6 className="fw-bold mt-2">Settings</h6>
      <div className="row g-3 mb-3">
        {BASE_SETTINGS.map(field => (
          <div className="col-12 col-md-4" key={field.key}>
            <label className="form-label" htmlFor={`machine-setting-${field.key}`}>
              {field.label}
            </label>
            <input
              id={`machine-setting-${field.key}`}
              className="form-control"
              type={field.type || 'text'}
              value={settings[field.key] ?? ''}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  [field.key]:
                    field.type === 'number' && e.target.value !== ''
                      ? Number(e.target.value)
                      : e.target.value,
                }))
              }
              disabled={loading}
              required={field.required}
            />
          </div>
        ))}
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="machine-setting-sync-method">
            Sync Method
          </label>
          <select
            id="machine-setting-sync-method"
            className="form-select"
            value={syncMethod}
            onChange={e => setSyncMethod(e.target.value)}
            disabled={loading}
          >
            <option value="rsync">rsync</option>
            <option value="scp">scp</option>
          </select>
        </div>
        <div className="col-12 col-md-8">
          <label className="form-label" htmlFor="machine-setting-safe-id">
            Safe ID Path (file on the agent host)
          </label>
          <input
            id="machine-setting-safe-id"
            className="form-control"
            type="text"
            value={safeIdPath}
            onChange={e => setSafeIdPath(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {version && basicFields.length > 0 && (
        <>
          <h6 className="fw-bold">Configuration</h6>
          <div className="mb-3">
            <MetadataFieldGroup
              fields={basicFields}
              values={properties}
              onChange={(key, value) => setProperties(prev => ({ ...prev, [key]: value }))}
              loading={loading}
            />
          </div>
        </>
      )}

      {version && advancedFields.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mb-2"
            onClick={() => setShowAdvanced(prev => !prev)}
          >
            <i className={`fas fa-angle-${showAdvanced ? 'down' : 'right'} me-2`} />
            Advanced Configuration
          </button>
          {showAdvanced && (
            <MetadataFieldGroup
              fields={advancedFields}
              values={advancedProperties}
              onChange={(key, value) => setAdvancedProperties(prev => ({ ...prev, [key]: value }))}
              loading={loading}
            />
          )}
        </div>
      )}

      {(version || roles.length > 0) && (
        <>
          <h6 className="fw-bold">Roles</h6>
          <div className="mb-3">
            <RolesEditor roles={roles} onRolesChange={setRoles} loading={loading} />
          </div>
        </>
      )}

      {!isEdit && (
        <div className="form-check form-switch">
          <input
            id="machine-create-start-after"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={startAfterCreate}
            onChange={e => setStartAfterCreate(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="machine-create-start-after">
            Start (and provision) after create
          </label>
        </div>
      )}
    </FormModal>
  );
};

MachineCreateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  editMachine: PropTypes.object,
  onCompleted: PropTypes.func.isRequired,
};

export default MachineCreateModal;
