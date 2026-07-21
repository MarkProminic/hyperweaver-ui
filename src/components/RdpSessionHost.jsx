import '@devolutions/iron-remote-desktop';
import {
  Backend,
  colorDepth,
  displayControl,
  enableAudio,
  init,
  lossyCompression,
  resizeMode,
} from '@devolutions/iron-remote-desktop-rdp';
import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAgentBasePath, fetchWsTicket } from '../api/serverUtils';
import { buildWsUrl } from '../utils/websocket';

/**
 * The RDP session host — the piece both RDP surfaces share (the embedded
 * console pane and the standalone full-window tab): hosts the
 * `<iron-remote-desktop>` element, drives the connect flow over the agent's
 * RDCleanPath bridge, and renders the connect/ended overlay. The
 * parent owns the header (or top strip), the settings object, the target
 * (`console` = the hypervisor's VRDE display, `guest` = the guest's own RDP
 * server via ?target=guest on the bridge), and the reconnect trigger (bump
 * `connectKey`); `uiRef` hands it the live UserInteraction for its own
 * buttons (Ctrl+Alt+Del, clipboard, stats).
 */

// The WASM module initializes exactly once per page (wasm-bindgen init).
let wasmReadyPromise = null;
const ensureWasm = () => {
  if (!wasmReadyPromise) {
    wasmReadyPromise = init('INFO');
  }
  return wasmReadyPromise;
};

// IronError carries kind()/backtrace(); anything else stringifies.
const ironErrorText = err => {
  if (err && typeof err.backtrace === 'function' && typeof err.kind === 'function') {
    return err.backtrace();
  }
  return String(err?.message || err);
};

// Requested desktop size, used ONLY in fit-client resize mode (follow-guest
// pins the session to the guest's own resolution — the request is ignored
// there). Pane-sized, even dimensions, sane clamps.
const paneDesktopSize = rect => ({
  width: Math.min(4096, Math.max(640, 2 * Math.round(rect.width / 2))),
  height: Math.min(2160, Math.max(480, 2 * Math.round(rect.height / 2))),
});

