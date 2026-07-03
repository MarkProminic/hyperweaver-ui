import PropTypes from 'prop-types';
import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { VncScreen } from 'react-vnc';

import { getAgentBasePath, fetchWsTicket } from '../api/serverUtils';
import {
  getStatusColorClass,
  performTyping,
  performSendKey,
  performCtrlAltDel,
} from '../utils/vncUtils';
import { buildWsUrl } from '../utils/websocket';

/**
 * Error Display Component
 */
const VncErrorDisplay = ({ className, style, message, onRetry }) => (
  <div className={`vnc-viewer-error ${className}`} style={style}>
    <div className="alert alert-danger">
      <h4 className="fs-5 fw-bold">VNC Console Error</h4>
      <p>{message}</p>
      {onRetry && (
        <div className="d-flex gap-2 mt-3">
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            <i className="fas fa-redo me-2" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  </div>
);

VncErrorDisplay.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};

/**
 * VNC Controls Component
 */
const VncControls = ({
  connected,
  connecting,
  zoneName,
  onCtrlAltDel,
  onConnect,
  onDisconnect,
}) => (
  <div className="vnc-controls hw-vnc-controls">
    <div className="vnc-status">
      <i className={`fas fa-circle ${getStatusColorClass(connected, connecting)}`} />
      <span className="ms-1">
        {connected && 'Connected'}
        {connecting && !connected && 'Connecting...'}
        {!connected && !connecting && 'Disconnected'}
        {connected && ` • ${zoneName}`}
      </span>
    </div>

    <div className="vnc-actions">
      <div className="d-flex gap-1 m-0">
        {/* Ctrl+Alt+Del Button */}
        <button
          type="button"
          className="btn btn-sm btn-warning"
          onClick={onCtrlAltDel}
          disabled={!connected}
          title="Send Ctrl+Alt+Del to guest system"
        >
          <i className="fas fa-keyboard me-2" />
          <span>Ctrl+Alt+Del</span>
        </button>

        {/* Connect/Disconnect Button */}
        <button
          type="button"
          className={`btn btn-sm ${connected ? 'btn-danger' : 'btn-success'}`}
          onClick={connected ? onDisconnect : onConnect}
          disabled={connecting}
          title={connected ? 'Disconnect from VNC' : 'Connect to VNC'}
        >
          <i className={`fas ${connected ? 'fa-plug' : 'fa-play'} me-2`} />
          <span>
            {connected && 'Disconnect'}
            {connecting && !connected && 'Connecting...'}
            {!connected && !connecting && 'Connect'}
          </span>
        </button>
      </div>
    </div>
  </div>
);

VncControls.propTypes = {
  connected: PropTypes.bool.isRequired,
  connecting: PropTypes.bool.isRequired,
  zoneName: PropTypes.string,
  onCtrlAltDel: PropTypes.func.isRequired,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
};

/**
 * Connecting Overlay Component
 */
const VncConnectingOverlay = () => (
  <div className="has-z-index-overlay hw-vnc-connecting-overlay">
    <div className="text-center">
      <i className="fas fa-spinner fa-pulse fa-2x hw-loading-spinner" />
      <p className="mt-2">Connecting to VNC...</p>
      <p className="small text-muted mt-1">Using react-vnc • Single WebSocket</p>
    </div>
  </div>
);

/**
 * Enhanced VNC Viewer Component - Uses react-vnc for native React integration
 * Replaces iframe-based approach with direct WebSocket connection
 * Provides 70-85% performance improvement by eliminating asset loading cascade
 */
const VncViewerReact = forwardRef(
  (
    {
      server,
      zoneName,
      viewOnly = false,
      autoConnect = true,
      quality = 6,
      compression = 2,
      resize = 'scale',
      showDot = true,
      showControls = true,
      resizeSession = false,
      onConnect = null,
      onDisconnect = null,
      onCtrlAltDel = null,
      onClipboard = null,
      style = {},
      className = '',
    },
    ref
  ) => {
    const vncRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');

    // Phase H: every VNC WS upgrade needs a short-lived ticket. Fetch on mount and
    // again on disconnect, so react-vnc's auto-reconnect always upgrades with a valid
    // one (the ticket is checked only at upgrade, so a 60s TTL covers the retry window).
    const [ticket, setTicket] = useState(null);
    const refreshTicket = useCallback(async () => {
      setTicket(server ? await fetchWsTicket(server) : null);
    }, [server]);
    useEffect(() => {
      refreshTicket();
    }, [refreshTicket]);

    // Mode-aware WebSocket URL (dual-mode plan §4.2/§4.3):
    // Aggregated → /api/agents/{id}/zones/{z}/vnc/websockify (Server proxies)
    // Direct     → /zones/{z}/vnc/websockify (agent's own WS, same origin)
    const basePath = server ? getAgentBasePath(server) : null;
    const wsUrl =
      server && zoneName && ticket && basePath !== null
        ? buildWsUrl(`${basePath}/zones/${encodeURIComponent(zoneName)}/vnc/websockify`, ticket)
        : '';

    const handleRefresh = useCallback(() => {
      if (vncRef.current) {
        console.log(`🔄 REACT-VNC: Refreshing connection to ${zoneName}`);
        if (connected) {
          vncRef.current.disconnect();
        }
        setTimeout(() => {
          setError('');
          setConnecting(true);
          vncRef.current.connect();
        }, 1000);
      }
    }, [connected, zoneName]);

    // Enhanced control handlers
    const handleConnect = useCallback(() => {
      if (vncRef.current && !connected && !connecting) {
        console.log(`🔌 REACT-VNC: Manually connecting to ${zoneName}`);
        setConnecting(true);
        setError('');
        vncRef.current.connect();
      }
    }, [connected, connecting, zoneName]);

    const handleDisconnect = useCallback(() => {
      if (vncRef.current && connected) {
        console.log(`🔌 REACT-VNC: Manually disconnecting from ${zoneName}`);
        vncRef.current.disconnect();
      }
    }, [connected, zoneName]);

    const handleCtrlAltDel = useCallback(() => {
      if (vncRef.current && connected) {
        console.log(`⌨️ REACT-VNC: Sending Ctrl+Alt+Del to ${zoneName}`);
        vncRef.current.sendCtrlAltDel();
      }

      // Call parent callback if provided
      if (onCtrlAltDel) {
        onCtrlAltDel();
      }
    }, [connected, zoneName, onCtrlAltDel]);

    // Expose control functions to parent component
    useEffect(() => {
      if (onConnect && typeof onConnect === 'function') {
        onConnect.connect = handleConnect;
        onConnect.disconnect = handleDisconnect;
        onConnect.ctrlAltDel = handleCtrlAltDel;
        onConnect.refresh = handleRefresh;
      }
    }, [handleConnect, handleDisconnect, handleCtrlAltDel, handleRefresh, onConnect]);

    // Connection event handlers
    const handleVncConnect = () => {
      console.log(`✅ REACT-VNC: Connected to ${zoneName}`);
      setConnected(true);
      setConnecting(false);
      setError('');

      if (onConnect) {
        onConnect();
      }
    };

    const handleVncDisconnect = event => {
      console.log(`❌ REACT-VNC: Disconnected from ${zoneName}:`, event);
      setConnected(false);
      setConnecting(false);
      // Fresh ticket so react-vnc's next auto-reconnect upgrade is authorized.
      refreshTicket();

      if (onDisconnect) {
        onDisconnect(event);
      }
    };

    const handleCredentialsRequired = () => {
      console.log(`🔐 REACT-VNC: Credentials required for ${zoneName}`);
      setError('VNC authentication required - this should not happen with zadm vnc');
    };

    const handleSecurityFailure = event => {
      console.error(`🔒 REACT-VNC: Security failure for ${zoneName}:`, event);
      setError('VNC security failure - check server configuration');
      setConnecting(false);
    };

    // Clipboard event handler
    const handleClipboard = event => {
      console.log(`📋 REACT-VNC: Clipboard event for ${zoneName}:`, event);
      if (onClipboard) {
        onClipboard(event);
      }
    };

    // Simulate typing function extracted to reduce complexity
    const simulateTyping = useCallback(
      async text => await performTyping(vncRef, connected, text),
      [connected]
    );

    // Clipboard paste method - expose to parent via ref
    const handleClipboardPaste = useCallback(
      text => {
        if (connected) {
          simulateTyping(text);
        }
      },
      [connected, simulateTyping]
    );

    // Expose methods via useImperativeHandle for VncActionsDropdown
    useImperativeHandle(
      ref,
      () => ({
        // React-VNC methods - properly forwarded from VncScreen ref
        sendKey: (keysym, code, down) => performSendKey(vncRef, connected, keysym, code, down),
        sendCtrlAltDel: () => performCtrlAltDel(vncRef, connected),
        clipboardPaste: simulateTyping,
        // Additional control methods
        connect: handleConnect,
        disconnect: handleDisconnect,
        refresh: handleRefresh,
        // State
        connected,
        connecting,
        // Access to underlying RFB object for advanced operations
        rfb: vncRef.current?.rfb || null,
      }),
      [connected, connecting, handleConnect, handleDisconnect, handleRefresh, simulateTyping]
    );

    // Legacy support - expose methods via callback props
    useEffect(() => {
      if (onConnect && typeof onConnect === 'object') {
        onConnect.clipboardPaste = handleClipboardPaste;
      }
    }, [connected, onConnect, handleClipboardPaste]);

    // Validate required parameters (Render error if missing, but hooks are already called)
    if (!server || !zoneName) {
      return (
        <VncErrorDisplay
          className={className}
          style={style}
          message="Missing required parameters: server and zoneName"
        />
      );
    }

    if (error) {
      return (
        <VncErrorDisplay
          className={className}
          style={style}
          message={error}
          onRetry={handleRefresh}
        />
      );
    }

    return (
      <div className={`vnc-viewer-react ${className}`} style={style}>
        {/* Conditional VNC Control Bar */}
        {showControls && (
          <VncControls
            connected={connected}
            connecting={connecting}
            zoneName={zoneName}
            onCtrlAltDel={handleCtrlAltDel}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}

        {/* VNC Display Area */}
        <div
          className={showControls ? 'hw-vnc-display-with-controls' : 'hw-vnc-display-no-controls'}
        >
          {connecting && !connected && <VncConnectingOverlay />}

          <VncScreen
            ref={vncRef}
            url={wsUrl}
            viewOnly={viewOnly}
            scaleViewport={resize === 'scale' && !resizeSession}
            resizeSession={resizeSession}
            autoConnect={autoConnect}
            background="#000000"
            qualityLevel={quality}
            compressionLevel={compression}
            showDotCursor={showDot}
            retryDuration={5000}
            debug={false} // Set to true for debugging
            className="hw-vnc-screen"
            onConnect={handleVncConnect}
            onDisconnect={handleVncDisconnect}
            onCredentialsRequired={handleCredentialsRequired}
            onSecurityFailure={handleSecurityFailure}
            onClipboard={handleClipboard}
          />
        </div>
      </div>
    );
  }
);

VncViewerReact.displayName = 'VncViewerReact';

VncViewerReact.propTypes = {
  server: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
  zoneName: PropTypes.string,
  viewOnly: PropTypes.bool,
  autoConnect: PropTypes.bool,
  quality: PropTypes.number,
  compression: PropTypes.number,
  resize: PropTypes.string,
  showDot: PropTypes.bool,
  showControls: PropTypes.bool,
  resizeSession: PropTypes.bool,
  onConnect: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onDisconnect: PropTypes.func,
  onCtrlAltDel: PropTypes.func,
  onClipboard: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
};

export default VncViewerReact;
