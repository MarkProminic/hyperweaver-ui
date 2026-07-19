import PropTypes from 'prop-types';

import StepCardList from './ProvisioningStepList';
import { LinesField } from './ProvisioningVarRows';

/**
 * The Folders tab — one card per folders[] entry, same treatment as Roles
 * (Mark's parity ask 2026-07-14): glance chips collapsed, the FULL field set
 * expanded — everything that used to hide in Raw JSON (args/exclude/delete/
 * owner/group/automount) edits structured. Unknown keys survive untouched.
 */

const FOLDER_TYPES = ['rsync', 'scp', 'virtualbox', 'disabled'];

const FolderTitle = ({ folder }) => (
  <>
    <span className="hw-rc-role">
      {folder.map || '—'} → {folder.to || '—'}
    </span>
    <span className="hw-chip">{folder.type || 'rsync'}</span>
    {folder.disabled && <span className="hw-chip hw-chip-when">disabled</span>}
    {folder.syncback && <span className="hw-chip hw-chip-vars">sync back</span>}
  </>
);

FolderTitle.propTypes = {
  folder: PropTypes.object.isRequired,
};

const FolderBody = ({ folder, patch, disabled }) => {
  const uiId = folder._ui_id;
  return (
    <>
      {folder.description && <p className="hw-rc-desc">{folder.description}</p>}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`folder-map-${uiId}`}>from (host)</label>
          <input
            id={`folder-map-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            value={folder.map ?? ''}
            disabled={disabled}
            onChange={e => patch({ map: e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`folder-to-${uiId}`}>to (guest)</label>
          <input
            id={`folder-to-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            value={folder.to ?? ''}
            disabled={disabled}
            onChange={e => patch({ to: e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`folder-type-${uiId}`}>type</label>
          <select
            id={`folder-type-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={folder.type ?? 'rsync'}
            disabled={disabled}
            onChange={e => patch({ type: e.target.value })}
          >
            {FOLDER_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </span>
        <span className="hw-field">
          <label htmlFor={`folder-owner-${uiId}`}>owner</label>
          <input
            id={`folder-owner-${uiId}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder="ssh user"
            value={folder.owner ?? ''}
            disabled={disabled}
            onChange={e => patch({ owner: e.target.value === '' ? undefined : e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`folder-group-${uiId}`}>group</label>
          <input
            id={`folder-group-${uiId}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder="owner"
            value={folder.group ?? ''}
            disabled={disabled}
            onChange={e => patch({ group: e.target.value === '' ? undefined : e.target.value })}
          />
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field form-check mb-0">
          <input
            id={`folder-disabled-${uiId}`}
            className="form-check-input"
            type="checkbox"
            checked={!!folder.disabled}
            disabled={disabled}
            onChange={e => patch({ disabled: e.target.checked })}
          />
          <label className="form-check-label small" htmlFor={`folder-disabled-${uiId}`}>
            Disabled
          </label>
        </span>
        <span className="hw-field form-check mb-0">
          <input
            id={`folder-syncback-${uiId}`}
            className="form-check-input"
            type="checkbox"
            checked={!!folder.syncback}
            disabled={disabled || folder.type === 'virtualbox' || !!folder.disabled}
            onChange={e => patch({ syncback: e.target.checked })}
          />
          <label
            className="form-check-label small"
            htmlFor={`folder-syncback-${uiId}`}
            title="Pull this folder from the guest (to) back to the host (from) after provisioning, or on an ad-hoc Sync Back"
          >
            Sync back
          </label>
        </span>
        <span className="hw-field form-check mb-0">
          <input
            id={`folder-delete-${uiId}`}
            className="form-check-input"
            type="checkbox"
            checked={!!folder.delete}
            disabled={disabled}
            onChange={e => patch({ delete: e.target.checked || undefined })}
          />
          <label
            className="form-check-label small"
            htmlFor={`folder-delete-${uiId}`}
            title="rsync --delete: remove guest files the host no longer has (push only, never on syncback)"
          >
            Delete extraneous
          </label>
        </span>
        <span className="hw-field form-check mb-0">
          <input
            id={`folder-automount-${uiId}`}
            className="form-check-input"
            type="checkbox"
            checked={!!folder.automount}
            disabled={disabled}
            onChange={e => patch({ automount: e.target.checked || undefined })}
          />
          <label
            className="form-check-label small"
            htmlFor={`folder-automount-${uiId}`}
            title="VirtualBox shared folders only"
          >
            Automount
          </label>
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`folder-description-${uiId}`}>description</label>
          <input
            id={`folder-description-${uiId}`}
            className="form-control form-control-sm hw-field-wide"
            type="text"
            value={folder.description ?? ''}
            disabled={disabled}
            onChange={e =>
              patch({ description: e.target.value === '' ? undefined : e.target.value })
            }
          />
        </span>
      </div>
      <div className="hw-rc-fields">
        <LinesField
          id={`folder-args-${uiId}`}
          label="rsync args (one per line)"
          lines={folder.args}
          disabled={disabled}
          placeholder={'--archive\n--delete\n-z'}
          onCommit={list => patch({ args: list })}
        />
        <LinesField
          id={`folder-exclude-${uiId}`}
          label="exclude (one per line)"
          lines={folder.exclude}
          disabled={disabled}
          placeholder={'.git\nnode_modules'}
          onCommit={list => patch({ exclude: list })}
        />
      </div>
    </>
  );
};

FolderBody.propTypes = {
  folder: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ProvisioningFoldersTab = ({ folders, onChange, disabled, makeRow }) => (
  <div>
    <p className="form-text text-muted mt-0 mb-2">
      Folders sync top to bottom — drag to reorder. <strong>Sync back</strong> also pulls the folder
      guest→host (to→from) after provisioning and on an ad-hoc Sync Back (rsync/scp folders only).
    </p>
    <StepCardList
      rows={folders}
      onChange={onChange}
      disabled={disabled}
      addLabel="Add Folder"
      makeRow={makeRow}
      renderTitle={folder => <FolderTitle folder={folder} />}
      renderBody={(folder, patch) => (
        <FolderBody folder={folder} patch={patch} disabled={disabled} />
      )}
    />
  </div>
);

ProvisioningFoldersTab.propTypes = {
  folders: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  makeRow: PropTypes.func.isRequired,
};

export default ProvisioningFoldersTab;
