import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../contexts/ServerContext';

/**
 * /etc/hosts editor — GET/PUT /system/hosts. Structured rows or the raw
 * file (raw wins on the wire); the agent writes a timestamped backup
 * before every change.
 */

const rowsFrom = entries =>
  (Array.isArray(entries) ? entries : []).map((entry, index) => ({
    key: `row-${index}-${entry.ip}`,
    ip: entry.ip || '',
    hostnames: (Array.isArray(entry.hostnames) ? entry.hostnames : []).join(' '),
  }));

const HostsFileEditor = ({ server, onError }) => {
  const { t } = useTranslation();
  const { makeAgentRequest } = useServers();
  const [rows, setRows] = useState([]);
  const [raw, setRaw] = useState('');
  const [path, setPath] = useState('');
  const [rawMode, setRawMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'system/hosts'
    );
    if (result.success) {
      setRows(rowsFrom(result.data?.entries));
      setRaw(result.data?.raw || '');
      setPath(result.data?.path || '');
    } else {
      onError(t('host.hostsFileEditor.errors.loadFailed', { message: result.message }));
    }
    setLoading(false);
  }, [server, makeAgentRequest, onError, t]);

  useEffect(() => {
    load();
  }, [load]);

  const setRow = (index, field, value) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const addRow = () =>
    setRows(prev => [...prev, { key: `new-${Date.now()}`, ip: '', hostnames: '' }]);
  const deleteRow = key => setRows(prev => prev.filter(row => row.key !== key));

  const save = async () => {
    const body = rawMode
      ? { raw }
      : {
          entries: rows
            .filter(row => row.ip.trim() && row.hostnames.trim())
            .map(row => ({
              ip: row.ip.trim(),
              hostnames: row.hostnames.trim().split(/\s+/u),
            })),
        };
    setSaving(true);
    setMsg('');
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'system/hosts',
      'PUT',
      body
    );
    setSaving(false);
    if (!result.success) {
      onError(t('host.hostsFileEditor.errors.saveFailed', { message: result.message }));
      return;
    }
    setMsg(
      result.data?.backup
        ? t('host.hostsFileEditor.savedWithBackup', { backup: result.data.backup })
        : t('host.hostsFileEditor.saved')
    );
    load();
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 className="fs-6 fw-bold mb-0">
            <i className="fas fa-address-book me-2" />
            {t('host.hostsFileEditor.hostsFile')}
            {path && <code className="small ms-2">{path}</code>}
          </h3>
          <div className="d-flex gap-2">
            <div className="form-check form-switch align-self-center">
              <input
                id="hosts-raw-mode"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={rawMode}
                onChange={e => setRawMode(e.target.checked)}
                disabled={loading || saving}
              />
              <label className="form-check-label" htmlFor="hosts-raw-mode">
                {t('host.hostsFileEditor.editRawFile')}
              </label>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={load}
              disabled={loading || saving}
            >
              <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`} />
              {t('host.hostsFileEditor.refresh')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={save}
              disabled={loading || saving}
            >
              <i className={`fas ${saving ? 'fa-spinner fa-pulse' : 'fa-save'} me-2`} />
              {t('host.hostsFileEditor.save')}
            </button>
          </div>
        </div>

        {msg && <div className="alert alert-success py-2">{msg}</div>}
        <p className="form-text text-muted mt-0">
          {t('host.hostsFileEditor.backupNote')}
          {rawMode
            ? t('host.hostsFileEditor.rawModeNote')
            : t('host.hostsFileEditor.tableModeNote')}
        </p>

        {rawMode ? (
          <textarea
            className="form-control font-monospace"
            rows={12}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            disabled={loading || saving}
            aria-label={t('host.hostsFileEditor.rawAriaLabel')}
          />
        ) : (
          <>
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '30%' }}>
                    {t('host.hostsFileEditor.ipAddress')}
                  </th>
                  <th scope="col">{t('host.hostsFileEditor.hostnames')}</th>
                  <th
                    scope="col"
                    style={{ width: '1%' }}
                    aria-label={t('host.hostsFileEditor.actions')}
                  />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key}>
                    <td>
                      <input
                        className="form-control form-control-sm font-monospace"
                        type="text"
                        value={row.ip}
                        onChange={e => setRow(index, 'ip', e.target.value)}
                        disabled={loading || saving}
                        aria-label={t('host.hostsFileEditor.entryIpAriaLabel', {
                          number: index + 1,
                        })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm font-monospace"
                        type="text"
                        value={row.hostnames}
                        onChange={e => setRow(index, 'hostnames', e.target.value)}
                        disabled={loading || saving}
                        aria-label={t('host.hostsFileEditor.entryHostnamesAriaLabel', {
                          number: index + 1,
                        })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteRow(row.key)}
                        disabled={loading || saving}
                        title={t('host.hostsFileEditor.removeEntry')}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addRow}
              disabled={loading || saving}
            >
              <i className="fas fa-plus me-2" />
              {t('host.hostsFileEditor.addEntry')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

HostsFileEditor.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default HostsFileEditor;
