import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  getOrchestrationStatus,
  enableOrchestration,
  disableOrchestration,
  getMachinePriorities,
  testOrchestration,
} from '../../api/machineAPI';
import { modifyInfrastructure } from '../../api/provisioningAPI';
import { makeAgentRequest } from '../../api/serverUtils';
import { ConfirmModal } from '../common';

const STRATEGIES = ['parallel_by_priority', 'sequential', 'staggered'];

/**
 * Orchestration view (catalog §8): host-level ordered boot/shutdown of
 * machines. Status + enable/disable (config-persisted, applies at the next
 * agent start), the priority table (writes are DB-immediate via
 * PUT /machines/{name} {boot_priority} — no task, no restart), and the
 * dry-run plan ("what would happen"). Startup boots autostart machines
 * highest-priority-first; agent exit stops lowest-first.
 */
const OrchestrationPanel = ({ server }) => {
  const [status, setStatus] = useState(null);
  const [priorities, setPriorities] = useState(null);
  const [plan, setPlan] = useState(null);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [confirmEnable, setConfirmEnable] = useState(false);
  // Drag-and-drop boot order (Mark's ask): rows reorder by drag; Apply
  // assigns spaced priorities from the order (top boots first) and writes
  // only the machines whose number changed.
  const [order, setOrder] = useState([]);
  const [dragName, setDragName] = useState(null);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const [statusResult, prioritiesResult] = await Promise.all([
      getOrchestrationStatus(server.hostname, server.port, server.protocol),
      getMachinePriorities(server.hostname, server.port, server.protocol),
    ]);
    setStatus(statusResult.success ? statusResult.data : null);
    setPriorities(prioritiesResult.success ? prioritiesResult.data : null);
    // Highest priority boots first — that's the top of the draggable list.
    setOrder(
      prioritiesResult.success
        ? [...(prioritiesResult.data?.machines || [])]
            .sort((a, b) => b.priority - a.priority)
            .map(machine => machine.name)
        : []
    );
    if (!statusResult.success) {
      report(`Orchestration status unavailable: ${statusResult.message}`, 'warning');
    }
    setLoading(false);
  }, [server]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async () => {
    setConfirmEnable(false);
    setLoading(true);
    const call = status?.orchestration_enabled ? disableOrchestration : enableOrchestration;
    const result = await call(server.hostname, server.port, server.protocol);
    setLoading(false);
    if (result.success) {
      report(
        result.data?.message ||
          `Orchestration ${status?.orchestration_enabled ? 'disabled' : 'enabled'} — persisted to config, fully applies at the next agent start.`,
        'success'
      );
      load();
    } else {
      report(`Toggle failed: ${result.message}`, 'danger');
    }
  };

  const handlePriority = async name => {
    const value = Number(edits[name]);
    if (!value || value < 1 || value > 100) {
      report('Priority must be 1–100.', 'danger');
      return;
    }
    setLoading(true);
    const result = await modifyInfrastructure(server.hostname, server.port, server.protocol, name, {
      boot_priority: value,
    });
    setLoading(false);
    if (result.success) {
      setEdits(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      report(`Priority for ${name} set to ${value} (immediate).`, 'success');
      load();
    } else {
      report(`Priority update failed for ${name}: ${result.message}`, 'danger');
    }
  };

  // Drop target: move the dragged row to this row's position.
  const handleDragOverRow = name => {
    if (!dragName || dragName === name) {
      return;
    }
    setOrder(prev => {
      const next = prev.filter(entry => entry !== dragName);
      next.splice(next.indexOf(name), 0, dragName);
      return next;
    });
  };

  /** Spaced priorities from the order: top = highest, 5 apart, floor 1. */
  const priorityForIndex = index => Math.max(1, 100 - index * 5);

  const orderDiffers =
    priorities &&
    order.some((name, index) => {
      const row = (priorities.machines || []).find(machine => machine.name === name);
      return row && row.priority !== priorityForIndex(index);
    });

  const handleApplyOrder = async () => {
    setLoading(true);
    const rows = priorities?.machines || [];
    const changes = order
      .map((name, index) => ({ name, priority: priorityForIndex(index) }))
      .filter(change => {
        const row = rows.find(machine => machine.name === change.name);
        return row && row.priority !== change.priority;
      });
    // boot_priority writes are DB-immediate and independent — parallel is fine.
    const results = await Promise.all(
      changes.map(change =>
        modifyInfrastructure(server.hostname, server.port, server.protocol, change.name, {
          boot_priority: change.priority,
        })
      )
    );
    setLoading(false);
    const failed = results.filter(result => !result.success);
    if (failed.length > 0) {
      report(
        `${failed.length} of ${changes.length} priority writes failed: ${failed[0].message}`,
        'danger'
      );
    } else {
      report(`Boot order applied — ${changes.length} priorities updated (immediate).`, 'success');
    }
    load();
  };

  const handlePlan = async () => {
    setLoading(true);
    const result = await testOrchestration(server.hostname, server.port, server.protocol);
    setLoading(false);
    if (result.success) {
      setPlan(result.data);
    } else {
      report(`Dry run failed: ${result.message}`, 'danger');
    }
  };

  // Strategy lives in agent config (machines.orchestration.strategy). PUT
  // /settings merges per top-level category, so the WHOLE machines object
  // is read, patched, and written back — never a bare {orchestration} that
  // would clobber sibling machine settings.
  const handleStrategy = async strategy => {
    setLoading(true);
    const current = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'settings'
    );
    if (!current.success) {
      setLoading(false);
      report(`Could not read settings: ${current.message}`, 'danger');
      return;
    }
    const machinesConfig = current.data?.machines || current.data?.settings?.machines || {};
    const result = await makeAgentRequest(
      server.hostname,
      server.port,
      server.protocol,
      'settings',
      'PUT',
      {
        machines: {
          ...machinesConfig,
          orchestration: { ...(machinesConfig.orchestration || {}), strategy },
        },
      }
    );
    setLoading(false);
    if (result.success) {
      report(`Strategy set to ${strategy} — fully applies at the next agent start.`, 'success');
      load();
    } else {
      report(`Strategy update failed: ${result.message}`, 'danger');
    }
  };

  return (
    <div>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <span>
          Status:{' '}
          {status ? (
            <span
              className={`badge ${status.orchestration_enabled ? 'text-bg-success' : 'text-bg-secondary'}`}
            >
              {status.orchestration_enabled ? 'enabled' : 'disabled'}
            </span>
          ) : (
            <span className="text-muted">unknown</span>
          )}
        </span>
        {status && (
          <span className="d-inline-flex align-items-center gap-1 small">
            strategy
            <select
              className="form-select form-select-sm w-auto"
              aria-label="Orchestration strategy"
              value={status.strategy || 'parallel_by_priority'}
              onChange={e => handleStrategy(e.target.value)}
              disabled={loading}
            >
              {STRATEGIES.map(strategy => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </span>
        )}
        {status && (
          <button
            type="button"
            className={`btn btn-sm ${status.orchestration_enabled ? 'btn-outline-danger' : 'btn-primary'}`}
            onClick={() => (status.orchestration_enabled ? handleToggle() : setConfirmEnable(true))}
            disabled={loading}
          >
            {status.orchestration_enabled ? 'Disable' : 'Enable'} Orchestration
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          onClick={handlePlan}
          disabled={loading}
        >
          <i className="fas fa-list-ol me-2" />
          Preview Shutdown Plan
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={load}
          disabled={loading}
        >
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {plan && (
        <div className="card mb-3">
          <div className="card-body">
            <h4 className="fs-6 fw-bold">
              Dry-Run Plan — {plan.total_machines} machines, ~{plan.estimated_duration}
            </h4>
            {(plan.execution_plan || []).map(group => (
              <div key={group.priority_range} className="mb-1">
                <span className="badge text-bg-secondary me-2">{group.priority_range}</span>
                {(group.machines || []).map(machine => (
                  <span key={machine.name} className="me-2">
                    <code>{machine.name}</code>
                    <span className="text-muted small"> ({machine.priority})</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {priorities && order.length > 0 && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="fs-6 fw-bold mb-0">
                <i className="fas fa-up-down me-2" />
                Boot Order — drag to reorder (top boots first)
              </h4>
              {orderDiffers && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleApplyOrder}
                  disabled={loading}
                >
                  <i className="fas fa-check me-2" />
                  Apply Order
                </button>
              )}
            </div>
            <div className="d-flex flex-column gap-1">
              {order.map((name, index) => {
                const row = (priorities.machines || []).find(machine => machine.name === name);
                return (
                  <div
                    key={name}
                    role="listitem"
                    draggable
                    onDragStart={() => setDragName(name)}
                    onDragEnd={() => setDragName(null)}
                    onDragOver={e => {
                      e.preventDefault();
                      handleDragOverRow(name);
                    }}
                    className={`d-flex align-items-center gap-2 border rounded px-2 py-1 ${dragName === name ? 'opacity-50 border-primary' : ''}`}
                    style={{ cursor: 'grab' }}
                  >
                    <i className="fas fa-grip-vertical text-muted" />
                    <span className="badge text-bg-secondary">{index + 1}</span>
                    <code className="small">{name}</code>
                    {row && <span className="text-muted small">{row.state}</span>}
                    {row && !row.has_custom_priority && (
                      <span className="badge text-bg-light">default</span>
                    )}
                    {orderDiffers && (
                      <span className="text-muted small">→ {priorityForIndex(index)}</span>
                    )}
                    <span className="ms-auto d-inline-flex align-items-center gap-1">
                      <input
                        className="form-control form-control-sm"
                        style={{ width: '80px' }}
                        type="number"
                        min="1"
                        max="100"
                        aria-label={`Boot priority for ${name}`}
                        value={edits[name] ?? row?.priority ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [name]: e.target.value }))}
                        disabled={loading}
                      />
                      {edits[name] !== undefined && row && Number(edits[name]) !== row.priority && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary py-0"
                          onClick={() => handlePriority(name)}
                          disabled={loading}
                        >
                          Save
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="form-text text-muted mb-0">
              Drag to reorder and Apply (top = highest, spaced by 5), or type an exact number on a
              row and Save — every write is immediate, no restart.
            </p>
          </div>
        </div>
      )}

      <p className="form-text text-muted">
        Higher priority boots first at agent start (autostart machines only); shutdown at agent exit
        runs lowest first. Priority changes apply immediately — no task, no restart.
      </p>

      <ConfirmModal
        isOpen={confirmEnable}
        onClose={() => setConfirmEnable(false)}
        onConfirm={handleToggle}
        title="Enable Orchestration"
        message="Enable host-level boot orchestration? The setting persists to the agent's config and fully applies at the next agent start — autostart machines will then boot in priority order."
        confirmText="Enable"
        confirmVariant="primary"
        loading={loading}
      />
    </div>
  );
};

OrchestrationPanel.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default OrchestrationPanel;
