import { Helmet } from '@dr.pogodin/react-helmet';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { useZoneTerminal } from '../contexts/ZoneTerminalContext';
import { useVncSession } from '../hooks/useVncSession';
import { useZloginSession } from '../hooks/useZloginSession';
import { useZoneDetails } from '../hooks/useZoneDetails';
import { useZoneManager } from '../hooks/useZoneManager';

import ConsoleDisplay from './ConsoleDisplay';
import VncModal from './Zone/VncModal';
import ZloginModal from './Zone/ZloginModal';
import ZoneHardware from './Zone/ZoneHardware';
import ZoneInfo from './Zone/ZoneInfo';
import ZoneNetwork from './Zone/ZoneNetwork';
import ZoneStorage from './Zone/ZoneStorage';

/**
 * Zones Management Component
 *
 * NOTE: The current host (server) and current zone are stored in GLOBAL CONTEXT
 * and are selected via the TOP NAVBAR dropdowns. The ServerContext manages:
 * - currentServer: Selected via "Host" dropdown in navbar
 * - currentZone: Selected via "Zone" dropdown in navbar
 *
 * This component automatically responds to these global selections and displays
 * details for the currently selected zone on the currently selected server.
 */
const Zones = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);

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
    currentZone,
    selectZone,
    // Get raw session functions for ConsoleDisplay
    startVncSession: rawStartVncSession,
  } = useServers();

  const { zones, runningZones, error: zonesError, getZoneStatus } = useZoneManager(currentServer);

  const {
    zoneDetails,
    setZoneDetails,
    monitoringHealth,
    error: detailsError,
  } = useZoneDetails(currentServer, currentZone);

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
  } = useVncSession(currentServer, currentZone, setZoneDetails);

  const {
    showZloginConsole,
    setShowZloginConsole,
    isZloginFullScreen,
    setIsZloginFullScreen,
    handleZloginConsole,
    refreshZloginSessionStatus,
    handleZloginModalPaste,
  } = useZloginSession(currentServer, currentZone, setZoneDetails);

  const { forceZoneSessionCleanup, startZloginSessionExplicitly, pasteTextToZone } =
    useZoneTerminal();

  const handleZoneSelect = useCallback(
    zoneName => {
      selectZone(zoneName);
      // Zone details load now automatically includes session detection
      // No need for separate session refresh orchestration
    },
    [selectZone]
  );

  // Handle URL query parameter for zone selection
  useEffect(() => {
    const zloginParam = searchParams.get('zlogin');
    if (zloginParam) {
      handleZoneSelect(zloginParam);
      handleZloginConsole(zloginParam).then(result => {
        if (!result.success) {
          setError(result.message);
        }
      });
      setSearchParams({});
    }

    const vncParam = searchParams.get('vnc');
    if (vncParam) {
      handleZoneSelect(vncParam);
      handleVncConsole(vncParam).then(errorMsg => {
        if (errorMsg) {
          setError(errorMsg);
        }
      });
      setSearchParams({});
    }

    const zoneParam = searchParams.get('zone');
    if (zoneParam && zones.length > 0) {
      // Check if the zone exists in the current zones list
      const zoneExists = zones.includes(zoneParam);
      if (zoneExists) {
        console.log(`🔗 URL PARAM: Auto-selecting zone from URL parameter: ${zoneParam}`);
        handleZoneSelect(zoneParam);
        // Clear the URL parameter after selection to clean up the URL
        setSearchParams({});
      } else {
        console.warn(`⚠️ URL PARAM: Zone '${zoneParam}' not found in current zones list`);
        setError(`Zone '${zoneParam}' not found on the current server.`);
      }
    }
  }, [
    searchParams,
    zones,
    setSearchParams,
    handleZoneSelect,
    handleZloginConsole,
    handleVncConsole,
  ]);

  // Sync local selectedZone with global currentZone
  useEffect(() => {
    setSelectedZone(currentZone);
  }, [currentZone]);

  // Auto-select console type based on what's available - FIXED to respect manual switching
  useEffect(() => {
    const hasVnc = zoneDetails.active_vnc_session;
    const hasZlogin = zoneDetails.zlogin_session;

    console.log(`🔧 CONSOLE AUTO-SWITCH CHECK:`, {
      hasVnc,
      hasZlogin,
      currentType: activeConsoleType,
      zloginSessionId: zoneDetails.zlogin_session?.id,
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
  }, [zoneDetails.active_vnc_session, zoneDetails.zlogin_session, activeConsoleType]);

  // Previous state tracking to fix infinite loop
  const prevShowZloginConsole = useRef(showZloginConsole);

  // Handle modal close reconnection - Fix for preview terminal going black after modal closes
  useEffect(() => {
    // Only trigger when modal JUST closed (state transition from true to false)
    if (
      prevShowZloginConsole.current &&
      !showZloginConsole &&
      activeConsoleType === 'zlogin' &&
      zoneDetails.zlogin_session &&
      selectedZone
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
  }, [showZloginConsole, activeConsoleType, zoneDetails.zlogin_session, selectedZone]);

  if (allServers.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Zones - Hyperweaver</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
              <div className="d-flex justify-content-between align-items-center">
                <strong>Zone Management</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">No Servers</h2>
                <p>You haven&apos;t added any Servers yet. Add a server to start managing zones.</p>
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

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Zones - Hyperweaver</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0 p-3">
            <div className="d-flex justify-content-between align-items-center">
              <strong>Zone Management</strong>
            </div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex gap-2">
                <span className="d-inline-flex">
                  <span className="badge text-bg-secondary">Total</span>
                  <span className="badge text-bg-info">{zones.length}</span>
                </span>
                <span className="d-inline-flex">
                  <span className="badge text-bg-secondary">Running</span>
                  <span className="badge text-bg-success">{runningZones.length}</span>
                </span>
                <span className="d-inline-flex">
                  <span className="badge text-bg-secondary">Stopped</span>
                  <span className="badge text-bg-danger">{zones.length - runningZones.length}</span>
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
            {zonesError && (
              <div className="alert alert-danger mb-4">
                <p>{zonesError}</p>
              </div>
            )}
            {detailsError && (
              <div className="alert alert-danger mb-4">
                <p>{detailsError}</p>
              </div>
            )}

            {/* Zone Details - Full Width */}
            <div>
              {selectedZone ? (
                <div className="card">
                  <div className="card-body">
                    {Object.keys(zoneDetails).length > 0 ? (
                      <div>
                        {/* Main Layout with VNC Console spanning both sections */}
                        <div className="row g-3">
                          {/* Left Column - Zone Information and Hardware & System */}
                          <div className="col-12 col-lg-6">
                            <ZoneInfo
                              zoneDetails={zoneDetails}
                              monitoringHealth={monitoringHealth}
                              getZoneStatus={getZoneStatus}
                              selectedZone={selectedZone}
                            />

                            <ZoneHardware zoneDetails={zoneDetails} />
                          </div>

                          {/* Right Column - Console Display with Toggle */}
                          <div className="col-12 col-lg-6">
                            <ConsoleDisplay
                              zoneDetails={zoneDetails}
                              activeConsoleType={activeConsoleType}
                              selectedZone={selectedZone}
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
                              setZoneDetails={setZoneDetails}
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
                          </div>
                        </div>

                        {/* Configuration Display */}
                        {zoneDetails.configuration &&
                        Object.keys(zoneDetails.configuration).length > 0 ? (
                          <div>
                            <ZoneStorage configuration={zoneDetails.configuration} />
                            <ZoneNetwork configuration={zoneDetails.configuration} />
                          </div>
                        ) : (
                          <div className="card mb-4">
                            <div className="card-body">
                              <h4 className="fs-6 fw-bold">Configuration</h4>
                              <div className="alert alert-info">
                                <p>
                                  <strong>No Configuration Data Available</strong>
                                </p>
                                <p>
                                  Zone configuration details are not available for this zone. This
                                  could be because:
                                </p>
                                <ul>
                                  <li>The zone configuration hasn&apos;t been loaded yet</li>
                                  <li>
                                    The Agent doesn&apos;t have configuration data for this zone
                                  </li>
                                  <li>The zone might be in a transitional state</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Raw Data (for debugging) */}
                        <details>
                          <summary className="fs-6 fw-bold">Raw Data (Debug)</summary>
                          <div className="card">
                            <div className="card-body">
                              <pre className="small">{JSON.stringify(zoneDetails, null, 2)}</pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        <p>Zone details will appear here when available.</p>
                        <p className="small text-muted">
                          Note: Zone detail fetching depends on Server API support.
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
                      <h3 className="fs-4 fw-bold text-muted">Select a Zone</h3>
                      <p>Choose a zone from the list to view details and manage it.</p>
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
        selectedZone={selectedZone}
        handleZloginConsole={handleZloginConsole}
        handleZloginModalPaste={handleZloginModalPaste}
        user={user}
        zoneDetails={zoneDetails}
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
        selectedZone={selectedZone}
        vncReconnectKey={vncReconnectKey}
        modalVncRef={modalVncRef}
        modalVncViewOnly={modalVncViewOnly}
        setModalVncViewOnly={setModalVncViewOnly}
        handleVncModalPaste={handleVncModalPaste}
        handleVncConsole={handleVncConsole}
        handleKillVncSession={handleKillVncSession}
        user={user}
        zoneDetails={zoneDetails}
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

export default React.memo(Zones);
