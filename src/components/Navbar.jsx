import { useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import { getApplications, launchMachineApplication, shutdownGuest } from '../api/machineAPI';
import { getProvisionStatus } from '../api/provisioningAPI';
import { hasFeature, hasFeatureStrict, hasHypervisor } from '../utils/capabilities';
import {
  canStartStopMachines,
  canRestartMachines,
  canCreateMachines,
  canDestroyMachines,
  canControlHosts,
  canPowerOffHosts,
} from '../utils/permissions';
import { resourceLabel } from '../utils/resourceLabel';

import { ConfirmModal, FormModal } from './common';
import Breadcrumb from './Navbar/Breadcrumb';
import BulkActionsModal from './Navbar/BulkActionsModal';
import ContextTabs from './Navbar/ContextTabs';
import { HostRestartOptions, HostShutdownOptions } from './Navbar/HostActionModalContent';
import { getActionVariant, getActionIcon, isShareableRoute } from './Navbar/navbarUtils';
import { useNavbarActions } from './Navbar/useNavbarActions';

/**
 * Navbar — two rows (contract §2, XenCenter-style):
 *   row 1: breadcrumb (Datacenter ▸ Host ▸ Machine) + scope-aware Controls dropdown
 *   row 2: context tabs for the focused node (ContextTabs)
 *
 * Selection moved to the SidebarTree, so the old Host/Zone selector dropdowns are gone; the
 * breadcrumb takes over their labeling role. The Controls dropdown (Machine/Host actions) and its
 * confirm modal are unchanged.
 */
// Routes whose top-right control is the Host Actions dropdown (host context). Explicit, so it's
// obvious which routes count — matches ContextTabs' host set, INCLUDING the Agent settings tab:
// omitting it dropped the dropdown there, which shrank navbar row 1 and made the layout jump
// between tabs. Dashboard → Datacenter controls; /ui/machines → Machine controls.
const HOST_CONTROL_ROUTES = [
  '/ui/hosts',
  '/ui/host-manage',
  '/ui/host-networking',
  '/ui/host-devices',
  '/ui/host-storage',
  '/ui/settings/agent',
];

const Navbar = () => {
  const {
    isModal,
    currentMode,
    setCurrentMode,
    currentAction,
    setCurrentAction,
    loading,
    hostActionOptions,
    setHostActionOptions,
    destroyOptions,
    setDestroyOptions,
    recoveryFailed,
    setRecoveryFailed,
    handleModalClick,
    handleMachineAction,
    handleHostAction,
    handleShareCurrentPage,
    navigate,
    location,
    user,
    allServers,
    currentServer,
    currentMachine,
  } = useNavbarActions();

  // Bulk Actions modal target: { action, servers } or null (phase B). Servers = one host
  // (host scope) or all registered hosts (Datacenter scope).
  const [bulk, setBulk] = useState(null);

  // Clean in-guest power via the guest agent — 'powerdown' | 'reboot' | null.
  const [guestPower, setGuestPower] = useState(null);
  const [guestPowerBusy, setGuestPowerBusy] = useState(false);
  const [guestPowerError, setGuestPowerError] = useState('');

  const runGuestPower = async () => {
    setGuestPowerBusy(true);
    setGuestPowerError('');
    const result = await shutdownGuest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      currentMachine,
      guestPower
    );
    setGuestPowerBusy(false);
    if (!result.success) {
      setGuestPowerError(result.message);
      return;
    }
    setGuestPower(null);
  };

  // Capability-driven noun (contract C7): "Zone" on all-bhyve scopes, "Machine" otherwise.
  const machineNoun = resourceLabel(currentServer, { plural: false });

  // Suspend gates on the op-level `machine-suspend` feature token (sync-file AGREED) —
  // any hypervisor that supports it advertises it; no hypervisor-value checks.
  const canSuspend = hasFeature(currentServer, 'machine-suspend');

  // Pause is VirtualBox-only (Mark's 2026-07-12 deliberate-divergence ruling
  // — no bhyve analog; gate by hypervisor, no probing). Resume rides the
  // machine-suspend token with Suspend: it resumes paused machines on the
  // Go agent and checkpoint-suspended machines on zoneweaver.
  const pauseAvailable = hasHypervisor(currentServer, 'virtualbox');

  // Run-in-Guest rides two transports: Guest Additions on VirtualBox, the
  // QEMU guest agent (guest-agent feature token) on bhyve.
  const guestExecAvailable =
    hasHypervisor(currentServer, 'virtualbox') ||
    (hasHypervisor(currentServer, 'bhyve') && hasFeature(currentServer, 'guest-agent'));

  // The agent host's configured external applications (host-launchers token) —
  // exists-flagged; the machine Controls menu launches them. Launches spawn on
  // the AGENT host, so this rides the token, not the UI mode (a headless host
  // no-ops harmlessly; a desktop host — bhyve or Direct — runs them).
  // STRICT gate: render-all fired GET /applications against agents that never
  // serve the route (zoneweaver 404s) — the token must be present.
  const launchersAvailable = hasFeatureStrict(currentServer, 'host-launchers');
  const [applications, setApplications] = useState([]);
  useEffect(() => {
    setApplications([]);
    if (!currentServer || !launchersAvailable) {
      return;
    }
    getApplications(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setApplications(
          result.success && Array.isArray(result.data?.applications) ? result.data.applications : []
        );
      }
    );
  }, [currentServer, launchersAvailable]);

  const handleLaunchApplication = async appName => {
    const result = await launchMachineApplication(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      currentMachine,
      appName
    );
    if (!result.success) {
      console.error(`Application launch failed: ${result.message}`);
    }
  };

  // Host power controls ride the `host-power` token (config-gated on the Go
  // agent via host_power.enabled; platform on zoneweaver) — role alone isn't
  // enough when the agent doesn't serve /system/host/*.
  const hostPowerAvailable = hasFeature(currentServer, 'host-power');

  // Provisioning controls gate on the provision-status answer — a machine
  // gains them by carrying a provisioner document (the Provisioning tab's
  // enable path); an errored/absent status means not configured.
  const [provisioningConfigured, setProvisioningConfigured] = useState(false);
  useEffect(() => {
    setProvisioningConfigured(false);
    if (!currentServer || !currentMachine) {
      return;
    }
    getProvisionStatus(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      currentMachine
    ).then(result => {
      setProvisioningConfigured(result.success && result.data?.provisioning_configured !== false);
    });
  }, [currentServer, currentMachine]);

  const MachineControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">{machineNoun} Controls</Dropdown.Toggle>
        <Dropdown.Menu>
          {isShareableRoute(location.pathname) && currentServer && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={handleShareCurrentPage}
                title="Copy shareable link to clipboard"
              >
                <i className="fas fa-share-alt text-info me-2" />
                Share Link
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}

          {canStartStopMachines(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('shutdown');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('start');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-play text-success me-2" />
                Power On
              </Dropdown.Item>
            </>
          )}

          {canRestartMachines(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('restart');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-redo text-warning me-2" />
                Restart
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Hard reboot — like pressing the reset button; only valid while running"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('reset');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-bolt text-danger me-2" />
                Reset
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Inject a non-maskable interrupt into the running machine — forces a guest crash dump / breaks into the kernel debugger; only valid while running"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('nmi');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-bug text-danger me-2" />
                Inject NMI
              </Dropdown.Item>
            </>
          )}

          {pauseAvailable && canStartStopMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              title="Freeze the machine in RAM; only valid while running"
              onClick={() => {
                handleModalClick();
                setCurrentAction('pause');
                setCurrentMode('machine');
              }}
            >
              <i className="fas fa-pause-circle text-warning me-2" />
              Pause
            </Dropdown.Item>
          )}

          {canSuspend && canStartStopMachines(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                title="Suspend to disk; Start or Resume continues where it left off"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('suspend');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-pause text-warning me-2" />
                Suspend
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Resume a paused or suspended machine"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('resume');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-play-circle text-success me-2" />
                Resume
              </Dropdown.Item>
            </>
          )}

          {guestExecAvailable && canStartStopMachines(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                title="Clean in-guest shutdown via the guest agent"
                onClick={() => setGuestPower('powerdown')}
              >
                <i className="fas fa-power-off text-danger me-2" />
                Guest Shutdown
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Clean in-guest reboot via the guest agent"
                onClick={() => setGuestPower('reboot')}
              >
                <i className="fas fa-rotate text-warning me-2" />
                Guest Reboot
              </Dropdown.Item>
            </>
          )}

          {applications.length > 0 && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Open in application</Dropdown.Header>
              {applications.map(app => (
                <Dropdown.Item
                  as="button"
                  type="button"
                  key={app.name}
                  disabled={!app.exists}
                  title={app.exists ? app.path : `${app.path} — not found on the agent host`}
                  onClick={() => handleLaunchApplication(app.name)}
                >
                  <i className="fas fa-arrow-up-right-from-square text-info me-2" />
                  {app.name}
                </Dropdown.Item>
              ))}
            </>
          )}

          {/* Snapshot/Clone modals live on the Machines page — hand it the
              intent via search params (its ?create=1 pattern). */}
          {hasFeature(currentServer, 'machine-snapshots') && canCreateMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              onClick={() => navigate('/ui/machines?tab=snapshots&take=1')}
            >
              <i className="fas fa-camera me-2" />
              Snapshot
            </Dropdown.Item>
          )}
          {hasFeature(currentServer, 'machine-create') && canCreateMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              onClick={() => navigate('/ui/machines?clone=1')}
            >
              <i className="fas fa-clone me-2" />
              Clone
            </Dropdown.Item>
          )}
          {hasFeature(currentServer, 'templates') && canCreateMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              title="Export this machine into a local .box template — publish it from the host's Templates page"
              onClick={() => navigate('/ui/machines?totemplate=1')}
            >
              <i className="fas fa-box-archive me-2" />
              Convert to Template…
            </Dropdown.Item>
          )}
          {hasHypervisor(currentServer, 'virtualbox') && canCreateMachines(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                title="Unattended OS install from an ISO — the machine must be powered off"
                onClick={() => navigate('/ui/machines?install=1')}
              >
                <i className="fas fa-compact-disc me-2" />
                Install OS…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Relocate the machine's files to another directory — powered off only"
                onClick={() => navigate('/ui/machines?move=1')}
              >
                <i className="fas fa-truck-arrow-right me-2" />
                Move…
              </Dropdown.Item>
            </>
          )}
          {guestExecAvailable && canStartStopMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              title="Run a command inside the guest via Guest Additions or the guest agent"
              onClick={() => navigate('/ui/machines?exec=1')}
            >
              <i className="fas fa-terminal me-2" />
              Run in Guest…
            </Dropdown.Item>
          )}
          {hasHypervisor(currentServer, 'virtualbox') && canStartStopMachines(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              title="Send a live display-resize hint to the running guest"
              onClick={() => navigate('/ui/machines?display=1')}
            >
              <i className="fas fa-display me-2" />
              Set Display Size…
            </Dropdown.Item>
          )}

          {/* Provisioning — executed by the Provisioning tab (?run=/?editprov=
              params), which reports the queued tasks. */}
          {provisioningConfigured && canStartStopMachines(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                title="FULL pipeline: re-render the document, boot if stopped, wait for SSH, sync folders, run playbooks (run-directives honored)"
                onClick={() => navigate('/ui/machines?tab=provisioning&run=provision')}
              >
                <i className="fas fa-cogs me-2" />
                Provision
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Sync the provisioning folders to the guest — nothing runs"
                onClick={() => navigate('/ui/machines?tab=provisioning&run=sync')}
              >
                <i className="fas fa-rotate me-2" />
                Sync Files
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Pull the folders flagged 'sync back' from the guest to the host (guest→host)"
                onClick={() => navigate('/ui/machines?tab=provisioning&run=syncback')}
              >
                <i className="fas fa-rotate-left me-2" />
                Sync Back
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                title="Playbooks ONLY, on an already-running SSH-reachable machine — no render, no boot, no sync"
                onClick={() => navigate('/ui/machines?tab=provisioning&run=run-provisioners')}
              >
                <i className="fas fa-list-check me-2" />
                Run Provisioners
              </Dropdown.Item>
            </>
          )}
          {canDestroyMachines(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('kill');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-skull text-danger me-2" />
                Force Kill
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('destroy');
                  setCurrentMode('machine');
                }}
              >
                <i className="fas fa-trash text-danger me-2" />
                Destroy
              </Dropdown.Item>
            </>
          )}

          {!canDestroyMachines(userRole) && (
            <>
              <Dropdown.Divider />
              <div className="text-muted text-center p-2 small">
                Advanced controls require admin privileges
              </div>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const HostControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">Host Actions</Dropdown.Toggle>
        <Dropdown.Menu>
          {isShareableRoute(location.pathname) && currentServer && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={handleShareCurrentPage}
                title="Copy shareable link to clipboard"
              >
                <i className="fas fa-share-alt text-info me-2" />
                Share Link
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}

          <Dropdown.Item as="button" type="button" onClick={() => navigate('/ui/hosts')}>
            <i className="fas fa-eye text-info me-2" />
            View Host Details
          </Dropdown.Item>
          <Dropdown.Item as="button" type="button" onClick={() => navigate('/ui/host-manage')}>
            <i className="fas fa-cogs text-info me-2" />
            Manage Host
          </Dropdown.Item>

          {hasFeature(currentServer, 'machine-create') &&
            hasFeature(currentServer, 'provisioner-registry') &&
            canCreateMachines(userRole) && (
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => navigate('/ui/machines?create=1')}
              >
                <i className="fas fa-plus text-success me-2" />
                New {machineNoun}
              </Dropdown.Item>
            )}

          {canPowerOffHosts(userRole) && hostPowerAvailable && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('restart');
                  setCurrentMode('host');
                }}
              >
                <i className="fas fa-redo text-warning me-2" />
                Restart Host
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('shutdown');
                  setCurrentMode('host');
                }}
              >
                <i className="fas fa-power-off text-danger me-2" />
                Power Off Host
              </Dropdown.Item>
            </>
          )}

          {canStartStopMachines(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Bulk machine actions</Dropdown.Header>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'start', servers: [currentServer] })}
              >
                <i className="fas fa-play text-success me-2" />
                Start machines…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'stop', servers: [currentServer] })}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown machines…
              </Dropdown.Item>
              {canRestartMachines(userRole) && (
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => setBulk({ action: 'restart', servers: [currentServer] })}
                >
                  <i className="fas fa-redo text-warning me-2" />
                  Restart machines…
                </Dropdown.Item>
              )}
            </>
          )}

          {!canControlHosts(userRole) && (
            <>
              <Dropdown.Divider />
              <div className="text-muted text-center p-2 small">
                Host controls require admin privileges
                <br />
                Users have read-only access to host information
              </div>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const DatacenterControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">Bulk Actions</Dropdown.Toggle>
        <Dropdown.Menu>
          {canStartStopMachines(userRole) ? (
            <>
              <Dropdown.Header>Across all hosts</Dropdown.Header>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'start', servers: allServers })}
              >
                <i className="fas fa-play text-success me-2" />
                Start machines…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'stop', servers: allServers })}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown machines…
              </Dropdown.Item>
              {canRestartMachines(userRole) && (
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => setBulk({ action: 'restart', servers: allServers })}
                >
                  <i className="fas fa-redo text-warning me-2" />
                  Restart machines…
                </Dropdown.Item>
              )}
            </>
          ) : (
            <div className="text-muted text-center p-2 small">
              Bulk actions require admin privileges
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  // Controls are scope-aware, driven by the route (like the breadcrumb + tabs): the machine
  // view → machine controls; a host view → host actions + host-scope bulk; the Datacenter /
  // Dashboard → cross-host bulk. Other pages (accounts/settings/profile) → no controls.
  const renderControls = () => {
    const path = location.pathname;
    if (path === '/ui/machines') {
      // The page has two states (Mark's ruling): DETAIL (machine selected) =
      // machine controls; LIST (none selected) = host-level context — Host
      // Actions carries the bulk start/stop that makes sense there. Machine
      // controls with no target opened an EMPTY confirm modal.
      if (currentMachine) {
        return <MachineControlDropdown />;
      }
      return currentServer ? <HostControlDropdown /> : null;
    }
    if (path === '/ui' || path === '/ui/dashboard') {
      return <DatacenterControlDropdown />;
    }
    if (HOST_CONTROL_ROUTES.includes(path)) {
      return <HostControlDropdown />;
    }
    return null;
  };

  return (
    <div>
      {/* Confirm modal for host/zone actions (portal — placement here is irrelevant) */}
      {!isModal && (
        <FormModal
          isOpen={!isModal}
          onClose={handleModalClick}
          onSubmit={() =>
            currentMode === 'host'
              ? handleHostAction(currentAction)
              : handleMachineAction(currentAction)
          }
          title={`Confirm ${currentMode === 'machine' ? machineNoun.toLowerCase() : currentMode} ${currentAction}`}
          icon={getActionIcon(currentAction)}
          submitText={loading ? 'Processing...' : currentAction}
          submitVariant={getActionVariant(currentAction)}
          loading={loading}
        >
          {currentMode === 'host' && currentServer && (
            <div>
              <div className="alert alert-warning">
                <p>
                  <strong>Target:</strong> {currentServer.hostname}
                </p>
                <p>
                  This action will {currentAction === 'restart' ? 'restart' : 'shutdown'} the entire
                  host system.
                </p>
                <p>
                  <strong>Warning:</strong> This will interrupt all system services and user
                  sessions.
                </p>
              </div>

              {currentAction === 'restart' && (
                <HostRestartOptions
                  hostActionOptions={hostActionOptions}
                  setHostActionOptions={setHostActionOptions}
                />
              )}

              {currentAction === 'shutdown' && (
                <HostShutdownOptions
                  hostActionOptions={hostActionOptions}
                  setHostActionOptions={setHostActionOptions}
                />
              )}
            </div>
          )}
          {currentMode === 'machine' && currentMachine && currentAction !== 'destroy' && (
            <div className="alert alert-info">
              <p>
                <strong>Target:</strong> {currentMachine}
              </p>
              <p>This action will be performed on the selected {machineNoun.toLowerCase()}.</p>
            </div>
          )}
          {currentMode === 'machine' && currentMachine && currentAction === 'destroy' && (
            <div>
              <div className="alert alert-danger">
                <p>
                  <strong>Target:</strong> {currentMachine}
                </p>
                <p className="mb-0">
                  This permanently deletes the {machineNoun.toLowerCase()}. A running{' '}
                  {machineNoun.toLowerCase()} is stopped first.
                </p>
              </div>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="destroy-cleanup-disks"
                  checked={destroyOptions.cleanupDisks}
                  onChange={e => setDestroyOptions({ cleanupDisks: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="destroy-cleanup-disks">
                  Also delete its disks (media the agent created for this{' '}
                  {machineNoun.toLowerCase()})
                </label>
              </div>
              <p className="text-muted small mb-0">
                Disk images and ISOs stored outside the {machineNoun.toLowerCase()}&apos;s working
                directory (user-attached media) are always preserved, whatever you choose here.
              </p>
            </div>
          )}
        </FormModal>
      )}

      {/* Row 1: breadcrumb + scope-aware Controls */}
      <nav
        className="d-flex justify-content-between align-items-center gap-2 px-2 py-1"
        role="navigation"
        aria-label="main navigation"
      >
        <Breadcrumb />
        <div className="d-flex align-items-center flex-shrink-0">{renderControls()}</div>
      </nav>

      {/* Row 2: context tabs for the focused node */}
      <ContextTabs />

      {guestPower && (
        <ConfirmModal
          isOpen
          onClose={() => {
            setGuestPower(null);
            setGuestPowerError('');
          }}
          onConfirm={runGuestPower}
          title={`Guest ${guestPower === 'reboot' ? 'Reboot' : 'Shutdown'} — ${currentMachine}`}
          message={
            guestPowerError
              ? `Failed: ${guestPowerError}`
              : `Send a clean in-guest ${
                  guestPower === 'reboot' ? 'reboot' : 'shutdown'
                } to ${currentMachine} via the guest agent? Silence after delivery is the normal success.`
          }
          confirmText={guestPowerError ? 'Retry' : 'Send'}
          loading={guestPowerBusy}
        />
      )}

      {/* Bulk Actions modal (phase B) — scope-aware, launched from the Controls dropdowns */}
      {bulk && (
        <BulkActionsModal
          show
          action={bulk.action}
          servers={bulk.servers}
          onClose={() => setBulk(null)}
        />
      )}

      {recoveryFailed && (
        <div className="alert alert-warning alert-dismissible m-2">
          Host restart is taking longer than expected. Please refresh the page manually to check if
          the server is back online.
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setRecoveryFailed(false)}
          />
        </div>
      )}
    </div>
  );
};
export default Navbar;
