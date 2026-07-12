import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { useServers } from '../../contexts/ServerContext';

/**
 * DNS resolver editor — GET/PUT /system/dns. Parsed fields or the raw
 * resolv.conf (raw wins on the wire); the agent writes a timestamped
 * backup before every change.
 */

const linesFrom = list => (Array.isArray(list) ? list.join('\n') : '');
const listFrom = text =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

const DnsSettings = ({ server, onError }) => {
  const { makeAgentRequest } = useServers();
  const [nameservers, setNameservers] = useState('');
  const [searchDomains, setSearchDomains] = useState('');
  const [domain, setDomain] = useState('');
  const [options, setOptions] = useState('');
  const [raw, setRaw] = useState('');
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
      'system/dns'
    );
    if (result.success) {
      setNameservers(linesFrom(result.data?.nameservers));
      setSearchDomains(linesFrom(result.data?.search_domains));
      setDomain(result.data?.domain || '');
      setOptions(linesFrom(result.data?.options));
      setRaw(result.data?.raw || '');
    } else {
      onError(`Failed to load the DNS configuration: ${result.message}`);
    }
    setLoading(false);
  }, [server, makeAgentRequest, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const body = rawMode
      ? { raw }
      : {
          nameservers: listFrom(nameservers),
          search_domains: listFrom(searchDomains),
          options: listFrom(options),
          ...(domain.trim() && { domain: domain.trim() }),
        };
    setSaving(true);
    setMsg('');
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'system/dns',
      'PUT',
      body
    );
    setSaving(false);
    if (!result.success) {
      onError(`Failed to save the DNS configuration: ${result.message}`);
      return;
    }
    setMsg(
      result.data?.backup
        ? `Saved — the previous file was backed up to ${result.data.backup}.`
        : 'Saved.'
    );
    load();
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 className="fs-6 fw-bold mb-0">
            <i className="fas fa-route me-2" />
            DNS Resolver
          </h3>
          <div className="d-flex gap-2">
            <div className="form-check form-switch align-self-center">
              <input
                id="dns-raw-mode"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={rawMode}
                onChange={e => setRawMode(e.target.checked)}
                disabled={loading || saving}
              />
              <label className="form-check-label" htmlFor="dns-raw-mode">
                Edit raw file
              </label>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={load}
              disabled={loading || saving}
            >
              <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={save}
              disabled={loading || saving}
            >
              <i className={`fas ${saving ? 'fa-spinner fa-pulse' : 'fa-save'} me-2`} />
              Save
            </button>
          </div>
        </div>

        {msg && <div className="alert alert-success py-2">{msg}</div>}
        <p className="form-text text-muted mt-0">
          A timestamped backup of the current file is written before every save.
          {rawMode
            ? ' Raw mode saves the file text verbatim.'
            : ' The parsed fields rewrite the file; one value per line in the list fields.'}
        </p>

        {rawMode ? (
          <textarea
            className="form-control font-monospace"
            rows={10}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            disabled={loading || saving}
            aria-label="Raw resolver configuration"
          />
        ) : (
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="dns-nameservers">
                Nameservers (one per line)
              </label>
              <textarea
                id="dns-nameservers"
                className="form-control font-monospace"
                rows={4}
                placeholder={'e.g.\n8.8.8.8\n1.1.1.1'}
                value={nameservers}
                onChange={e => setNameservers(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="dns-search-domains">
                Search domains (one per line)
              </label>
              <textarea
                id="dns-search-domains"
                className="form-control font-monospace"
                rows={4}
                value={searchDomains}
                onChange={e => setSearchDomains(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="dns-domain">
                Domain
              </label>
              <input
                id="dns-domain"
                className="form-control font-monospace"
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                disabled={loading || saving}
              />
              <label className="form-label mt-3" htmlFor="dns-options">
                Options (one per line)
              </label>
              <textarea
                id="dns-options"
                className="form-control font-monospace"
                rows={2}
                placeholder="e.g. ndots:2"
                value={options}
                onChange={e => setOptions(e.target.value)}
                disabled={loading || saving}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

DnsSettings.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }).isRequired,
  onError: PropTypes.func.isRequired,
};

export default DnsSettings;
