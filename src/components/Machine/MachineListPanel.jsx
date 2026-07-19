import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';

import { provisionMachine } from '../../api/provisioningAPI';
import { useServers } from '../../contexts/ServerContext';
import { hasFeature, hasHypervisor } from '../../utils/capabilities';
import { canCreateMachines, canStartStopMachines } from '../../utils/permissions';
import { resourceLabel } from '../../utils/resourceLabel';

import CloneMachineModal from './CloneMachineModal';
import { machineStatusVariant, parseConfiguration } from './machineHelpers';

/**
 * Machine list panel — SHI's ServerPage recreated for the web UI (Mark's
 * order, 2026-07-06): a searchable, counted list of every machine on the
 * selected host with status, provisioner/roles info, and quick actions.
 * One shared contract: GET /machines answers {machines[], total} on BOTH
 * agents (verified in ZoneQueryController.listZones and the Go agent's
 * handleListMachines); per-row extras render only where the row carries
 * them (Go `spec`, zoneweaver `configuration.provisioner`).
 */

const statusClass = status => `text-bg-${machineStatusVariant(status)}`;

/**
 * Provisioner reference of a row, whichever agent shaped it: the Go agent's
 * `spec.provisioner` {name, version} or zoneweaver's
 * `configuration.provisioner` {provisioner_name, provisioner_version}.
 */
const provisionerOf = row => {
  if (row.spec?.provisioner?.name) {
    return `${row.spec.provisioner.name}/${row.spec.provisioner.version}`;
  }
  const { provisioner } = parseConfiguration(row);
  if (provisioner?.provisioner_name) {
    return `${provisioner.provisioner_name}/${provisioner.provisioner_version || '?'}`;
  }
  return null;
};

/** Enabled role names of a row — SHI's roles line. Entries defensively. */
const rolesOf = row => {
  const specRoles = row.spec?.roles;
  if (Array.isArray(specRoles)) {
    return specRoles.filter(role => role?.enabled && role.name).map(role => role.name);
  }
  const { provisioner } = parseConfiguration(row);
  const provisionRoles = provisioner?.roles;
  if (Array.isArray(provisionRoles)) {
    return provisionRoles
      .map(role => (typeof role === 'string' ? role : role?.name))
      .filter(Boolean);
  }
  return [];
};

/** SHI's System line: vCPUs · memory · box, from whichever shape the row carries. */
const systemLineOf = row => {
  const settings = row.spec?.settings || parseConfiguration(row).settings || {};
  return [
    settings.vcpus && `${settings.vcpus} vCPU${Number(settings.vcpus) === 1 ? '' : 's'}`,
    settings.memory && `${settings.memory} RAM`,
    settings.box && String(settings.box),
  ]
    .filter(Boolean)
    .join(' · ');
};

/** SHI's status sentence — a human line, not just the badge. */
const statusSentence = (row, singular, t) => {
  const status = (row.status || '').toLowerCase();
  switch (status) {
    case 'running':
      return t('machine.machineListPanel.runningSentence', { noun: singular.toLowerCase() });
    case 'stopped':
      return t('machine.machineListPanel.stoppedSentence', { noun: singular.toLowerCase() });
    case 'paused':
      return t('machine.machineListPanel.pausedSentence');
    case 'suspended':
      return t('machine.machineListPanel.suspendedSentence');
    case 'configured':
      return t('machine.machineListPanel.configuredSentence');
    case 'starting':
    case 'stopping':
      return t('machine.machineListPanel.transitioningSentence', {
        noun: singular.toLowerCase(),
        status,
      });
    default:
      return '';
  }
};

const matchesFilter = (row, needle) => {
  if (!needle) {
    return true;
  }
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return (
    row.name?.toLowerCase().includes(needle) ||
    String(row.server_id ?? '').includes(needle) ||
    tags.some(tag => String(tag).toLowerCase().includes(needle)) ||
    (provisionerOf(row) || '').toLowerCase().includes(needle)
  );
};

