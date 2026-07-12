import { Helmet } from '@dr.pogodin/react-helmet';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';
import { useMachineDetails } from '../hooks/useMachineDetails';
import { useMachineManager } from '../hooks/useMachineManager';
import { useVncSession } from '../hooks/useVncSession';
import { useZloginSession } from '../hooks/useZloginSession';
import { hasConsole, hasFeature, hasHypervisor, hasMachines } from '../utils/capabilities';
import { canCreateMachines, canStartStopMachines } from '../utils/permissions';
import { resourceLabel } from '../utils/resourceLabel';

import { DismissibleAlert } from './common';
import ConsoleDisplay from './ConsoleDisplay';
import CloneMachineModal from './Machine/CloneMachineModal';
import { CurrentHardwarePanel, parseHardware } from './Machine/CurrentHardware';
import DisplayResizeModal from './Machine/DisplayResizeModal';
import GuestExecModal from './Machine/GuestExecModal';
import ImportMachineModal from './Machine/ImportMachineModal';
import MachineCreateModal from './Machine/MachineCreateModal';
import MachineGuestAgent from './Machine/MachineGuestAgent';
import MachineGuestInfo from './Machine/MachineGuestInfo';
import MachineHardware from './Machine/MachineHardware';
import MachineInfo from './Machine/MachineInfo';
import MachineListPanel from './Machine/MachineListPanel';
import MachineProvisioning from './Machine/MachineProvisioning';
import MachineSettings from './Machine/MachineSettings';
import MachineSnapshots from './Machine/MachineSnapshots';
import MoveMachineModal from './Machine/MoveMachineModal';
import UnattendedInstallModal from './Machine/UnattendedInstallModal';
import VncModal from './Machine/VncModal';
import ZloginModal from './Machine/ZloginModal';

/**
 * Machines Management Component — the machine detail view, both hypervisors.
 *
 * NOTE: The current host (server) and current machine are stored in GLOBAL CONTEXT
 * and are selected via the SidebarTree. The ServerContext manages:
 * - currentServer: the selected host
 * - currentZone: the selected machine (context key keeps its legacy zone name)
 *
 * This component automatically responds to these global selections and displays
 * details for the currently selected machine on the currently selected server.
 */

/** The page-top alert stack — extracted to keep Machines under the complexity cap. */
const PageAlerts = ({ error, machinesError, detailsError, notice, onDismissNotice }) => (
  <>
    {error && <DismissibleAlert variant="alert-danger" text={error} />}
    {machinesError && <DismissibleAlert variant="alert-danger" text={machinesError} />}
    {detailsError && <DismissibleAlert variant="alert-danger" text={detailsError} />}
    {notice && (
      <DismissibleAlert
        variant={notice.warning ? 'alert-warning' : 'alert-info'}
        text={notice.text}
        onHide={onDismissNotice}
      />
    )}
  </>
);

PageAlerts.propTypes = {
  error: PropTypes.string,
  machinesError: PropTypes.string,
  detailsError: PropTypes.string,
  notice: PropTypes.object,
  onDismissNotice: PropTypes.func.isRequired,
};

// List view's New/Import buttons — the detail view's actions live in the
// navbar's {Machine} Controls dropdown, its tabs in the navbar's context strip.
const HeaderActions = ({
  selectedMachine,
  singular,
  wizardAvailable,
  importAvailable,
  onNew,
  onImport,
}) =>
  !selectedMachine ? (
    <div className="d-flex gap-2">
      {importAvailable && (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onImport}>
          <i className="fas fa-file-import me-2" />
          Import
        </button>
      )}
      {wizardAvailable && (
        <button type="button" className="btn btn-sm btn-primary" onClick={onNew}>
          <i className="fas fa-plus me-2" />
          New {singular}
        </button>
      )}
    </div>
  ) : null;

HeaderActions.propTypes = {
  selectedMachine: PropTypes.string,
  singular: PropTypes.string.isRequired,
  wizardAvailable: PropTypes.bool,
  importAvailable: PropTypes.bool,
  onNew: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
};

