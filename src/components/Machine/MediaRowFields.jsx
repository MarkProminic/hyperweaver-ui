import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { PathInput } from '../common';

import PickOrType from './PickOrType';

const FieldCol = ({ col, id, label, children }) => (
  <div className={col}>
    <label className="form-label small mb-1" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
);

FieldCol.propTypes = {
  col: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export const DiskSourceFields = ({
  idPrefix,
  idSuffix = '',
  sourceLabel,
  valueCol,
  sizeLabel,
  sizePlaceholder,
  existingLabel,
  row,
  onPatch,
  picker = null,
  currentServer,
  disabled,
}) => {
  const { t } = useTranslation();
  const modeId = `${idPrefix}-mode${idSuffix}`;
  const sizeId = `${idPrefix}-size${idSuffix}`;
  const pathId = `${idPrefix}-path${idSuffix}`;
  return (
    <>
      <FieldCol col="col-4 col-md-3" id={modeId} label={sourceLabel}>
        <select
          id={modeId}
          className="form-select form-select-sm"
          value={row.mode}
          onChange={e => onPatch({ mode: e.target.value })}
          disabled={disabled}
        >
          <option value="new">{t('machineEdit.diskSourceFields.newDisk')}</option>
          <option value="existing">{t('machineEdit.diskSourceFields.existingImage')}</option>
        </select>
      </FieldCol>
      {row.mode === 'new' ? (
        <FieldCol col={valueCol} id={sizeId} label={sizeLabel}>
          <input
            id={sizeId}
            className="form-control form-control-sm"
            type="text"
            placeholder={sizePlaceholder}
            value={row.size}
            onChange={e => onPatch({ size: e.target.value })}
            disabled={disabled}
          />
        </FieldCol>
      ) : (
        <FieldCol col={valueCol} id={pathId} label={existingLabel}>
          {picker ? (
            <PickOrType
              id={pathId}
              value={row.path}
              onChange={next => onPatch({ path: next })}
              options={picker.options}
              blankLabel={picker.blankLabel}
              placeholder={picker.placeholder}
              small
              disabled={disabled}
            />
          ) : (
            <PathInput
              id={pathId}
              className="form-control form-control-sm"
              value={row.path}
              onChange={next => onPatch({ path: next })}
              server={currentServer}
              mode="file"
              pickTitle={t('machineEdit.diskSourceFields.pickDiskImage')}
              disabled={disabled}
            />
          )}
        </FieldCol>
      )}
    </>
  );
};

DiskSourceFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  idSuffix: PropTypes.string,
  sourceLabel: PropTypes.string.isRequired,
  valueCol: PropTypes.string.isRequired,
  sizeLabel: PropTypes.string.isRequired,
  sizePlaceholder: PropTypes.string,
  existingLabel: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  picker: PropTypes.shape({
    options: PropTypes.array.isRequired,
    blankLabel: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
  }),
  currentServer: PropTypes.object,
  disabled: PropTypes.bool,
};

export const CdromSourceFields = ({
  idPrefix,
  idSuffix = '',
  sourceLabel,
  sourceCol,
  isoCol,
  pathCol,
  row,
  onPatch,
  isoOptions,
  currentServer,
  disabled,
}) => {
  const { t } = useTranslation();
  const sourceId = `${idPrefix}-source${idSuffix}`;
  const isoId = `${idPrefix}-iso${idSuffix}`;
  const pathId = `${idPrefix}-path${idSuffix}`;
  const useIso = (row.source || 'path') === 'iso' && isoOptions.length > 0;
  return (
    <>
      {isoOptions.length > 0 && (
        <FieldCol col={sourceCol} id={sourceId} label={sourceLabel}>
          <select
            id={sourceId}
            className="form-select form-select-sm"
            value={row.source || 'path'}
            onChange={e => onPatch({ source: e.target.value })}
            disabled={disabled}
          >
            <option value="iso">{t('machineEdit.cdromSourceFields.cachedIso')}</option>
            <option value="path">{t('machineEdit.cdromSourceFields.agentPath')}</option>
          </select>
        </FieldCol>
      )}
      {useIso ? (
        <FieldCol col={isoCol} id={isoId} label={t('machineEdit.cdromSourceFields.cachedIso')}>
          <select
            id={isoId}
            className="form-select form-select-sm"
            value={row.iso ?? ''}
            onChange={e => onPatch({ iso: e.target.value })}
            disabled={disabled}
          >
            <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
            {isoOptions.map(filename => (
              <option key={filename} value={filename}>
                {filename}
              </option>
            ))}
          </select>
        </FieldCol>
      ) : (
        <FieldCol col={pathCol} id={pathId} label={t('machineEdit.cdromSourceFields.isoPath')}>
          <PathInput
            id={pathId}
            className="form-control form-control-sm"
            value={row.path}
            onChange={next => onPatch({ path: next })}
            server={currentServer}
            mode="file"
            pickTitle={t('machineEdit.cdromSourceFields.pickIso')}
            disabled={disabled}
          />
        </FieldCol>
      )}
    </>
  );
};

CdromSourceFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  idSuffix: PropTypes.string,
  sourceLabel: PropTypes.string.isRequired,
  sourceCol: PropTypes.string.isRequired,
  isoCol: PropTypes.string.isRequired,
  pathCol: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  isoOptions: PropTypes.array.isRequired,
  currentServer: PropTypes.object,
  disabled: PropTypes.bool,
};

export const ControllerPortFields = ({
  idPrefix,
  idSuffix = '',
  row,
  onPatch,
  showController = true,
  showPort = true,
  controllerList,
  portPlaceholder,
  disabled,
}) => {
  const { t } = useTranslation();
  const controllerId = `${idPrefix}-controller${idSuffix}`;
  const portId = `${idPrefix}-port${idSuffix}`;
  return (
    <>
      {showController && (
        <FieldCol
          col="col-3 col-md-2"
          id={controllerId}
          label={t('machineEdit.controllerPortFields.controller')}
        >
          <input
            id={controllerId}
            className="form-control form-control-sm"
            list={controllerList}
            placeholder="n/a"
            value={row.controller ?? ''}
            onChange={e => onPatch({ controller: e.target.value })}
            disabled={disabled}
          />
        </FieldCol>
      )}
      {showPort && (
        <FieldCol
          col="col-2 col-md-1"
          id={portId}
          label={t('machineEdit.controllerPortFields.port')}
        >
          <input
            id={portId}
            className="form-control form-control-sm"
            type="number"
            min="0"
            placeholder={portPlaceholder}
            value={row.port ?? ''}
            onChange={e => onPatch({ port: e.target.value })}
            disabled={disabled}
          />
        </FieldCol>
      )}
    </>
  );
};

ControllerPortFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  idSuffix: PropTypes.string,
  row: PropTypes.object.isRequired,
  onPatch: PropTypes.func.isRequired,
  showController: PropTypes.bool,
  showPort: PropTypes.bool,
  controllerList: PropTypes.string,
  portPlaceholder: PropTypes.string,
  disabled: PropTypes.bool,
};

export const RemoveRowButton = ({ label, onClick, disabled }) => (
  <div className="col-auto">
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <i className="fas fa-trash" />
    </button>
  </div>
);

RemoveRowButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