const MachineListPanel = ({ currentServer, user, onSelect }) => {
  const { t } = useTranslation();
  const {
    getAllMachines,
    startMachine,
    stopMachine,
    restartMachine,
    pauseMachine,
    resumeMachine,
    suspendMachine,
  } = useServers();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('');
  const [cloneTarget, setCloneTarget] = useState(null); // row being cloned

  const singular = resourceLabel(currentServer, { plural: false });
  const plural = resourceLabel(currentServer);
  const canOperate = canStartStopMachines(user?.role);
  // Pause is VirtualBox-only (Mark's ruling); suspend/resume ride the
  // machine-suspend token on both agents.
  const pauseAvailable = hasHypervisor(currentServer, 'virtualbox');
  const suspendAvailable = hasFeature(currentServer, 'machine-suspend');
  const cloneAvailable =
    hasFeature(currentServer, 'machine-create') && canCreateMachines(user?.role);

  const loadRows = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    setLoading(true);
    const result = await getAllMachines(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol
    );
    if (result.success) {
      setRows(result.data?.machines || []);
      setMsg('');
    } else {
      setMsg(
        t('machine.machineListPanel.loadFailed', {
          plural: plural.toLowerCase(),
          message: result.message,
        })
      );
    }
    setLoading(false);
  }, [currentServer, getAllMachines, plural, t]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const needle = filter.trim().toLowerCase();
  const visible = useMemo(() => rows.filter(row => matchesFilter(row, needle)), [rows, needle]);
  const runningCount = rows.filter(row => (row.status || '').toLowerCase() === 'running').length;

  const handleLifecycle = async (row, action) => {
    setLoading(true);
    let call = action === 'start' ? startMachine : stopMachine;
    if (action === 'provision') {
      call = provisionMachine;
    }
    if (action === 'pause') {
      call = pauseMachine;
    }
    if (action === 'suspend') {
      call = suspendMachine;
    }
    if (action === 'resume') {
      call = resumeMachine;
    }
    if (action === 'restart') {
      call = restartMachine;
    }
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      row.name
    );
    setMsg(
      result.success
        ? result.data?.message ||
            t('machine.machineListPanel.actionQueued', { action, name: row.name })
        : t('machine.machineListPanel.actionFailed', {
            action,
            name: row.name,
            message: result.message,
          })
    );
    setLoading(false);
    // Statuses move through the task queue — refresh shortly after queueing.
    setTimeout(loadRows, 2000);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h4 className="fs-6 fw-bold mb-0">
            <i className="fas fa-server me-2" />
            {plural} ({rows.length})
          </h4>
          <div className="d-flex align-items-center gap-2">
            <span className="d-inline-flex">
              <span className="badge text-bg-secondary">
                {t('machine.machineListPanel.runningBadge')}
              </span>
              <span className="badge text-bg-success">{runningCount}</span>
            </span>
            <span className="d-inline-flex">
              <span className="badge text-bg-secondary">
                {t('machine.machineListPanel.stoppedBadge')}
              </span>
              <span className="badge text-bg-danger">{rows.length - runningCount}</span>
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={loadRows}
              disabled={loading}
            >
              <i className="fas fa-sync-alt" />
            </button>
          </div>
        </div>

        <input
          className="form-control form-control-sm mb-3"
          type="search"
          placeholder={t('machine.machineListPanel.filterPlaceholder')}
          aria-label={t('machine.machineListPanel.filterAriaLabel', {
            plural: plural.toLowerCase(),
          })}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />

        {msg && <div className="alert alert-info py-2">{msg}</div>}
        {loading && rows.length === 0 && (
          <p className="text-muted">{t('machine.machineListPanel.loading')}</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="text-muted mb-0">
            {t('machine.machineListPanel.noneOnHost', { plural: plural.toLowerCase() })}
          </p>
        )}
        {rows.length > 0 && visible.length === 0 && (
          <p className="text-muted mb-0">{t('machine.machineListPanel.noMatch')}</p>
        )}

        <div className="d-flex flex-column gap-2">
          {visible.map(row => {
            const provisionerRef = provisionerOf(row);
            const roles = rolesOf(row);
            const status = (row.status || 'unknown').toLowerCase();
            const systemLine = systemLineOf(row);
            const sentence = statusSentence(row, singular, t);
            return (
              <div className="border rounded p-2" key={row.name}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold align-baseline"
                      onClick={() => onSelect(row.name)}
                    >
                      {row.name}
                    </button>
                    <div className="small text-muted">
                      {row.server_id && (
                        <span className="me-2">
                          {t('machine.machineListPanel.idPrefix', { serverId: row.server_id })}
                        </span>
                      )}
                      {provisionerRef && <code className="small me-2">{provisionerRef}</code>}
                      {roles.length > 0 && (
                        <span>
                          {t('machine.machineListPanel.rolesLabel', { roles: roles.join(', ') })}
                        </span>
                      )}
                    </div>
                    {systemLine && <div className="small text-muted">{systemLine}</div>}
                    {sentence && <div className="small text-muted fst-italic">{sentence}</div>}
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      <span className={`badge ${statusClass(status)} text-capitalize`}>
                        {status}
                      </span>
                      {row.backing && (
                        <span className="badge text-bg-secondary">{row.backing}</span>
                      )}
                      {row.is_orphaned && (
                        <span className="badge text-bg-warning">
                          {t('machine.machineListPanel.orphanedBadge')}
                        </span>
                      )}
                      {row.auto_discovered && (
                        <span className="badge text-bg-info">
                          {t('machine.machineListPanel.autoDiscoveredBadge')}
                        </span>
                      )}
                      {(Array.isArray(row.tags) ? row.tags : []).map(tag => (
                        <span className="badge text-bg-light" key={String(tag)}>
                          {String(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info"
                      title={t('machine.machineListPanel.viewTooltip', {
                        noun: singular.toLowerCase(),
                      })}
                      onClick={() => onSelect(row.name)}
                    >
                      <i className="fas fa-eye" />
                    </button>
                    {canOperate && status !== 'running' && status !== 'paused' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        title={t('machine.machineListPanel.startTooltip')}
                        onClick={() => handleLifecycle(row, 'start')}
                        disabled={loading}
                      >
                        <i className="fas fa-play" />
                      </button>
                    )}
                    {canOperate && status === 'running' && (
                      <>
                        {pauseAvailable && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            title={t('machine.machineListPanel.pauseTooltip')}
                            onClick={() => handleLifecycle(row, 'pause')}
                            disabled={loading}
                          >
                            <i className="fas fa-pause" />
                          </button>
                        )}
                        {suspendAvailable && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            title={t('machine.machineListPanel.suspendTooltip')}
                            onClick={() => handleLifecycle(row, 'suspend')}
                            disabled={loading}
                          >
                            <i className="fas fa-moon" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title={t('machine.machineListPanel.shutdownTooltip')}
                          onClick={() => handleLifecycle(row, 'stop')}
                          disabled={loading}
                        >
                          <i className="fas fa-stop" />
                        </button>
                      </>
                    )}
                    {canOperate &&
                      ((pauseAvailable && status === 'paused') ||
                        (suspendAvailable && status === 'suspended')) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          title={t('machine.machineListPanel.resumeTooltip')}
                          onClick={() => handleLifecycle(row, 'resume')}
                          disabled={loading}
                        >
                          <i className="fas fa-play-circle" />
                        </button>
                      )}
                    {canOperate && provisionerRef && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        title={t('machine.machineListPanel.provisionTooltip')}
                        onClick={() => handleLifecycle(row, 'provision')}
                        disabled={loading}
                      >
                        <i className="fas fa-cogs" />
                      </button>
                    )}
                    {(canOperate || cloneAvailable) && (
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          variant="outline-secondary"
                          size="sm"
                          title={t('machine.machineListPanel.moreActionsTooltip')}
                        >
                          <i className="fas fa-gear" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {canOperate && status === 'running' && (
                            <Dropdown.Item
                              as="button"
                              type="button"
                              onClick={() => handleLifecycle(row, 'restart')}
                            >
                              <i className="fas fa-redo text-warning me-2" />
                              {t('machine.machineListPanel.restartItem')}
                            </Dropdown.Item>
                          )}
                          {cloneAvailable && (
                            <Dropdown.Item
                              as="button"
                              type="button"
                              onClick={() => setCloneTarget(row)}
                            >
                              <i className="fas fa-clone me-2" />
                              {t('machine.machineListPanel.cloneItem')}
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item
                            as="button"
                            type="button"
                            onClick={() => onSelect(row.name)}
                          >
                            <i className="fas fa-eye text-info me-2" />
                            {t('machine.machineListPanel.openItem')}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cloneTarget && (
        <CloneMachineModal
          isOpen
          onClose={() => setCloneTarget(null)}
          currentServer={currentServer}
          machineName={cloneTarget.name}
          isRunning={(cloneTarget.status || '').toLowerCase() === 'running'}
          onCloned={({ taskId, message }) => {
            // The clone's row appears when its task completes — never select
            // a machine that does not exist yet.
            setMsg(`${message}${taskId ? ` (task ${taskId})` : ''}`);
            setCloneTarget(null);
            setTimeout(loadRows, 2000);
          }}
        />
      )}
    </div>
  );
};

MachineListPanel.propTypes = {
  currentServer: PropTypes.object,
  user: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

export default MachineListPanel;
