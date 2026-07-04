import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

import { useServers } from '../../contexts/ServerContext';
import { resourceLabel } from '../../utils/resourceLabel';

/**
 * BulkActionsModal — the Proxmox-style bulk power flow (contract §2 / I2D-2/3).
 *
 * Scope = the `servers` passed in: one host (host-scope) or many (Datacenter-scope, where the
 * Node column + filter become the cross-host "union" selector). Candidates are fetched per
 * server (`stats`) and pre-filtered by the action (Start→stopped, Shutdown/Restart→running).
 * The operator ticks targets and confirms; the button names the count. No floating bar, no
 * tree checkboxes — bulk is deliberate and lives here.
 */
const ACTIONS = {
  start: { verb: 'Start', icon: 'fas fa-play', variant: 'success', wantRunning: false },
  stop: { verb: 'Shutdown', icon: 'fas fa-stop', variant: 'danger', wantRunning: true },
  restart: { verb: 'Restart', icon: 'fas fa-redo', variant: 'warning', wantRunning: true },
};

const keyFor = (server, name) => `${server.id ?? server.hostname}:${name}`;

const BulkActionsModal = ({ show, onClose, action, servers }) => {
  const { makeAgentRequest, startZone, stopZone, restartZone } = useServers();
  const cfg = ACTIONS[action] || ACTIONS.start;
  const multiHost = servers.length > 1;
  const noun = resourceLabel(servers, { plural: true }).toLowerCase();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(() => new Set());
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nodeFilter, setNodeFilter] = useState('all');

  // Fetch each in-scope host's machines when the modal opens; preselect the action-relevant set.
  useEffect(() => {
    if (!show) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setStatusFilter(cfg.wantRunning ? 'running' : 'stopped');
    setNameFilter('');
    setNodeFilter('all');

    Promise.all(
      servers.map(server =>
        makeAgentRequest(server.hostname, server.port, server.protocol, 'stats')
          .then(res =>
            res.success
              ? (res.data.allzones || []).map(name => ({
                  server,
                  name,
                  running: (res.data.runningzones || []).includes(name),
                }))
              : []
          )
          .catch(() => [])
      )
    ).then(perServer => {
      if (cancelled) {
        return;
      }
      const all = perServer.flat();
      setCandidates(all);
      // Preselect the machines this action applies to (running for stop/restart, stopped for start).
      setChecked(
        new Set(all.filter(c => c.running === cfg.wantRunning).map(c => keyFor(c.server, c.name)))
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [show, servers, action, cfg.wantRunning, makeAgentRequest]);

  const visible = useMemo(
    () =>
      candidates.filter(c => {
        if (nameFilter && !c.name.toLowerCase().includes(nameFilter.toLowerCase())) {
          return false;
        }
        if (statusFilter === 'running' && !c.running) {
          return false;
        }
        if (statusFilter === 'stopped' && c.running) {
          return false;
        }
        if (nodeFilter !== 'all' && (c.server.id ?? c.server.hostname) !== nodeFilter) {
          return false;
        }
        return true;
      }),
    [candidates, nameFilter, statusFilter, nodeFilter]
  );

  const visibleKeys = visible.map(c => keyFor(c.server, c.name));
  const allVisibleChecked = visibleKeys.length > 0 && visibleKeys.every(k => checked.has(k));
  const checkedCount = checked.size;

  const toggleOne = key =>
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const toggleAllVisible = () =>
    setChecked(prev => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        visibleKeys.forEach(k => next.delete(k));
      } else {
        visibleKeys.forEach(k => next.add(k));
      }
      return next;
    });

  const runFn = useCallback(
    (server, name) => {
      const args = [server.hostname, server.port, server.protocol, name];
      if (action === 'stop') {
        return stopZone(...args);
      }
      if (action === 'restart') {
        return restartZone(...args);
      }
      return startZone(...args);
    },
    [action, startZone, stopZone, restartZone]
  );

  const handleConfirm = async () => {
    const targets = candidates.filter(c => checked.has(keyFor(c.server, c.name)));
    if (targets.length === 0) {
      return;
    }
    setRunning(true);
    setError('');
    const results = await Promise.all(
      targets.map(c =>
        runFn(c.server, c.name)
          .then(r => (r && r.success === false ? `${c.name}: ${r.message || 'failed'}` : null))
          .catch(e => `${c.name}: ${e.message || 'error'}`)
      )
    );
    setRunning(false);
    const failures = results.filter(Boolean);
    if (failures.length > 0) {
      setError(`${failures.length} failed — ${failures.join('; ')}`);
    } else {
      onClose();
    }
  };

  return (
    <Modal show={show} onHide={running ? undefined : onClose} size="lg" centered scrollable>
      <Modal.Header closeButton={!running}>
        <Modal.Title>
          <i className={`${cfg.icon} me-2`} />
          Bulk {cfg.verb} — {noun}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            className="form-control form-control-sm w-auto"
            placeholder="Filter by name…"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            disabled={loading || running}
          />
          <select
            className="form-select form-select-sm w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            disabled={loading || running}
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
          {multiHost && (
            <select
              className="form-select form-select-sm w-auto"
              value={nodeFilter}
              onChange={e => setNodeFilter(e.target.value)}
              disabled={loading || running}
            >
              <option value="all">All hosts</option>
              {servers.map(server => (
                <option key={server.id ?? server.hostname} value={server.id ?? server.hostname}>
                  {server.entityName || server.hostname}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="text-center text-muted py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading machines…
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: '2rem' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allVisibleChecked}
                      onChange={toggleAllVisible}
                      disabled={running || visible.length === 0}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Name</th>
                  {multiHost && <th>Host</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={multiHost ? 4 : 3} className="text-center text-muted py-3">
                      No matching machines
                    </td>
                  </tr>
                )}
                {visible.map(c => {
                  const k = keyFor(c.server, c.name);
                  return (
                    <tr key={k}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked.has(k)}
                          onChange={() => toggleOne(k)}
                          disabled={running}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td>{c.name}</td>
                      {multiHost && <td>{c.server.entityName || c.server.hostname}</td>}
                      <td>
                        <span className={c.running ? 'text-success' : 'text-secondary'}>
                          <i className={`${c.running ? 'fas' : 'far'} fa-circle fa-xs me-1`} />
                          {c.running ? 'running' : 'stopped'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={running}>
          Cancel
        </Button>
        <Button
          variant={cfg.variant}
          onClick={handleConfirm}
          disabled={running || checkedCount === 0}
        >
          {running && <Spinner as="span" size="sm" animation="border" className="me-2" />}
          {cfg.verb} {checkedCount} {checkedCount === 1 ? noun.replace(/s$/, '') : noun}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

BulkActionsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  action: PropTypes.oneOf(['start', 'stop', 'restart']).isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default BulkActionsModal;
