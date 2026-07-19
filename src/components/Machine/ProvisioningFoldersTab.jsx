import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import StepCardList from './ProvisioningStepList';
import { LinesField } from './ProvisioningVarRows';

/**
 * The Folders tab — one card per folders[] entry, same treatment as Roles
 * (Mark's parity ask 2026-07-14): glance chips collapsed, the FULL field set
 * expanded — everything that used to hide in Raw JSON (args/exclude/delete/
 * owner/group/automount) edits structured. Unknown keys survive untouched.
 */

const FOLDER_TYPES = ['rsync', 'scp', 'virtualbox', 'disabled'];

const FolderTitle = ({ folder }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="hw-rc-role">
        {folder.map || '—'} → {folder.to || '—'}
      </span>
      <span className="hw-chip">{folder.type || 'rsync'}</span>
      {folder.disabled && (
        <span className="hw-chip hw-chip-when">
          {t('provisioning.provisioningFoldersTab.disabledChip')}
        </span>
      )}
      {folder.syncback && (
        <span className="hw-chip hw-chip-vars">
          {t('provisioning.provisioningFoldersTab.syncBackChip')}
        </span>
      )}
    </>
  );
};

FolderTitle.propTypes = {
  folder: PropTypes.object.isRequired,
};

const FolderBody = ({ folder, patch, disabled }) => {
  const { t } = useTranslation();
  const uiId = folder._ui_id;
  return (
    <>
      {folder.description && <p className="hw-rc-desc">{folder.description}</p>}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`folder-map-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.fromHostLabel')}
          </label>
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
          <label htmlFor={`folder-to-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.toGuestLabel')}
          </label>
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
          <label htmlFor={`folder-type-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.typeLabel')}
          </label>
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
          <label htmlFor={`folder-owner-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.ownerLabel')}
          </label>
          <input
            id={`folder-owner-${uiId}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder={t('provisioning.provisioningFoldersTab.ownerPlaceholder')}
            value={folder.owner ?? ''}
            disabled={disabled}
            onChange={e => patch({ owner: e.target.value === '' ? undefined : e.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`folder-group-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.groupLabel')}
          </label>
          <input
            id={`folder-group-${uiId}`}
            className="form-control form-control-sm hw-field-short"
            type="text"
            placeholder={t('provisioning.provisioningFoldersTab.groupPlaceholder')}
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
            {t('provisioning.provisioningFoldersTab.disabledLabel')}
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
            title={t('provisioning.provisioningFoldersTab.syncBackTitle')}
          >
            {t('provisioning.provisioningFoldersTab.syncBackLabel')}
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
            title={t('provisioning.provisioningFoldersTab.deleteExtraneousTitle')}
          >
            {t('provisioning.provisioningFoldersTab.deleteExtraneousLabel')}
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
            title={t('provisioning.provisioningFoldersTab.automountTitle')}
          >
            {t('provisioning.provisioningFoldersTab.automountLabel')}
          </label>
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`folder-description-${uiId}`}>
            {t('provisioning.provisioningFoldersTab.descriptionLabel')}
          </label>
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
          label={t('provisioning.provisioningFoldersTab.rsyncArgsLabel')}
          lines={folder.args}
          disabled={disabled}
          placeholder={'--archive\n--delete\n-z'}
          onCommit={list => patch({ args: list })}
        />
        <LinesField
          id={`folder-exclude-${uiId}`}
          label={t('provisioning.provisioningFoldersTab.excludeLabel')}
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

const ProvisioningFoldersTab = ({ folders, onChange, disabled, makeRow }) => {
  const { t } = useTranslation();
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningFoldersTab.introText1')}{' '}
        <strong>{t('provisioning.provisioningFoldersTab.syncBackLabel')}</strong>{' '}
        {t('provisioning.provisioningFoldersTab.introText2')}
      </p>
      <StepCardList
        rows={folders}
        onChange={onChange}
        disabled={disabled}
        addLabel={t('provisioning.provisioningFoldersTab.addFolder')}
        makeRow={makeRow}
        renderTitle={folder => <FolderTitle folder={folder} />}
        renderBody={(folder, patch) => (
          <FolderBody folder={folder} patch={patch} disabled={disabled} />
        )}
      />
    </div>
  );
};

ProvisioningFoldersTab.propTypes = {
  folders: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  makeRow: PropTypes.func.isRequired,
};

export default ProvisioningFoldersTab;
