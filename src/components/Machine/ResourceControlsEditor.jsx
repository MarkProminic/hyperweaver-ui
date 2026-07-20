import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The zonecfg resource-control families (zoneweaver slices 2+3, sync
 * 2026-07-19), riding the existing PUT /machines/{name} modify wire:
 * capped_cpu / capped_memory / dedicated_cpu / security_flags (object
 * replaces, explicit null removes, absent untouched) · rctls/admins
 * (replace-by-key + remove lists) · fs_allowed ('' clears) · virtfs and
 * ppt (whole-set replace, [] clears). Seeds from knob_current (current
 * values in the PUT vocabulary); emits a changed-only fragment upward via
 * onChanges — null when untouched.
 */

const TriSelect = ({ id, mode, setMode, hasCurrent }) => {
  const { t } = useTranslation();
  return (
    <select
      id={id}
      className="form-select form-select-sm w-auto"
      value={mode}
      onChange={event => setMode(event.target.value)}
    >
      <option value="">{t('machineEdit.resources.unchanged')}</option>
      <option value="set">{t('machineEdit.resources.setOption')}</option>
      {hasCurrent && <option value="remove">{t('machineEdit.resources.removeOption')}</option>}
    </select>
  );
};

TriSelect.propTypes = {
  id: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  hasCurrent: PropTypes.bool,
};

const currentLine = value =>
  value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');

