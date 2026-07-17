import PropTypes from 'prop-types';

import { LinesField } from './ProvisioningVarRows';

/**
 * The Scripts tab — provisioning.shell verbatim: {enabled, scripts[]}.
 * Scripts are ARBITRARY package-relative paths (any script type,
 * interpreter by extension/shebang), one task child per script in LIST
 * ORDER. WHEN they run = where the `shell:` key sits among the
 * document's provisioning methods — the document prescribes the whole
 * run, there are no phases (Mark's ruling 2026-07-17). Agents gate on
 * enabled AND a non-empty list.
 */
const ProvisioningScriptsTab = ({ shell, onChange, disabled }) => {
  const scripts = Array.isArray(shell?.scripts) ? shell.scripts : [];
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        Shell scripts run top to bottom (one line per script, package-relative paths like{' '}
        <code>./scripts/aliases.sh</code>), in the position <code>shell</code> holds among this
        document&apos;s provisioning methods. Any script type; the shebang decides the interpreter.
        Document <code>vars</code> reach scripts as environment variables under their exact names.
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
      {/* Keyed off the stored list so Discard Edits remounts the draft —
          the blur-commit editor must never re-commit discarded text. */}
      <LinesField
        key={`scripts:${scripts.join('\n')}`}
        id="prov-shell-scripts"
        label="Scripts (one per line, run order)"
        lines={scripts}
        disabled={disabled}
        placeholder={'./scripts/aliases.sh\n./scripts/motd.sh'}
        onCommit={list => onChange({ ...(shell || {}), scripts: list || [] })}
      />
    </div>
  );
};

ProvisioningScriptsTab.propTypes = {
  shell: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningScriptsTab;
