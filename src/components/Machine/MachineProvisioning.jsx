import PropTypes from 'prop-types';
import { useState } from 'react';

import { cloneMachine, provisionMachine, syncMachine } from '../../api/provisioningAPI';
import { hasFeature } from '../../utils/capabilities';
import { canCreateMachines, canStartStopMachines } from '../../utils/permissions';
import { resourceLabel } from '../../utils/resourceLabel';
import { FormModal } from '../common';

/**
 * Provisioning card on the machine detail view (sync item 11) — renders only
 * for provisioner-managed machines (rows carrying a creation spec), on
 * WHICHEVER agent serves them: everything here speaks the shared v1
 * contract and gates on tokens/spec presence, never on hypervisor. Offers
 * the post-provision welcome address plus Provision / Sync / Modify / Clone.
 */
const MachineProvisioning = ({
  machineDetails,
  currentServer,
  user,
  onModify,
  onCloned,
  notice,
}) => {
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [loading, setLoading] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneHostname, setCloneHostname] = useState('');
  const [cloneDomain, setCloneDomain] = useState('');
  const [cloneMemory, setCloneMemory] = useState('');
  const [cloneVcpus, setCloneVcpus] = useState('');
  const [cloneStart, setCloneStart] = useState(false);

  const spec = machineDetails?.machine_info?.spec;
  const machineName = machineDetails?.machine_info?.name;
  const webAddress = machineDetails?.web_address || null;
  const singular = resourceLabel(currentServer, { plural: false });

  if (!spec || !machineName || Object.keys(spec).length === 0) {
    return null;
  }

  const canOperate = canStartStopMachines(user?.role);
  const canReshape = canCreateMachines(user?.role) && hasFeature(currentServer, 'machine-create');

  const report = (result, queuedLabel) => {
    if (result.success) {
      const taskId = result.data?.task_id;
      setMsgVariant('info');
      setMsg(
        result.data?.message ||
          (taskId ? `${queuedLabel} task queued (${taskId})` : `${queuedLabel} queued`)
      );
    } else {
      setMsgVariant('danger');
      setMsg(result.message);
    }
  };

  const runOp = async op => {
    setLoading(true);
    setMsg('');
    const call = op === 'provision' ? provisionMachine : syncMachine;
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    );
    report(result, op === 'provision' ? 'Provision' : 'Sync');
    setLoading(false);
  };

  const handleClone = async () => {
    if (!cloneHostname.trim()) {
      setMsgVariant('danger');
      setMsg('Clone needs a new hostname.');
      return;
    }
    setLoading(true);
    setMsg('');
    const settings = { hostname: cloneHostname.trim() };
    if (cloneDomain.trim()) {
      settings.domain = cloneDomain.trim();
    }
    const overrides = {};
    if (cloneMemory !== '') {
      overrides.memory = Number(cloneMemory);
    }
    if (cloneVcpus !== '') {
      overrides.vcpus = Number(cloneVcpus);
    }
    // `name` is optional (sync item 12) — blank lets the agent derive it.
    const result = await cloneMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      {
        ...(cloneName.trim() && { name: cloneName.trim() }),
        settings,
        overrides,
        start_after_create: cloneStart,
      }
    );
    setLoading(false);
    if (result.success) {
      const newName = result.data?.machine_name || cloneName.trim();
      setShowClone(false);
      setMsgVariant('success');
      setMsg(result.data?.message || (newName ? `Cloned to ${newName}` : 'Cloned'));
      if (newName) {
        onCloned(newName);
      }
      setCloneName('');
      setCloneHostname('');
      setCloneDomain('');
      setCloneMemory('');
      setCloneVcpus('');
      setCloneStart(false);
    } else {
      setMsgVariant('danger');
      setMsg(result.message);
    }
  };

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-cubes me-2" />
          Provisioning
        </h4>

        {notice && <div className="alert alert-warning py-2">{notice}</div>}
        {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

        <div className="table-responsive">
          <table className="table table-striped small mb-3">
            <tbody>
              <tr>
                <td className="px-3 py-2">
                  <strong>Provisioner</strong>
                </td>
                <td className="px-3 py-2">
                  <code className="small">
                    {spec.provisioner?.name}/{spec.provisioner?.version}
                  </code>
                </td>
              </tr>
              {spec.sync_method && (
                <tr>
                  <td className="px-3 py-2">
                    <strong>Sync Method</strong>
                  </td>
                  <td className="px-3 py-2">
                    <span className="badge text-bg-secondary">{spec.sync_method}</span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-2">
                  <strong>Welcome Page</strong>
                </td>
                <td className="px-3 py-2">
                  {webAddress ? (
                    <a href={webAddress} target="_blank" rel="noopener noreferrer">
                      {webAddress}
                      <i className="fas fa-external-link-alt ms-2 small" />
                    </a>
                  ) : (
                    <span className="text-muted">Available after the first provision</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {webAddress && (
            <a
              href={webAddress}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-success"
            >
              <i className="fas fa-globe me-2" />
              Open
            </a>
          )}
          {canOperate && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => runOp('provision')}
                disabled={loading}
              >
                <i className="fas fa-cogs me-2" />
                Provision
              </button>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => runOp('sync')}
                disabled={loading}
              >
                <i className="fas fa-rotate me-2" />
                Sync Files
              </button>
            </>
          )}
          {canReshape && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-warning"
                onClick={onModify}
                disabled={loading}
              >
                <i className="fas fa-pen-to-square me-2" />
                Modify
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowClone(true)}
                disabled={loading}
              >
                <i className="fas fa-clone me-2" />
                Clone
              </button>
            </>
          )}
        </div>
      </div>

      <FormModal
        isOpen={showClone}
        onClose={() => setShowClone(false)}
        onSubmit={handleClone}
        title={`Clone ${singular}: ${machineName}`}
        icon="fas fa-clone"
        submitText="Clone"
        loading={loading}
        showCancelButton
      >
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="clone-name">
              New Name
            </label>
            <input
              id="clone-name"
              className="form-control"
              type="text"
              placeholder="blank = derived from hostname/domain"
              value={cloneName}
              onChange={e => setCloneName(e.target.value)}
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
              value={cloneHostname}
              onChange={e => setCloneHostname(e.target.value)}
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
              value={cloneDomain}
              onChange={e => setCloneDomain(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="clone-memory">
              Memory (MB)
            </label>
            <input
              id="clone-memory"
              className="form-control"
              type="number"
              value={cloneMemory}
              onChange={e => setCloneMemory(e.target.value)}
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
              value={cloneVcpus}
              onChange={e => setCloneVcpus(e.target.value)}
            />
          </div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input
                id="clone-start-after"
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={cloneStart}
                onChange={e => setCloneStart(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="clone-start-after">
                Start (and provision) after clone
              </label>
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

MachineProvisioning.propTypes = {
  machineDetails: PropTypes.object,
  currentServer: PropTypes.object,
  user: PropTypes.object,
  onModify: PropTypes.func.isRequired,
  onCloned: PropTypes.func.isRequired,
  notice: PropTypes.string,
};

export default MachineProvisioning;
