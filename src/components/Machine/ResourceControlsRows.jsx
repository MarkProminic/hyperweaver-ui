import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The row-editor families of the Resources tab (rctls / admins / virtfs / ppt) —
 * MECHANICAL split from ResourceControlsEditor (500-line rule): JSX moved verbatim,
 * closed-over identifiers became same-named props. State stays in the editor.
 */

export const RctlRows = ({ seedRctls, rctlRemoves, onToggleRemove, rctlAdds, setRctlAdds }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.rctls')}</h6>
      {seedRctls.map(row => (
        <div key={row.name} className="d-flex align-items-center gap-2 small hw-topo-mono py-1">
          <span className="text-truncate">
            {row.name} = {row.limit} ({row.priv || 'privileged'}/{row.action || 'deny'})
          </span>
          <button
            type="button"
            className={`btn btn-sm ${rctlRemoves.includes(row.name) ? 'btn-danger' : 'btn-outline-danger'} ms-auto`}
            title={t('machineEdit.resources.markRemove')}
            onClick={() => onToggleRemove(row.name)}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      ))}
      {rctlAdds.map((row, index) => (
        <div key={`rctl-${String(index)}`} className="row g-2 align-items-center mb-1">
          {['name', 'limit', 'priv', 'action'].map(key => (
            <div className="col" key={key}>
              <input
                className="form-control form-control-sm"
                placeholder={t(`machineEdit.resources.rctl_${key}`)}
                aria-label={t(`machineEdit.resources.rctl_${key}`)}
                value={row[key]}
                onChange={event =>
                  setRctlAdds(prev =>
                    prev.map((entry, i) =>
                      i === index ? { ...entry, [key]: event.target.value } : entry
                    )
                  )
                }
              />
            </div>
          ))}
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              title={t('machineEdit.resources.dropRow')}
              onClick={() =>
                setRctlAdds(prev => [...prev.slice(0, index), ...prev.slice(index + 1)])
              }
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary mb-3"
        onClick={() =>
          setRctlAdds(prev => [...prev, { name: '', limit: '', priv: '', action: '' }])
        }
      >
        <i className="fas fa-plus me-1" />
        {t('machineEdit.resources.addRctl')}
      </button>
    </>
  );
};

RctlRows.propTypes = {
  seedRctls: PropTypes.array.isRequired,
  rctlRemoves: PropTypes.array.isRequired,
  onToggleRemove: PropTypes.func.isRequired,
  rctlAdds: PropTypes.array.isRequired,
  setRctlAdds: PropTypes.func.isRequired,
};

export const AdminRows = ({
  seedAdmins,
  adminRemoves,
  onToggleRemove,
  adminAdds,
  setAdminAdds,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.admins')}</h6>
      {seedAdmins.map(row => (
        <div key={row.user} className="d-flex align-items-center gap-2 small hw-topo-mono py-1">
          <span className="text-truncate">
            {row.user}: {row.auths}
          </span>
          <button
            type="button"
            className={`btn btn-sm ${adminRemoves.includes(row.user) ? 'btn-danger' : 'btn-outline-danger'} ms-auto`}
            title={t('machineEdit.resources.markRemove')}
            onClick={() => onToggleRemove(row.user)}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      ))}
      {adminAdds.map((row, index) => (
        <div key={`admin-${String(index)}`} className="row g-2 align-items-center mb-1">
          {['user', 'auths'].map(key => (
            <div className="col" key={key}>
              <input
                className="form-control form-control-sm"
                placeholder={t(`machineEdit.resources.admin_${key}`)}
                aria-label={t(`machineEdit.resources.admin_${key}`)}
                value={row[key]}
                onChange={event =>
                  setAdminAdds(prev =>
                    prev.map((entry, i) =>
                      i === index ? { ...entry, [key]: event.target.value } : entry
                    )
                  )
                }
              />
            </div>
          ))}
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              title={t('machineEdit.resources.dropRow')}
              onClick={() =>
                setAdminAdds(prev => [...prev.slice(0, index), ...prev.slice(index + 1)])
              }
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary mb-3"
        onClick={() => setAdminAdds(prev => [...prev, { user: '', auths: '' }])}
      >
        <i className="fas fa-plus me-1" />
        {t('machineEdit.resources.addAdmin')}
      </button>
    </>
  );
};

AdminRows.propTypes = {
  seedAdmins: PropTypes.array.isRequired,
  adminRemoves: PropTypes.array.isRequired,
  onToggleRemove: PropTypes.func.isRequired,
  adminAdds: PropTypes.array.isRequired,
  setAdminAdds: PropTypes.func.isRequired,
};

export const VirtfsRows = ({ virtfsRows, setVirtfsRows, setVirtfsDirty }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.virtfs')}</h6>
      <p className="form-text mt-0 mb-1">{t('machineEdit.resources.virtfsNote')}</p>
      {virtfsRows.map((row, index) => (
        <div key={`virtfs-${String(index)}`} className="row g-2 align-items-center mb-1">
          <div className="col-3">
            <input
              className="form-control form-control-sm"
              placeholder={t('machineEdit.resources.shareName')}
              aria-label={t('machineEdit.resources.shareName')}
              value={row.name}
              onChange={event => {
                setVirtfsDirty(true);
                setVirtfsRows(prev =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, name: event.target.value } : entry
                  )
                );
              }}
            />
          </div>
          <div className="col">
            <input
              className="form-control form-control-sm hw-topo-mono"
              placeholder={t('machineEdit.resources.sharePath')}
              aria-label={t('machineEdit.resources.sharePath')}
              value={row.path}
              onChange={event => {
                setVirtfsDirty(true);
                setVirtfsRows(prev =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, path: event.target.value } : entry
                  )
                );
              }}
            />
          </div>
          <div className="col-auto form-check ms-2">
            <input
              id={`hw-virtfs-ro-${String(index)}`}
              className="form-check-input"
              type="checkbox"
              checked={row.ro}
              onChange={event => {
                setVirtfsDirty(true);
                setVirtfsRows(prev =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, ro: event.target.checked } : entry
                  )
                );
              }}
            />
            <label className="form-check-label" htmlFor={`hw-virtfs-ro-${String(index)}`}>
              {t('machineEdit.resources.readOnly')}
            </label>
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              title={t('machineEdit.resources.dropRow')}
              onClick={() => {
                setVirtfsDirty(true);
                setVirtfsRows(prev => [...prev.slice(0, index), ...prev.slice(index + 1)]);
              }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary mb-3"
        onClick={() => {
          setVirtfsDirty(true);
          setVirtfsRows(prev => [...prev, { name: '', path: '', ro: false }]);
        }}
      >
        <i className="fas fa-plus me-1" />
        {t('machineEdit.resources.addShare')}
      </button>
    </>
  );
};

VirtfsRows.propTypes = {
  virtfsRows: PropTypes.array.isRequired,
  setVirtfsRows: PropTypes.func.isRequired,
  setVirtfsDirty: PropTypes.func.isRequired,
};

export const PptRows = ({ pptRows, setPptRows, setPptDirty }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.ppt')}</h6>
      <p className="form-text mt-0 mb-1">{t('machineEdit.resources.pptNote')}</p>
      {pptRows.map((row, index) => (
        <div key={`ppt-${String(index)}`} className="row g-2 align-items-center mb-1">
          <div className="col-3">
            <input
              className="form-control form-control-sm hw-topo-mono"
              placeholder="ppt0"
              aria-label={t('machineEdit.resources.pptDevice')}
              value={row.device}
              onChange={event => {
                setPptDirty(true);
                setPptRows(prev =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, device: event.target.value } : entry
                  )
                );
              }}
            />
          </div>
          <div className="col-3">
            <input
              className="form-control form-control-sm"
              placeholder={t('machineEdit.resources.pptState')}
              aria-label={t('machineEdit.resources.pptState')}
              value={row.state}
              onChange={event => {
                setPptDirty(true);
                setPptRows(prev =>
                  prev.map((entry, i) =>
                    i === index ? { ...entry, state: event.target.value } : entry
                  )
                );
              }}
            />
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              title={t('machineEdit.resources.dropRow')}
              onClick={() => {
                setPptDirty(true);
                setPptRows(prev => [...prev.slice(0, index), ...prev.slice(index + 1)]);
              }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-primary mb-3"
        onClick={() => {
          setPptDirty(true);
          setPptRows(prev => [...prev, { device: '', state: '' }]);
        }}
      >
        <i className="fas fa-plus me-1" />
        {t('machineEdit.resources.addPpt')}
      </button>
    </>
  );
};

PptRows.propTypes = {
  pptRows: PropTypes.array.isRequired,
  setPptRows: PropTypes.func.isRequired,
  setPptDirty: PropTypes.func.isRequired,
};