const cleanObject = entries => {
  const cleaned = Object.fromEntries(
    Object.entries(entries)
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

const ResourceControlsEditor = ({ knobCurrent, onChanges, disabled = false }) => {
  const { t } = useTranslation();
  const seed = useMemo(
    () => ({
      cappedCpu: knobCurrent?.capped_cpu ?? null,
      cappedMemory: knobCurrent?.capped_memory ?? null,
      dedicatedCpu: knobCurrent?.dedicated_cpu ?? null,
      securityFlags: knobCurrent?.security_flags ?? null,
      fsAllowed: knobCurrent?.fs_allowed ?? null,
      rctls: Array.isArray(knobCurrent?.rctls) ? knobCurrent.rctls : [],
      admins: Array.isArray(knobCurrent?.admins) ? knobCurrent.admins : [],
      virtfs: Array.isArray(knobCurrent?.virtfs) ? knobCurrent.virtfs : [],
      ppt: Array.isArray(knobCurrent?.ppt) ? knobCurrent.ppt : [],
    }),
    [knobCurrent]
  );

  const [cappedCpu, setCappedCpu] = useState({ mode: '', ncpus: '' });
  const [cappedMemory, setCappedMemory] = useState({
    mode: '',
    physical: '',
    swap: '',
    locked: '',
  });
  const [dedicatedCpu, setDedicatedCpu] = useState({ mode: '', ncpus: '', importance: '' });
  const [securityFlags, setSecurityFlags] = useState({
    mode: '',
    default: '',
    lower: '',
    upper: '',
  });
  const [fsAllowed, setFsAllowed] = useState({ mode: '', value: '' });
  const [rctlAdds, setRctlAdds] = useState([]);
  const [rctlRemoves, setRctlRemoves] = useState([]);
  const [adminAdds, setAdminAdds] = useState([]);
  const [adminRemoves, setAdminRemoves] = useState([]);
  const [virtfsRows, setVirtfsRows] = useState(
    seed.virtfs.map(row => ({ name: row.name || '', path: row.path || '', ro: Boolean(row.ro) }))
  );
  const [virtfsDirty, setVirtfsDirty] = useState(false);
  const [pptRows, setPptRows] = useState(
    seed.ppt.map(row => ({ device: row.device || '', state: row.state || '' }))
  );
  const [pptDirty, setPptDirty] = useState(false);

  const changes = useMemo(() => {
    const built = {};
    if (cappedCpu.mode === 'set' && cappedCpu.ncpus.trim()) {
      built.capped_cpu = { ncpus: Number(cappedCpu.ncpus) };
    } else if (cappedCpu.mode === 'remove') {
      built.capped_cpu = null;
    }

    if (cappedMemory.mode === 'set') {
      const body = cleanObject({
        physical: cappedMemory.physical,
        swap: cappedMemory.swap,
        locked: cappedMemory.locked,
      });
      if (body) {
        built.capped_memory = body;
      }
    } else if (cappedMemory.mode === 'remove') {
      built.capped_memory = null;
    }
    if (dedicatedCpu.mode === 'set' && dedicatedCpu.ncpus.trim()) {
      built.dedicated_cpu = {
        ncpus: dedicatedCpu.ncpus.trim(),
        ...(dedicatedCpu.importance.trim() ? { importance: Number(dedicatedCpu.importance) } : {}),
      };
    } else if (dedicatedCpu.mode === 'remove') {
      built.dedicated_cpu = null;
    }
    if (securityFlags.mode === 'set') {
      const body = cleanObject({
        default: securityFlags.default,
        lower: securityFlags.lower,
        upper: securityFlags.upper,
      });
      if (body) {
        built.security_flags = body;
      }
    } else if (securityFlags.mode === 'remove') {
      built.security_flags = null;
    }
    if (fsAllowed.mode === 'set' && fsAllowed.value.trim()) {
      built.fs_allowed = fsAllowed.value.trim();
    } else if (fsAllowed.mode === 'remove') {
      built.fs_allowed = null;
    }
    const rctls = rctlAdds
      .filter(row => row.name.trim() && row.limit.trim())
      .map(row => ({
        name: row.name.trim(),
        limit: row.limit.trim(),
        ...(row.priv.trim() ? { priv: row.priv.trim() } : {}),
        ...(row.action.trim() ? { action: row.action.trim() } : {}),
      }));
    if (rctls.length > 0) {
      built.rctls = rctls;
    }
    if (rctlRemoves.length > 0) {
      built.remove_rctls = rctlRemoves;
    }
    const admins = adminAdds
      .filter(row => row.user.trim() && row.auths.trim())
      .map(row => ({ user: row.user.trim(), auths: row.auths.trim() }));
    if (admins.length > 0) {
      built.admins = admins;
    }
    if (adminRemoves.length > 0) {
      built.remove_admins = adminRemoves;
    }
    if (virtfsDirty) {
      built.virtfs = virtfsRows
        .filter(row => row.name.trim() && row.path.trim())
        .map(row => ({
          name: row.name.trim(),
          path: row.path.trim(),
          ...(row.ro ? { ro: true } : {}),
        }));
    }
    if (pptDirty) {
      built.ppt = pptRows
        .filter(row => row.device.trim())
        .map(row => ({
          device: row.device.trim(),
          ...(row.state.trim() ? { state: row.state.trim() } : {}),
        }));
    }
    return Object.keys(built).length > 0 ? built : null;
  }, [
    cappedCpu,
    cappedMemory,
    dedicatedCpu,
    securityFlags,
    fsAllowed,
    rctlAdds,
    rctlRemoves,
    adminAdds,
    adminRemoves,
    virtfsRows,
    virtfsDirty,
    pptRows,
    pptDirty,
  ]);

  useEffect(() => {
    onChanges(changes);
  }, [changes, onChanges]);

  const toggleRemove = (list, setList) => name =>
    setList(list.includes(name) ? list.filter(entry => entry !== name) : [...list, name]);

  return (
    <fieldset disabled={disabled}>
      <p className="form-text text-muted">{t('machineEdit.resources.hint')}</p>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <h6 className="fw-bold">{t('machineEdit.resources.cappedCpu')}</h6>
          <p className="form-text mt-0 mb-1">
            {t('machineEdit.resources.current')}: {currentLine(seed.cappedCpu) || '—'}
          </p>
          <div className="d-flex gap-2 align-items-center">
            <TriSelect
              id="hw-res-capped-cpu"
              mode={cappedCpu.mode}
              setMode={mode => setCappedCpu(prev => ({ ...prev, mode }))}
              hasCurrent={Boolean(seed.cappedCpu)}
            />
            {cappedCpu.mode === 'set' && (
              <input
                className="form-control form-control-sm w-auto"
                placeholder={t('machineEdit.resources.ncpus')}
                aria-label={t('machineEdit.resources.ncpus')}
                value={cappedCpu.ncpus}
                onChange={event => setCappedCpu(prev => ({ ...prev, ncpus: event.target.value }))}
              />
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <h6 className="fw-bold">{t('machineEdit.resources.dedicatedCpu')}</h6>
          <p className="form-text mt-0 mb-1">
            {t('machineEdit.resources.current')}: {currentLine(seed.dedicatedCpu) || '—'}
          </p>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <TriSelect
              id="hw-res-dedicated-cpu"
              mode={dedicatedCpu.mode}
              setMode={mode => setDedicatedCpu(prev => ({ ...prev, mode }))}
              hasCurrent={Boolean(seed.dedicatedCpu)}
            />
            {dedicatedCpu.mode === 'set' && (
              <>
                <input
                  className="form-control form-control-sm w-auto"
                  placeholder={t('machineEdit.resources.ncpusRange')}
                  aria-label={t('machineEdit.resources.ncpusRange')}
                  value={dedicatedCpu.ncpus}
                  onChange={event =>
                    setDedicatedCpu(prev => ({ ...prev, ncpus: event.target.value }))
                  }
                />
                <input
                  className="form-control form-control-sm w-auto"
                  placeholder={t('machineEdit.resources.importance')}
                  aria-label={t('machineEdit.resources.importance')}
                  value={dedicatedCpu.importance}
                  onChange={event =>
                    setDedicatedCpu(prev => ({ ...prev, importance: event.target.value }))
                  }
                />
              </>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <h6 className="fw-bold">{t('machineEdit.resources.cappedMemory')}</h6>
          <p className="form-text mt-0 mb-1">
            {t('machineEdit.resources.current')}: {currentLine(seed.cappedMemory) || '—'}
          </p>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <TriSelect
              id="hw-res-capped-memory"
              mode={cappedMemory.mode}
              setMode={mode => setCappedMemory(prev => ({ ...prev, mode }))}
              hasCurrent={Boolean(seed.cappedMemory)}
            />
            {cappedMemory.mode === 'set' &&
              ['physical', 'swap', 'locked'].map(key => (
                <input
                  key={key}
                  className="form-control form-control-sm w-auto"
                  placeholder={t(`machineEdit.resources.${key}`)}
                  aria-label={t(`machineEdit.resources.${key}`)}
                  value={cappedMemory[key]}
                  onChange={event =>
                    setCappedMemory(prev => ({ ...prev, [key]: event.target.value }))
                  }
                />
              ))}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <h6 className="fw-bold">{t('machineEdit.resources.securityFlags')}</h6>
          <p className="form-text mt-0 mb-1">
            {t('machineEdit.resources.current')}: {currentLine(seed.securityFlags) || '—'}
          </p>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <TriSelect
              id="hw-res-security-flags"
              mode={securityFlags.mode}
              setMode={mode => setSecurityFlags(prev => ({ ...prev, mode }))}
              hasCurrent={Boolean(seed.securityFlags)}
            />
            {securityFlags.mode === 'set' &&
              ['default', 'lower', 'upper'].map(key => (
                <input
                  key={key}
                  className="form-control form-control-sm w-auto"
                  placeholder={key}
                  aria-label={`${t('machineEdit.resources.securityFlags')} ${key}`}
                  value={securityFlags[key]}
                  onChange={event =>
                    setSecurityFlags(prev => ({ ...prev, [key]: event.target.value }))
                  }
                />
              ))}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <h6 className="fw-bold">{t('machineEdit.resources.fsAllowed')}</h6>
          <p className="form-text mt-0 mb-1">
            {t('machineEdit.resources.current')}: {currentLine(seed.fsAllowed) || '—'}
          </p>
          <div className="d-flex gap-2 align-items-center">
            <TriSelect
              id="hw-res-fs-allowed"
              mode={fsAllowed.mode}
              setMode={mode => setFsAllowed(prev => ({ ...prev, mode }))}
              hasCurrent={Boolean(seed.fsAllowed)}
            />
            {fsAllowed.mode === 'set' && (
              <input
                className="form-control form-control-sm"
                placeholder="ufs,pcfs"
                aria-label={t('machineEdit.resources.fsAllowed')}
                value={fsAllowed.value}
                onChange={event => setFsAllowed(prev => ({ ...prev, value: event.target.value }))}
              />
            )}
          </div>
        </div>
      </div>

      <hr />
      <h6 className="fw-bold">{t('machineEdit.resources.rctls')}</h6>
      {seed.rctls.map(row => (
        <div key={row.name} className="d-flex align-items-center gap-2 small hw-topo-mono py-1">
          <span className="text-truncate">
            {row.name} = {row.limit} ({row.priv || 'privileged'}/{row.action || 'deny'})
          </span>
          <button
            type="button"
            className={`btn btn-sm ${rctlRemoves.includes(row.name) ? 'btn-danger' : 'btn-outline-danger'} ms-auto`}
            title={t('machineEdit.resources.markRemove')}
            onClick={() => toggleRemove(rctlRemoves, setRctlRemoves)(row.name)}
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

      <h6 className="fw-bold">{t('machineEdit.resources.admins')}</h6>
      {seed.admins.map(row => (
        <div key={row.user} className="d-flex align-items-center gap-2 small hw-topo-mono py-1">
          <span className="text-truncate">
            {row.user}: {row.auths}
          </span>
          <button
            type="button"
            className={`btn btn-sm ${adminRemoves.includes(row.user) ? 'btn-danger' : 'btn-outline-danger'} ms-auto`}
            title={t('machineEdit.resources.markRemove')}
            onClick={() => toggleRemove(adminRemoves, setAdminRemoves)(row.user)}
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
    </fieldset>
  );
};

ResourceControlsEditor.propTypes = {
  knobCurrent: PropTypes.object,
  onChanges: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ResourceControlsEditor;
