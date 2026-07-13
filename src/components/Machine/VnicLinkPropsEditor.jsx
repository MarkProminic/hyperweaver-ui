import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { makeAgentRequest } from '../../api/serverUtils';

/**
 * The VNIC's dladm LINK properties — a different family from the brand's net
 * properties: this is the link itself (protection, maxbw, allowed-ips,
 * priority, mtu…). `protection` is where MAC/IP spoofing lives: the values are
 * the *no-spoof* guards (mac-nospoof, ip-nospoof, dhcp-nospoof, restricted), so
 * ALLOWING spoofing means clearing the guard, not setting a flag.
 *
 * Loads lazily on expand (GET /network/vnics/{vnic}/properties → {property,
 * value|null, default|null, possible[]}) and writes through
 * PUT /network/vnics/{vnic}/properties — its own 202 task, independent of the
 * machine's Apply pipeline.
 */

const SPOOF_GUARDS = ['mac-nospoof', 'ip-nospoof', 'dhcp-nospoof', 'restricted'];

const displayValue = row => {
  if (row.value === null || row.value === undefined || row.value === '') {
    return row.default === null || row.default === undefined || row.default === ''
      ? '(unset)'
      : `(default: ${row.default})`;
  }
  return row.value;
};

/** protection is a comma-separated guard list — render it as real toggles. */
const ProtectionRow = ({ row, value, onChange, disabled }) => {
  const active = String(value ?? row.value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  const guards = row.possible?.length > 0 ? row.possible : SPOOF_GUARDS;
  const toggle = guard => {
    const next = active.includes(guard)
      ? active.filter(entry => entry !== guard)
      : [...active, guard];
    onChange(next.join(','));
  };
  return (
    <div className="col-12">
      <span className="form-label small mb-1 d-block">
        protection <span className="text-muted">— anti-spoof guards</span>
      </span>
      <div className="d-flex flex-wrap gap-2">
        {guards.map(guard => (
          <div className="form-check" key={guard}>
            <input
              id={`vnic-protection-${guard}`}
              className="form-check-input"
              type="checkbox"
              checked={active.includes(guard)}
              onChange={() => toggle(guard)}
              disabled={disabled}
            />
            <label className="form-check-label small" htmlFor={`vnic-protection-${guard}`}>
              {guard}
            </label>
          </div>
        ))}
      </div>
      <span className="form-text text-muted small">
        These are the guards, not permissions — UNCHECK a guard to allow that spoofing (e.g. clear{' '}
        <code>mac-nospoof</code> + <code>ip-nospoof</code> for a CARP/VRRP firewall guest). All
        clear = no anti-spoof enforcement.
      </span>
    </div>
  );
};

ProtectionRow.propTypes = {
  row: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const VnicLinkPropsEditor = ({ currentServer, vnic, disabled }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [edits, setEdits] = useState({});
  const [temporary, setTemporary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!open || !currentServer || !vnic) {
      return;
    }
    setRows(null);
    setError('');
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `network/vnics/${encodeURIComponent(vnic)}/properties`
    );
    if (result.success) {
      const list = Array.isArray(result.data?.properties)
        ? result.data.properties
        : result.data?.properties || [];
      setRows(Array.isArray(list) ? list : []);
    } else {
      setRows([]);
      setError(
        `GET network/vnics/${vnic}/properties failed (${result.status ?? '?'}): ${result.message}`
      );
    }
  }, [open, currentServer, vnic]);

  useEffect(() => {
    setEdits({});
    setNotice('');
    load();
  }, [load]);

  const save = async () => {
    const properties = Object.fromEntries(
      Object.entries(edits).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(properties).length === 0) {
      setError('Nothing changed — edit a property first.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `network/vnics/${encodeURIComponent(vnic)}/properties`,
      'PUT',
      { properties, ...(temporary && { temporary: true }) }
    );
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setNotice(
      `${result.data?.message || 'Link properties queued'}${
        result.data?.task_id ? ` (task ${result.data.task_id})` : ''
      }.`
    );
    setEdits({});
    load();
  };

  const editable = (rows || []).filter(row => row.property !== 'protection');
  const protection = (rows || []).find(row => row.property === 'protection') || null;

  return (
    <div className="hw-device-row hw-device-child hw-device-child-form">
      <details className="w-100" onToggle={e => setOpen(e.currentTarget.open)}>
        <summary className="small fw-semibold">
          Link properties (dladm) — spoofing, bandwidth, MTU
        </summary>

        {error && <div className="alert alert-danger py-1 px-2 small mt-2 mb-1">{error}</div>}
        {notice && <div className="alert alert-success py-1 px-2 small mt-2 mb-1">{notice}</div>}

        {open && rows === null && !error && (
          <p className="text-muted small mt-2 mb-0">
            <i className="fas fa-spinner fa-pulse me-2" />
            Reading the link…
          </p>
        )}

        {rows !== null && rows.length > 0 && (
          <>
            <div className="row g-2 align-items-end mt-0">
              {protection && (
                <ProtectionRow
                  row={protection}
                  value={edits.protection}
                  onChange={value => setEdits(prev => ({ ...prev, protection: value }))}
                  disabled={disabled || busy}
                />
              )}
              {editable.map(row => {
                const inputId = `vnic-${vnic}-${row.property}`;
                const value = edits[row.property] ?? '';
                return (
                  <div className="col-6 col-md-3" key={row.property}>
                    <label className="form-label small mb-1" htmlFor={inputId}>
                      {row.property}
                    </label>
                    {row.possible?.length > 0 ? (
                      <select
                        id={inputId}
                        className="form-select form-select-sm"
                        value={value}
                        onChange={e =>
                          setEdits(prev => ({ ...prev, [row.property]: e.target.value }))
                        }
                        disabled={disabled || busy}
                      >
                        <option value="">{displayValue(row)}</option>
                        {row.possible.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={inputId}
                        className="form-control form-control-sm"
                        placeholder={displayValue(row)}
                        value={value}
                        onChange={e =>
                          setEdits(prev => ({ ...prev, [row.property]: e.target.value }))
                        }
                        disabled={disabled || busy}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="d-flex align-items-center gap-3 mt-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={save}
                disabled={disabled || busy}
              >
                Apply link properties
              </button>
              <div className="form-check mb-0">
                <input
                  id={`vnic-${vnic}-temporary`}
                  className="form-check-input"
                  type="checkbox"
                  checked={temporary}
                  onChange={e => setTemporary(e.target.checked)}
                  disabled={disabled || busy}
                />
                <label className="form-check-label small" htmlFor={`vnic-${vnic}-temporary`}>
                  Temporary (until the next host reboot)
                </label>
              </div>
              <span className="text-muted small">Applies to the link now — not on Apply.</span>
            </div>
          </>
        )}

        {rows !== null && rows.length === 0 && !error && (
          <p className="text-muted small mt-2 mb-0">The link reports no properties.</p>
        )}
      </details>
    </div>
  );
};

VnicLinkPropsEditor.propTypes = {
  currentServer: PropTypes.object,
  vnic: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default VnicLinkPropsEditor;
