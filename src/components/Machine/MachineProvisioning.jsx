import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  provisionMachine,
  syncMachine,
  runProvisioners,
  getProvisionStatus,
} from '../../api/provisioningAPI';
import { hasFeature } from '../../utils/capabilities';
import { canCreateMachines, canStartStopMachines } from '../../utils/permissions';
import { ConfirmModal, DismissibleAlert } from '../common';

import HostsYmlModal from './HostsYmlModal';
import { parseConfiguration } from './machineHelpers';
import ProvisioningEditor from './ProvisioningEditor';

/**
 * Provisioning TAB on the machine detail view — status on top, the
 * provisioner-document editor INLINE beneath (the tab IS the editor; the
 * navbar's Edit Provisioning item just navigates here). The pipeline actions
 * (Provision / Sync Files / Run Provisioners) live in the navbar's {Machine}
 * Controls menu, gated on the provision-status answer — they arrive as
 * ?run= params and this pane executes them and reports. A machine WITHOUT a
 * provisioner document gets the same editor: storing a first document turns
 * the pipeline on (package-created machines carry one automatically).
 */

const MachineProvisioning = ({
  machineDetails,
  currentServer,
  user,
  requestedAction = null,
  onActionConsumed = null,
  onDocumentStored = null,
}) => {
  const { t } = useTranslation();
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  // The 409 host-hooks pre-flight gate ({reason} from the agent) — confirming
  // re-POSTs {confirm_host_hooks: true}; the agent remembers per machine.
  const [hookConfirm, setHookConfirm] = useState(null);
  const [hostsYmlOpen, setHostsYmlOpen] = useState(false);

  const machineName = machineDetails?.machine_info?.name;
  const configuration = parseConfiguration(machineDetails);
  const provisionerDoc = configuration.provisioner || null;
  const webAddress = machineDetails?.web_address || null;

  const canOperate = canStartStopMachines(user?.role);
  const canReshape = canCreateMachines(user?.role) && hasFeature(currentServer, 'machine-create');

  const loadStatus = useCallback(() => {
    if (!currentServer || !machineName) {
      return;
    }
    getProvisionStatus(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName
    ).then(result => {
      setStatus(result.success ? result.data : null);
    });
  }, [currentServer, machineName]);

  const statusMachineRef = useRef(null);
  useEffect(() => {
    if (statusMachineRef.current !== machineName) {
      statusMachineRef.current = machineName;
      setStatus(null);
    }
    if (provisionerDoc) {
      loadStatus();
    }
  }, [machineName, provisionerDoc, loadStatus]);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const runPipeline = async (kind, options = null) => {
    setLoading(true);
    setMsg('');
    let result;
    if (kind === 'provision') {
      result = await provisionMachine(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        options
      );
    } else if (kind === 'sync' || kind === 'syncback') {
      result = await syncMachine(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName,
        kind === 'syncback'
      );
    } else {
      result = await runProvisioners(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName
      );
    }
    setLoading(false);
    if (!result.success) {
      // Host-hooks pre-flight refusal (ruled: 409 BEFORE anything runs, never
      // a mid-sequence failure) — surface the agent's reason and offer the
      // one-time confirmation.
      if (kind === 'provision' && result.status === 409 && result.data?.needs_confirmation) {
        setHookConfirm({ reason: result.data.reason || result.message });
        return;
      }
      report(result.message, 'danger');
      return;
    }
    const data = result.data || {};
    const skipped = Array.isArray(data.playbooks_skipped) ? data.playbooks_skipped : [];
    if (!data.parent_task_id && skipped.length > 0) {
      // Run directives skipped everything — the agent's 200 no-op answer.
      report(
        t('provisioning.machineProvisioning.nothingToRun', { skipped: skipped.join(', ') }),
        'warning'
      );
      return;
    }
    const parts = [data.message || t('provisioning.machineProvisioning.queued')];
    if (data.parent_task_id) {
      parts.push(
        data.steps
          ? t('provisioning.machineProvisioning.taskWithSteps', {
              id: data.parent_task_id,
              steps: data.steps,
            })
          : t('provisioning.machineProvisioning.taskOnly', { id: data.parent_task_id })
      );
    }
    if (skipped.length > 0) {
      parts.push(
        t('provisioning.machineProvisioning.skippedSuffix', { skipped: skipped.join(', ') })
      );
    }
    report(parts.join(' '), 'success');
    setTimeout(loadStatus, 2000);
  };

  // Actions handed over from the navbar Controls menu — one-shot, guarded
  // against StrictMode double-invocation; refs keep the effect deps honest.
  const runPipelineRef = useRef(runPipeline);
  runPipelineRef.current = runPipeline;
  const onActionConsumedRef = useRef(onActionConsumed);
  onActionConsumedRef.current = onActionConsumed;
  const firedActionRef = useRef(false);
  useEffect(() => {
    if (!requestedAction) {
      firedActionRef.current = false;
      return;
    }
    if (firedActionRef.current || !provisionerDoc) {
      return;
    }
    firedActionRef.current = true;
    if (onActionConsumedRef.current) {
      onActionConsumedRef.current();
    }
    if (canOperate) {
      runPipelineRef.current(requestedAction);
    }
  }, [requestedAction, provisionerDoc, canOperate]);

  if (!machineName) {
    return null;
  }

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <h4 className="fs-6 fw-bold mb-3">
          <i className="fas fa-cubes me-2" />
          {t('provisioning.machineProvisioning.heading')}
        </h4>

        {msg && (
          <DismissibleAlert variant={`alert-${msgVariant}`} text={msg} onHide={() => setMsg('')} />
        )}
        {loading && (
          <div className="alert alert-info py-2 d-flex align-items-center gap-2">
            <i className="fas fa-spinner fa-spin" />
            <span>{t('provisioning.machineProvisioning.working')}</span>
          </div>
        )}

        {provisionerDoc ? (
          <>
            <div className="table-responsive">
              <table className="table table-striped small mb-3">
                <tbody>
                  {(provisionerDoc.provisioner_name || provisionerDoc.provisioner_version) && (
                    <tr>
                      <td className="px-3 py-2">
                        <strong>{t('provisioning.machineProvisioning.provisionerLabel')}</strong>
                      </td>
                      <td className="px-3 py-2">
                        <code className="small">
                          {provisionerDoc.provisioner_name || '?'}/
                          {provisionerDoc.provisioner_version || '?'}
                        </code>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-3 py-2">
                      <strong>{t('provisioning.machineProvisioning.statusLabel')}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {status ? (
                        <>
                          <span
                            className={`badge ${status.provisioning_status === 'provisioned' ? 'text-bg-success' : 'text-bg-warning'}`}
                          >
                            {status.provisioning_status ||
                              t('provisioning.machineProvisioning.unknown')}
                          </span>
                          {status.last_provisioned_at && (
                            <span className="small text-muted ms-2">
                              {t('provisioning.machineProvisioning.lastProvisioned', {
                                date: new Date(status.last_provisioned_at).toLocaleString(),
                              })}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                  {webAddress && (
                    <tr>
                      <td className="px-3 py-2">
                        <strong>{t('provisioning.machineProvisioning.welcomePageLabel')}</strong>
                      </td>
                      <td className="px-3 py-2">
                        <a href={webAddress} target="_blank" rel="noopener noreferrer">
                          {webAddress}
                          <i className="fas fa-external-link-alt ms-2 small" />
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="form-text text-muted mb-0">
              {t('provisioning.machineProvisioning.pipelineHint')}
            </p>
          </>
        ) : (
          <p className="text-muted mb-0">
            {t('provisioning.machineProvisioning.noDocumentYet')}
            {canReshape ? t('provisioning.machineProvisioning.noDocumentReshapeSuffix') : ''}.
          </p>
        )}

        {canReshape && (
          <>
            <div className="mt-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setHostsYmlOpen(true)}
                disabled={loading}
                title={t('provisioning.machineProvisioning.editHostsYmlTitle')}
              >
                <i className="fas fa-file-code me-2" />
                {t('provisioning.machineProvisioning.editHostsYmlButton')}
              </button>
            </div>
            <ProvisioningEditor
              currentServer={currentServer}
              machineName={machineName}
              document={provisionerDoc}
              onSaved={text => {
                report(text, 'success');
                // The stored document reshapes configuration.provisioner —
                // refresh so a first document flips the status (and the
                // Controls menu) on, and the editor reseeds from what stuck.
                if (onDocumentStored) {
                  onDocumentStored();
                }
              }}
            />
            <HostsYmlModal
              isOpen={hostsYmlOpen}
              onClose={() => setHostsYmlOpen(false)}
              currentServer={currentServer}
              machineName={machineName}
              onSaved={text => {
                report(text, 'success');
                if (onDocumentStored) {
                  onDocumentStored();
                }
              }}
            />
          </>
        )}

        {hookConfirm && (
          <ConfirmModal
            isOpen
            onClose={() => {
              setHookConfirm(null);
              report(t('provisioning.machineProvisioning.hookConfirmDeclined'), 'info');
            }}
            onConfirm={() => {
              setHookConfirm(null);
              runPipeline('provision', { confirm_host_hooks: true });
            }}
            title={t('provisioning.machineProvisioning.hookConfirmTitle')}
            message={`${hookConfirm.reason} ${t('provisioning.machineProvisioning.hookConfirmSuffix')}`}
            confirmText={t('provisioning.machineProvisioning.confirmAndProvision')}
            confirmVariant="warning"
            icon="fas fa-triangle-exclamation"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

MachineProvisioning.propTypes = {
  machineDetails: PropTypes.object,
  currentServer: PropTypes.object,
  user: PropTypes.object,
  requestedAction: PropTypes.string,
  onActionConsumed: PropTypes.func,
  onDocumentStored: PropTypes.func,
};

export default MachineProvisioning;
