import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { VarRowList, ROLE_NAME_PATTERN, applyPatch } from './ProvisioningVarRows';

/**
 * The Roles tab — Foreman/PatternFly dual-list lineage (Mark's design,
 * mockup-approved 2026-07-13): the package's role catalog on the left
 * (grouped by shipped collection, searchable, collapsible), the machine's
 * ordered execution list on the right. Add by click or by dragging a catalog
 * role to its slot; duplicates are a feature (Ansible runs each entry when
 * its vars differ). Cards edit ONLY that entry — when:/tags, the per-role
 * Ansible keywords (become/become_user/delegate_to/environment — preserved
 * verbatim; they render once the package templates carry them), and free
 * variables with spec autocomplete. Globals live on the Variables tab, never
 * here. depends_on hints from provisioner.yml are advisories, never blocks.
 */

const bareName = name =>
  String(name || '')
    .split('.')
    .pop();

/**
 * Resolve a role entry's argument spec: role_specs keys are BARE names while
 * documents carry FQCNs — match the last segment, and require the collection
 * to agree when the entry is fully qualified.
 */
const specFor = (specs, name) => {
  if (!specs || !name) {
    return null;
  }
  const bare = bareName(name);
  const spec = specs[bare];
  if (!spec) {
    return null;
  }
  if (name.includes('.') && spec.collection && name !== `${spec.collection}.${bare}`) {
    return null;
  }
  return spec;
};

/** depends_on advisories: a hinted dependency absent from the run, or whose
    first occurrence sits below this entry. */
const dependencyWarnings = (roles, hints, index) => {
  const deps = hints?.[bareName(roles[index].name)];
  if (!Array.isArray(deps) || deps.length === 0) {
    return [];
  }
  const warnings = [];
  deps.forEach(dep => {
    const first = roles.findIndex(row => bareName(row.name) === dep);
    if (first === -1) {
      warnings.push({ dep, kind: 'absent' });
    } else if (first > index) {
      warnings.push({ dep, kind: 'below' });
    }
  });
  return warnings;
};

/**
 * The catalog-source picker — the ATTACH (Mark's ruling 2026-07-14): pick a
 * registry package (family + version) and the catalog loads from its role
 * specs; the pick stamps provisioner_name/provisioner_version into the
 * edited document (rides Store). Hosts.yml only ever carried those as header
 * COMMENTS, so legacy documents arrive without them.
 */
