import PropTypes from 'prop-types';
import { useState } from 'react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import StepCardList from './ProvisioningStepList';

/**
 * The Hooks tab — two different things that both wrap the run:
 *
 * 1. SEQUENCE HOOKS (design B10, ruled 2026-07-16): provisioning.pre[] /
 *    provisioning.post[] — steps around the WHOLE provisioning run, each
 *    {script, target: host|guest, on_failure: abort|continue, run:
 *    always|once}, executed in list order. Host-target hooks ride the
 *    agent's host_hooks gate (hyperweaver ON / zoneweaver OFF defaults).
 * 2. pre_tasks / post_tasks — ansible TASK blocks inside the generated
 *    playbook (the old Hosts.rb contract), document-level keys, edited as
 *    YAML lists.
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

/**
 * A YAML editor over an ansible TASK LIST (pre_tasks/post_tasks) — edits
 * locally, commits on blur ONLY when the text parses to a list (empty
 * unsets the key). The same refuse-to-save-garbage rule as the vars editor.
 */
const TaskListYaml = ({ id, label, tasks, onCommit, disabled }) => {
  const [draft, setDraft] = useState(() =>
    Array.isArray(tasks) && tasks.length > 0 ? stringifyYaml(tasks) : ''
  );
  const [invalid, setInvalid] = useState(false);
  const parses = value => {
    if (value.trim() === '') {
      return true;
    }
    try {
      return Array.isArray(parseYaml(value));
    } catch {
      return false;
    }
  };
  return (
    <div className="mb-3">
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`form-control form-control-sm font-monospace hw-yaml-edit ${invalid ? 'is-invalid' : ''}`}
        rows={5}
        value={draft}
        spellCheck={false}
        disabled={disabled}
        placeholder={'- name: Wait for something\n  ansible.builtin.wait_for:\n    port: 22'}
        onChange={e => {
          setDraft(e.target.value);
          setInvalid(!parses(e.target.value));
        }}
        onBlur={() => {
          if (!parses(draft)) {
            return;
          }
          onCommit(draft.trim() === '' ? undefined : parseYaml(draft));
        }}
      />
      {invalid && (
        <div className="hw-invalid-msg">
          Not a valid YAML LIST of tasks — the value is not saved until it parses.
        </div>
      )}
    </div>
  );
};

TaskListYaml.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  tasks: PropTypes.array,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ProvisioningHooksTab = ({
  preHooks,
  postHooks,
  onPreChange,
  onPostChange,
  preTasks,
  postTasks,
  onPreTasksChange,
  onPostTasksChange,
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

    <h6 className="fw-bold mt-4">Ansible pre/post tasks</h6>
    <p className="form-text text-muted mt-0 mb-2">
      Task blocks inside the generated playbook (the old <code>pre_tasks</code>/
      <code>post_tasks</code> contract) — YAML lists, run by ansible itself, not by the hooks
      machinery above.
    </p>
    {/* Keyed off the stored lists so Discard Edits remounts the drafts —
        blur-commit editors must never re-commit discarded YAML. */}
    <TaskListYaml
      key={`pre:${JSON.stringify(preTasks ?? null)}`}
      id="prov-pre-tasks"
      label="pre_tasks (YAML list)"
      tasks={preTasks}
      onCommit={onPreTasksChange}
      disabled={disabled}
    />
    <TaskListYaml
      key={`post:${JSON.stringify(postTasks ?? null)}`}
      id="prov-post-tasks"
      label="post_tasks (YAML list)"
      tasks={postTasks}
      onCommit={onPostTasksChange}
      disabled={disabled}
    />
  </div>
);

ProvisioningHooksTab.propTypes = {
  preHooks: PropTypes.array.isRequired,
  postHooks: PropTypes.array.isRequired,
  onPreChange: PropTypes.func.isRequired,
  onPostChange: PropTypes.func.isRequired,
  preTasks: PropTypes.array,
  postTasks: PropTypes.array,
  onPreTasksChange: PropTypes.func.isRequired,
  onPostTasksChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningHooksTab;