const RdpSessionHost = ({
  currentServer,
  machineName,
  settings,
  target = 'console',
  uiRef,
  connectKey,
  onPhase = null,
  onReconnect = null,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [phase, setPhaseState] = useState('connecting');
  const [detail, setDetail] = useState('');

  // The connect flow reads settings through a ref so a settings change never
  // forces a reconnect by itself (the parent's Apply button does that).
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Phase mirror for the parent's header without effect-dep churn.
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);
  const setPhase = useCallback(value => {
    setPhaseState(value);
    onPhaseRef.current?.(value);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentServer || !machineName) {
      return undefined;
    }
    let cancelled = false;

    const connectSession = async ui => {
      try {
        const ticket = await fetchWsTicket(currentServer, machineName);
        const basePath = getAgentBasePath(currentServer);
        if (cancelled) {
          return;
        }
        if (!ticket || basePath === null) {
          setPhase('failed');
          setDetail(t('console.rdpSessionHost.noWsTicket'));
          return;
        }
        const bridgePath = `${basePath}/machines/${encodeURIComponent(machineName)}/rdp-bridge${
          target === 'guest' ? '?target=guest' : ''
        }`;
        const builder = ui
          .configBuilder()
          .withUsername('')
          .withPassword('')
          .withExtension(resizeMode(settingsRef.current.resizeMode));
        if (settingsRef.current.resizeMode === 'fit-client') {
          // Only meaningful when pinning: follow-guest ignores the request.
          builder.withDesktopSize(paneDesktopSize(container.getBoundingClientRect()));
        }
        const config = builder
          // Advisory only — the ticket already authorized THIS machine's
          // bridge and the agent resolves the real target itself (the VRDE
          // port, or the guest's IP:3389 on ?target=guest).
          .withDestination('127.0.0.1:3389')
          .withProxyAddress(buildWsUrl(bridgePath, ticket))
          // build() refuses an empty token; it rides the RDCleanPath
          // ProxyAuth field, which the bridge ignores — the ?ticket= on the
          // proxyAddress is the real auth.
          .withAuthToken(ticket)
          .withExtension(displayControl(true))
          .withExtension(colorDepth(settingsRef.current.colorDepth))
          .withExtension(lossyCompression(settingsRef.current.lossy))
          .withExtension(enableAudio(settingsRef.current.audio))
          .build();
        const sessionInfo = await ui.connect(config);
        if (cancelled) {
          ui.shutdown();
          return;
        }
        // The component boots with its canvas HIDDEN (visibility:hidden +
        // pointer-events:none + translated off-screen) — without this call
        // the session decodes into an invisible canvas and no click can
        // ever focus it for keyboard capture.
        ui.setVisibility(true);
        ui.setScale(settingsRef.current.scale);
        setPhase('connected');
        const termination = await sessionInfo.run();
        if (!cancelled) {
          try {
            ui.setVisibility(false);
          } catch (visErr) {
            console.warn('RDP setVisibility(false) after session end:', visErr);
          }
          setPhase('ended');
          setDetail(termination.reason());
        }
      } catch (err) {
        if (!cancelled) {
          console.error('RDP connect failed:', err);
          setPhase('failed');
          setDetail(ironErrorText(err));
        }
      }
    };

    // ready bubbles composed out of the shadow root — listening on the
    // container BEFORE the element exists cannot miss it.
    const handleReady = event => {
      const ui = event.detail.irgUserInteraction;
      uiRef.current = ui;
      // No auto clipboard: its 100ms navigator.clipboard.read loop makes
      // Firefox pop its paste prompt on every console focus. The parent's
      // clipboard button sends on demand instead.
      ui.setEnableAutoClipboard(false);
      ui.setEnableClipboard(settingsRef.current.clipboard);
      connectSession(ui);
    };
    container.addEventListener('ready', handleReady);

    setPhase('connecting');
    setDetail('');

    const element = document.createElement('iron-remote-desktop');
    element.setAttribute('scale', settingsRef.current.scale);
    // Center the letterboxed viewer in the pane (component-native centering;
    // safe now that scaling measures the parent, not the window).
    element.setAttribute('flexcenter', 'true');
    let appended = false;
    ensureWasm()
      .then(() => {
        if (cancelled) {
          return;
        }
        container.appendChild(element);
        appended = true;
        // Property AFTER the upgrade — a pre-upgrade own property would
        // shadow the component's accessor.
        element.module = Backend;
      })
      .catch(err => {
        if (!cancelled) {
          setPhase('failed');
          setDetail(t('console.rdpSessionHost.clientFailedToLoad', { error: ironErrorText(err) }));
        }
      });

    return () => {
      cancelled = true;
      container.removeEventListener('ready', handleReady);
      try {
        uiRef.current?.shutdown();
      } catch (err) {
        console.warn('RDP shutdown on unmount:', err);
      }
      uiRef.current = null;
      if (appended) {
        container.removeChild(element);
      }
    };
  }, [currentServer, machineName, target, connectKey, uiRef, setPhase, t]);

  const overlay = phase !== 'connected' && (
    <div className="hw-rdp-overlay">
      <div className="text-center p-4">
        {phase === 'connecting' && (
          <>
            <i className="fas fa-spinner fa-pulse fa-2x hw-loading-spinner" />
            <p className="mt-2">{t('console.rdpSessionHost.connectingOverBridge')}</p>
          </>
        )}
        {phase === 'ended' && (
          <>
            <div className="fs-6 fw-medium mb-2">{t('console.rdpSessionHost.sessionEnded')}</div>
            {detail && <div className="small mb-3">{detail}</div>}
          </>
        )}
        {phase === 'failed' && (
          <>
            <div className="fs-6 fw-medium mb-2">
              {t('console.rdpSessionHost.connectionFailed')}
            </div>
            {detail && <div className="small mb-2">{detail}</div>}
          </>
        )}
        {phase !== 'connecting' && onReconnect && (
          <div className="d-flex gap-2 justify-content-center">
            <button type="button" className="btn btn-sm btn-primary" onClick={onReconnect}>
              <i className="fas fa-redo me-2" />
              <span>{t('console.rdpSessionHost.reconnect')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="hw-rdp-screen" />
      {overlay}
    </>
  );
};

RdpSessionHost.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  target: PropTypes.oneOf(['console', 'guest']),
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
    clipboard: PropTypes.bool,
    scale: PropTypes.string,
    resizeMode: PropTypes.string,
  }).isRequired,
  uiRef: PropTypes.object.isRequired,
  connectKey: PropTypes.number.isRequired,
  onPhase: PropTypes.func,
  onReconnect: PropTypes.func,
};

export default React.memo(RdpSessionHost);
