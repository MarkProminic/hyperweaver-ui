import { AttachAddon } from '@xterm/addon-attach';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { useEffect, useState, useRef } from 'react';
import { useXTerm } from 'react-xtermjs';

import { useFooter } from '../../contexts/FooterContext';

const HostShell = () => {
  const { session } = useFooter();

  const { instance, ref } = useXTerm();

  const addonsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  if (!addonsRef.current) {
    addonsRef.current = {
      fitAddon: new FitAddon(),
      serializeAddon: new SerializeAddon(),
      clipboardAddon: new ClipboardAddon(),
      webLinksAddon: new WebLinksAddon(),
      searchAddon: new SearchAddon(),
    };

    try {
      addonsRef.current.webglAddon = new WebglAddon();
    } catch (error) {
      console.error('HOSTSHELL: WebGL addon not available:', error);
      addonsRef.current.webglAddon = null;
    }
  }

  useEffect(() => {
    if (instance && ref?.current) {
      try {
        instance.open(ref.current);
      } catch (error) {
        console.error('HOSTSHELL: Failed to attach terminal to DOM:', error);
      }
    }
  }, [instance, ref]);

  useEffect(() => {
    if (instance) {
      try {
        instance.writeln('Host terminal ready...');

        instance.loadAddon(addonsRef.current.fitAddon);
        instance.loadAddon(addonsRef.current.clipboardAddon);
        instance.loadAddon(addonsRef.current.webLinksAddon);
        instance.loadAddon(addonsRef.current.serializeAddon);
        instance.loadAddon(addonsRef.current.searchAddon);

        if (addonsRef.current.webglAddon) {
          try {
            addonsRef.current.webglAddon.onContextLoss?.(() =>
              addonsRef.current.webglAddon.dispose()
            );
            instance.loadAddon(addonsRef.current.webglAddon);
          } catch (error) {
            console.error('HOSTSHELL: WebGL addon failed:', error);
          }
        }
      } catch (error) {
        console.error('HOSTSHELL: Terminal initialization failed:', error);
      }
    }
  }, [instance]);

  useEffect(() => {
    if (!instance || !session?.websocket) {
      setIsReady(false);
      return undefined;
    }

    const { websocket } = session;
    let attachAddon = null;

    const checkConnection = () => {
      if (websocket.readyState === WebSocket.OPEN) {
        attachAddon = new AttachAddon(websocket);
        instance.loadAddon(attachAddon);
        setIsReady(true);
      }
    };

    checkConnection();

    const onOpen = () => {
      checkConnection();
    };

    const onClose = () => {
      setIsReady(false);
    };

    websocket.addEventListener('open', onOpen);
    websocket.addEventListener('close', onClose);

    return () => {
      websocket.removeEventListener('open', onOpen);
      websocket.removeEventListener('close', onClose);
      if (attachAddon) {
        attachAddon.dispose();
      }
      setIsReady(false);
    };
  }, [instance, session]);

  useEffect(() => {
    const handleFooterResize = () => {
      if (addonsRef.current?.fitAddon && instance) {
        setTimeout(() => addonsRef.current.fitAddon.fit?.(), 50);
      }
    };

    window.addEventListener('footer-resized', handleFooterResize);
    return () => {
      window.removeEventListener('footer-resized', handleFooterResize);
    };
  }, [instance]);

  if (!session) {
    return (
      <div className="h-100 w-100 d-flex align-items-center justify-content-center text-white-50">
        <div className="text-center">
          <i className="fas fa-terminal fa-2x mb-2" />
          <p>No session available</p>
          <p className="small text-muted">Select a server to start terminal</p>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="h-100 w-100 d-flex align-items-center justify-content-center text-white-50">
        <div className="text-center">
          <i className="fas fa-terminal fa-2x fa-pulse mb-2" />
          <p>Loading terminal...</p>
          <p className="small text-muted">Initializing xterm.js</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-100 w-100 d-flex flex-column">
      <div ref={ref} className="h-100 w-100 flex-grow-1" />

      {!isReady && (
        <div className="alert alert-dark p-2 float-end mt-1 me-1">
          <i className="fas fa-plug fa-pulse me-1" />
          {session?.websocket?.readyState === WebSocket.CONNECTING
            ? 'Connecting...'
            : 'Waiting for server'}
        </div>
      )}
    </div>
  );
};

export default HostShell;
