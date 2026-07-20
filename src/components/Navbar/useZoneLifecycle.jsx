import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';

import {
  attachMachine,
  detachMachine,
  markIncompleteMachine,
  moveMachine,
  readyMachine,
  verifyMachine,
} from '../../api/machineAPI';
import { hasHypervisor } from '../../utils/capabilities';
import { canCreateMachines } from '../../utils/permissions';
import { ContentModal, FormModal } from '../common';

/**
 * The zoneadm lifecycle family for the Machine Controls menu (zoneweaver
 * slice 1, sync 2026-07-19): ready / verify / mark-incomplete / detach /
 * attach(-u/-F) / move (the CONVERGED {target_path} body, sync 2026-07-19).
 * bhyve hosts only; the agent is authoritative on state preconditions — its
 * refusals surface in the result dialog.
 */
export const useZoneLifecycle = (currentServer, currentMachine, userRole) => {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachUpdate, setAttachUpdate] = useState(false);
  const [attachForce, setAttachForce] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePath, setMovePath] = useState('');
  const [busy, setBusy] = useState(false);

  const available =
    Boolean(currentMachine) && hasHypervisor(currentServer, 'bhyve') && canCreateMachines(userRole);

  const finish = (title, res) => {
    const lines = [];
    if (res?.data?.valid !== undefined) {
      lines.push(
        res.data.valid
          ? t('navbar.zoneLifecycle.verifyValid')
          : t('navbar.zoneLifecycle.verifyInvalid')
      );
    }
    if (res?.data?.message) {
      lines.push(res.data.message);
    }
    if (res?.data?.task_id) {
      lines.push(`task ${res.data.task_id}`);
    }
    if (!res?.success) {
      lines.push(res?.message || t('navbar.zoneLifecycle.failed'));
    }
    setResult({ title, ok: Boolean(res?.success), lines, output: res?.data?.output || null });
  };

  const call = async (fn, title, body = undefined) => {
    setBusy(true);
    const res = await fn(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      currentMachine,
      body
    );
    setBusy(false);
    finish(title, res);
  };

  const items = available ? (
    <>
      <Dropdown.Divider />
      <Dropdown.Header>{t('navbar.zoneLifecycle.header')}</Dropdown.Header>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => call(readyMachine, t('navbar.zoneLifecycle.ready'))}
      >
        <i className="fas fa-circle-check text-success me-2" />
        {t('navbar.zoneLifecycle.ready')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => call(verifyMachine, t('navbar.zoneLifecycle.verify'))}
      >
        <i className="fas fa-list-check text-info me-2" />
        {t('navbar.zoneLifecycle.verify')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => call(markIncompleteMachine, t('navbar.zoneLifecycle.markIncomplete'))}
      >
        <i className="fas fa-circle-exclamation text-warning me-2" />
        {t('navbar.zoneLifecycle.markIncomplete')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => call(detachMachine, t('navbar.zoneLifecycle.detach'))}
      >
        <i className="fas fa-link-slash text-warning me-2" />
        {t('navbar.zoneLifecycle.detach')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => {
          setAttachUpdate(false);
          setAttachForce(false);
          setAttachOpen(true);
        }}
      >
        <i className="fas fa-link text-success me-2" />
        {t('navbar.zoneLifecycle.attach')}
      </Dropdown.Item>
      <Dropdown.Item
        as="button"
        type="button"
        disabled={busy}
        onClick={() => {
          setMovePath('');
          setMoveOpen(true);
        }}
      >
        <i className="fas fa-truck-arrow-right text-warning me-2" />
        {t('navbar.zoneLifecycle.move')}
      </Dropdown.Item>
    </>
  ) : null;

  const modals = (
    <>
      {result && (
        <ContentModal
          isOpen
          onClose={() => setResult(null)}
          title={result.title}
          icon={result.ok ? 'fas fa-circle-check' : 'fas fa-triangle-exclamation'}
        >
          {result.lines.map(line => (
            <p key={line} className={result.ok ? '' : 'text-danger'}>
              {line}
            </p>
          ))}
          {result.output && (
            <>
              <h6 className="h6">{t('navbar.zoneLifecycle.resultOutput')}</h6>
              <pre className="small">{result.output}</pre>
            </>
          )}
        </ContentModal>
      )}
      {attachOpen && (
        <FormModal
          isOpen
          onClose={() => setAttachOpen(false)}
          onSubmit={() => {
            setAttachOpen(false);
            call(attachMachine, t('navbar.zoneLifecycle.attach'), {
              update: attachUpdate,
              force: attachForce,
            });
          }}
          title={t('navbar.zoneLifecycle.attachTitle', { machine: currentMachine })}
          icon="fas fa-link"
          submitText={t('navbar.zoneLifecycle.attachSubmit')}
          loading={busy}
          showCancelButton
        >
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="hw-zone-attach-update"
              checked={attachUpdate}
              onChange={event => setAttachUpdate(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="hw-zone-attach-update">
              {t('navbar.zoneLifecycle.attachUpdate')}
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="hw-zone-attach-force"
              checked={attachForce}
              onChange={event => setAttachForce(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="hw-zone-attach-force">
              {t('navbar.zoneLifecycle.attachForce')}
            </label>
          </div>
        </FormModal>
      )}
      {moveOpen && (
        <FormModal
          isOpen
          onClose={() => setMoveOpen(false)}
          onSubmit={() => {
            setMoveOpen(false);
            call(moveMachine, t('navbar.zoneLifecycle.move'), movePath.trim());
          }}
          title={t('navbar.zoneLifecycle.moveTitle', { machine: currentMachine })}
          icon="fas fa-truck-arrow-right"
          submitText={t('navbar.zoneLifecycle.moveSubmit')}
          loading={busy}
          disabled={!movePath.trim().startsWith('/')}
          showCancelButton
        >
          <label className="form-label" htmlFor="hw-zone-move-path">
            {t('navbar.zoneLifecycle.movePath')}
          </label>
          <input
            id="hw-zone-move-path"
            className="form-control hw-topo-mono"
            type="text"
            required
            value={movePath}
            onChange={event => setMovePath(event.target.value)}
            placeholder="/rpool/zones/new-home"
          />
        </FormModal>
      )}
    </>
  );

  return { items, modals };
};

export default useZoneLifecycle;
