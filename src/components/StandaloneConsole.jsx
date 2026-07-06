import { useParams } from 'react-router-dom';

import { useMode } from '../contexts/ModeContext';
import { useServers } from '../contexts/ServerContext';

import VncViewerReact from './VncViewerReact';

/**
 * Full-window VNC console, opened in its own browser tab by the console's
 * "Open in New Tab" action. The route carries the agent's registry id
 * (`self` in Direct mode) so the viewer can build the mode-aware websockify
 * path — host:port addressing died with the /api/agents unification.
 * The VNC session must already be running — the opener starts it before
 * opening this tab. This tab shares the origin's auth (localStorage token).
 */
const StandaloneConsole = () => {
  const { agentId, machineName } = useParams();
  const { isDirect, ready: modeReady } = useMode();
  const { servers } = useServers();
  const machine = machineName ? decodeURIComponent(machineName) : '';

  if (!agentId || !machine) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        Invalid console address.
      </div>
    );
  }

  // Wait until the mode is pinned and (in Aggregated mode) the registry is
  // loaded — the viewer autoconnects immediately, so the server object must
  // be resolvable before it mounts.
  const server = isDirect
    ? servers[0]
    : servers.find(candidate => String(candidate.id) === String(agentId));

  if (!modeReady || (!server && servers.length === 0)) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        <div className="text-center">
          <i className="fas fa-spinner fa-pulse fa-2x mb-2" />
          <p>Connecting to host...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        Unknown host for console (agent {agentId}).
      </div>
    );
  }

  return (
    <div className="hw-standalone-console">
      <VncViewerReact
        server={server}
        machineName={machine}
        autoConnect
        showControls
        resize="scale"
        className="hw-standalone-console-viewer"
      />
    </div>
  );
};

export default StandaloneConsole;
