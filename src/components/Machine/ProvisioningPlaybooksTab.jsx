import PropTypes from 'prop-types';

import StepCardList from './ProvisioningStepList';
import { LinesField, OptionalBoolSelect } from './ProvisioningVarRows';

/**
 * The Playbooks tab — the first playbook group's local[] and remote[] lists,
 * one card per entry, same treatment as Roles (Mark's parity ask 2026-07-14):
 * the fields that used to hide in Raw JSON (collections/remote_collections/
 * install_mode/interpreter/config_file/callbacks…) edit structured. Unknown
 * keys survive untouched. Execution order IS the render order: the group's
 * local[] top to bottom, then its remote[] top to bottom. Drag reorders
 * within a list only; the "runs" selector is the sole way an entry crosses
 * lists, and it lands at the END of the other list.
 */

const RUN_MODES = ['always', 'once', 'not_first'];

const PlaybookTitle = ({ playbook }) => {
  const collections = Array.isArray(playbook.collections) ? playbook.collections.length : 0;
  return (
    <>
      <span className="hw-rc-role">{playbook.playbook || '—'}</span>
      <span className="hw-chip hw-chip-tag">run: {playbook.run || 'once'}</span>
      {collections > 0 && (
        <span className="hw-chip">
          {collections} collection{collections > 1 ? 's' : ''}
          {playbook.remote_collections === true ? ' (galaxy)' : ''}
        </span>
      )}
      {playbook.install_mode && <span className="hw-chip">{playbook.install_mode}</span>}
    </>
  );
};

PlaybookTitle.propTypes = {
  playbook: PropTypes.object.isRequired,
};