// Detail panes: Overview | Settings (machine-modify + create permission) |
// Snapshots (machine-snapshots token) | Provisioning (every machine — a bare
// one gets the enable path there). The navbar's ContextTabs strip drives
// selection via ?tab=; an unavailable or unknown tab falls back to Overview,
// so the panes carry no gates of their own.
const availableDetailTabs = (editAvailable, snapshotsViewable) => [
  'overview',
  ...(editAvailable ? ['settings'] : []),
  ...(snapshotsViewable ? ['snapshots'] : []),
  'provisioning',
];

const resolveDetailTab = (tabs, wanted) => (tabs.includes(wanted) ? wanted : 'overview');

const machinePageGates = (currentServer, role) => ({
  wizardAvailable:
    hasFeature(currentServer, 'machine-create') &&
    hasFeature(currentServer, 'provisioner-registry') &&
    canCreateMachines(role),
  editAvailable: hasFeature(currentServer, 'machine-modify') && canCreateMachines(role),
  cloneAvailable: hasFeature(currentServer, 'machine-create') && canCreateMachines(role),
  snapshotsAvailable: hasFeature(currentServer, 'machine-snapshots') && canCreateMachines(role),
  unattendedAvailable: hasHypervisor(currentServer, 'virtualbox') && canCreateMachines(role),
  guestControlAvailable: hasHypervisor(currentServer, 'virtualbox') && canStartStopMachines(role),
  // Run-in-Guest rides two transports: Guest Additions on VirtualBox, the
  // QEMU guest agent (guest-agent feature token) on bhyve.
  guestExecAvailable:
    (hasHypervisor(currentServer, 'virtualbox') ||
      (hasHypervisor(currentServer, 'bhyve') && hasFeature(currentServer, 'guest-agent'))) &&
    canStartStopMachines(role),
  guestExecFlavor: hasHypervisor(currentServer, 'virtualbox') ? 'additions' : 'qga',
  // Console column renders only when the agent offers a console surface at all
  // (vnc/zlogin/rdp console tokens or the ssh feature) — otherwise a placeholder.
  consoleAvailable:
    hasConsole(currentServer, 'vnc') ||
    hasFeature(currentServer, 'ssh') ||
    hasConsole(currentServer, 'rdp') ||
    hasConsole(currentServer, 'zlogin'),
});

