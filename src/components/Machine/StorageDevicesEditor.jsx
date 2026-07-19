import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { markButtonClass, markIconClass } from './CurrentHardware';
import {
  CdromSourceFields,
  ControllerPortFields,
  DiskSourceFields,
  RemoveRowButton,
} from './MediaRowFields';
import PickOrType from './PickOrType';

/**
 * The Settings → Storage editor: ONE device tree. Each existing controller
 * is a group row with its attached media beneath; attach affordances live ON
 * the controller (the new device nests where it will land), removals are row
 * marks. New controllers and devices aimed at the agent's default controller
 * ride the footer buttons. Everything applies together on Apply.
 */

const FALLBACK_CONTROLLER_TYPES = ['ide', 'sata', 'scsi', 'sas', 'nvme', 'virtio', 'usb', 'floppy'];

const kindIcon = kind => (kind === 'cdrom' ? 'fa-compact-disc' : 'fa-hdd');

/** An attached medium with its remove mark (boot medium is unremovable). */
const EditableAttachmentRow = ({ entry, isMarked, onToggle, formDisabled }) => {
  const { t } = useTranslation();
  const bootDisk = entry.port === 0 && entry.kind === 'disk';
  return (
    <div className={`hw-device-row hw-device-child ${isMarked ? 'hw-device-removed' : ''}`}>
      <i className={`fas ${kindIcon(entry.kind)} text-muted`} />
      <span className="hw-device-meta">
        {t('machineEdit.storageDevicesEditor.portDev', { port: entry.port, device: entry.device })}
      </span>
      <span className="hw-device-path" title={entry.path}>
        {entry.path || t('machineEdit.storageDevicesEditor.emptyDrive')}
      </span>
      {bootDisk ? (
        <span
          className="badge text-bg-light ms-auto"
          title={t('machineEdit.storageDevicesEditor.bootMediumTitle')}
        >
          {t('machineEdit.storageDevicesEditor.boot')}
        </span>
      ) : (
        <div className="hw-device-actions">
          <button
            type="button"
            className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
            title={
              isMarked
                ? t('machineEdit.storageDevicesEditor.unmark')
                : t('machineEdit.storageDevicesEditor.markForRemoval')
            }
            onClick={() => onToggle(entry)}
            disabled={formDisabled}
          >
            <i className={`fas ${markIconClass(isMarked)}`} />
          </button>
        </div>
      )}
    </div>
  );
};

EditableAttachmentRow.propTypes = {
  entry: PropTypes.object.isRequired,
  isMarked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  formDisabled: PropTypes.bool,
};

const PendingDiskRow = ({
  row,
  onPatch,
  onDrop,
  currentServer,
  showController,
  showPort = true,
  formDisabled,
}) => {
  const { t } = useTranslation();
  return (
    <div className="hw-device-row hw-device-child hw-device-child-form">
      <div className="row g-2 align-items-end">
        <DiskSourceFields
          idPrefix="add-disk"
          idSuffix={`-${row.key}`}
          sourceLabel={t('machineEdit.storageDevicesEditor.newDiskSource')}
          valueCol="col-5 col-md-3"
          sizeLabel={t('machineEdit.storageDevicesEditor.sizeHint')}
          existingLabel={t('machineEdit.storageDevicesEditor.pathOnAgentHost')}
          row={row}
          onPatch={onPatch}
          currentServer={currentServer}
          disabled={formDisabled}
        />
        <ControllerPortFields
          idPrefix="add-disk"
          idSuffix={`-${row.key}`}
          row={row}
          onPatch={onPatch}
          showController={showController}
          showPort={showPort}
          portPlaceholder={t('machineEdit.common.auto')}
          disabled={formDisabled}
        />
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropDiskRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
    </div>
  );
};

PendingDiskRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  showController: PropTypes.bool,
  showPort: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

