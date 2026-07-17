import PropTypes from 'prop-types';

import StepCardList from './ProvisioningStepList';

/**
 * The Hooks tab — SEQUENCE HOOKS only (design B10, ruled 2026-07-16):
 * provisioning.pre[] / provisioning.post[] — steps around the WHOLE
 * provisioning run, each {script, target: host|guest, on_failure:
 * abort|continue, run: always|once}, executed in list order. Host-target
 * hooks ride the agent's host_hooks gate (hyperweaver ON / zoneweaver OFF
 * defaults). pre_tasks/post_tasks are PLAYBOOK-layer keys (the generated-
 * playbook convention) — no dedicated UI surface (Mark's ruling 2026-07-17);
 * the Raw JSON tab is the only place they edit, and documents carrying them
 * ride verbatim.
 */

const HOOK_TARGETS = ['guest', 'host'];
const HOOK_FAILURE = ['abort', 'continue'];
const HOOK_RUN = ['always', 'once'];

const HookTitle = ({ hook }) => (
  <>
    <span className="hw-rc-role">{hook.script || '—'}</span>
    <span className="hw-chip">{hook.target || 'guest'}</span>
    <span className="hw-chip hw-chip-tag">run: {hook.run || 'always'}</span>
    {(hook.on_failure || 'abort') === 'continue' && (
      <span className="hw-chip hw-chip-when">failure: continue</span>
    )}
  </>
);

HookTitle.propTypes = {
  hook: PropTypes.object.isRequired,
};

const HookBody = ({ hook, patch, disabled }) => {
  const uiId = hook._ui_id;
  return (
    <div className="hw-rc-fields">
      <span className="hw-field">
        <label htmlFor={`hook-script-${uiId}`}>script</label>
        <input
          id={`hook-script-${uiId}`}
          className="form-control form-control-sm font-monospace hw-field-wide"
          type="text"
          placeholder="./scripts/snapshot.sh"
          value={hook.script ?? ''}
          disabled={disabled}
          onChange={e => patch({ script: e.target.value })}
        />
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-target-${uiId}`}>target</label>
        <select
          id={`hook-target-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.target ?? 'guest'}
          disabled={disabled}
          onChange={e => patch({ target: e.target.value })}
        >
          {HOOK_TARGETS.map(target => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-failure-${uiId}`}>on failure</label>
        <select
          id={`hook-failure-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.on_failure ?? 'abort'}
          disabled={disabled}
          onChange={e => patch({ on_failure: e.target.value })}
        >
          {HOOK_FAILURE.map(mode => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-run-${uiId}`}>run</label>
        <select
          id={`hook-run-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.run ?? 'always'}
          disabled={disabled}
          onChange={e => patch({ run: e.target.value })}
        >
          {HOOK_RUN.map(mode => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
};

HookBody.propTypes = {
  hook: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ProvisioningHooksTab = ({
  preHooks,
  postHooks,
  onPreChange,
  onPostChange,
  makeRow,
  disabled,
}) => (
  <div>
    <p className="form-text text-muted mt-0 mb-2">
      Sequence hooks run around the WHOLE provisioning run — <strong>pre</strong> before the first
      step, <strong>post</strong> after the last — in list order. <code>target: host</code> runs on
      the agent host and only works where the agent&apos;s <code>host_hooks</code> gate allows it.
    </p>

    <h6 className="fw-bold">Pre hooks</h6>
    <StepCardList
      rows={preHooks}
      onChange={onPreChange}
      disabled={disabled}
      addLabel="Add Pre Hook"
      makeRow={makeRow}
      renderTitle={hook => <HookTitle hook={hook} />}
      renderBody={(hook, patch) => <HookBody hook={hook} patch={patch} disabled={disabled} />}
    />

    <h6 className="fw-bold mt-3">Post hooks</h6>
    <StepCardList
      rows={postHooks}
      onChange={onPostChange}
      disabled={disabled}
      addLabel="Add Post Hook"
      makeRow={makeRow}
      renderTitle={hook => <HookTitle hook={hook} />}
      renderBody={(hook, patch) => <HookBody hook={hook} patch={patch} disabled={disabled} />}
    />
  </div>
);

ProvisioningHooksTab.propTypes = {
  preHooks: PropTypes.array.isRequired,
  postHooks: PropTypes.array.isRequired,
  onPreChange: PropTypes.func.isRequired,
  onPostChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningHooksTab;
