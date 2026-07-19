import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/** bhyve lofs host-directory mounts — the create `filesystems[]` / PUT
 *  add_filesystems / remove_filesystems surface. */
const FilesystemsEditor = ({
  currentFilesystems,
  addFilesystems,
  onAddChange,
  removeFilesystems,
  onRemoveChange,
  disabled,
}) => {
  const { t } = useTranslation();
  const setRow = (index, patch) =>
    onAddChange(addFilesystems.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const toggleRemove = (dir, marked) =>
    onRemoveChange(marked ? [...removeFilesystems, dir] : removeFilesystems.filter(d => d !== dir));

  return (
    <div className="d-flex flex-column gap-2">
      <p className="form-text text-muted mt-0">
        {t('machineEdit.filesystemsEditor.mountsIntro1')}
        <code>special</code>
        {t('machineEdit.filesystemsEditor.mountsIntro2')} <code>dir</code>
        {t('machineEdit.filesystemsEditor.mountsIntro3')}
      </p>
      {currentFilesystems.length > 0 && (
        <>
          <h6 className="fw-bold">{t('machineEdit.filesystemsEditor.current')}</h6>
          {currentFilesystems.map(fs => {
            const isMarked = removeFilesystems.includes(fs.dir);
            return (
              <div className={`border rounded p-2 ${isMarked ? 'border-danger' : ''}`} key={fs.dir}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small">
                    <code>{fs.special}</code> → <code>{fs.dir}</code>
                    {fs.type && <span className="text-muted"> ({fs.type})</span>}
                    {fs.options && <span className="text-muted"> [{fs.options}]</span>}
                  </span>
                  <div className="form-check">
                    <input
                      id={`fs-remove-${fs.dir}`}
                      className="form-check-input"
                      type="checkbox"
                      checked={isMarked}
                      onChange={e => toggleRemove(fs.dir, e.target.checked)}
                      disabled={disabled}
                    />
                    <label
                      className="form-check-label small text-danger"
                      htmlFor={`fs-remove-${fs.dir}`}
                    >
                      {t('machineEdit.filesystemsEditor.remove')}
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
      <h6 className="fw-bold mt-2">{t('machineEdit.filesystemsEditor.addMount')}</h6>
      {addFilesystems.map((row, index) => (
        <div className="row g-2 align-items-end" key={row.key}>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor={`fs-special-${row.key}`}>
              {t('machineEdit.filesystemsEditor.hostDir')}
            </label>
            <input
              id={`fs-special-${row.key}`}
              className="form-control form-control-sm"
              value={row.special}
              onChange={e => setRow(index, { special: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor={`fs-dir-${row.key}`}>
              {t('machineEdit.filesystemsEditor.mountPoint')}
            </label>
            <input
              id={`fs-dir-${row.key}`}
              className="form-control form-control-sm"
              value={row.dir}
              onChange={e => setRow(index, { dir: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="col-4 col-md-2">
            <label className="form-label small mb-1" htmlFor={`fs-type-${row.key}`}>
              {t('machineEdit.filesystemsEditor.type')}
            </label>
            <input
              id={`fs-type-${row.key}`}
              className="form-control form-control-sm"
              placeholder="lofs"
              value={row.type}
              onChange={e => setRow(index, { type: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1" htmlFor={`fs-options-${row.key}`}>
              {t('machineEdit.filesystemsEditor.options')}
            </label>
            <input
              id={`fs-options-${row.key}`}
              className="form-control form-control-sm"
              placeholder="e.g. ro"
              value={row.options}
              onChange={e => setRow(index, { options: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              aria-label={t('machineEdit.filesystemsEditor.removeRow')}
              onClick={() => onAddChange(addFilesystems.filter(entry => entry.key !== row.key))}
              disabled={disabled}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() =>
            onAddChange([
              ...addFilesystems,
              { key: `fs-${Date.now()}`, special: '', dir: '', type: '', options: '' },
            ])
          }
          disabled={disabled}
        >
          <i className="fas fa-plus me-2" />
          {t('machineEdit.filesystemsEditor.addMount')}
        </button>
      </div>
    </div>
  );
};

FilesystemsEditor.propTypes = {
  currentFilesystems: PropTypes.array.isRequired,
  addFilesystems: PropTypes.array.isRequired,
  onAddChange: PropTypes.func.isRequired,
  removeFilesystems: PropTypes.array.isRequired,
  onRemoveChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default FilesystemsEditor;