const PackagePicker = ({ packages, packageName, packageVersion, disabled, onPicked }) => {
  const { t } = useTranslation();
  const family = packages.find(entry => entry.name === packageName) || null;
  const versions = family?.versions || [];
  const versionKnown = versions.some(entry => entry.version === packageVersion);
  const emptyRegistry = packages.length === 0 && !packageName;
  return (
    <div className="hw-cat-picker">
      <select
        className="form-select form-select-sm"
        aria-label={t('provisioning.provisioningRolesTab.catalogPackageAriaLabel')}
        value={packageName || ''}
        disabled={disabled || emptyRegistry}
        onChange={e => {
          const next = packages.find(entry => entry.name === e.target.value) || null;
          onPicked(next ? next.name : undefined, next ? next.versions?.[0]?.version : undefined);
        }}
      >
        <option value="">
          {emptyRegistry
            ? t('provisioning.provisioningRolesTab.catalogRegistryEmpty')
            : t('provisioning.provisioningRolesTab.catalogNoPackage')}
        </option>
        {packageName && !family && (
          <option value={packageName}>
            {t('provisioning.provisioningRolesTab.packageNotInRegistry', { packageName })}
          </option>
        )}
        {packages.map(entry => (
          <option key={entry.name} value={entry.name}>
            {entry.metadata?.label || entry.name}
          </option>
        ))}
      </select>
      {family && (
        <select
          className="form-select form-select-sm w-auto"
          aria-label={t('provisioning.provisioningRolesTab.catalogVersionAriaLabel')}
          value={packageVersion || ''}
          disabled={disabled}
          onChange={e => onPicked(packageName, e.target.value)}
        >
          {packageVersion && !versionKnown && (
            <option value={packageVersion}>
              {t('provisioning.provisioningRolesTab.versionNotInRegistry', { packageVersion })}
            </option>
          )}
          {versions.map(entry => (
            <option key={entry.dir || entry.version} value={entry.version}>
              {entry.version}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

PackagePicker.propTypes = {
  packages: PropTypes.array.isRequired,
  packageName: PropTypes.string,
  packageVersion: PropTypes.string,
  disabled: PropTypes.bool,
  onPicked: PropTypes.func.isRequired,
};

/** The catalog pane: collections → roles, searchable, click or drag to add. */
const RoleCatalog = ({ specs, disabled, onAdd, onDragNew }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const groups = {};
  Object.entries(specs).forEach(([bare, spec]) => {
    const matches =
      query === '' ||
      bare.includes(query.toLowerCase()) ||
      String(spec.short_description || '')
        .toLowerCase()
        .includes(query.toLowerCase());
    if (!matches) {
      return;
    }
    const collection = spec.collection || 'no collection';
    (groups[collection] = groups[collection] || []).push(bare);
  });

  const toggleGroup = collection =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(collection)) {
        next.delete(collection);
      } else {
        next.add(collection);
      }
      return next;
    });

  const catalogItem = bare => {
    const spec = specs[bare];
    const name = spec.collection ? `${spec.collection}.${bare}` : bare;
    return (
      <div
        key={bare}
        className="hw-cat-item"
        role="button"
        tabIndex={0}
        draggable={!disabled}
        onClick={() => onAdd(name)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAdd(name);
          }
        }}
        onDragStart={() => onDragNew(name)}
        onDragEnd={() => onDragNew(null)}
      >
        <div className="hw-cat-text">
          <div className="hw-cat-name">{bare}</div>
          <div className="hw-cat-desc">{spec.short_description || ''}</div>
        </div>
        <span className="hw-cat-add" title={t('provisioning.provisioningRolesTab.addToRunTitle')}>
          <i className="fas fa-plus" />
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="hw-cat-search">
        <input
          className="form-control form-control-sm"
          type="search"
          placeholder={t('provisioning.provisioningRolesTab.searchRolesPlaceholder')}
          aria-label={t('provisioning.provisioningRolesTab.searchRolesAriaLabel')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="hw-cat-scroll">
        {Object.keys(groups)
          .sort()
          .map(collection => {
            const open = query !== '' || !collapsed.has(collection);
            return (
              <div key={collection}>
                <button
                  type="button"
                  className="hw-cat-group"
                  aria-expanded={open}
                  onClick={() => toggleGroup(collection)}
                >
                  <i className="fas fa-chevron-down" />
                  <span>{collection}</span>
                  <span className="hw-cat-count">{groups[collection].length}</span>
                </button>
                {open && groups[collection].sort().map(catalogItem)}
              </div>
            );
          })}
      </div>
    </>
  );
};

RoleCatalog.propTypes = {
  specs: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onDragNew: PropTypes.func.isRequired,
};

/** The collapsed head's glance chips. */
const RoleChips = ({ role }) => {
  const { t } = useTranslation();
  const varCount = Object.keys(role.vars || {}).length;
  const envCount = Object.keys(role.environment || {}).length;
  const becomeChip = () => {
    if (!role.become) {
      return t('provisioning.provisioningRolesTab.becomeNoChip');
    }
    return role.become_user
      ? t('provisioning.provisioningRolesTab.becomeUserChip', { user: role.become_user })
      : t('provisioning.provisioningRolesTab.becomeChip');
  };
  return (
    <>
      {role.tags && (
        <span className="hw-chip hw-chip-tag">
          {t('provisioning.provisioningRolesTab.tagsChip', { tags: String(role.tags) })}
        </span>
      )}
      {role.when && (
        <span className="hw-chip hw-chip-when">
          {t('provisioning.provisioningRolesTab.whenChip', { when: String(role.when) })}
        </span>
      )}
      {varCount > 0 && (
        <span className="hw-chip hw-chip-vars">
          {t('provisioning.provisioningRolesTab.varCountChip', { count: varCount })}
        </span>
      )}
      {role.become !== undefined && <span className="hw-chip">{becomeChip()}</span>}
      {envCount > 0 && (
        <span className="hw-chip">
          {t('provisioning.provisioningRolesTab.envCountChip', { count: envCount })}
        </span>
      )}
    </>
  );
};

RoleChips.propTypes = {
  role: PropTypes.object.isRequired,
};

/** The per-role Ansible keyword fields (become / as user / delegate to) —
    preserved verbatim in the document; the package templates decide what
    renders into the generated playbook. */
const RoleKeywordFields = ({ role, uiId, disabled, onPatch }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="hw-field">
        <label htmlFor={`role-become-${uiId}`}>
          {t('provisioning.provisioningRolesTab.becomeLabel')}
        </label>
        <select
          id={`role-become-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={role.become === undefined ? '' : String(role.become)}
          disabled={disabled}
          onChange={e =>
            onPatch({ become: e.target.value === '' ? undefined : e.target.value === 'true' })
          }
        >
          <option value="">{t('provisioning.provisioningRolesTab.notSetOption')}</option>
          <option value="true">{t('provisioning.provisioningRolesTab.yesOption')}</option>
          <option value="false">{t('provisioning.provisioningRolesTab.noOption')}</option>
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`role-become-user-${uiId}`}>
          {t('provisioning.provisioningRolesTab.asUserLabel')}
        </label>
        <input
          id={`role-become-user-${uiId}`}
          className="form-control form-control-sm hw-field-short"
          type="text"
          placeholder={t('provisioning.provisioningRolesTab.asUserPlaceholder')}
          value={role.become_user ?? ''}
          disabled={disabled}
          onChange={e =>
            onPatch({ become_user: e.target.value === '' ? undefined : e.target.value })
          }
        />
      </span>
      <span className="hw-field">
        <label htmlFor={`role-delegate-${uiId}`}>
          {t('provisioning.provisioningRolesTab.delegateToLabel')}
        </label>
        <input
          id={`role-delegate-${uiId}`}
          className="form-control form-control-sm hw-field-short"
          type="text"
          placeholder={t('provisioning.provisioningRolesTab.delegateToPlaceholder')}
          value={role.delegate_to ?? ''}
          disabled={disabled}
          onChange={e =>
            onPatch({ delegate_to: e.target.value === '' ? undefined : e.target.value })
          }
        />
      </span>
    </>
  );
};

RoleKeywordFields.propTypes = {
  role: PropTypes.object.isRequired,
  uiId: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

/** One expanded card body: description, when/tags/keywords, vars, environment. */
const RoleCardBody = ({ role, spec, disabled, onPatch }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-rc-body">
      {spec?.short_description && <p className="hw-rc-desc">{spec.short_description}</p>}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`role-tags-${role._ui_id}`}>
            {t('provisioning.provisioningRolesTab.tagsLabel')}
          </label>
          <input
            id={`role-tags-${role._ui_id}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder="—"
            value={role.tags ?? ''}
            disabled={disabled}
            onChange={e => onPatch({ tags: e.target.value === '' ? undefined : e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`role-when-${role._ui_id}`}>
            {t('provisioning.provisioningRolesTab.whenLabel')}
          </label>
          <input
            id={`role-when-${role._ui_id}`}
            className="form-control form-control-sm font-monospace hw-field-when"
            type="text"
            placeholder={t('provisioning.provisioningRolesTab.whenPlaceholder')}
            value={role.when ?? ''}
            disabled={disabled}
            onChange={e => onPatch({ when: e.target.value === '' ? undefined : e.target.value })}
          />
        </span>
        <RoleKeywordFields role={role} uiId={role._ui_id} disabled={disabled} onPatch={onPatch} />
      </div>
      <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.variablesHeading')}</div>
      <VarRowList
        idPrefix={`role-${role._ui_id}`}
        entries={role.vars || {}}
        specOptions={spec?.options || null}
        disabled={disabled}
        addLabel={t('provisioning.provisioningRolesTab.addVariable')}
        onChange={next => onPatch({ vars: Object.keys(next).length > 0 ? next : undefined })}
      />
      <div className="hw-rc-sub">{t('provisioning.provisioningRolesTab.environmentHeading')}</div>
      <VarRowList
        idPrefix={`role-env-${role._ui_id}`}
        entries={role.environment || {}}
        specOptions={null}
        disabled={disabled}
        addLabel={t('provisioning.provisioningRolesTab.addEnvVar')}
        onChange={next => onPatch({ environment: Object.keys(next).length > 0 ? next : undefined })}
      />
    </div>
  );
};

RoleCardBody.propTypes = {
  role: PropTypes.object.isRequired,
  spec: PropTypes.object,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const ProvisioningRolesTab = ({
  roles,
  specs,
  hints,
  disabled,
  onChange,
  makeRow,
  packages,
  packageName,
  packageVersion,
  onPackagePicked,
}) => {
  // Drag state: {kind: 'move', id} reorders live; {kind: 'new', name} inserts
  // a catalog role at the drop target.
  const { t } = useTranslation();
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = uiId =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(uiId)) {
        next.delete(uiId);
      } else {
        next.add(uiId);
      }
      return next;
    });

  const moveOver = overId => {
    if (!drag || drag.kind !== 'move' || drag.id === overId) {
      return;
    }
    const from = roles.findIndex(row => row._ui_id === drag.id);
    const to = roles.findIndex(row => row._ui_id === overId);
    if (from === -1 || to === -1) {
      return;
    }
    const next = [...roles];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const insertAt = (name, index) => {
    const next = [...roles];
    next.splice(index, 0, makeRow(name));
    onChange(next);
  };

  const patchRole = (uiId, patch) =>
    onChange(roles.map(row => (row._ui_id === uiId ? applyPatch(row, patch) : row)));

  const hasCatalog = specs && Object.keys(specs).length > 0;

  return (
    <div className="hw-prov-grid">
      <div>
        <p className="hw-prov-pane-title">
          {t('provisioning.provisioningRolesTab.availableRolesHeading')}
        </p>
        <div className="hw-prov-catalog">
          {(packages !== null || packageName) && (
            <PackagePicker
              packages={packages || []}
              packageName={packageName}
              packageVersion={packageVersion}
              disabled={disabled}
              onPicked={onPackagePicked}
            />
          )}
          {hasCatalog ? (
            <RoleCatalog
              specs={specs}
              disabled={disabled}
              onAdd={name => insertAt(name, roles.length)}
              onDragNew={name => {
                setDrag(name ? { kind: 'new', name } : null);
                setDropTarget(null);
              }}
            />
          ) : (
            <p className="hw-cat-empty">
              {packages === null
                ? t('provisioning.provisioningRolesTab.noCatalogNoRegistry')
                : t('provisioning.provisioningRolesTab.noCatalogPickPackage')}
            </p>
          )}
          <CustomRoleAdd disabled={disabled} onAdd={name => insertAt(name, roles.length)} />
        </div>
      </div>

      <div>
        <p className="hw-prov-pane-title">
          {t('provisioning.provisioningRolesTab.executionOrderHeading', { count: roles.length })}
        </p>
        <p className="form-text text-muted mt-0 mb-2">
          {t('provisioning.provisioningRolesTab.executionOrderIntro1')}{' '}
          <code>allow_duplicates</code>{' '}
          {t('provisioning.provisioningRolesTab.executionOrderIntro2')}
        </p>
        <div className="d-flex flex-column gap-2" role="list">
          {roles.map((role, index) => {
            const spec = specFor(specs, role.name);
            const warnings = dependencyWarnings(roles, hints, index);
            const isExpanded = expanded.has(role._ui_id);
            return (
              <div
                key={role._ui_id}
                className={`hw-role-card ${drag?.kind === 'move' && drag.id === role._ui_id ? 'hw-dragging' : ''} ${dropTarget === role._ui_id ? 'hw-drop-target' : ''}`}
                role="listitem"
                onDragOver={e => {
                  e.preventDefault();
                  if (drag?.kind === 'new') {
                    setDropTarget(role._ui_id);
                  } else {
                    moveOver(role._ui_id);
                  }
                }}
                onDragLeave={() => {
                  if (dropTarget === role._ui_id) {
                    setDropTarget(null);
                  }
                }}
                onDrop={e => {
                  if (drag?.kind !== 'new') {
                    return;
                  }
                  e.preventDefault();
                  insertAt(drag.name, index);
                  setDrag(null);
                  setDropTarget(null);
                }}
              >
                <div className="hw-rc-head">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted"
                    draggable={!disabled}
                    style={{ cursor: 'grab' }}
                    title={t('provisioning.provisioningRolesTab.dragToReorder')}
                    onDragStart={() => setDrag({ kind: 'move', id: role._ui_id })}
                    onDragEnd={() => setDrag(null)}
                  >
                    <i className="fas fa-grip-vertical" />
                  </button>
                  <span className="hw-run-num">{index + 1}</span>
                  <RoleCardName
                    role={role}
                    spec={spec}
                    disabled={disabled}
                    onPatch={patch => patchRole(role._ui_id, patch)}
                  />
                  <div className="hw-rc-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      title={t('provisioning.provisioningRolesTab.duplicateTitle')}
                      disabled={disabled}
                      onClick={() => {
                        const next = [...roles];
                        next.splice(index + 1, 0, makeRow(null, role));
                        onChange(next);
                      }}
                    >
                      <i className="fas fa-clone" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary hw-expander"
                      title={t('provisioning.provisioningRolesTab.detailsTitle')}
                      aria-expanded={isExpanded}
                      disabled={disabled}
                      onClick={() => toggleExpanded(role._ui_id)}
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      aria-label={t('provisioning.provisioningRolesTab.removeFromRun')}
                      title={t('provisioning.provisioningRolesTab.removeFromRun')}
                      disabled={disabled}
                      onClick={() => onChange(roles.filter(row => row._ui_id !== role._ui_id))}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
                {warnings.map(warning => (
                  <div className="hw-dep-warning" key={warning.dep}>
                    <i className="fas fa-triangle-exclamation me-1" />
                    {t('provisioning.provisioningRolesTab.needsDependency')}{' '}
                    <code>{warning.dep}</code>{' '}
                    {warning.kind === 'absent'
                      ? t('provisioning.provisioningRolesTab.dependencyAbsent')
                      : t('provisioning.provisioningRolesTab.dependencyBelow')}
                  </div>
                ))}
                {isExpanded && (
                  <RoleCardBody
                    role={role}
                    spec={spec}
                    disabled={disabled}
                    onPatch={patch => patchRole(role._ui_id, patch)}
                  />
                )}
              </div>
            );
          })}
          {drag?.kind === 'new' && (
            <div
              className="hw-drop-endzone"
              role="listitem"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                insertAt(drag.name, roles.length);
                setDrag(null);
                setDropTarget(null);
              }}
            >
              {t('provisioning.provisioningRolesTab.dropHereToAdd')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ProvisioningRolesTab.propTypes = {
  roles: PropTypes.array.isRequired,
  specs: PropTypes.object,
  hints: PropTypes.object,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  // makeRow(name, copyFrom?) — the editor owns row identity (_ui_id tagging).
  makeRow: PropTypes.func.isRequired,
  // The registry list + the document's attached package (the catalog
  // source). null = the registry surface didn't answer on this host.
  packages: PropTypes.array,
  packageName: PropTypes.string,
  packageVersion: PropTypes.string,
  onPackagePicked: PropTypes.func.isRequired,
};

/** Catalog-known entries show the bare name + collection; unknown ones edit
    free-typed with role-name validation. */
const RoleCardName = ({ role, spec, disabled, onPatch }) => {
  const { t } = useTranslation();
  if (spec) {
    return (
      <div className="hw-rc-name">
        <span className="hw-rc-role">{bareName(role.name)}</span>
        <span className="hw-rc-coll">{spec.collection}</span>
        <RoleChips role={role} />
      </div>
    );
  }
  const name = role.name ?? '';
  const badName = name.trim() !== '' && !ROLE_NAME_PATTERN.test(name.trim());
  return (
    <div className="hw-rc-name">
      <input
        className={`form-control form-control-sm font-monospace hw-rc-name-input ${badName ? 'is-invalid' : ''}`}
        type="text"
        placeholder="namespace.collection.role"
        aria-label={t('provisioning.provisioningRolesTab.roleNameAriaLabel')}
        value={name}
        disabled={disabled}
        onChange={e => onPatch({ name: e.target.value })}
      />
      <RoleChips role={role} />
      {badName && (
        <div className="hw-invalid-msg w-100">
          {t('provisioning.provisioningRolesTab.roleNameRule')}
        </div>
      )}
    </div>
  );
};

RoleCardName.propTypes = {
  role: PropTypes.object.isRequired,
  spec: PropTypes.object,
  disabled: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

/** Free-typed add for specless packages and out-of-catalog roles. */
const CustomRoleAdd = ({ disabled, onAdd }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const add = () => {
    onAdd(name.trim());
    setName('');
  };
  return (
    <div className="hw-cat-custom">
      <input
        className="form-control form-control-sm font-monospace"
        type="text"
        placeholder="namespace.collection.role"
        aria-label={t('provisioning.provisioningRolesTab.customRoleNameAriaLabel')}
        value={name}
        disabled={disabled}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={disabled}
        onClick={add}
      >
        <i className="fas fa-plus me-1" />
        {t('provisioning.provisioningRolesTab.addButton')}
      </button>
    </div>
  );
};

CustomRoleAdd.propTypes = {
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
};

export default ProvisioningRolesTab;
