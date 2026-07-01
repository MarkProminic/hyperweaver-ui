import { AttachAddon } from '@xterm/addon-attach';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import axios from 'axios';
import PropTypes from 'prop-types';
import React, { createContext, useContext, useCallback, useRef } from 'react';

import { buildWsUrl } from '../utils/websocket';

import { useServers } from './ServerContext';

const ZoneTerminalContext = createContext();

export const useZoneTerminal = () => useContext(ZoneTerminalContext);

export const ZoneTerminalProvider = ({ children }) => {
  const { currentServer, stopZloginSession: apiStopZloginSession } = useServers();

  // Zone session and WebSocket management (similar to FooterContext)
  const sessionsMap = useRef(new Map());
  const websocketsMap = useRef(new Map());
  const creatingSessionsSet = useRef(new Set());
  const historyMap = useRef(new Map()); // Store serialized content per zone

  // Persistent addon instances per zone (prevent history loss)
  const fitAddonsMap = useRef(new Map());
  const webLinksAddonsMap = useRef(new Map());
  const serializeAddonsMap = useRef(new Map());
  const clipboardAddonsMap = useRef(new Map());
  const searchAddonsMap = useRef(new Map());
  const webglAddonsMap = useRef(new Map());

  const getZoneKey = useCallback((server, zoneName) => {
    if (!server || !zoneName) {
      return null;
    }
    return `${server.hostname}:${server.port}:${zoneName}`;
  }, []);

  // Initialize persistent addons for a zone
  const initializeZoneAddons = useCallback(zoneKey => {
    if (!fitAddonsMap.current.has(zoneKey)) {
      console.log(`🔧 ZONE ADDONS: Initializing addons for ${zoneKey}`);

      fitAddonsMap.current.set(zoneKey, new FitAddon());
      webLinksAddonsMap.current.set(zoneKey, new WebLinksAddon());
      serializeAddonsMap.current.set(zoneKey, new SerializeAddon());
      clipboardAddonsMap.current.set(zoneKey, new ClipboardAddon());
      searchAddonsMap.current.set(zoneKey, new SearchAddon());

      // Try WebGL, fallback gracefully
      try {
        webglAddonsMap.current.set(zoneKey, new WebglAddon());
        console.log(`🔧 ZONE ADDONS: WebGL available for ${zoneKey}`);
      } catch (error) {
        console.log(`🔧 ZONE ADDONS: WebGL not supported for ${zoneKey}`, error);
        webglAddonsMap.current.set(zoneKey, null);
      }
    }
  }, []);

  // Get addons array for a specific zone
  const getZoneAddons = useCallback(
    (zoneName, readOnly = false) => {
      const zoneKey = getZoneKey(currentServer, zoneName);
      if (!zoneKey) {
        return null;
      }

      initializeZoneAddons(zoneKey);

      const ws = websocketsMap.current.get(zoneKey);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // No WebSocket connection yet, return base addons without AttachAddon
        const baseAddons = [
          fitAddonsMap.current.get(zoneKey),
          null, // AttachAddon placeholder
          webLinksAddonsMap.current.get(zoneKey),
          serializeAddonsMap.current.get(zoneKey),
          clipboardAddonsMap.current.get(zoneKey),
          searchAddonsMap.current.get(zoneKey),
        ];

        const webglAddon = webglAddonsMap.current.get(zoneKey);
        if (webglAddon) {
          baseAddons.push(webglAddon);
        }

        return baseAddons.filter(addon => addon !== null);
      }

      // WebSocket is available, create AttachAddon
      const attachAddon = new AttachAddon(ws, { bidirectional: !readOnly });

      const addons = [
        fitAddonsMap.current.get(zoneKey),
        attachAddon,
        webLinksAddonsMap.current.get(zoneKey),
        serializeAddonsMap.current.get(zoneKey),
        clipboardAddonsMap.current.get(zoneKey),
        searchAddonsMap.current.get(zoneKey),
      ];

      const webglAddon = webglAddonsMap.current.get(zoneKey);
      if (webglAddon) {
        addons.push(webglAddon);
      }

      return addons;
    },
    [currentServer, getZoneKey, initializeZoneAddons]
  );

  // Get terminal options for a specific zone
  const getZoneOptions = useCallback(
    (readOnly = false) => ({
      cursorBlink: !readOnly,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
      },
      scrollback: 10000,
      fontSize: 12,
      fontFamily: '"Cascadia Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      allowTransparency: false,
      disableStdin: readOnly,
      convertEol: false,
    }),
    []
  );

  // Create or reuse terminal session (simplified for react-xtermjs)
  const createOrReuseTerminalSession = useCallback(
    async (server, zoneName) => {
      const zoneKey = getZoneKey(server, zoneName);
      if (!zoneKey) {
        return null;
      }

      if (creatingSessionsSet.current.has(zoneKey)) {
        console.log(`⏳ ZLOGIN SESSION: Creation already in progress for ${zoneKey}`);
        return null;
      }

      if (sessionsMap.current.has(zoneKey)) {
        console.log(`✅ ZLOGIN SESSION: Reusing existing session for ${zoneKey}`);
        return sessionsMap.current.get(zoneKey);
      }

      creatingSessionsSet.current.add(zoneKey);

      try {
        console.log(`🚀 ZLOGIN SESSION: Starting new session for ${zoneKey}`);
        const response = await axios.post(
          `/api/servers/${server.hostname}:${server.port}/zones/${zoneName}/zlogin/start`
        );

        if (!response.data.success || !response.data.session) {
          console.error(
            `❌ ZLOGIN SESSION: Backend failed to start session for ${zoneKey}:`,
            response.data.error
          );
          return null;
        }

        const sessionData = response.data.session;
        if (!sessionData.websocket_url) {
          console.error(`🚫 ZLOGIN SESSION: Missing websocket_url for ${zoneKey}!`);
          return null;
        }

        const wsUrl = buildWsUrl(
          `/api/servers/${server.hostname}:${server.port}${sessionData.websocket_url}`
        );
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log(`🔗 ZONE TERMINAL: WebSocket connected for ${zoneKey}`);
        ws.onclose = () => {
          console.log(`🔗 ZONE TERMINAL: WebSocket closed for ${zoneKey}`);
          websocketsMap.current.delete(zoneKey);
        };
        ws.onerror = error =>
          console.error(`🚨 ZONE TERMINAL: WebSocket error for ${zoneKey}:`, error);

        sessionsMap.current.set(zoneKey, sessionData);
        websocketsMap.current.set(zoneKey, ws);

        console.log(`🎉 ZONE TERMINAL: Session and WebSocket created successfully for ${zoneKey}`);
        return sessionData;
      } catch (error) {
        console.error(`💥 ZONE TERMINAL: Failed to create session for ${zoneKey}:`, error);
        return null;
      } finally {
        creatingSessionsSet.current.delete(zoneKey);
      }
    },
    [getZoneKey]
  );

  // Preserve terminal history before WebSocket disconnect
  const preserveZoneHistory = useCallback(zoneKey => {
    const serializeAddon = serializeAddonsMap.current.get(zoneKey);
    if (serializeAddon) {
      try {
        const serializedContent = serializeAddon.serialize();
        historyMap.current.set(zoneKey, serializedContent);
        console.log(
          `🔧 ZONE HISTORY: Preserved for ${zoneKey}:`,
          serializedContent.length,
          'characters'
        );
      } catch (error) {
        console.warn(`🔧 ZONE HISTORY: Failed to preserve for ${zoneKey}:`, error);
      }
    }
  }, []);

  // Restore terminal history after WebSocket reconnect
  const restoreZoneHistory = useCallback((zoneKey, terminal) => {
    const history = historyMap.current.get(zoneKey);
    if (history && terminal) {
      try {
        terminal.clear();
        terminal.write(history);
        console.log(`🔧 ZONE HISTORY: Restored for ${zoneKey}`);
      } catch (error) {
        console.warn(`🔧 ZONE HISTORY: Failed to restore for ${zoneKey}:`, error);
      }
    }
  }, []);

  const forceZoneSessionCleanup = useCallback(
    async (server, zoneName) => {
      const zoneKey = getZoneKey(server, zoneName);
      if (!zoneKey) {
        return;
      }

      console.log(`🧹 ZLOGIN CLEANUP: Force cleaning up session state for ${zoneKey}`);

      // Preserve history before cleanup
      preserveZoneHistory(zoneKey);

      const sessionData = sessionsMap.current.get(zoneKey);
      if (sessionData) {
        try {
          await apiStopZloginSession(server.hostname, server.port, server.protocol, sessionData.id);
        } catch (e) {
          console.warn('Failed to stop session on backend during cleanup', e);
        }
      }

      const ws = websocketsMap.current.get(zoneKey);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }

      // Clean up session and WebSocket maps
      sessionsMap.current.delete(zoneKey);
      websocketsMap.current.delete(zoneKey);

      console.log(`✅ ZLOGIN CLEANUP: Complete cleanup finished for ${zoneKey}`);
    },
    [getZoneKey, apiStopZloginSession, preserveZoneHistory]
  );

  const startZloginSessionExplicitly = useCallback(
    async (server, zoneName) => {
      console.log(
        `🎬 START ZLOGIN: User explicitly requested session start for ${getZoneKey(server, zoneName)}`
      );
      return await createOrReuseTerminalSession(server, zoneName);
    },
    [createOrReuseTerminalSession, getZoneKey]
  );

  const initializeSessionFromExisting = useCallback(
    (server, zoneName, sessionData) => {
      const zoneKey = getZoneKey(server, zoneName);
      if (!zoneKey || !sessionData || !sessionData.id) {
        console.error(`❌ ZLOGIN RECONNECT: Invalid data provided for ${zoneKey}`, {
          hasZoneKey: !!zoneKey,
          hasSessionData: !!sessionData,
          hasSessionId: !!sessionData?.id,
        });
        return;
      }

      // Construct websocket_url if missing (for sessions from GET /sessions API)
      const websocketUrl = sessionData.websocket_url || `/zlogin/${sessionData.id}`;

      if (!websocketUrl) {
        console.error(`❌ ZLOGIN RECONNECT: Could not determine websocket URL for ${zoneKey}`);
        return;
      }

      if (websocketsMap.current.has(zoneKey)) {
        console.log(`✅ ZLOGIN RECONNECT: WebSocket already exists for ${zoneKey}`);
        return;
      }

      console.log(`🔄 ZLOGIN RECONNECT: Initializing session from existing data for ${zoneKey}`, {
        sessionId: sessionData.id,
        websocketUrl,
        wasConstructed: !sessionData.websocket_url,
      });

      const wsUrl = buildWsUrl(`/api/servers/${server.hostname}:${server.port}${websocketUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log(`🔗 ZLOGIN RECONNECT: WebSocket connected for ${zoneKey}`);
      ws.onclose = () => {
        console.log(`🔗 ZLOGIN RECONNECT: WebSocket closed for ${zoneKey}`);
        websocketsMap.current.delete(zoneKey);
      };
      ws.onerror = error =>
        console.error(`🚨 ZLOGIN RECONNECT: WebSocket error for ${zoneKey}:`, error);

      // WebSocket message handling is now done by react-xtermjs AttachAddon
      sessionsMap.current.set(zoneKey, sessionData);
      websocketsMap.current.set(zoneKey, ws);

      console.log(`🎉 ZLOGIN RECONNECT: Session initialized successfully for ${zoneKey}`);
    },
    [getZoneKey]
  );

  const pasteTextToZone = useCallback(
    (server, zoneName, text) => {
      const zoneKey = getZoneKey(server, zoneName);
      const ws = websocketsMap.current.get(zoneKey);

      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`📋 ZLOGIN PASTE: Sending ${text.length} characters to ${zoneKey}`);
        // Send clipboard text through WebSocket (simulates typing)
        ws.send(text);
        return true;
      }
      console.warn(`⚠️ ZLOGIN PASTE: Cannot paste - WebSocket not ready for ${zoneKey}`);
      return false;
    },
    [getZoneKey]
  );

  const value = React.useMemo(
    () => ({
      // React-xtermjs specific methods
      getZoneAddons,
      getZoneOptions,

      // Session management methods (for compatibility)
      forceZoneSessionCleanup,
      startZloginSessionExplicitly,
      initializeSessionFromExisting,
      pasteTextToZone,

      // History management
      preserveZoneHistory,
      restoreZoneHistory,
    }),
    [
      getZoneAddons,
      getZoneOptions,
      forceZoneSessionCleanup,
      startZloginSessionExplicitly,
      initializeSessionFromExisting,
      pasteTextToZone,
      preserveZoneHistory,
      restoreZoneHistory,
    ]
  );

  return <ZoneTerminalContext.Provider value={value}>{children}</ZoneTerminalContext.Provider>;
};

ZoneTerminalProvider.propTypes = {
  children: PropTypes.node,
};
