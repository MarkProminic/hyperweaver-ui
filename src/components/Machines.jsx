import { Helmet } from '@dr.pogodin/react-helmet';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';
import { useMachineDetails } from '../hooks/useMachineDetails';
import { useMachineManager } from '../hooks/useMachineManager';
import { useVncSession } from '../hooks/useVncSession';
import { useZloginSession } from '../hooks/useZloginSession';
import { hasConsole, hasFeature, hasMachines } from '../utils/capabilities';
import { resourceLabel } from '../utils/resourceLabel';

import ConsoleDisplay from './ConsoleDisplay';
import MachineHardware from './Machine/MachineHardware';
import MachineInfo from './Machine/MachineInfo';
import MachineNetwork from './Machine/MachineNetwork';
import MachineStorage from './Machine/MachineStorage';
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
const Machines = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConsoleType, setActiveConsoleType] = useState('vnc'); // 'vnc' or 'zlogin'
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
  } = useMachineManager(currentServer);

  const {
    machineDetails,
    setMachineDetails,
    monitoringHealth,
    error: detailsError,
  } = useMachineDetails(currentServer, currentMachine);

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

  // Console column renders only when the agent offers a console surface at all
  // (vnc console token or the zlogin feature) — otherwise a plain placeholder.
  const consoleAvailable = hasConsole(currentServer, 'vnc') || hasFeature(currentServer, 'zlogin');
  // zadm (bhyve) configuration shape vs the VirtualBox flat showvminfo map — the
  // structured panels only understand zadm; flat maps render as a generic table.
  const isZadmConfig = !!machineDetails.configuration?.zonename;

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

    const machineParam = searchParams.get('machine');
    if (machineParam && machines.length > 0) {
      // Check if the machine exists in the current list
      const machineExists = machines.includes(machineParam);
      if (machineExists) {
        console.log(`🔗 URL PARAM: Auto-selecting machine from URL parameter: ${machineParam}`);
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
  ]);

  // Sync local selectedMachine with the global machine selection
  useEffect(() => {
    setSelectedMachine(currentMachine);
  }, [currentMachine]);

  // Auto-select console type based on what's available - FIXED to respect manual switching
  useEffect(() => {
    const hasVnc = machineDetails.active_vnc_session;
    const hasZlogin = machineDetails.zlogin_session;

    console.log(`🔧 CONSOLE AUTO-SWITCH CHECK:`, {
      hasVnc,
      hasZlogin,
      currentType: activeConsoleType,
      zloginSessionId: machineDetails.zlogin_session?.id,
    });

    // LOOP PREVENTION: Only change console type if there's a meaningful difference
    // This prevents VNC disconnect -> console switch -> remount -> VNC disconnect loops

    if (hasVnc && hasZlogin) {
      // Both active - keep current selection or default to VNC
      if (!activeConsoleType || (activeConsoleType !== 'vnc' && activeConsoleType !== 'zlogin')) {
        console.log('🔧 CONSOLE SWITCH: Both sessions available, defaulting to VNC');
        setActiveConsoleType('vnc');
      }
    } else if (hasZlogin && !hasVnc) {
      // Only zlogin available - ALWAYS switch to zlogin (don't check current type)
      console.log('🔧 CONSOLE SWITCH: Only zlogin available, switching to zlogin');
      setActiveConsoleType('zlogin');
    } else if (hasVnc && !hasZlogin) {
      // Only VNC available - ALWAYS switch to VNC (don't check current type)
      console.log('🔧 CONSOLE SWITCH: Only VNC available, switching to VNC');
      setActiveConsoleType('vnc');
    } else if (!hasVnc && !hasZlogin && activeConsoleType !== 'vnc') {
      // Nothing available - default to VNC (but don't cause unnecessary switches)
      console.log('🔧 CONSOLE SWITCH: No sessions available, defaulting to VNC');
      setActiveConsoleType('vnc');
    }
  }, [machineDetails.active_vnc_session, machineDetails.zlogin_session, activeConsoleType]);

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
      console.log('🔄 MODAL CLOSE: zlogin modal just closed, reconnecting preview terminal');

      // Force preview terminal reconnection by incrementing the reconnect key
      // This will trigger a fresh ZoneShell component mount
      setTimeout(() => {
        setPreviewReconnectKey(prev => prev + 1);
        console.log('🔄 MODAL CLOSE: Preview terminal reconnection triggered');
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
            </div>
          </div>

          <div className="px-4">
            {error && (
              <div className="alert alert-danger mb-4">
                <p>{error}</p>
              </div>
            )}
            {machinesError && (
              <div className="alert alert-danger mb-4">
                <p>{machinesError}</p>
              </div>
            )}
            {detailsError && (
              <div className="alert alert-danger mb-4">
                <p>{detailsError}</p>
              </div>
            )}

            {/* Zone Details - Full Width */}
            <div>
              {selectedMachine ? (
                <div className="card">
                  <div className="card-body">
                    {Object.keys(machineDetails).length > 0 ? (
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

                            <MachineHardware machineDetails={machineDetails} />
                          </div>

                          {/* Right Column - Console Display with Toggle (capability-gated) */}
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
                            {consoleAvailable && (
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
                            )}
                          </div>
                        </div>

                        {/* Configuration Display: zadm shape → structured panels;
                            VirtualBox flat showvminfo map → generic key/value table */}
                        {(() => {
                          const config = machineDetails.configuration;
                          if (isZadmConfig) {
                            return (
                              <div>
                                <MachineStorage configuration={config} />
                                <MachineNetwork configuration={config} />
                              </div>
                            );
                          }
                          if (config && Object.keys(config).length > 0) {
                            return (
                              <div className="card mb-4">
                                <div className="card-body">
                                  <h4 className="fs-6 fw-bold mb-3">
                                    <i className="fas fa-sliders me-2" />
                                    Configuration
                                  </h4>
                                  <div className="table-responsive">
                                    <table className="table table-striped small">
                                      <tbody>
                                        {Object.entries(config).map(([key, value]) => (
                                          <tr key={key}>
                                            <td className="px-3 py-2">
                                              <strong>{key}</strong>
                                            </td>
                                            <td className="px-3 py-2">
                                              <code className="small">{String(value)}</code>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="card mb-4">
                              <div className="card-body">
                                <h4 className="fs-6 fw-bold">Configuration</h4>
                                <div className="alert alert-info">
                                  <p>
                                    <strong>No Configuration Data Available</strong>
                                  </p>
                                  <p>
                                    Configuration details are not available for this{' '}
                                    {singular.toLowerCase()}. This could be because:
                                  </p>
                                  <ul>
                                    <li>The configuration hasn&apos;t been loaded yet</li>
                                    <li>
                                      The Agent doesn&apos;t have configuration data for this{' '}
                                      {singular.toLowerCase()}
                                    </li>
                                    <li>
                                      The {singular.toLowerCase()} might be in a transitional state
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Raw Data (for debugging) */}
                        <details>
                          <summary className="fs-6 fw-bold">Raw Data (Debug)</summary>
                          <div className="card">
                            <div className="card-body">
                              <pre className="small">{JSON.stringify(machineDetails, null, 2)}</pre>
                            </div>
                          </div>
                        </details>
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
                <div className="card">
                  <div className="card-body">
                    <div className="text-center text-muted p-5">
                      <div className="mb-3">
                        <i className="fas fa-server fa-3x" />
                      </div>
                      <h3 className="fs-4 fw-bold text-muted">Select a {singular}</h3>
                      <p>
                        Choose a {singular.toLowerCase()} from the list to view details and manage
                        it.
                      </p>
                    </div>
                  </div>
                </div>
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
