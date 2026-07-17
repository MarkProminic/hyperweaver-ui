import PropTypes from 'prop-types';

import StepCardList from './ProvisioningStepList';

/**
 * The Scripts tab — provisioning.shell verbatim: {enabled, scripts[]}.
 * One card per script entry, same drag-to-reorder treatment as Playbooks —
 * array order IS run order. On the WIRE each entry is a bare
 * package-relative path string (any script type, interpreter by shebang);
 * the row objects exist only in editor state (the editor unwraps them back
 * to strings). A bare string entry runs on EVERY walk (Q3 ruling); WHEN the
 * method runs = where the `shell:` key sits among the document's
 * provisioning methods.
 */

const ScriptTitle = ({ row }) => (
  <>
    <span className="hw-rc-role font-monospace">{row.script || '—'}</span>
    <span className="hw-chip hw-chip-tag">runs every walk</span>
  </>
);

ScriptTitle.propTypes = {
  row: PropTypes.object.isRequired,
};

const ScriptBody = ({ row, patch, disabled }) => (
  <div className="hw-rc-fields">
    <span className="hw-field">
      <label htmlFor={`script-path-${row._ui_id}`}>script</label>
      <input
        id={`script-path-${row._ui_id}`}
        className="form-control form-control-sm font-monospace hw-field-wide"
        type="text"
        placeholder="./scripts/aliases.sh"
        value={row.script ?? ''}
        disabled={disabled}
        onChange={e => patch({ script: e.target.value })}
      />
    </span>
  </div>
);

ScriptBody.propTypes = {
  row: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ProvisioningScriptsTab = ({ shell, onChange, makeRow, disabled }) => {
  const scripts = Array.isArray(shell?.scripts) ? shell.scripts : [];
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        Shell scripts run top to bottom — drag to reorder. Paths are package-relative (like{' '}
        <code>./scripts/aliases.sh</code>); any script type, the shebang decides the interpreter;
        each entry runs on every walk. WHEN they run is where <code>shell</code> sits among this
        document&apos;s provisioning methods. Document <code>vars</code> reach scripts as
        environment variables under their exact names.
      </p>
      <div className="form-check form-switch mb-2">
        <input
          id="prov-shell-enabled"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={shell?.enabled === true || shell?.enabled === 'true'}
          disabled={disabled}
          onChange={e => onChange({ ...(shell || {}), enabled: e.target.checked })}
        />
        <label className="form-check-label" htmlFor="prov-shell-enabled">
          Enabled
        </label>
      </div>
      <StepCardList
        rows={scripts}
        onChange={next => onChange({ ...(shell || {}), scripts: next })}
        disabled={disabled}
        addLabel="Add Script"
        makeRow={makeRow}
        renderTitle={row => <ScriptTitle row={row} />}
        renderBody={(row, patch) => <ScriptBody row={row} patch={patch} disabled={disabled} />}
      />
    </div>
  );
};

ProvisioningScriptsTab.propTypes = {
  shell: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningScriptsTab;