const PlaybookBody = ({ playbook, patch, disabled, pathListId, placement, onPlacementChange }) => {
  const uiId = playbook._ui_id;
  const text = (key, value) => patch({ [key]: value === '' ? undefined : value });
  return (
    <>
      {playbook.description && <p className="hw-rc-desc">{playbook.description}</p>}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-path-${uiId}`}>playbook</label>
          <input
            id={`playbook-path-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            list={pathListId}
            value={playbook.playbook ?? ''}
            disabled={disabled}
            onChange={e => patch({ playbook: e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-placement-${uiId}`}>runs</label>
          <select
            id={`playbook-placement-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={placement}
            disabled={disabled}
            onChange={e => {
              if (e.target.value !== placement) {
                onPlacementChange(e.target.value);
              }
            }}
          >
            <option value="local">in the guest (ansible-local)</option>
            <option value="remote">from the host (remote ansible)</option>
          </select>
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-run-${uiId}`}>run</label>
          <select
            id={`playbook-run-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={playbook.run ?? 'once'}
            disabled={disabled}
            onChange={e => patch({ run: e.target.value })}
          >
            {RUN_MODES.map(mode => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-install-${uiId}`}>install ansible via</label>
          <select
            id={`playbook-install-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={playbook.install_mode ?? ''}
            disabled={disabled}
            onChange={e => text('install_mode', e.target.value)}
          >
            <option value="">not set</option>
            <option value="pip">pip</option>
            <option value="pkg">pkg</option>
          </select>
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-interpreter-${uiId}`}>python interpreter</label>
          <input
            id={`playbook-interpreter-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            placeholder="/usr/bin/python3"
            value={playbook.ansible_python_interpreter ?? ''}
            disabled={disabled}
            onChange={e => text('ansible_python_interpreter', e.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-config-${uiId}`}>config file</label>
          <input
            id={`playbook-config-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            placeholder="/vagrant/ansible/ansible.cfg"
            value={playbook.config_file ?? ''}
            disabled={disabled}
            onChange={e => text('config_file', e.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-workdir-${uiId}`}>run from</label>
          <input
            id={`playbook-workdir-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-short"
            type="text"
            placeholder="/vagrant"
            value={playbook.provisioning_path ?? ''}
            disabled={disabled}
            onChange={e => text('provisioning_path', e.target.value)}
          />
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-callbacks-${uiId}`}>callbacks</label>
          <input
            id={`playbook-callbacks-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-short"
            type="text"
            placeholder="profile_tasks"
            value={playbook.callbacks ?? ''}
            disabled={disabled}
            onChange={e => text('callbacks', e.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-compat-${uiId}`}>compatibility</label>
          <input
            id={`playbook-compat-${uiId}`}
            className="form-control form-control-sm hw-field-tiny"
            type="text"
            placeholder="2.0"
            value={playbook.compatibility_mode ?? ''}
            disabled={disabled}
            onChange={e => text('compatibility_mode', e.target.value)}
          />
        </span>
        <OptionalBoolSelect
          id={`playbook-pipelining-${uiId}`}
          label="ssh pipelining"
          value={playbook.ssh_pipelining}
          disabled={disabled}
          onChange={value => patch({ ssh_pipelining: value })}
        />
        <OptionalBoolSelect
          id={`playbook-verbose-${uiId}`}
          label="verbose"
          value={playbook.verbose}
          disabled={disabled}
          onChange={value => patch({ verbose: value })}
        />
        <OptionalBoolSelect
          id={`playbook-remote-collections-${uiId}`}
          label="galaxy-install collections"
          value={playbook.remote_collections}
          disabled={disabled}
          onChange={value => patch({ remote_collections: value })}
        />
      </div>
      <div className="hw-rc-fields">
        <LinesField
          id={`playbook-collections-${uiId}`}
          label="collections (one per line)"
          lines={playbook.collections}
          disabled={disabled}
          placeholder={'startcloud.startcloud_roles\nstartcloud.hcl_roles'}
          onCommit={list => patch({ collections: list })}
        />
        <span className="hw-field">
          <label htmlFor={`playbook-description-${uiId}`}>description</label>
          <input
            id={`playbook-description-${uiId}`}
            className="form-control form-control-sm hw-field-wide"
            type="text"
            value={playbook.description ?? ''}
            disabled={disabled}
            onChange={e => text('description', e.target.value)}
          />
        </span>
      </div>
      <p className="form-text text-muted mb-0">
        <code>galaxy-install collections: false</code> means the collections ship inside the
        provisioner package and reach the guest through the folder sync — the galaxy is never
        called.
      </p>
    </>
  );
};

PlaybookBody.propTypes = {
  playbook: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  pathListId: PropTypes.string,
  placement: PropTypes.oneOf(['local', 'remote']).isRequired,
  onPlacementChange: PropTypes.func.isRequired,
};

const ProvisioningPlaybooksTab = ({ playbookLists, pathOptions, onChange, disabled, makeRow }) => {
  const { local, remote } = playbookLists;
  // Registry playbook candidates (advisory, design D16) — a datalist under
  // the path input; free text always stands.
  const pathListId =
    Array.isArray(pathOptions) && pathOptions.length > 0 ? 'playbook-path-options' : undefined;

  // The one cross-list move: out of its list, onto the END of the other.
  const moveTo = (row, target) => {
    const without = list => list.filter(entry => entry._ui_id !== row._ui_id);
    onChange(
      target === 'remote'
        ? { local: without(local), remote: [...remote, row] }
        : { local: [...local, row], remote: without(remote) }
    );
  };

  const renderList = (rows, placement, addLabel) => (
    <StepCardList
      rows={rows}
      onChange={next =>
        onChange(placement === 'local' ? { local: next, remote } : { local, remote: next })
      }
      disabled={disabled}
      addLabel={addLabel}
      makeRow={makeRow}
      renderTitle={playbook => <PlaybookTitle playbook={playbook} />}
      renderBody={(playbook, patch) => (
        <PlaybookBody
          playbook={playbook}
          patch={patch}
          disabled={disabled}
          pathListId={pathListId}
          placement={placement}
          onPlacementChange={target => moveTo(playbook, target)}
        />
      )}
    />
  );

  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        Order is exactly what you see: the local playbooks run first, top to bottom, then the remote
        playbooks, top to bottom. Drag reorders within a list; the <code>runs</code> selector moves
        an entry to the end of the other list. <code>run</code> gates each against the
        machine&apos;s provision history: <code>always</code> every run, <code>once</code> only when
        never provisioned, <code>not_first</code> only after a prior success.
      </p>
      {pathListId && (
        <datalist id={pathListId}>
          {pathOptions.map(path => (
            <option key={path} value={path} />
          ))}
        </datalist>
      )}
      <h6 className="fs-6 fw-bold mb-2">
        <i className="fas fa-box me-2" />
        Local — ansible-local, inside the guest
      </h6>
      {renderList(local, 'local', 'Add Playbook')}
      <h6 className="fs-6 fw-bold mt-3 mb-2">
        <i className="fas fa-tower-broadcast me-2" />
        Remote — host ansible over the guest transport
      </h6>
      {renderList(remote, 'remote', 'Add Remote Playbook')}
    </div>
  );
};

ProvisioningPlaybooksTab.propTypes = {
  playbookLists: PropTypes.shape({
    local: PropTypes.array.isRequired,
    remote: PropTypes.array.isRequired,
  }).isRequired,
  pathOptions: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  makeRow: PropTypes.func.isRequired,
};

export default ProvisioningPlaybooksTab;