const Machines = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConsoleType, setActiveConsoleType] = useState('vnc'); // 'vnc' | 'zlogin' | 'ssh' | 'rdp'
  const [previewReadOnly, setPreviewReadOnly] = useState(true); // Track preview terminal read-only state
  const [previewReconnectKey, setPreviewReconnectKey] = useState(0); // Force preview reconnection
  const [previewVncViewOnly, setPreviewVncViewOnly] = useState(true); // Track preview VNC view-only state
  const [modalVncViewOnly, setModalVncViewOnly] = useState(false); // Track modal VNC view-only state
  const [modalReadOnly, setModalReadOnly] = useState(false); // Track modal zlogin read-only state

  // VNC component refs to pass to action dropdowns
  const modalVncRef = useRef(null);

  const { user } = useAuth();
  const {
    makeAgentRequest,
    servers: allServers,
    currentServer,
    currentMachine,
    selectMachine,
    // Get raw session functions for ConsoleDisplay
    startVncSession: rawStartVncSession,
  } = useServers();

  const {
    machines,
    runningMachines,
    error: machinesError,
    getMachineStatus,
    loadMachines,
  } = useMachineManager(currentServer);

  const {
    machineDetails,
    setMachineDetails,
    monitoringHealth,
    error: detailsError,
    reloadMachineDetails,
  } = useMachineDetails(currentServer, currentMachine);

  const [wizardOpen, setWizardOpen] = useState(false);
  // {text, warning} — warning flags a chained download or requires_restart.
  const [provisioningNotice, setProvisioningNotice] = useState(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  // Take Snapshot lives in the page header; the Snapshots TAB lists/restores/deletes.
  const [snapshotTakeOpen, setSnapshotTakeOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [execOpen, setExecOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const {
    wizardAvailable,
    editAvailable,
    cloneAvailable,
    snapshotsAvailable,
    consoleAvailable,
    unattendedAvailable,
    guestControlAvailable,
    guestExecAvailable,
    guestExecFlavor,
  } = machinePageGates(currentServer, user?.role);

  // Provisioning pipeline intents handed over by the navbar Controls menu (?run=).
  const [provisionAction, setProvisionAction] = useState(null);

  const detailTabs = availableDetailTabs(
    editAvailable,
    hasFeature(currentServer, 'machine-snapshots')
  );
  const activeDetailTab = resolveDetailTab(detailTabs, searchParams.get('tab') || 'overview');

  const handleWizardCompleted = ({ message, taskId, requiresDownload }) => {
    const parts = [message];
    if (taskId) {
      parts.push(`(task ${taskId})`);
    }
    if (requiresDownload) {
      parts.push('— the base box downloads first');
    }
    setProvisioningNotice({ text: parts.join(' '), warning: requiresDownload });
    // The machine row only exists once the finalize child completes — stay
    // on the LIST (nothing selected) instead of a detail page for a machine
    // that is not there yet; the notice above carries the task id.
    loadMachines();
  };

  const {
    loadingVnc,
    setLoadingVnc,
    showVncConsole,
    setShowVncConsole,
    vncLoadError,
    setVncLoadError,
    isVncFullScreen,
    setIsVncFullScreen,
    vncReconnectKey,
    vncSettings,
    handleVncQualityChange,
    handleVncCompressionChange,
    handleVncResizeChange,
    handleVncShowDotChange,
    handleVncConsole,
    closeVncConsole,
    handleKillVncSession,
    handleVncClipboardPaste,
    handleVncModalPaste,
    openDirectVncFallback,
    waitForVncSessionReady,
  } = useVncSession(currentServer, currentMachine, setMachineDetails);

  const {
    showZloginConsole,
    setShowZloginConsole,
    isZloginFullScreen,
    setIsZloginFullScreen,
    handleZloginConsole,
    refreshZloginSessionStatus,
    handleZloginModalPaste,
  } = useZloginSession(currentServer, currentMachine, setMachineDetails);

  const { forceZoneSessionCleanup, startZloginSessionExplicitly, pasteTextToZone } =
    useZoneTerminal();

  // Capability-driven noun (contract C7): "Zone(s)" on bhyve hosts, "Machine(s)" otherwise.
  const plural = resourceLabel(currentServer);
  const singular = resourceLabel(currentServer, { plural: false });

  const handleMachineSelect = useCallback(
    machineName => {
      selectMachine(machineName);
      // Machine details load now automatically includes session detection
      // No need for separate session refresh orchestration
    },
    [selectMachine]
  );

  // Handle URL query parameter for zone selection
  useEffect(() => {
    const zloginParam = searchParams.get('zlogin');
    if (zloginParam) {
      handleMachineSelect(zloginParam);
      handleZloginConsole(zloginParam).then(result => {
        if (!result.success) {
          setError(result.message);
        }
      });
      setSearchParams({});
    }

    const vncParam = searchParams.get('vnc');
    if (vncParam) {
      handleMachineSelect(vncParam);
      handleVncConsole(vncParam).then(errorMsg => {
        if (errorMsg) {
          setError(errorMsg);
        }
      });
      setSearchParams({});
    }

    // Entry points elsewhere (Host page, Dashboard) open the wizard here via
    // ?create=1 — the gate is the same wizardAvailable the header button uses.
    if (searchParams.get('create')) {
      if (wizardAvailable) {
        setWizardOpen(true);
      }
      setSearchParams({});
    }

    // Navbar Machine Controls: ?take=1 opens the take-snapshot dialog on the
    // Snapshots tab; ?clone=1 opens the clone modal (the ?create=1 pattern).
    if (searchParams.get('take')) {
      if (currentMachine && snapshotsAvailable) {
        setSnapshotTakeOpen(true);
      }
      setSearchParams({ tab: 'snapshots' });
    }

    if (searchParams.get('clone')) {
      if (currentMachine && cloneAvailable) {
        setCloneOpen(true);
      }
      const tabParam = searchParams.get('tab');
      setSearchParams(tabParam ? { tab: tabParam } : {});
    }

    if (searchParams.get('install')) {
      if (currentMachine && unattendedAvailable) {
        setInstallOpen(true);
      }
      setSearchParams({});
    }

    if (searchParams.get('move')) {
      if (currentMachine && unattendedAvailable) {
        setMoveOpen(true);
      }
      setSearchParams({});
    }

    if (searchParams.get('exec')) {
      if (currentMachine && guestExecAvailable) {
        setExecOpen(true);
      }
      setSearchParams({});
    }

    if (searchParams.get('display')) {
      if (currentMachine && guestControlAvailable) {
        setDisplayOpen(true);
      }
      setSearchParams({});
    }

    // Provisioning actions from the Controls menu — the pane executes them.
    const runParam = searchParams.get('run');
    if (runParam) {
      setProvisionAction(runParam);
      setSearchParams({ tab: 'provisioning' });
    }

    const machineParam = searchParams.get('machine');
    if (machineParam && machines.length > 0) {
      // Check if the machine exists in the current list
      const machineExists = machines.includes(machineParam);
      if (machineExists) {
        handleMachineSelect(machineParam);
        // Clear the URL parameter after selection to clean up the URL
        setSearchParams({});
      } else {
        console.warn(`⚠️ URL PARAM: Machine '${machineParam}' not found in current list`);
        setError(`Machine '${machineParam}' not found on the current server.`);
      }
    }
  }, [
    searchParams,
    machines,
    setSearchParams,
    handleMachineSelect,
    handleZloginConsole,
    handleVncConsole,
    wizardAvailable,
    currentMachine,
    snapshotsAvailable,
    cloneAvailable,
    unattendedAvailable,
    guestControlAvailable,
    guestExecAvailable,
  ]);

  // Sync local selectedMachine with the global machine selection
  useEffect(() => {
    setSelectedMachine(currentMachine);
  }, [currentMachine]);

  // Auto-select console type based on what's available - FIXED to respect manual switching
  useEffect(() => {
    const hasVnc = machineDetails.active_vnc_session;
    const hasZlogin = machineDetails.zlogin_session;

    // SSH and RDP selections are always manual choices over live sessions —
    // the vnc/zlogin availability logic below must never stomp them.
    if (
      (activeConsoleType === 'ssh' && machineDetails.ssh_session?.id) ||
      (activeConsoleType === 'rdp' && machineDetails.rdp_session)
    ) {
      return;
    }

    // LOOP PREVENTION: Only change console type if there's a meaningful difference
    // This prevents VNC disconnect -> console switch -> remount -> VNC disconnect loops

    if (hasVnc && hasZlogin) {
      // Both active - keep current selection or default to VNC
      if (!activeConsoleType || (activeConsoleType !== 'vnc' && activeConsoleType !== 'zlogin')) {
        setActiveConsoleType('vnc');
      }
    } else if (hasZlogin && !hasVnc) {
      // Only zlogin available - ALWAYS switch to zlogin (don't check current type)
      setActiveConsoleType('zlogin');
    } else if (hasVnc && !hasZlogin) {
      // Only VNC available - ALWAYS switch to VNC (don't check current type)
      setActiveConsoleType('vnc');
    } else if (!hasVnc && !hasZlogin && activeConsoleType !== 'vnc') {
      // Nothing available - default to VNC (but don't cause unnecessary switches)
      setActiveConsoleType('vnc');
    }
  }, [
    machineDetails.active_vnc_session,
    machineDetails.zlogin_session,
    machineDetails.ssh_session,
    machineDetails.rdp_session,
    activeConsoleType,
  ]);

  // Previous state tracking to fix infinite loop
  const prevShowZloginConsole = useRef(showZloginConsole);

  // Handle modal close reconnection - Fix for preview terminal going black after modal closes
  useEffect(() => {
    // Only trigger when modal JUST closed (state transition from true to false)
    if (
      prevShowZloginConsole.current &&
      !showZloginConsole &&
      activeConsoleType === 'zlogin' &&
      machineDetails.zlogin_session &&
      selectedMachine
    ) {
      // Force preview terminal reconnection by incrementing the reconnect key
      // This will trigger a fresh ZoneShell component mount
      setTimeout(() => {
        setPreviewReconnectKey(prev => prev + 1);
      }, 100); // Small delay to ensure modal cleanup is complete
    }

    // Update previous state for next comparison
    prevShowZloginConsole.current = showZloginConsole;
  }, [showZloginConsole, activeConsoleType, machineDetails.zlogin_session, selectedMachine]);

  if (allServers.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{`${plural} - Hyperweaver`}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
              <div className="d-flex justify-content-between align-items-center">
                <strong>{singular} Management</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">No Servers</h2>
                <p>
                  You haven&apos;t added any Servers yet. Add a server to start managing{' '}
                  {plural.toLowerCase()}.
                </p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />
                    Add Server
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Capability gate (hasMachines): the Go agent advertises "machines" only once the
  // surface ships — until then this page is a stub instead of a wall of fetch errors.
  if (currentServer && !hasMachines(currentServer)) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{`${plural} - Hyperweaver`}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
              <div className="d-flex justify-content-between align-items-center">
                <strong>{singular} Management</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-info">
                <p className="mb-0">
                  {singular} management is not available on this host yet — the agent does not
                  advertise the <code>machines</code> capability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hoisted so the multiline element carries its own parens — the
  // jsx-wrap-multilines/prettier circular-fix trap (footerExtras pattern).
  const legacyConsoleDisplay = (
    <ConsoleDisplay
      machineDetails={machineDetails}
      activeConsoleType={activeConsoleType}
      selectedMachine={selectedMachine}
      currentServer={currentServer}
      user={user}
      loading={loading}
      loadingVnc={loadingVnc}
      previewReadOnly={previewReadOnly}
      previewVncViewOnly={previewVncViewOnly}
      previewReconnectKey={previewReconnectKey}
      vncReconnectKey={vncReconnectKey}
      vncSettings={vncSettings}
      setActiveConsoleType={setActiveConsoleType}
      setLoading={setLoading}
      setLoadingVnc={setLoadingVnc}
      setError={setError}
      setPreviewReadOnly={setPreviewReadOnly}
      setPreviewVncViewOnly={setPreviewVncViewOnly}
      setMachineDetails={setMachineDetails}
      startZloginSessionExplicitly={startZloginSessionExplicitly}
      forceZoneSessionCleanup={forceZoneSessionCleanup}
      handleZloginConsole={handleZloginConsole}
      handleVncConsole={handleVncConsole}
      handleKillVncSession={handleKillVncSession}
      handleVncQualityChange={handleVncQualityChange}
      handleVncCompressionChange={handleVncCompressionChange}
      handleVncResizeChange={handleVncResizeChange}
      handleVncShowDotChange={handleVncShowDotChange}
      handleVncClipboardPaste={handleVncClipboardPaste}
      startVncSession={rawStartVncSession}
      waitForVncSessionReady={waitForVncSessionReady}
      pasteTextToZone={pasteTextToZone}
      setShowZloginConsole={setShowZloginConsole}
    />
  );

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{`${plural} - Hyperweaver`}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <strong>{singular} Management</strong>
            </div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              {/* Fleet counts belong to the LIST — the detail view drops them. */}
              {!selectedMachine && (
                <div className="d-flex gap-2">
                  <span className="d-inline-flex">
                    <span className="badge text-bg-secondary">Total</span>
                    <span className="badge text-bg-info">{machines.length}</span>
                  </span>
                  <span className="d-inline-flex">
                    <span className="badge text-bg-secondary">Running</span>
                    <span className="badge text-bg-success">{runningMachines.length}</span>
                  </span>
                  <span className="d-inline-flex">
                    <span className="badge text-bg-secondary">Stopped</span>
                    <span className="badge text-bg-danger">
                      {machines.length - runningMachines.length}
                    </span>
                  </span>
                </div>
              )}
              <HeaderActions
                selectedMachine={selectedMachine}
                singular={singular}
                wizardAvailable={wizardAvailable}
                importAvailable={unattendedAvailable}
                onNew={() => setWizardOpen(true)}
                onImport={() => setImportOpen(true)}
              />
            </div>
          </div>

          <div className="px-4">
            <PageAlerts
              error={error}
              machinesError={machinesError}
              detailsError={detailsError}
              notice={provisioningNotice}
              onDismissNotice={() => setProvisioningNotice(null)}
            />

            {/* Zone Details - Full Width */}
            <div>
              {selectedMachine ? (
                <div className="card">
                  <div className="card-body">
                    {Object.keys(machineDetails).length > 0 ? (
                      <div>
                        {activeDetailTab === 'overview' && (
                          <div>
                            {/* Main Layout with VNC Console spanning both sections */}
                            <div className="row g-3">
                              {/* Left Column - Machine Information and Hardware & System */}
                              <div className="col-12 col-lg-6">
                                <MachineInfo
                                  machineDetails={machineDetails}
                                  monitoringHealth={monitoringHealth}
                                  getMachineStatus={getMachineStatus}
                                  selectedMachine={selectedMachine}
                                />

                                {/* Guest additions data (catalog §6) — self-hides
                                    when the wire answers nothing */}
                                <MachineGuestInfo
                                  currentServer={currentServer}
                                  machineName={selectedMachine}
                                />

                                <MachineGuestAgent
                                  currentServer={currentServer}
                                  machineName={selectedMachine}
                                  guestInfo={machineDetails.configuration?.guest_info}
                                />

                                {/* Screenshot lives INSIDE the console section now
                                    (its inactive default view) — no separate card. */}
                                <MachineHardware machineDetails={machineDetails} />

                                {/* Current hardware, read-only — VirtualBox
                                    controllers/media or the zone's device
                                    families. */}
                                <CurrentHardwarePanel
                                  currentHardware={parseHardware(machineDetails.configuration)}
                                />
                              </div>

                              {/* Right column — the one console home; SSH/screenshot/
                                  direct-VNC extend it in place. */}
                              <div className="col-12 col-lg-6">
                                {!consoleAvailable && (
                                  <div className="card mb-0 pt-0">
                                    <div className="card-body">
                                      <h4 className="fs-6 fw-bold mb-3">
                                        <i className="fas fa-terminal me-2" />
                                        Console
                                      </h4>
                                      <div className="alert alert-info mb-0">
                                        <p className="mb-0">
                                          No console is available on this host yet — the agent
                                          advertises neither a VNC console nor zlogin.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {consoleAvailable && legacyConsoleDisplay}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kept MOUNTED (d-none when inactive) so typed-but-
                            unapplied edits survive tab switches; machine
                            switches still reset the form. */}
                        {editAvailable && (
                          <div className={activeDetailTab === 'settings' ? '' : 'd-none'}>
                            <MachineSettings
                              currentServer={currentServer}
                              machineName={selectedMachine}
                              configuration={machineDetails.configuration}
                              knobCurrent={machineDetails.knob_current}
                              pendingChanges={machineDetails.pending_changes}
                              rawDetails={machineDetails}
                              isRunning={getMachineStatus(selectedMachine) === 'running'}
                              onDone={notice => {
                                setProvisioningNotice(notice);
                                // The stop/apply/start path changes the running
                                // state, and applied changes reshape the
                                // configuration — refresh both.
                                loadMachines();
                                reloadMachineDetails();
                              }}
                            />
                          </div>
                        )}

                        {activeDetailTab === 'snapshots' && (
                          <MachineSnapshots
                            currentServer={currentServer}
                            machineName={selectedMachine}
                            isRunning={getMachineStatus(selectedMachine) === 'running'}
                            user={user}
                            snapshotPolicy={machineDetails.configuration?.snapshots}
                            takeOpen={snapshotTakeOpen}
                            onTakeClose={() => setSnapshotTakeOpen(false)}
                          />
                        )}

                        {activeDetailTab === 'provisioning' && (
                          <MachineProvisioning
                            machineDetails={machineDetails}
                            currentServer={currentServer}
                            user={user}
                            requestedAction={provisionAction}
                            onActionConsumed={() => setProvisionAction(null)}
                            onDocumentStored={reloadMachineDetails}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        <p>{singular} details will appear here when available.</p>
                        <p className="small text-muted">
                          Note: {singular} detail fetching depends on Server API support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No machine selected: the list panel. Selecting a row drives
                   the same global selection the sidebar does. */
                <MachineListPanel
                  currentServer={currentServer}
                  user={user}
                  onSelect={handleMachineSelect}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ZloginModal
        showZloginConsole={showZloginConsole}
        setShowZloginConsole={setShowZloginConsole}
        isZloginFullScreen={isZloginFullScreen}
        setIsZloginFullScreen={setIsZloginFullScreen}
        selectedMachine={selectedMachine}
        handleZloginConsole={handleZloginConsole}
        handleZloginModalPaste={handleZloginModalPaste}
        user={user}
        machineDetails={machineDetails}
        setShowVncConsole={setShowVncConsole}
        handleVncConsole={handleVncConsole}
        loadingVnc={loadingVnc}
        setLoading={setLoading}
        makeAgentRequest={makeAgentRequest}
        currentServer={currentServer}
        forceZoneSessionCleanup={forceZoneSessionCleanup}
        refreshZloginSessionStatus={refreshZloginSessionStatus}
        setError={setError}
        modalReadOnly={modalReadOnly}
        setModalReadOnly={setModalReadOnly}
      />

      {wizardAvailable && (
        <MachineCreateModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          currentServer={currentServer}
          onCompleted={handleWizardCompleted}
        />
      )}

      {cloneAvailable && selectedMachine && (
        <CloneMachineModal
          isOpen={cloneOpen}
          onClose={() => setCloneOpen(false)}
          currentServer={currentServer}
          machineName={selectedMachine}
          isRunning={getMachineStatus(selectedMachine) === 'running'}
          onCloned={({ taskId, message, warnings }) => {
            const parts = [message];
            if (taskId) {
              parts.push(`(task ${taskId})`);
            }
            if (warnings.length > 0) {
              parts.push(`— ${warnings.map(warning => warning.message).join('; ')}`);
            }
            setProvisioningNotice({ text: parts.join(' '), warning: warnings.length > 0 });
            // The clone's row appears when its task completes — never select
            // a machine that does not exist yet.
            loadMachines();
          }}
        />
      )}

      {unattendedAvailable && selectedMachine && (
        <UnattendedInstallModal
          isOpen={installOpen}
          onClose={() => setInstallOpen(false)}
          currentServer={currentServer}
          machineName={selectedMachine}
          isRunning={getMachineStatus(selectedMachine) === 'running'}
          onDone={notice => {
            setProvisioningNotice(notice);
            loadMachines();
          }}
        />
      )}

      {unattendedAvailable && (
        <ImportMachineModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          currentServer={currentServer}
          onDone={notice => {
            setProvisioningNotice(notice);
            loadMachines();
          }}
        />
      )}

      {unattendedAvailable && selectedMachine && (
        <MoveMachineModal
          isOpen={moveOpen}
          onClose={() => setMoveOpen(false)}
          currentServer={currentServer}
          machineName={selectedMachine}
          isRunning={getMachineStatus(selectedMachine) === 'running'}
          onDone={notice => {
            setProvisioningNotice(notice);
            loadMachines();
          }}
        />
      )}

      {guestExecAvailable && selectedMachine && (
        <GuestExecModal
          isOpen={execOpen}
          onClose={() => setExecOpen(false)}
          currentServer={currentServer}
          machineName={selectedMachine}
          isRunning={getMachineStatus(selectedMachine) === 'running'}
          flavor={guestExecFlavor}
        />
      )}

      {guestControlAvailable && selectedMachine && (
        <DisplayResizeModal
          isOpen={displayOpen}
          onClose={() => setDisplayOpen(false)}
          currentServer={currentServer}
          machineName={selectedMachine}
          isRunning={getMachineStatus(selectedMachine) === 'running'}
          onDone={setProvisioningNotice}
        />
      )}

      <VncModal
        showVncConsole={showVncConsole}
        closeVncConsole={closeVncConsole}
        isVncFullScreen={isVncFullScreen}
        openVncFullScreen={() => setIsVncFullScreen(!isVncFullScreen)}
        vncLoadError={vncLoadError}
        openDirectVncFallback={openDirectVncFallback}
        setVncLoadError={setVncLoadError}
        currentServer={currentServer}
        selectedMachine={selectedMachine}
        vncReconnectKey={vncReconnectKey}
        modalVncRef={modalVncRef}
        modalVncViewOnly={modalVncViewOnly}
        setModalVncViewOnly={setModalVncViewOnly}
        handleVncModalPaste={handleVncModalPaste}
        handleVncConsole={handleVncConsole}
        handleKillVncSession={handleKillVncSession}
        user={user}
        machineDetails={machineDetails}
        setShowZloginConsole={setShowZloginConsole}
        handleZloginConsole={handleZloginConsole}
        loading={loading}
        loadingVnc={loadingVnc}
        vncSettings={vncSettings}
        handleVncQualityChange={handleVncQualityChange}
        handleVncCompressionChange={handleVncCompressionChange}
        handleVncResizeChange={handleVncResizeChange}
        handleVncShowDotChange={handleVncShowDotChange}
        handleVncClipboardPaste={handleVncClipboardPaste}
      />
    </div>
  );
};

export default React.memo(Machines);
