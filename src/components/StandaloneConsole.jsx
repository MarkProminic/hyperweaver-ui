import { useParams } from 'react-router-dom';

import VncViewerReact from './VncViewerReact';

/**
 * Full-window VNC console, opened in its own browser tab by the console's
 * "Open in New Tab" action. Reads `hostname:port` and the zone name from the
 * route and reuses the same websockify-backed react-vnc viewer as the embedded
 * console, so it inherits the same auth/proxy path. The VNC session must already
 * be running — the opener starts it before opening this tab.
 */
const StandaloneConsole = () => {
  const { serverAddress, zoneName } = useParams();
  const [hostname, port] = (serverAddress || '').split(':');
  const zone = zoneName ? decodeURIComponent(zoneName) : '';

  if (!hostname || !port || !zone) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        Invalid console address.
      </div>
    );
  }

  return (
    <div className="hw-standalone-console">
      <VncViewerReact
        serverHostname={hostname}
        serverPort={port}
        zoneName={zone}
        autoConnect
        showControls
        resize="scale"
        className="hw-standalone-console-viewer"
      />
    </div>
  );
};

export default StandaloneConsole;
