import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  hypervisor,
  isRunning,
  onCloned,
}) => {
  const { t } = useTranslation();
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
  // utm clones take no snapshot/linked options (the wire 400s them) — the
  // whole snapshot panel hides and nothing snapshot-shaped rides the body.
  const isUtm = hypervisor === 'utm';
  const snapshotsAvailable = hasFeature(currentServer, 'machine-snapshots') && !isUtm;

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
      setMsg(t('machine.cloneMachineModal.hostnameRequired'));
      return;
    }
    if (source === 'current' && isRunning && !snapshot && !isUtm) {
      setMsg(t('machine.cloneMachineModal.snapshotRequiredWhileRunning'));
      return;
    }
    if (linked && !snapshot) {
      setMsg(t('machine.cloneMachineModal.linkedRequiresSnapshot'));
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
      title={t('machine.cloneMachineModal.title', { singular, machineName })}
      icon="fas fa-clone"
      submitText={t('machine.cloneMachineModal.submit')}
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
            <strong>{t('machine.cloneMachineModal.freshFromTemplateStrong')}</strong>{' '}
            {t('machine.cloneMachineModal.freshFromTemplateRest', {
              noun: singular.toLowerCase(),
            })}
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
            <strong>{t('machine.cloneMachineModal.copyCurrentStrong')}</strong>{' '}
            {t('machine.cloneMachineModal.copyCurrentRest')}
          </label>
        </div>
      </div>

      {source === 'current' && !isUtm && (
        <div className="border rounded p-2 mb-3">
          <div className="mb-2">
            <label className="form-label" htmlFor="clone-snapshot">
              {t('machine.cloneMachineModal.snapshotLabel')}{' '}
              {isRunning ? (
                <span className="text-danger">
                  {t('machine.cloneMachineModal.snapshotRequiredNote')}
                </span>
              ) : (
                <span className="text-muted">
                  {t('machine.cloneMachineModal.snapshotOptionalNote')}
                </span>
              )}
            </label>
            <select
              id="clone-snapshot"
              className="form-select"
              value={snapshot}
              onChange={e => setSnapshot(e.target.value)}
            >
              <option value="">
                {isRunning
                  ? t('machine.cloneMachineModal.pickSnapshotOption')
                  : t('machine.cloneMachineModal.noneCloneLiveOption')}
              </option>
              {snapshots.map(entry => (
                <option key={entry.uuid || entry.name} value={entry.name}>
                  {entry.name}
                  {entry.current ? ` ${t('machine.cloneMachineModal.currentSuffix')}` : ''}
                </option>
              ))}
            </select>
            {snapshots.length === 0 && (
              <div className="form-text">
                {t('machine.cloneMachineModal.noSnapshotsYet', { noun: singular.toLowerCase() })}
                {isRunning
                  ? ` ${t('machine.cloneMachineModal.takeOneFirstNote')}`
                  : t('machine.cloneMachineModal.periodSuffix')}
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
              {t('machine.cloneMachineModal.linkedCloneLabel')}
            </label>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="clone-name">
            {t('machine.cloneMachineModal.newNameLabel')}
          </label>
          <input
            id="clone-name"
            className="form-control"
            type="text"
            placeholder={t('machine.cloneMachineModal.newNamePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="clone-hostname">
            {t('machine.cloneMachineModal.newHostnameLabel')}
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
            {t('machine.cloneMachineModal.domainLabel')}
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
            {t('machine.cloneMachineModal.memoryLabel')}
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
            {t('machine.cloneMachineModal.vcpusLabel')}
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
              {t('machine.cloneMachineModal.startAfterCloneLabel')}
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
  hypervisor: PropTypes.string,
  isRunning: PropTypes.bool,
  onCloned: PropTypes.func.isRequired,
};

export default CloneMachineModal;
