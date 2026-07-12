import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { ContentModal } from '../common';

const formatBytes = bytes => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return '—';
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
};

const countOf = value => {
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  return null;
};

const PAGE_SIZE = 50;

/** Read-only paged row browser — the agent validates table/order_by, the
 *  UI never sends SQL. */
const TableBrowserModal = ({ server, database, table, onClose }) => {
  const { makeAgentRequest } = useServers();
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [orderBy, setOrderBy] = useState('');
  const [desc, setDesc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      setError('');
      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `database/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/rows`,
        'GET',
        null,
        {
          limit: PAGE_SIZE,
          offset,
          ...(orderBy && { order_by: desc ? `${orderBy}:desc` : orderBy }),
        }
      );
      if (cancelled) {
        return;
      }
      if (result.success) {
        setColumns(Array.isArray(result.data?.columns) ? result.data.columns : []);
        setRows(Array.isArray(result.data?.rows) ? result.data.rows : []);
        setTotal(result.data?.total ?? 0);
      } else {
        setError(result.message);
      }
      setLoading(false);
    };
    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [server, makeAgentRequest, database, table, offset, orderBy, desc]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <ContentModal isOpen onClose={onClose} title={`${database} · ${table}`} icon="fas fa-table">
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <label className="small text-muted" htmlFor="db-browse-orderby">
          Order by
        </label>
        <select
          id="db-browse-orderby"
          className="form-select form-select-sm w-auto"
          value={orderBy}
          onChange={e => {
            setOrderBy(e.target.value);
            setOffset(0);
          }}
          disabled={loading}
        >
          <option value="">(table order)</option>
          {columns.map(column => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </select>
        {orderBy && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title={desc ? 'Descending — click for ascending' : 'Ascending — click for descending'}
            onClick={() => {
              setDesc(current => !current);
              setOffset(0);
            }}
            disabled={loading}
          >
            <i className={`fas ${desc ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide'}`} />
          </button>
        )}
        <span className="ms-auto d-flex align-items-center gap-2 small">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-label="Previous page"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={loading || offset === 0}
          >
            <i className="fas fa-chevron-left" />
          </button>
          <span className="text-nowrap">
            {from}–{to} of {total.toLocaleString()}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-label="Next page"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={loading || to >= total}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </span>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && (
        <p className="text-muted mb-0">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading…
        </p>
      )}
      {!loading && !error && (
        <div className="table-responsive" style={{ maxHeight: '60vh' }}>
          <table className="table table-sm table-striped small">
            <thead>
              <tr>
                {columns.map(column => (
                  <th scope="col" key={column} className="text-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${offset + rowIndex}`}>
                  {row.map((cell, cellIndex) => {
                    const text = cell === null || cell === undefined ? '' : String(cell);
                    return (
                      <td
                        key={columns[cellIndex] || cellIndex}
                        className="text-nowrap"
                        style={{ maxWidth: '20rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={text}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="text-muted">
                    No rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ContentModal>
  );
};

TableBrowserModal.propTypes = {
  server: PropTypes.object.isRequired,
  database: PropTypes.string.isRequired,
  table: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

const DatabaseRow = ({ database, expanded, tables, onToggle, onBrowse }) => {
  const files = Array.isArray(database.files) ? database.files : [];
  const tableCount = countOf(database.tables);
  const indexCount = countOf(database.indexes);
  const totalSize =
    typeof database.size === 'number'
      ? database.size
      : files.reduce((sum, file) => sum + (typeof file.size === 'number' ? file.size : 0), 0) ||
        null;
  return (
    <div className="border rounded p-2">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-decoration-none"
          aria-label={expanded ? `Collapse ${database.name}` : `Explore ${database.name}`}
          onClick={() => onToggle(database.name)}
        >
          <i className={`fas ${expanded ? 'fa-caret-down' : 'fa-caret-right'}`} />
        </button>
        <strong>{database.name}</strong>
        {totalSize !== null && <span className="badge text-bg-info">{formatBytes(totalSize)}</span>}
        {tableCount !== null && (
          <span className="badge text-bg-secondary">{tableCount} tables</span>
        )}
        {indexCount !== null && (
          <span className="badge text-bg-secondary">{indexCount} indexes</span>
        )}
      </div>
      {files.length > 0 && (
        <table className="table table-sm small mb-0 mt-2">
          <tbody>
            {files.map(file => (
              <tr key={file.name || file.filename || file.path}>
                <td>{file.name || file.filename || file.path}</td>
                <td className="text-end">{formatBytes(file.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {expanded && !tables && (
        <p className="text-muted small mb-0 mt-2">
          <i className="fas fa-spinner fa-pulse me-2" />
          Loading tables…
        </p>
      )}
      {expanded && tables && tables.length === 0 && (
        <p className="text-muted small mb-0 mt-2">No tables reported.</p>
      )}
      {expanded && tables && tables.length > 0 && (
        <table className="table table-sm small mb-0 mt-2 align-middle">
          <thead>
            <tr>
              <th scope="col">Table</th>
              <th scope="col" className="text-end">
                Rows
              </th>
              <th scope="col" className="text-end">
                Indexes
              </th>
              <th scope="col" className="text-end" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tables.map(table => (
              <tr key={table.name}>
                <td>
                  <code className="small">{table.name}</code>
                </td>
                <td className="text-end">{Number(table.rows ?? 0).toLocaleString()}</td>
                <td className="text-end">{countOf(table.indexes) ?? '—'}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-info py-0"
                    title="Browse this table's rows (read-only)"
                    onClick={() => onBrowse(database.name, table.name)}
                  >
                    <i className="fas fa-table me-1" />
                    Browse
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

DatabaseRow.propTypes = {
  database: PropTypes.object.isRequired,
  expanded: PropTypes.bool,
  tables: PropTypes.array,
  onToggle: PropTypes.func.isRequired,
  onBrowse: PropTypes.func.isRequired,
};

const DatabasePanel = ({ server }) => {
  const { makeAgentRequest } = useServers();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [expandedDb, setExpandedDb] = useState(null);
  const [tablesByDb, setTablesByDb] = useState({});
  const [browser, setBrowser] = useState(null); // {database, table}

  const report = (text, variant) => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'database/stats'
    );
    setStats(result.success ? result.data : null);
    if (!result.success) {
      report(`Failed to load database stats: ${result.message}`, 'danger');
    }
    setLoading(false);
  }, [server, makeAgentRequest]);

  useEffect(() => {
    setMsg('');
    setExpandedDb(null);
    setTablesByDb({});
    setBrowser(null);
    load();
  }, [load]);

  const toggleExplore = async name => {
    if (expandedDb === name) {
      setExpandedDb(null);
      return;
    }
    setExpandedDb(name);
    if (tablesByDb[name]) {
      return;
    }
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      `database/${encodeURIComponent(name)}/tables`
    );
    if (result.success) {
      setTablesByDb(prev => ({
        ...prev,
        [name]: Array.isArray(result.data?.tables) ? result.data.tables : [],
      }));
    } else {
      setTablesByDb(prev => ({ ...prev, [name]: [] }));
      report(`Failed to list tables for ${name}: ${result.message}`, 'danger');
    }
  };

  const runMaintenance = async action => {
    setBusy(action);
    setMsg('');
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      `database/${action}`,
      'POST'
    );
    setBusy('');
    if (!result.success) {
      report(`${action} failed: ${result.message}`, 'danger');
      return;
    }
    const data = result.data || {};
    if (action === 'vacuum' && Array.isArray(data.databases)) {
      const perDb = data.databases
        .map(entry => `${entry.name}: ${formatBytes(entry.space_reclaimed)}`)
        .join(', ');
      report(
        `Vacuum complete — reclaimed ${formatBytes(data.total_reclaimed)} (${perDb}).`,
        'success'
      );
    } else {
      report(data.message || `${action} complete.`, 'success');
    }
    load();
  };

  const databases = Array.isArray(stats?.databases) ? stats.databases : [];

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 className="fs-6 fw-bold mb-0">
            <i className="fas fa-database me-2" />
            Agent Databases
          </h3>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={load}
              disabled={loading || busy !== ''}
            >
              <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => runMaintenance('vacuum')}
              disabled={loading || busy !== ''}
              title="Rebuild the database files to reclaim free space"
            >
              <i className={`fas ${busy === 'vacuum' ? 'fa-spinner fa-pulse' : 'fa-broom'} me-2`} />
              Vacuum
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => runMaintenance('analyze')}
              disabled={loading || busy !== ''}
              title="Refresh the query planner statistics"
            >
              <i
                className={`fas ${busy === 'analyze' ? 'fa-spinner fa-pulse' : 'fa-magnifying-glass-chart'} me-2`}
              />
              Analyze
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={() => runMaintenance('cleanup')}
              disabled={loading || busy !== ''}
              title="Prune expired rows per the retention settings"
            >
              <i
                className={`fas ${busy === 'cleanup' ? 'fa-spinner fa-pulse' : 'fa-trash-arrow-up'} me-2`}
              />
              Cleanup
            </button>
          </div>
        </div>

        {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

        {stats && (
          <p className="form-text text-muted mt-0">
            {typeof stats.total_size === 'number' && (
              <span className="me-3">
                Total size: <strong>{formatBytes(stats.total_size)}</strong>
              </span>
            )}
            {typeof stats.total_tables === 'number' && (
              <span className="me-3">
                Tables: <strong>{stats.total_tables}</strong>
              </span>
            )}
            {typeof stats.total_rows === 'number' && (
              <span>
                Rows: <strong>{stats.total_rows.toLocaleString()}</strong>
              </span>
            )}
          </p>
        )}

        {!loading && databases.length === 0 && (
          <p className="text-muted small mb-0">No database statistics reported.</p>
        )}
        <div className="d-flex flex-column gap-2">
          {databases.map(database => (
            <DatabaseRow
              key={database.name}
              database={database}
              expanded={expandedDb === database.name}
              tables={tablesByDb[database.name] || null}
              onToggle={toggleExplore}
              onBrowse={(db, table) => setBrowser({ database: db, table })}
            />
          ))}
        </div>
      </div>

      {browser && (
        <TableBrowserModal
          server={server}
          database={browser.database}
          table={browser.table}
          onClose={() => setBrowser(null)}
        />
      )}
    </div>
  );
};

DatabasePanel.propTypes = {
  server: PropTypes.object,
};

export default DatabasePanel;
