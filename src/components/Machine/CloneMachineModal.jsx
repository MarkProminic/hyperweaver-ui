import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { getMachineSnapshots } from '../../api/machineAPI';
import { cloneMachine } from '../../api/provisioningAPI';
import { hasFeature } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';
import { FormModal, ResourceIssueList, validationDetails } from '../common';

/**
 * Clone dialog, two modes (catalog §11) — standalone so provisioner-less
 * machines clone too (clone was buried in the Provisioning card before):
 * - source: "template" (default) — rebuild fresh from the original template
 *   (the create-orchestration answer shape).
 * - source: "current" — copy TODAY'S disk state (clonevm). Extra options:
 *   `snapshot` (REQUIRED when the source is running; optional otherwise —
 *   fed from the snapshots list) and `linked` (differencing clone, requires
 *   a snapshot). Answer: {task_id, operation: machine_clone_current, …}.
 * A 400 Insufficient-resources answer renders its details[] per entry.
 */
const CloneMachineModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  isRunning,
  onCloned,
}) => {
  const [source, setSource] = useState('template');
  const [snapshot, setSnapshot] = useState('');
  const [linked, setLinked] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [domain, setDomain] = useState('');
  const [memory, setMemory] = useState('');
  const [vcpus, setVcpus] = useState('');
  const [startAfter, setStartAfter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [details, setDetails] = useState([]);

  const singular = resourceLabel(currentServer, { plural: false });
  const snapshotsAvailable = hasFeature(currentServer, 'machine-snapshots');

  // The snapshot picker feeds from the snapshots list (§4) the moment the
  // user picks copy-current-state.
  useEffect(() => {
    if (!isOpen || source !== 'current' || !snapshotsAvailable || !currentServer) {
      return;
    }
    getMachineSnapshots(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    ).then(result => {
      setSnapshots(result.success ? result.data?.snapshots || [] : []);
    });
  }, [isOpen, source, snapshotsAvailable, currentServer, machineName]);

  const handleSubmit = async () => {
    if (!hostname.trim()) {
      setMsg('Clone needs a new hostname.');
      return;
    }
    if (source === 'current' && isRunning && !snapshot) {
      setMsg('Copying the current state of a RUNNING machine requires picking a snapshot.');
      return;
    }
    if (linked && !snapshot) {
      setMsg('A linked clone requires a snapshot.');
      return;
    }
    setLoading(true);
    setMsg('');
    setDetails([]);
    const settings = { hostname: hostname.trim() };
    if (domain.trim()) {
      settings.domain = domain.trim();
    }
    const overrides = {};
    if (memory !== '') {
      overrides.memory = memory;
    }
    if (vcpus !== '') {
      overrides.vcpus = Number(vcpus);
    }
    const body = {
      ...(name.trim() && { name: name.trim() }),
      settings,
      overrides,
      source,
      start_after_create: startAfter,
    };
    // The wire key is snapshot_name (aligned to export/publish — sync ruling).
    if (source === 'current' && snapshot) {
      body.snapshot_name = snapshot;
    }
    if (source === 'current' && linked) {
      body.linked = true;
    }
    const result = await cloneMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      body
    );
    setLoading(false);
    if (result.success) {
      const data = result.data || {};
      onCloned({
        machineName: data.machine_name || name.trim() || hostname.trim(),
        taskId: data.parent_task_id || data.task_id,
        message: data.message || 'Clone queued',
        warnings: Array.isArray(data.resource_warnings) ? data.resource_warnings : [],
      });
      onClose();
      setName('');
      setHostname('');
      setDomain('');
      setMemory('');
      setVcpus('');
      setSnapshot('');
      setLinked(false);
      setStartAfter(false);
      setSource('template');
    } else {
      setDetails(validationDetails(result));
      setMsg(validationDetails(result).length > 0 ? '' : result.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Clone ${singular}: ${machineName}`}
      icon="fas fa-clone"
      submitText="Clone"
      loading={loading}
      showCancelButton
    >
      {msg && <div className="alert alert-danger py-2">{msg}</div>}
      {details.length > 0 && <ResourceIssueList details={details} />}

      <div className="mb-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name="clone-source"
            id="clone-source-template"
            checked={source === 'template'}
            onChange={() => setSource('template')}
          />
          <label className="form-check-label" htmlFor="clone-source-template">
            <strong>Fresh from template</strong> — rebuild from the original template; changes made
            inside the {singular.toLowerCase()} since creation are NOT copied
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="radio"
            name="clone-source"
            id="clone-source-current"
            checked={source === 'current'}
            onChange={() => setSource('current')}
          />
          <label className="form-check-label" htmlFor="clone-source-current">
            <strong>Copy current state</strong> — duplicate today&apos;s disks exactly
          </label>
        </div>
      </div>

      {source === 'current' && (
        <div className="border rounded p-2 mb-3">
          <div className="mb-2">
            <label className="form-label" htmlFor="clone-snapshot">
              Snapshot{' '}
              {isRunning ? (
                <span className="text-danger">(required — the source is running)</span>
              ) : (
                <span className="text-muted">(optional)</span>
              )}
            </label>
            <select
              id="clone-snapshot"
              className="form-select"
              value={snapshot}
              onChange={e => setSnapshot(e.target.value)}
            >
              <option value="">
                {isRunning ? 'Pick a snapshot…' : 'none — clone the live disk state'}
              </option>
              {snapshots.map(entry => (
                <option key={entry.uuid || entry.name} value={entry.name}>
                  {entry.name}
                  {entry.current ? ' (current)' : ''}
                </option>
              ))}
            </select>
            {snapshots.length === 0 && (
              <div className="form-text">
                No snapshots on this {singular.toLowerCase()} yet
                {isRunning ? ' — take one first (Snapshots card), or stop the machine.' : '.'}
              </div>
            )}
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="clone-linked"
              checked={linked}
              onChange={e => setLinked(e.target.checked)}
              disabled={!snapshot}
            />
            <label className="form-check-label" htmlFor="clone-linked">
              Linked clone — a space-saving differencing copy (requires a snapshot; the clone
              depends on the source&apos;s disk)
            </label>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="clone-name">
            New Name
          </label>
          <input
            id="clone-name"
            className="form-control"
            type="text"
            placeholder="derived from hostname/domain"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="clone-hostname">
            New Hostname
          </label>
          <input
            id="clone-hostname"
            className="form-control"
            type="text"
            value={hostname}
            onChange={e => setHostname(e.target.value)}
            required
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="clone-domain">
            Domain (blank = inherit)
          </label>
          <input
            id="clone-domain"
            className="form-control"
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="clone-memory">
            Memory
          </label>
          <input
            id="clone-memory"
            className="form-control"
            type="text"
            placeholder="e.g. 2G"
            value={memory}
            onChange={e => setMemory(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="clone-vcpus">
            vCPUs
          </label>
          <input
            id="clone-vcpus"
            className="form-control"
            type="number"
            value={vcpus}
            onChange={e => setVcpus(e.target.value)}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="clone-start-after"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={startAfter}
              onChange={e => setStartAfter(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="clone-start-after">
              Start after clone
            </label>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

CloneMachineModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  isRunning: PropTypes.bool,
  onCloned: PropTypes.func.isRequired,
};

export default CloneMachineModal;