const PendingCdromRow = ({
  row,
  onPatch,
  onDrop,
  currentServer,
  isoOptions,
  showController,
  showPort = true,
  formDisabled,
}) => {
  const { t } = useTranslation();
  return (
    <div className="hw-device-row hw-device-child hw-device-child-form">
      <div className="row g-2 align-items-end">
        <CdromSourceFields
          idPrefix="add-cdrom"
          idSuffix={`-${row.key}`}
          sourceLabel={t('machineEdit.storageDevicesEditor.newIsoSource')}
          sourceCol="col-3 col-md-2"
          isoCol="col-6 col-md-3"
          pathCol="col-9 col-md-3"
          row={row}
          onPatch={onPatch}
          isoOptions={isoOptions}
          currentServer={currentServer}
          disabled={formDisabled}
        />
        <ControllerPortFields
          idPrefix="add-cdrom"
          idSuffix={`-${row.key}`}
          row={row}
          onPatch={onPatch}
          showController={showController}
          showPort={showPort}
          portPlaceholder={t('machineEdit.common.auto')}
          disabled={formDisabled}
        />
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropIsoRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
    </div>
  );
};

PendingCdromRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  isoOptions: PropTypes.array.isRequired,
  showController: PropTypes.bool,
  showPort: PropTypes.bool,
  formDisabled: PropTypes.bool,
};

const ZonePendingDiskRow = ({ row, onPatch, onDrop, poolChoices, zoneName, formDisabled }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-device-row hw-device-child hw-device-child-form">
      <div className="row g-2 align-items-end">
        <div className="col-4 col-md-2">
          <label className="form-label small mb-1" htmlFor={`add-zdisk-mode-${row.key}`}>
            {t('machineEdit.storageDevicesEditor.newDiskSource')}
          </label>
          <select
            id={`add-zdisk-mode-${row.key}`}
            className="form-select form-select-sm"
            value={row.mode}
            onChange={e => onPatch({ mode: e.target.value })}
            disabled={formDisabled}
          >
            <option value="new">{t('machineEdit.storageDevicesEditor.newZvol')}</option>
            <option value="existing">{t('machineEdit.storageDevicesEditor.existingZvol')}</option>
          </select>
        </div>
        {row.mode === 'new' ? (
          <>
            <div className="col-4 col-md-2">
              <label className="form-label small mb-1" htmlFor={`add-zdisk-size-${row.key}`}>
                {t('machineEdit.storageDevicesEditor.size')}
              </label>
              <input
                id={`add-zdisk-size-${row.key}`}
                className="form-control form-control-sm"
                placeholder="e.g. 50G"
                value={row.size}
                onChange={e => onPatch({ size: e.target.value })}
                disabled={formDisabled}
              />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small mb-1" htmlFor={`add-zdisk-pool-${row.key}`}>
                {t('machineEdit.storageDevicesEditor.pool')}
              </label>
              <PickOrType
                id={`add-zdisk-pool-${row.key}`}
                value={row.pool}
                onChange={next => onPatch({ pool: next })}
                options={poolChoices}
                blankLabel="rpool"
                placeholder={t('machineEdit.storageDevicesEditor.poolName')}
                small
                disabled={formDisabled}
              />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small mb-1" htmlFor={`add-zdisk-volume-${row.key}`}>
                {t('machineEdit.storageDevicesEditor.volumeName')}
              </label>
              <input
                id={`add-zdisk-volume-${row.key}`}
                className="form-control form-control-sm"
                placeholder="diskN"
                value={row.volume_name}
                onChange={e => onPatch({ volume_name: e.target.value })}
                disabled={formDisabled}
              />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small mb-1" htmlFor={`add-zdisk-dataset-${row.key}`}>
                {t('machineEdit.storageDevicesEditor.parentDataset')}
              </label>
              <input
                id={`add-zdisk-dataset-${row.key}`}
                className="form-control form-control-sm"
                placeholder="zones"
                value={row.dataset}
                onChange={e => onPatch({ dataset: e.target.value })}
                disabled={formDisabled}
              />
            </div>
            <div className="col-auto">
              <div className="form-check form-switch mb-1">
                <input
                  id={`add-zdisk-sparse-${row.key}`}
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={row.sparse}
                  onChange={e => onPatch({ sparse: e.target.checked })}
                  disabled={formDisabled}
                />
                <label className="form-check-label small" htmlFor={`add-zdisk-sparse-${row.key}`}>
                  {t('machineEdit.storageDevicesEditor.sparse')}
                </label>
              </div>
            </div>
          </>
        ) : (
          <div className="col-8 col-md-5">
            <label className="form-label small mb-1" htmlFor={`add-zdisk-existing-${row.key}`}>
              {t('machineEdit.storageDevicesEditor.existingZvolDatasetName')}
            </label>
            <input
              id={`add-zdisk-existing-${row.key}`}
              className="form-control form-control-sm font-monospace"
              placeholder="e.g. rpool/zones/mydisk"
              value={row.existing_dataset}
              onChange={e => onPatch({ existing_dataset: e.target.value })}
              disabled={formDisabled}
            />
          </div>
        )}
        <RemoveRowButton
          label={t('machineEdit.storageDevicesEditor.dropDiskRow')}
          onClick={onDrop}
          disabled={formDisabled}
        />
      </div>
      {row.mode === 'new' && (
        <span className="form-text text-muted small">
          {t('machineEdit.storageDevicesEditor.createsZvol')}{' '}
          <code>
            {row.pool.trim() || 'rpool'}/{row.dataset.trim() || 'zones'}/{zoneName || '<zone>'}/
            {row.volume_name.trim() || 'disk<N>'}
          </code>{' '}
          — {row.size.trim() || t('machineEdit.storageDevicesEditor.sizeRequired')}
          {row.sparse ? t('machineEdit.storageDevicesEditor.sparseSuffix') : ''}
        </span>
      )}
    </div>
  );
};

ZonePendingDiskRow.propTypes = {
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  poolChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  zoneName: PropTypes.string,
  formDisabled: PropTypes.bool,
};

const StorageDevicesEditor = ({
  currentHardware,
  addDisks,
  onAddDisksChange,
  addCdroms,
  onAddCdromsChange,
  addControllers,
  onAddControllersChange,
  marked,
  onToggleAttachment,
  controllerMarked,
  onToggleController,
  addZoneDisks = [],
  onAddZoneDisksChange = () => {},
  poolChoices = [],
  zoneName = '',
  zoneDiskRemovals = [],
  onToggleZoneDisk = () => {},
  onManageZoneDisk = () => {},
  zoneCdromRemovals = [],
  onToggleZoneCdrom = () => {},
  isoOptions,
  controllerTypes = null,
  currentServer,
  formDisabled = false,
}) => {
  const { t } = useTranslation();
  const { controllers, attachments, zone } = currentHardware;
  const controllerNames = new Set(controllers.map(controller => controller.name));
  const types = controllerTypes || FALLBACK_CONTROLLER_TYPES;

  const patchDisk = (key, patch) =>
    onAddDisksChange(addDisks.map(row => (row.key === key ? { ...row, ...patch } : row)));
  const dropDisk = key => onAddDisksChange(addDisks.filter(row => row.key !== key));
  const patchCdrom = (key, patch) =>
    onAddCdromsChange(addCdroms.map(row => (row.key === key ? { ...row, ...patch } : row)));
  const dropCdrom = key => onAddCdromsChange(addCdroms.filter(row => row.key !== key));

  const newDisk = controller => ({
    key: Date.now() + Math.random(),
    mode: 'new',
    size: '',
    path: '',
    controller: controller ?? '',
  });
  const newCdrom = controller => ({
    key: Date.now() + Math.random(),
    source: isoOptions.length > 0 ? 'iso' : 'path',
    path: '',
    iso: '',
    controller: controller ?? '',
  });

  const disksUnder = name => addDisks.filter(row => (row.controller ?? '') === name);
  const cdromsUnder = name => addCdroms.filter(row => (row.controller ?? '') === name);
  const orphanDisks = addDisks.filter(row => !controllerNames.has(row.controller ?? ''));
  const orphanCdroms = addCdroms.filter(row => !controllerNames.has(row.controller ?? ''));

  const pendingRows = (disks, cdroms, showController, showPort = true) => (
    <>
      {disks.map(row => (
        <PendingDiskRow
          key={row.key}
          row={row}
          onPatch={patch => patchDisk(row.key, patch)}
          onDrop={() => dropDisk(row.key)}
          currentServer={currentServer}
          showController={showController}
          showPort={showPort}
          formDisabled={formDisabled}
        />
      ))}
      {cdroms.map(row => (
        <PendingCdromRow
          key={row.key}
          row={row}
          onPatch={patch => patchCdrom(row.key, patch)}
          onDrop={() => dropCdrom(row.key)}
          currentServer={currentServer}
          isoOptions={isoOptions}
          showController={showController}
          showPort={showPort}
          formDisabled={formDisabled}
        />
      ))}
    </>
  );

  return (
    <div className="hw-device-tree">
      <div className="hw-device-tree-head">
        <i className="fas fa-hard-drive" />
        <span>{t('machineEdit.storageDevicesEditor.storageDevices')}</span>
      </div>

      {zone && (
        <>
          {zone.disks.length > 0 && (
            <div className="hw-device-row hw-device-group">
              <i className="fas fa-hard-drive text-muted" />
              <span>{t('machineEdit.storageDevicesEditor.disks')}</span>
            </div>
          )}
          {zone.disks.map(disk => {
            const isMarked = zoneDiskRemovals.includes(disk.name);
            return (
              <div
                className={`hw-device-row hw-device-child ${isMarked ? 'hw-device-removed' : ''}`}
                key={disk.name}
              >
                <i className="fas fa-hdd text-muted" />
                <span className="hw-device-meta">{disk.name}</span>
                <span className="hw-device-path" title={disk.value}>
                  {disk.value}
                </span>
                {disk.size && <span className="badge text-bg-secondary">{disk.size}</span>}
                {disk.boot && (
                  <span
                    className="badge text-bg-light"
                    title={t('machineEdit.storageDevicesEditor.zoneBootMediumTitle')}
                  >
                    {t('machineEdit.storageDevicesEditor.boot')}
                  </span>
                )}
                {disk.boot && isMarked && (
                  <span className="badge text-bg-danger">
                    {t('machineEdit.storageDevicesEditor.unbootableAfterApply')}
                  </span>
                )}
                <div className="hw-device-actions">
                  {!isMarked && (
                    <button
                      type="button"
                      className="btn btn-sm py-0 btn-outline-secondary"
                      title={t('machineEdit.storageDevicesEditor.manageZvol')}
                      onClick={() => onManageZoneDisk(disk)}
                      disabled={formDisabled}
                    >
                      <i className="fas fa-gear" />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                    title={
                      isMarked
                        ? t('machineEdit.storageDevicesEditor.unmark')
                        : `${t('machineEdit.storageDevicesEditor.detachDiskTitle')}${
                            disk.boot
                              ? t('machineEdit.storageDevicesEditor.detachBootDiskSuffix')
                              : ''
                          }`
                    }
                    onClick={() => onToggleZoneDisk(disk.name)}
                    disabled={formDisabled}
                  >
                    <i className={`fas ${markIconClass(isMarked)}`} />
                  </button>
                </div>
              </div>
            );
          })}
          {zone.cdroms.length > 0 && (
            <div className="hw-device-row hw-device-group">
              <i className="fas fa-compact-disc text-muted" />
              <span>{t('machineEdit.storageDevicesEditor.cdDvd')}</span>
            </div>
          )}
          {zone.cdroms.map(cdrom => {
            const isMarked = zoneCdromRemovals.includes(cdrom.name);
            return (
              <div
                className={`hw-device-row hw-device-child ${isMarked ? 'hw-device-removed' : ''}`}
                key={cdrom.name}
              >
                <i className="fas fa-compact-disc text-muted" />
                <span className="hw-device-meta">{cdrom.name}</span>
                <span className="hw-device-path" title={cdrom.value}>
                  {cdrom.value}
                </span>
                <div className="hw-device-actions">
                  <button
                    type="button"
                    className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                    title={
                      isMarked
                        ? t('machineEdit.storageDevicesEditor.unmark')
                        : t('machineEdit.storageDevicesEditor.ejectIso')
                    }
                    onClick={() => onToggleZoneCdrom(cdrom.name)}
                    disabled={formDisabled}
                  >
                    <i className={`fas ${markIconClass(isMarked)}`} />
                  </button>
                </div>
              </div>
            );
          })}
          {addZoneDisks.map(row => (
            <ZonePendingDiskRow
              key={row.key}
              row={row}
              onPatch={patch =>
                onAddZoneDisksChange(
                  addZoneDisks.map(entry =>
                    entry.key === row.key ? { ...entry, ...patch } : entry
                  )
                )
              }
              onDrop={() =>
                onAddZoneDisksChange(addZoneDisks.filter(entry => entry.key !== row.key))
              }
              poolChoices={poolChoices}
              zoneName={zoneName}
              formDisabled={formDisabled}
            />
          ))}
          <div className="hw-device-row hw-device-meta">
            {t('machineEdit.storageDevicesEditor.detachedDisksHint')}
          </div>
        </>
      )}

      {!zone && controllers.length === 0 && attachments.length === 0 && (
        <div className="hw-device-row hw-device-meta">
          {t('machineEdit.storageDevicesEditor.noStorageDevices')}
        </div>
      )}

      {controllers.map(controller => {
        const isMarked = controllerMarked(controller.name);
        return (
          <Fragment key={controller.name}>
            <div className={`hw-device-row hw-device-group ${isMarked ? 'hw-device-removed' : ''}`}>
              <i className="fas fa-hard-drive text-muted" />
              <span>{controller.name}</span>
              {controller.type && (
                <span className="badge text-bg-secondary">{controller.type}</span>
              )}
              <div className="hw-device-actions">
                <button
                  type="button"
                  className="btn btn-sm py-0 btn-outline-secondary"
                  title={t('machineEdit.storageDevicesEditor.attachDisk')}
                  onClick={() => onAddDisksChange([...addDisks, newDisk(controller.name)])}
                  disabled={formDisabled}
                >
                  <i className="fas fa-hdd me-1" />
                  <i className="fas fa-plus small" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm py-0 btn-outline-secondary"
                  title={t('machineEdit.storageDevicesEditor.attachIso')}
                  onClick={() => onAddCdromsChange([...addCdroms, newCdrom(controller.name)])}
                  disabled={formDisabled}
                >
                  <i className="fas fa-compact-disc me-1" />
                  <i className="fas fa-plus small" />
                </button>
                <button
                  type="button"
                  className={`btn btn-sm py-0 ${markButtonClass(isMarked)}`}
                  title={
                    isMarked
                      ? t('machineEdit.storageDevicesEditor.unmark')
                      : t('machineEdit.storageDevicesEditor.markControllerForRemoval')
                  }
                  onClick={() => onToggleController(controller.name)}
                  disabled={formDisabled}
                >
                  <i className={`fas ${markIconClass(isMarked)}`} />
                </button>
              </div>
            </div>
            {attachments
              .filter(entry => entry.controller === controller.name)
              .map(entry => (
                <EditableAttachmentRow
                  key={`${entry.controller}-${entry.port}-${entry.device}`}
                  entry={entry}
                  isMarked={marked(entry)}
                  onToggle={onToggleAttachment}
                  formDisabled={formDisabled}
                />
              ))}
            {pendingRows(disksUnder(controller.name), cdromsUnder(controller.name), false)}
          </Fragment>
        );
      })}

      {(orphanDisks.length > 0 || orphanCdroms.length > 0) && (
        <>
          <div className="hw-device-row hw-device-group">
            <i className="fas fa-plus text-success" />
            <span>{t('machineEdit.storageDevicesEditor.newDevices')}</span>
            <span className="hw-device-meta">
              {zone
                ? t('machineEdit.storageDevicesEditor.attachToZoneOnApply')
                : t('machineEdit.storageDevicesEditor.blankControllerDefault')}
            </span>
          </div>
          {pendingRows(orphanDisks, orphanCdroms, !zone, !zone)}
        </>
      )}

      {addControllers.map(row => (
        <div className="hw-device-row hw-device-group" key={`add-controller-${row.key}`}>
          <i className="fas fa-plus text-success" />
          <span>{t('machineEdit.storageDevicesEditor.newController')}</span>
          <select
            className="form-select form-select-sm w-auto"
            aria-label={t('machineEdit.storageDevicesEditor.newControllerType')}
            value={row.type}
            onChange={e =>
              onAddControllersChange(
                addControllers.map(entry =>
                  entry.key === row.key ? { ...entry, type: e.target.value } : entry
                )
              )
            }
            disabled={formDisabled}
          >
            {types.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            className="form-control form-control-sm w-auto"
            aria-label={t('machineEdit.storageDevicesEditor.newControllerName')}
            placeholder={t('machineEdit.storageDevicesEditor.nameOptional')}
            value={row.name}
            onChange={e =>
              onAddControllersChange(
                addControllers.map(entry =>
                  entry.key === row.key ? { ...entry, name: e.target.value } : entry
                )
              )
            }
            disabled={formDisabled}
          />
          <div className="hw-device-actions">
            <button
              type="button"
              className="btn btn-sm py-0 btn-outline-danger"
              aria-label={t('machineEdit.storageDevicesEditor.dropControllerRow')}
              onClick={() =>
                onAddControllersChange(addControllers.filter(entry => entry.key !== row.key))
              }
              disabled={formDisabled}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
      ))}

      <div className="hw-device-tree-foot">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            zone
              ? onAddZoneDisksChange([
                  ...addZoneDisks,
                  {
                    key: Date.now(),
                    mode: 'new',
                    size: '',
                    sparse: true,
                    pool: '',
                    dataset: '',
                    volume_name: '',
                    existing_dataset: '',
                  },
                ])
              : onAddDisksChange([...addDisks, newDisk('')])
          }
          disabled={formDisabled}
        >
          <i className="fas fa-plus me-1" />
          {t('machineEdit.storageDevicesEditor.disk')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onAddCdromsChange([...addCdroms, newCdrom('')])}
          disabled={formDisabled}
        >
          <i className="fas fa-plus me-1" />
          {t('machineEdit.storageDevicesEditor.iso')}
        </button>
        {!zone && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              onAddControllersChange([
                ...addControllers,
                { key: Date.now(), name: '', type: types.includes('sata') ? 'sata' : types[0] },
              ])
            }
            disabled={formDisabled}
          >
            <i className="fas fa-plus me-1" />
            {t('machineEdit.storageDevicesEditor.controller')}
          </button>
        )}
      </div>
    </div>
  );
};

StorageDevicesEditor.propTypes = {
  currentHardware: PropTypes.object.isRequired,
  addDisks: PropTypes.array.isRequired,
  onAddDisksChange: PropTypes.func.isRequired,
  addCdroms: PropTypes.array.isRequired,
  onAddCdromsChange: PropTypes.func.isRequired,
  addControllers: PropTypes.array.isRequired,
  onAddControllersChange: PropTypes.func.isRequired,
  marked: PropTypes.func.isRequired,
  onToggleAttachment: PropTypes.func.isRequired,
  controllerMarked: PropTypes.func.isRequired,
  onToggleController: PropTypes.func.isRequired,
  addZoneDisks: PropTypes.array,
  onAddZoneDisksChange: PropTypes.func,
  poolChoices: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  zoneName: PropTypes.string,
  zoneDiskRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneDisk: PropTypes.func,
  onManageZoneDisk: PropTypes.func,
  zoneCdromRemovals: PropTypes.arrayOf(PropTypes.string),
  onToggleZoneCdrom: PropTypes.func,
  isoOptions: PropTypes.array.isRequired,
  controllerTypes: PropTypes.array,
  currentServer: PropTypes.object,
  formDisabled: PropTypes.bool,
};

export default StorageDevicesEditor;
